import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";
import {isValidSale,parseSalesRow,productKey,saleKind,vasKey,type SalesRow} from "@/lib/m238-sales-sanitize";

const ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0",STORE="M238";
const s=(v:unknown)=>String(v??"").trim();
const n=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/[^0-9.-]/g,""))||0;
function monthLabel(period:string){return new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric",timeZone:"Asia/Jakarta"}).format(new Date(`${period}-01T00:00:00Z`))}
const accRate=(price:number)=>price<=599000?5000:price<=2000000?10000:price<=4000000?20000:price<=6000000?40000:80000;

export async function GET(req:NextRequest){
 const period=req.nextUrl.searchParams.get("period")||"",from=req.nextUrl.searchParams.get("from")||"",to=req.nextUrl.searchParams.get("to")||"";
 const rangeMode=/^20\d{2}-\d{2}-\d{2}$/.test(from)&&/^20\d{2}-\d{2}-\d{2}$/.test(to)&&from<=to;
 if(!/^2026-\d{2}$/.test(period))return NextResponse.json({error:"Period harus format YYYY-MM"},{status:400});
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const[dataRows,config]=await getSheetRanges(ID,["'Data Copas'!A2:S50000","Config!A1:AZ120"],email,key);
  const rows=(dataRows||[]).map(parseSalesRow).filter(r=>(rangeMode?(r.date>=from&&r.date<=to):r.date.startsWith(period))&&r.store===STORE&&isValidSale(r,true)&&r.id);
  const label=monthLabel(period).toLowerCase(),targetRow=(config||[]).find(r=>s(r[16]).toLowerCase()===label),target={amount:n(targetRow?.[17]),device:n(targetRow?.[18]),accessories:n(targetRow?.[19]),vas:n(targetRow?.[20])};
  const configById=new Map<string,{name:string;position:string;share:number}>();
  for(const r of (config||[]).slice(27,55)){if(s(r[7]).toUpperCase()!==STORE||!s(r[8])||/SUPERVISOR|ONLINE/i.test(s(r[10])))continue;configById.set(s(r[8]),{name:s(r[9]),position:s(r[10]),share:n(r[11])})}
  const byId=new Map<string,SalesRow[]>();for(const r of rows){const arr=byId.get(r.id)||[];arr.push(r);byId.set(r.id,arr)}
  const staff=[...byId.entries()].map(([id,rr])=>{
   const cfg=configById.get(id),name=[...rr].reverse().map(r=>r.name).find(Boolean)||cfg?.name||id,position=cfg?.position||"Staff M238",share=Math.max(0,cfg?.share||0),invoices=new Set(rr.map(r=>r.invoice).filter(Boolean)),qty=rr.reduce((a,r)=>a+r.qty,0),amount=rr.reduce((a,r)=>a+r.amount,0);
   const sum=(k:string)=>rr.filter(r=>saleKind(r)===k).reduce((a,r)=>a+r.amount,0),lob={iphone:0,mac:0,ipad:0,watch:0,airpods:0},vasDetail={qoala:{qty:0,value:0},telkomsel:{qty:0,value:0},xl:{qty:0,value:0},indosat:{qty:0,value:0}};
   for(const r of rr){const p=productKey(r);if(p in lob)lob[p as keyof typeof lob]+=r.qty;if(saleKind(r)==="vas"){const v=vasKey(r);if(v){vasDetail[v as keyof typeof vasDetail].qty+=r.qty;vasDetail[v as keyof typeof vasDetail].value+=r.amount}}}
   const qoala=rr.filter(r=>saleKind(r)==="vas"&&vasKey(r)==="qoala").reduce((a,r)=>a+(Math.abs(r.amount)/Math.max(1,r.qty)>=1315000?50000:15000)*Math.max(1,r.qty),0),accessoriesInc=rr.filter(r=>saleKind(r)==="accessories").reduce((a,r)=>a+accRate(Math.abs(r.amount)/Math.max(1,r.qty))*Math.max(1,r.qty),0),incentive={mac:lob.mac*30000,iphone:lob.iphone*15000,ipad:lob.ipad*10000,watch:lob.watch*10000,qoala,accessories:accessoriesInc,total:0};
   incentive.total=incentive.mac+incentive.iphone+incentive.ipad+incentive.watch+incentive.qoala+incentive.accessories;
   return{id,name,position,share,status:"IN",amount,device:sum("device"),accessories:sum("accessories"),vas:sum("vas"),qty,invoices:invoices.size,upt:invoices.size?qty/invoices.size:0,atv:invoices.size?amount/invoices.size:0,targets:{amount:target.amount*share,device:target.device*share,accessories:target.accessories*share,vas:target.vas*share},lob,vasDetail,incentive};
  }).sort((a,b)=>b.amount-a.amount||a.name.localeCompare(b.name));
  return NextResponse.json({period,staff,classificationSource:"m238-sales-sanitize"},{headers:{"cache-control":"no-store"}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca staff historical"},{status:500})}
}
