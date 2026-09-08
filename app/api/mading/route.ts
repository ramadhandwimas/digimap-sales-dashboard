import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const s=(v:unknown)=>String(v??"").trim(),up=(v:unknown)=>s(v).toUpperCase();
const n=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/\./g,"").replace(/,/g,".").replace(/[^0-9.-]/g,""))||0;
function iso(v:unknown){const x=s(v);if(/^\d{2}-\d{2}-\d{4}$/.test(x)){const[d,m,y]=x.split("-");return`${y}-${m}-${d}`}if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);return""}
function today(){return new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date())}
type Row={date:string;id:string;name:string;invoice:string;article:string;description:string;type:string;qty:number;amount:number;category:string;brand:string;scheme:string;vendor:string};
type QtyValue={name:string;qty:number;value:number};
function parse(r:unknown[]):Row{return{date:iso(r[0]),id:s(r[1]),name:s(r[2]),invoice:s(r[3]),article:s(r[4]),description:s(r[5]),type:s(r[6]),qty:n(r[7]),amount:n(r[8]),category:up(r[9]),brand:up(r[10]),scheme:up(r[12]),vendor:up(r[13])}}
function valid(r:Row){return!!r.date&&!!r.id&&r.scheme!=="VOUCHER"&&!up(r.description).includes("VOUCHER")}
function bucket(r:Row){if(r.scheme==="VAS")return"vas";if(r.scheme==="ACCESSORIES")return"accessories";if(r.scheme==="DEVICES")return"device";return"other"}
function lob(r:Row){if(r.brand!=="APPLE")return"";if(r.scheme==="ACCESSORIES"&&r.category==="AIRPODS")return"AirPods";if(r.scheme!=="DEVICES")return"";if(r.category==="IPHONE")return"iPhone";if(r.category==="MAC")return"MacBook";if(r.category==="IPAD")return"iPad";if(r.category==="APPLE WATCH")return"Apple Watch";return""}
function vasProvider(r:Row){const t=`${r.article} ${r.brand} ${r.vendor} ${r.description}`.toUpperCase();if(t.includes("QOALA")||t.includes("KLA"))return"Qoala";if(t.includes("TELKOMSEL")||t.includes("TSL"))return"Telkomsel";if(t.includes("INDOSAT")||t.includes("IDT"))return"Indosat";if(/(^|\s)XL(\s|$)|XXL/.test(t))return"XL";return""}
function summarize(rows:Row[]){
 const total={amount:0,device:0,accessories:0,vas:0,qty:0,invoices:0};const invoices=new Set<string>(),staff=new Map<string,number>();
 const lobs=new Map<string,QtyValue>(["iPhone","MacBook","iPad","Apple Watch","AirPods"].map(x=>[x,{name:x,qty:0,value:0}]));
 const providers=new Map<string,QtyValue>(["Qoala","Telkomsel","XL","Indosat"].map(x=>[x,{name:x,qty:0,value:0}]));
 for(const r of rows.filter(valid)){total.amount+=r.amount;total.qty+=r.qty;if(r.invoice)invoices.add(r.invoice);const k=bucket(r);if(k==="device")total.device+=r.amount;if(k==="accessories")total.accessories+=r.amount;if(k==="vas")total.vas+=r.amount;staff.set(r.name,(staff.get(r.name)||0)+r.amount);const l=lob(r);if(l){const x=lobs.get(l)!;x.qty+=r.qty;x.value+=r.amount}const v=vasProvider(r);if(v){const x=providers.get(v)!;x.qty+=r.qty;x.value+=r.amount}}
 total.invoices=invoices.size;return{...total,upt:total.invoices?total.qty/total.invoices:0,staff:[...staff.entries()].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value),lob:[...lobs.values()],vasProviders:[...providers.values()]};
}
function dim(period:string){const[y,m]=period.split("-").map(Number);return new Date(y,m,0).getDate()}
function priorPeriod(period:string,months:number){const[y,m]=period.split("-").map(Number),d=new Date(Date.UTC(y,m-1-months,1));return d.toISOString().slice(0,7)}
function metricValues(x:ReturnType<typeof summarize>){return{total:x.amount,device:x.device,accessories:x.accessories,vas:x.vas}}
export async function GET(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const period=req.nextUrl.searchParams.get("period")||today().slice(0,7),year=period.slice(0,4),source=year==="2025"?"Data Copas Archive 2025":"Data Copas";
  const ranges=year==="2025"?["'Data Copas Archive 2025'!A2:S32755","'Data Copas'!A2:S50000"]:["'Data Copas'!A2:S50000","'Data Copas Archive 2025'!A2:S32755"];
  const[currentRows,otherRows]=await getSheetRanges(ID,ranges,email,key);const current=currentRows.map(parse).filter(r=>r.date.startsWith(period));const maxDate=current.map(r=>r.date).sort().at(-1)||`${period}-01`;const selectedAsOf=period===today().slice(0,7)?today():maxDate;
  const selected=current.filter(r=>r.date<=selectedAsOf),summary=summarize(selected),days=Math.max(1,Number(selectedAsOf.slice(8,10))),daysInMonth=dim(period);const factor=period===today().slice(0,7)?daysInMonth/days:1;
  const estimate={amount:summary.amount*factor,device:summary.device*factor,accessories:summary.accessories*factor,vas:summary.vas*factor};
  const prev=priorPeriod(period,1),lfl=`${Number(year)-1}-${period.slice(5,7)}`;const all=[...currentRows,...otherRows].map(parse);const compareDay=Math.max(1,Number(selectedAsOf.slice(8,10))-1);
  const mtmSummary=summarize(all.filter(r=>r.date.startsWith(prev)&&Number(r.date.slice(8,10))<=compareDay));const lflSummary=summarize(all.filter(r=>r.date.startsWith(lfl)&&Number(r.date.slice(8,10))<=compareDay));const currentH1=summarize(all.filter(r=>r.date.startsWith(period)&&Number(r.date.slice(8,10))<=compareDay));
  return NextResponse.json({period,asOf:selectedAsOf,source,summary,estimate,compare:{cutoffDay:compareDay,current:metricValues(currentH1),mtm:{period:prev,...metricValues(mtmSummary)},lfl:{period:lfl,...metricValues(lflSummary)}}},{headers:{"cache-control":"no-store"}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca Mading"},{status:500})}
}
