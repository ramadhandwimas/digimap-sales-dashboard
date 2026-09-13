import {NextRequest,NextResponse} from "next/server";
import {getGoogleSheetRequestCount,getSheetRanges} from "@/lib/google-sheets";
import {getDailySummaryFocus} from "@/lib/m238-daily-summary-focus";

const SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const s=(v:unknown)=>String(v??"").trim();
const up=(v:unknown)=>s(v).toUpperCase();
const n=(v:unknown)=>typeof v==="number"?v:Number(s(v).replace(/[^0-9.-]/g,""))||0;
const validDate=(v:string)=>/^20\d{2}-\d{2}-\d{2}$/.test(v);
const zeroVas={qoalaQty:0,qoalaValue:0,telkomselQty:0,telkomselValue:0,xlQty:0,xlValue:0,indosatQty:0,indosatValue:0};
function iso(v:unknown){if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);const x=s(v);if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);if(/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(x)){const[d,m,y]=x.split(/[/-]/);return`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`}return""}
function addDays(date:string,days:number){const d=new Date(`${date}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
function diffDays(a:string,b:string){return Math.max(1,Math.round((new Date(`${b}T00:00:00Z`).getTime()-new Date(`${a}T00:00:00Z`).getTime())/86400000)+1)}
function weekday(date:string){return new Intl.DateTimeFormat("id-ID",{weekday:"long",timeZone:"Asia/Jakarta"}).format(new Date(`${date}T00:00:00Z`)).toLowerCase()}
type Row={date:string;invoice:string;description:string;qty:number;amount:number;category:string;brand:string;scheme:string;vendor:string;article:string};
function parse(r:unknown[]):Row{return{date:iso(r[0]),invoice:s(r[3]),article:s(r[4]),description:s(r[5]),qty:n(r[7]),amount:n(r[8]),category:up(r[9]),brand:up(r[10]),scheme:up(r[12]),vendor:up(r[13])}}
function valid(r:Row){return!!r.date&&r.scheme!=="VOUCHER"&&!up(`${r.article} ${r.description}`).includes("VOUCHER")}
function kind(r:Row){if(r.scheme==="VAS")return"vas";if(r.scheme==="ACCESSORIES")return"accessories";if(r.scheme==="DEVICES")return"device";return"other"}
function product(r:Row){if(r.brand!=="APPLE")return"";if(r.scheme==="ACCESSORIES"&&r.category==="AIRPODS")return"airpods";if(r.scheme!=="DEVICES")return"";if(r.category==="IPHONE")return"iphone";if(r.category==="MAC"||r.category==="MACBOOK")return"mac";if(r.category==="IPAD")return"ipad";if(r.category==="APPLE WATCH"||r.category==="WATCH")return"watch";return""}
function vasType(r:Row){const t=up(`${r.article} ${r.brand} ${r.vendor} ${r.description}`);if(t.includes("QOALA")||t.includes("KLA"))return"qoala";if(t.includes("TELKOMSEL")||t.includes("TSL"))return"telkomsel";if(t.includes("INDOSAT")||t.includes("IDT"))return"indosat";if(/(^|\s)XL(\s|$)|XXL/.test(t))return"xl";return""}
function aggregate(rows:Row[],date:string,target:number,traffic:number){const day=rows.filter(r=>r.date===date&&valid(r)),invoices=new Set(day.map(r=>r.invoice).filter(Boolean));let amount=0,device=0,accessories=0,vas=0,qty=0,mac=0,ipad=0,iphone=0,watch=0,airpods=0;const vasData={...zeroVas};for(const r of day){amount+=r.amount;qty+=r.qty;const k=kind(r);if(k==="device")device+=r.amount;else if(k==="accessories")accessories+=r.amount;else if(k==="vas")vas+=r.amount;const p=product(r);if(p==="mac")mac+=r.qty;else if(p==="ipad")ipad+=r.qty;else if(p==="iphone")iphone+=r.qty;else if(p==="watch")watch+=r.qty;else if(p==="airpods")airpods+=r.qty;if(k==="vas"){const v=vasType(r);if(v==="qoala"){vasData.qoalaQty+=r.qty;vasData.qoalaValue+=r.amount}else if(v==="telkomsel"){vasData.telkomselQty+=r.qty;vasData.telkomselValue+=r.amount}else if(v==="indosat"){vasData.indosatQty+=r.qty;vasData.indosatValue+=r.amount}else if(v==="xl"){vasData.xlQty+=r.qty;vasData.xlValue+=r.amount}}}const inv=invoices.size,upt=inv?qty/inv:0,atv=inv?amount/inv:0,cvr=traffic?inv/traffic*100:0;return{date,amount,target,device,accessories,vas,invoices:inv,qty,upt,atv,cvr,traffic,mac,ipad,iphone,watch,airpods,vasData}}

export async function GET(req:NextRequest){
 const started=Date.now(),apiStarted=getGoogleSheetRequestCount(),email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY,from=req.nextUrl.searchParams.get("from")||"",to=req.nextUrl.searchParams.get("to")||"";
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 if(!validDate(from)||!validDate(to)||from>to)return NextResponse.json({error:"Range tanggal tidak valid"},{status:400});
 try{
  const days=diffDays(from,to),prevEnd=addDays(from,-1),prevStart=addDays(prevEnd,-days+1);
  const trafficPromise=getSheetRanges(MASTER_ID,["'Traffic'!A2:B1000"],email,key);
  const[config,dateRows]=await getSheetRanges(SOURCE_ID,["Config!A1:AZ120","'Data Copas'!A2:A50000"],email,key);
  const indexes:number[]=[];for(let i=0;i<dateRows.length;i++){const d=iso(dateRows[i]?.[0]);if(d&&d>=prevStart&&d<=to)indexes.push(i+2)}
  let parsed:Row[]=[];if(indexes.length){const first=Math.min(...indexes),last=Math.max(...indexes);const[detail]=await getSheetRanges(SOURCE_ID,[`'Data Copas'!A${first}:S${last}`],email,key);parsed=(detail||[]).map(parse).filter(r=>r.date>=prevStart&&r.date<=to&&valid(r))}
  const[trafficRows]=await trafficPromise,trafficMap=new Map<string,number>();for(const r of trafficRows||[]){const d=iso(r[0]);if(d)trafficMap.set(d,n(r[1]))}
  const dates=[...new Set(parsed.filter(r=>r.date>=from&&r.date<=to).map(r=>r.date))].sort();
  const rows=dates.map(date=>{const targetRow=config.find(r=>s(r[22]).toLowerCase()===weekday(date));return aggregate(parsed,date,n(targetRow?.[23]),trafficMap.get(date)||0)});
  const previousTotal=parsed.filter(r=>r.date>=prevStart&&r.date<=prevEnd).reduce((a,r)=>a+r.amount,0);
  const totals=rows.reduce((a,r)=>({amount:a.amount+r.amount,target:a.target+r.target,device:a.device+r.device,accessories:a.accessories+r.accessories,vas:a.vas+r.vas,invoices:a.invoices+r.invoices,qty:a.qty+r.qty,traffic:a.traffic+r.traffic,mac:a.mac+r.mac,ipad:a.ipad+r.ipad,iphone:a.iphone+r.iphone,watch:a.watch+r.watch,airpods:a.airpods+r.airpods}),{amount:0,target:0,device:0,accessories:0,vas:0,invoices:0,qty:0,traffic:0,mac:0,ipad:0,iphone:0,watch:0,airpods:0});
  const upt=totals.invoices?totals.qty/totals.invoices:0,atv=totals.invoices?totals.amount/totals.invoices:0,cvr=totals.traffic?totals.invoices/totals.traffic*100:0,growthPct=previousTotal?(totals.amount-previousTotal)/previousTotal*100:null;
  const best=rows.length?[...rows].sort((a,b)=>b.amount-a.amount)[0]:null,lowest=rows.length?[...rows].sort((a,b)=>a.amount-b.amount)[0]:null;
  let focus:any={data:{lob:{iphone:{target:null,achievement:totals.iphone},macbook:{target:null,achievement:totals.mac},ipad:{target:null,achievement:totals.ipad},appleWatch:{target:null,achievement:totals.watch},allDevice:{target:null,achievement:totals.iphone+totals.mac+totals.ipad+totals.watch}},types:[],configuredFocusKeys:[],vasByDate:{},cache:"LIVE_FALLBACK",sourceRows:parsed.length},timing:{focusTotal:0,focusSourceRows:0}};
  let focusWarning="";try{focus=await getDailySummaryFocus(from,to,{email,key});focus.data.lob.iphone.achievement=totals.iphone;focus.data.lob.macbook.achievement=totals.mac;focus.data.lob.ipad.achievement=totals.ipad;focus.data.lob.appleWatch.achievement=totals.watch;focus.data.lob.allDevice.achievement=totals.iphone+totals.mac+totals.ipad+totals.watch}catch(error){focusWarning="LOB Focus sementara memakai total live source.";console.warn("M238_DAILY_SUMMARY_FOCUS_FALLBACK",{from,to,error:error instanceof Error?error.message:"Unknown error"})}
  const dailyRows=rows.map(r=>({date:r.date,day:new Intl.DateTimeFormat("id-ID",{weekday:"short",timeZone:"Asia/Jakarta"}).format(new Date(`${r.date}T00:00:00Z`)),totalSales:r.amount,target:r.target,achievementPct:r.target?r.amount/r.target*100:0,transaction:r.invoices,invoice:r.invoices,qty:r.qty,upt:r.upt,atv:r.atv,traffic:r.traffic,cvr:r.cvr,breakdown:{device:r.device,accessories:r.accessories,vas:r.vas},lob:{iphoneQty:r.iphone,macbookQty:r.mac,ipadQty:r.ipad,appleWatchQty:r.watch,airpodsQty:r.airpods},vas:r.vasData}));
  const summary={totalSales:totals.amount,target:totals.target,achievementPct:totals.target?totals.amount/totals.target*100:0,transaction:totals.invoices,invoice:totals.invoices,qty:totals.qty,upt,atv,traffic:totals.traffic,cvr,bestDay:best?{date:best.date,amount:best.amount}:null,lowestDay:lowest?{date:lowest.date,amount:lowest.amount}:null,previousTotal,growthPct};
  const performance={googleSheetRequests:getGoogleSheetRequestCount()-apiStarted,rawRowsFetched:parsed.length,rowsReturned:dailyRows.length,totalLoad:Date.now()-started};
  return NextResponse.json({from,to,summary,previous:{totalSales:previousTotal,growthPct},breakdown:{device:totals.device,accessories:totals.accessories,vas:totals.vas,lob:{iphone:totals.iphone,macbook:totals.mac,ipad:totals.ipad,appleWatch:totals.watch,airpods:totals.airpods}},lobFocus:focus.data,focusWarning:focusWarning||undefined,dailyRows,generatedAt:new Date().toISOString(),source:"Data Copas + Config + Traffic (LIVE)",cache:{summary:"LIVE",focus:focus.data.cache},performance},{headers:{"cache-control":"no-store"}})
 }catch(error){console.warn("M238_DAILY_SUMMARY_LIVE_ERROR",{from,to,error:error instanceof Error?error.message:"Unknown error"});return NextResponse.json({error:"Daily Summary belum berhasil diperbarui."},{status:500,headers:{"cache-control":"no-store"}})}
}
