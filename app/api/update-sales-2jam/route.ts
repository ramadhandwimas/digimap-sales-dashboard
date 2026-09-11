import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";
import {GET as dailyFastGET} from "@/app/api/daily-fast/route";

const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const SLOT_HOURS=[10,12,14,16,18,20,22];
const text=(v:unknown)=>String(v??"").trim();
const num=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/[^0-9.-]/g,""))||0;
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
function jakartaParts(d=new Date()){const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(d);return{h:Number(p.find(x=>x.type==="hour")?.value||0),m:Number(p.find(x=>x.type==="minute")?.value||0)}}
function timeWib(v:string){const d=new Date(v);if(Number.isNaN(d.getTime()))return"";return new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit",hour12:false}).format(d).replace(".",":")}

export async function GET(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Koneksi Google Sheets belum tersedia"},{status:500});
 const date=req.nextUrl.searchParams.get("date")||today();
 try{
  const dailyResponse=await dailyFastGET(req),daily=await dailyResponse.json();
  if(!dailyResponse.ok)return NextResponse.json({error:daily.error||"Data Update Sales belum berhasil dimuat."},{status:dailyResponse.status});
  let logs:unknown[][]=[];try{[logs]=await getSheetRanges(MASTER_ID,["'UPLOAD LOG'!A1:H5000"],email,key)}catch{logs=[]}
  const perSlot=new Map<string,{slot:string;uploadedAt:string;totalSales:number;transactions:number;rowsProcessed:number;staffDetected:number}>();
  for(const r of logs){if(text(r[1])!=="UPDATE_SALES_2H"||text(r[2])!==date)continue;const slot=text(r[3]),uploadedAt=text(r[0]);const prev=perSlot.get(slot);if(!prev||uploadedAt>prev.uploadedAt)perSlot.set(slot,{slot,uploadedAt,totalSales:num(r[4]),transactions:num(r[5]),rowsProcessed:num(r[6]),staffDetected:num(r[7])})}
  const nowDate=today(),now=jakartaParts(),nowMinutes=now.h*60+now.m;
  const updateSlots=SLOT_HOURS.map(h=>{const slot=`${String(h).padStart(2,"0")}:00`,hit=perSlot.get(slot),slotMinutes=h*60;let status:"Updated"|"Menunggu Update"|"Belum Ada Data"="Belum Ada Data";if(hit)status="Updated";else if(date<nowDate||(date===nowDate&&slotMinutes<=nowMinutes))status="Menunggu Update";return{slot,status,totalSales:hit?.totalSales??null,transaction:hit?.transactions??null,updateTime:hit?timeWib(hit.uploadedAt):null,uploadedAt:hit?.uploadedAt??null,rowsProcessed:hit?.rowsProcessed??null,staffDetected:hit?.staffDetected??null}});
  const successful=[...perSlot.values()].sort((a,b)=>a.uploadedAt.localeCompare(b.uploadedAt)),last=successful.at(-1);
  const staffSales=(daily.staff||[]).map((s:any,index:number)=>({scheduleOrder:index,staffId:s.id,staffName:s.name,status:s.status,amount:Number(s.amount||0),vas:Number(s.vas||0),acc:Number(s.accessories||0),upt:Number(s.upt||0),atv:Number(s.atv||0),transaction:Number(s.invoices||0),qty:Number(s.qty||0)}));
  const totals=staffSales.reduce((a:any,r:any)=>({amount:a.amount+r.amount,vas:a.vas+r.vas,acc:a.acc+r.acc,transaction:a.transaction+r.transaction,qty:a.qty+r.qty}),{amount:0,vas:0,acc:0,transaction:0,qty:0});
  const avgUpt=staffSales.length?staffSales.reduce((a:number,r:any)=>a+r.upt,0)/staffSales.length:0,avgAtv=staffSales.length?staffSales.reduce((a:number,r:any)=>a+r.atv,0)/staffSales.length:0;
  let status="Belum Ada Data";if(last){const currentSlot=[...SLOT_HOURS].filter(h=>h*60<=nowMinutes).at(-1);status=date===nowDate&&currentSlot&&last.slot===`${String(currentSlot).padStart(2,"0")}:00`?"Data Terbaru":"Data Terlambat"}else if(date===nowDate)status="Menunggu Update";
  return NextResponse.json({date,updatedAt:last?.uploadedAt||daily.fastUpdatedAt||null,lastUpdate:last?timeWib(last.uploadedAt):null,status,updateSlots,staffSales,summary:{totalSales:totals.amount,totalVas:totals.vas,totalAcc:totals.acc,avgUpt,avgAtv,totalTransactions:totals.transaction,totalQty:totals.qty},source:"Fast Daily Sales / Daily Sales existing calculation"},{headers:{"cache-control":"no-store"}})
 }catch(e){console.error("update-sales-2jam",e);return NextResponse.json({error:"Data Update Sales belum berhasil dimuat."},{status:500})}
}
