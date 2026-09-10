import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0",STORE="M238";
const s=(v:unknown)=>String(v??"").trim(),up=(v:unknown)=>s(v).toUpperCase();
const n=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/[^0-9.-]/g,""))||0;
function iso(v:unknown){const x=s(v);if(/^\d{2}-\d{2}-\d{4}$/.test(x)){const[d,m,y]=x.split("-");return`${y}-${m}-${d}`}if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);return""}
function monthLabel(period:string){return new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric",timeZone:"Asia/Jakarta"}).format(new Date(`${period}-01T00:00:00Z`))}
function valid(r:unknown[]){return up(r[12])!=="VOUCHER"&&!up(r[5]).includes("VOUCHER")}
function kind(r:unknown[]){const scheme=up(r[12]),text=`${up(r[6])} ${up(r[9])} ${up(r[5])}`;if(scheme==="VAS")return"vas";if(scheme==="ACCESSORIES")return"accessories";if(scheme==="DEVICES")return"device";if(/IPHONE|IPAD|MAC|APPLE WATCH|AIRPODS/.test(text))return"device";return"other"}
function product(r:unknown[]){if(up(r[10])!=="APPLE")return"other";const scheme=up(r[12]),cat=up(r[9]);if(scheme==="ACCESSORIES")return cat==="AIRPODS"?"airpods":"other";if(scheme!=="DEVICES")return"other";if(cat==="IPHONE")return"iphone";if(cat==="MAC")return"mac";if(cat==="IPAD")return"ipad";if(cat==="APPLE WATCH")return"watch";return"other"}
function vasType(r:unknown[]){const t=`${s(r[4])} ${s(r[10])} ${s(r[13])} ${s(r[5])}`.toUpperCase();if(t.includes("QOALA")||t.includes("KLA"))return"qoala";if(t.includes("TELKOMSEL")||t.includes("TSL"))return"telkomsel";if(t.includes("INDOSAT")||t.includes("IDT"))return"indosat";if(/(^|\s)XL(\s|$)|XXL/.test(t))return"xl";return""}
const accRate=(price:number)=>price<=599000?5000:price<=2000000?10000:price<=4000000?20000:price<=6000000?40000:80000;

export async function GET(req:NextRequest){
 const period=req.nextUrl.searchParams.get("period")||"";
 if(!/^2026-\d{2}$/.test(period))return NextResponse.json({error:"Period harus format YYYY-MM"},{status:400});
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const[dataRows,config]=await getSheetRanges(ID,["'Data Copas'!A2:S50000","Config!A1:AZ120"],email,key);
  const rows=(dataRows||[]).filter(r=>iso(r[0]).startsWith(period)&&up(r[15])===STORE&&valid(r)&&s(r[1]));
  const label=monthLabel(period).toLowerCase(),targetRow=(config||[]).find(r=>s(r[16]).toLowerCase()===label),target={amount:n(targetRow?.[17]),device:n(targetRow?.[18]),accessories:n(targetRow?.[19]),vas:n(targetRow?.[20])};
  const configById=new Map<string,{name:string;position:string;share:number}>();
  for(const r of (config||[]).slice(27,55)){if(s(r[7])!==STORE||!s(r[8])||/SUPERVISOR|ONLINE/i.test(s(r[10])))continue;configById.set(s(r[8]),{name:s(r[9]),position:s(r[10]),share:n(r[11])})}
  const byId=new Map<string,unknown[][]>();for(const r of rows){const id=s(r[1]),arr=byId.get(id)||[];arr.push(r);byId.set(id,arr)}
  const staff=[...byId.entries()].map(([id,rr])=>{
   const cfg=configById.get(id),name=[...rr].reverse().map(r=>s(r[2])).find(Boolean)||cfg?.name||id,position=cfg?.position||"Staff M238",share=Math.max(0,cfg?.share||0),invoices=new Set(rr.map(r=>s(r[3])).filter(Boolean)),qty=rr.reduce((a,r)=>a+n(r[7]),0),amount=rr.reduce((a,r)=>a+n(r[8]),0);
   const sum=(k:string)=>rr.filter(r=>kind(r)===k).reduce((a,r)=>a+n(r[8]),0),lob={iphone:0,mac:0,ipad:0,watch:0,airpods:0},vasDetail={qoala:{qty:0,value:0},telkomsel:{qty:0,value:0},xl:{qty:0,value:0},indosat:{qty:0,value:0}};
   for(const r of rr){const p=product(r);if(p in lob)lob[p as keyof typeof lob]+=n(r[7]);if(kind(r)==="vas"){const v=vasType(r);if(v){vasDetail[v as keyof typeof vasDetail].qty+=n(r[7]);vasDetail[v as keyof typeof vasDetail].value+=n(r[8])}}}
   const qoala=rr.filter(r=>kind(r)==="vas"&&vasType(r)==="qoala").reduce((a,r)=>a+(Math.abs(n(r[8]))/Math.max(1,n(r[7]))>=1315000?50000:15000)*Math.max(1,n(r[7])),0),accessoriesInc=rr.filter(r=>kind(r)==="accessories").reduce((a,r)=>a+accRate(Math.abs(n(r[8]))/Math.max(1,n(r[7])))*Math.max(1,n(r[7])),0),incentive={mac:lob.mac*30000,iphone:lob.iphone*15000,ipad:lob.ipad*10000,watch:lob.watch*10000,qoala,accessories:accessoriesInc,total:0};
   incentive.total=incentive.mac+incentive.iphone+incentive.ipad+incentive.watch+incentive.qoala+incentive.accessories;
   return{id,name,position,share,status:"IN",amount,device:sum("device"),accessories:sum("accessories"),vas:sum("vas"),qty,invoices:invoices.size,upt:invoices.size?qty/invoices.size:0,atv:invoices.size?amount/invoices.size:0,targets:{amount:target.amount*share,device:target.device*share,accessories:target.accessories*share,vas:target.vas*share},lob,vasDetail,incentive};
  }).sort((a,b)=>b.amount-a.amount||a.name.localeCompare(b.name));
  return NextResponse.json({period,staff},{headers:{"cache-control":"no-store"}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca staff historical"},{status:500})}
}
