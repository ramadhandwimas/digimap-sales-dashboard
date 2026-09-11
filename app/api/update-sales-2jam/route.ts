import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";
import {GET as dailyFastGET} from "@/app/api/daily-fast/route";

const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const STORE="M238",SLOT_HOURS=[10,12,14,16,18,20,22];
const text=(v:unknown)=>String(v??"").trim(),up=(v:unknown)=>text(v).toUpperCase();
const num=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/[^0-9.-]/g,""))||0;
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
function jakartaParts(d=new Date()){const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(d);return{h:Number(p.find(x=>x.type==="hour")?.value||0),m:Number(p.find(x=>x.type==="minute")?.value||0)}}
function timeWib(v:string){const d=new Date(v);if(Number.isNaN(d.getTime()))return"";return new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit",hour12:false}).format(d).replace(".",":")}
function isSupervisor(v:string){return/SUPERVISOR|\bSPV\b/i.test(v)}
function normalizedName(v:unknown){return up(v).replace(/\s+/g," ")}
function logDate(v:unknown){
 const raw=text(v);if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
 if(/^\d{2}-\d{2}-\d{4}$/.test(raw)){const[d,m,y]=raw.split("-");return`${y}-${m}-${d}`}
 const serial=typeof v==="number"?v:Number(raw);if(Number.isFinite(serial)&&serial>20000&&serial<80000){const d=new Date(Date.UTC(1899,11,30)+Math.round(serial)*86400000);return d.toISOString().slice(0,10)}
 return raw;
}
function logSlot(v:unknown){
 const raw=text(v);if(/^\d{1,2}:\d{2}$/.test(raw)){const[h,m]=raw.split(":");return`${String(Number(h)).padStart(2,"0")}:${String(Number(m)).padStart(2,"0")}`}
 const value=typeof v==="number"?v:Number(raw);if(Number.isFinite(value)&&value>=0&&value<1.5){const total=Math.round((value%1)*24*60),h=Math.floor(total/60)%24,m=total%60;return`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`}
 return raw;
}

type DailyStaff={id?:string;name?:string;status?:string;amount?:number;vas?:number;accessories?:number;upt?:number;atv?:number;invoices?:number;qty?:number};
type ActiveStaff={id:string;name:string;order:number};
function activeStaffFromConfig(config:unknown[][]){const out:ActiveStaff[]=[];const seen=new Set<string>();for(const r of config.slice(27,70)){if(up(r[7])!==STORE)continue;const id=text(r[8]),name=text(r[9]),position=text(r[10]);if(!id||!name||isSupervisor(position))continue;const key=id||normalizedName(name);if(seen.has(key))continue;seen.add(key);out.push({id,name,order:out.length})}return out}

export async function GET(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({error:"Koneksi Google Sheets belum tersedia"},{status:500});
 const date=req.nextUrl.searchParams.get("date")||today();
 try{
  const[dailyResponse,masterRead,sourceRead]=await Promise.all([
   dailyFastGET(req),
   getSheetRanges(MASTER_ID,["'UPLOAD LOG'!A1:H5000"],email,key).catch(()=>[[]]),
   getSheetRanges(SOURCE_ID,["Config!A1:AZ120"],email,key).catch(()=>[[]]),
  ]),daily=await dailyResponse.json();
  if(!dailyResponse.ok)return NextResponse.json({error:daily.error||"Data Update Sales belum berhasil dimuat."},{status:dailyResponse.status});
  const logs=masterRead[0]||[],config=sourceRead[0]||[];
  let clearAt="";for(const r of logs){if(text(r[1])!=="CLEAR_SALES_2H"||logDate(r[2])!==date)continue;const at=text(r[0]);if(at>clearAt)clearAt=at}
  const perSlot=new Map<string,{slot:string;uploadedAt:string;totalSales:number;transactions:number;rowsProcessed:number;staffDetected:number}>();
  for(const r of logs){if(text(r[1])!=="UPDATE_SALES_2H"||logDate(r[2])!==date)continue;const slot=logSlot(r[3]),uploadedAt=text(r[0]);if(clearAt&&uploadedAt<=clearAt)continue;const prev=perSlot.get(slot);if(!prev||uploadedAt>prev.uploadedAt)perSlot.set(slot,{slot,uploadedAt,totalSales:num(r[4]),transactions:num(r[5]),rowsProcessed:num(r[6]),staffDetected:num(r[7])})}
  const nowDate=today(),now=jakartaParts(),nowMinutes=now.h*60+now.m,updateSlots=SLOT_HOURS.map(h=>{const slot=`${String(h).padStart(2,"0")}:00`,hit=perSlot.get(slot),slotMinutes=h*60;let status:"Updated"|"Menunggu Update"|"Belum Ada Data"="Belum Ada Data";if(hit)status="Updated";else if(date<nowDate||(date===nowDate&&slotMinutes<=nowMinutes))status="Menunggu Update";return{slot,status,totalSales:hit?.totalSales??null,transaction:hit?.transactions??null,updateTime:hit?timeWib(hit.uploadedAt):null,uploadedAt:hit?.uploadedAt??null}});
  const successful=[...perSlot.values()].sort((a,b)=>a.uploadedAt.localeCompare(b.uploadedAt)),last=successful.at(-1),dailyRows=(daily.staff||[]) as DailyStaff[],byId=new Map(dailyRows.filter(s=>text(s.id)).map(s=>[text(s.id),s])),byName=new Map(dailyRows.filter(s=>text(s.name)).map(s=>[normalizedName(s.name),s]));
  const active=activeStaffFromConfig(config),staffSales=active.map((p,index)=>{const s=byId.get(p.id)||byName.get(normalizedName(p.name));return{scheduleOrder:index,staffId:p.id,staffName:p.name,amount:Number(s?.amount||0),vas:Number(s?.vas||0),acc:Number(s?.accessories||0),upt:Number(s?.upt||0),atv:Number(s?.atv||0),transaction:Number(s?.invoices||0),qty:Number(s?.qty||0)}});
  for(const s of dailyRows){const id=text(s.id),name=text(s.name);if(!id&&!name)continue;if(staffSales.some(x=>x.staffId===id||normalizedName(x.staffName)===normalizedName(name)))continue;staffSales.push({scheduleOrder:staffSales.length,staffId:id,staffName:name||id,amount:Number(s.amount||0),vas:Number(s.vas||0),acc:Number(s.accessories||0),upt:Number(s.upt||0),atv:Number(s.atv||0),transaction:Number(s.invoices||0),qty:Number(s.qty||0)})}
  const totals=staffSales.reduce((a,r)=>({amount:a.amount+r.amount,vas:a.vas+r.vas,acc:a.acc+r.acc,transaction:a.transaction+r.transaction,qty:a.qty+r.qty}),{amount:0,vas:0,acc:0,transaction:0,qty:0});
  let status="Belum Ada Data";if(last){const currentSlot=[...SLOT_HOURS].filter(h=>h*60<=nowMinutes).at(-1);status=date===nowDate&&currentSlot&&last.slot===`${String(currentSlot).padStart(2,"0")}:00`?"Data Terbaru":"Data Terlambat"}else if(date===nowDate)status="Menunggu Update";
  return NextResponse.json({date,updatedAt:last?.uploadedAt||(!clearAt?daily.fastUpdatedAt:null)||null,lastUpdate:last?timeWib(last.uploadedAt):null,status,updateSlots,staffSales,summary:{totalSales:totals.amount,totalVas:totals.vas,totalAcc:totals.acc,totalTransactions:totals.transaction,totalQty:totals.qty},clearedAt:clearAt||null,source:"Fast Daily Sales current staging; staff roster from active M238 config"},{headers:{"cache-control":"no-store"}})
 }catch(e){console.error("update-sales-2jam",e);return NextResponse.json({error:"Data Update Sales belum berhasil dimuat."},{status:500})}
}
