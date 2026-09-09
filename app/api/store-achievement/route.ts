import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const DASHBOARD_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const STORE="M238";
const s=(v:unknown)=>String(v??"").trim();
const n=(v:unknown)=>typeof v==="number"?v:Number(s(v).replace(/[^0-9.-]/g,""))||0;
const up=(v:unknown)=>s(v).toUpperCase();
const iso=(v:unknown)=>{if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);const x=s(v);if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);const m=x.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:""};
const monthNames=["januari","februari","maret","april","mei","juni","juli","agustus","september","oktober","november","desember"];
const currentPeriod=()=>new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());
const todayIso=()=>new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());
const daysInMonth=(period:string)=>new Date(Number(period.slice(0,4)),Number(period.slice(5,7)),0).getDate();
const pct=(a:number,b:number)=>b?(a-b)/b*100:0;
const weekRank=(label:string)=>{const m=label.match(/Week\s*(\d+)\s*Q(\d+)/i);return Number(m?.[2]||0)*100+Number(m?.[1]||0)};

type Row={date:string;invoice:string;qty:number;amount:number;category:string;scheme:string;week:string};
function parse(r:unknown[]):Row{return{date:iso(r[0]),invoice:s(r[3]),qty:n(r[7]),amount:n(r[8]),category:up(r[9]),scheme:up(r[12]),week:s(r[14])}}
function valid(r:Row){return !!r.date&&r.scheme!=="VOUCHER"}
function lob(r:Row){if(/AIRPOD/.test(r.category))return"AirPods";if(r.category==="IPHONE")return"iPhone";if(r.category==="IPAD")return"iPad";if(r.category==="MAC"||r.category.includes("MACBOOK"))return"Mac";if(r.category.includes("WATCH"))return"Watch";return""}
function sumAmount(rows:Row[]){return rows.reduce((a,r)=>a+r.amount,0)}
function uniqueTransactions(rows:Row[]){return new Set(rows.map(r=>r.invoice).filter(Boolean)).size}

export async function GET(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 const period=req.nextUrl.searchParams.get("period")||currentPeriod();
 if(!/^20\d{2}-\d{2}$/.test(period))return NextResponse.json({error:"Periode tidak valid"},{status:400});
 try{
  const [[dataRows,archiveRows,configRows],[trafficRows,manualRows]]=await Promise.all([
   getSheetRanges(DASHBOARD_ID,["'Data Copas'!A2:S50000","'Data Copas Archive 2025'!A2:S40000","Config!A1:AZ120"],email,key),
   getSheetRanges(MASTER_ID,["'Traffic'!A2:B2000","'Dashboard Manual Target'!A2:E5000"],email,key).catch(()=>[[],[]])
  ]);
  const all2026=dataRows.filter(r=>s(r[15])===STORE).map(parse).filter(valid),all2025=archiveRows.filter(r=>!s(r[15])||s(r[15])===STORE).map(parse).filter(valid),all=[...all2025,...all2026];
  const now=todayIso(),isCurrent=period===now.slice(0,7),dim=daysInMonth(period),cutoff=isCurrent?Number(now.slice(8,10)):dim,periodRows=all.filter(r=>r.date.startsWith(period)&&Number(r.date.slice(8,10))<=cutoff);
  const year=Number(period.slice(0,4)),month=Number(period.slice(5,7)),prevDate=new Date(Date.UTC(year,month-2,1)),prevPeriod=prevDate.toISOString().slice(0,7),lastYearPeriod=`${year-1}-${period.slice(5,7)}`;
  const prevCutoff=Math.min(cutoff,daysInMonth(prevPeriod)),lyCutoff=Math.min(cutoff,daysInMonth(lastYearPeriod));
  const prevRows=all.filter(r=>r.date.startsWith(prevPeriod)&&Number(r.date.slice(8,10))<=prevCutoff),lyRows=all.filter(r=>r.date.startsWith(lastYearPeriod)&&Number(r.date.slice(8,10))<=lyCutoff);
  const monthLabel=`${monthNames[month-1]} ${year}`,targetRow=configRows.find(r=>s(r[16]).toLowerCase()===monthLabel),target={amount:n(targetRow?.[17]),device:n(targetRow?.[18]),accessories:n(targetRow?.[19]),vas:n(targetRow?.[20])};
  const actual={amount:sumAmount(periodRows),device:sumAmount(periodRows.filter(r=>r.scheme==="DEVICES")),accessories:sumAmount(periodRows.filter(r=>r.scheme==="ACCESSORIES")),vas:sumAmount(periodRows.filter(r=>r.scheme==="VAS"))};
  const dailyTargetMap=new Map<string,number>();for(const r of configRows){const day=s(r[22]).toLowerCase();if(day)dailyTargetMap.set(day,n(r[23]))}
  const daily=Array.from({length:dim},(_,i)=>{const day=i+1,date=`${period}-${String(day).padStart(2,"0")}`,rr=periodRows.filter(r=>r.date===date),weekday=new Intl.DateTimeFormat("id-ID",{weekday:"long",timeZone:"Asia/Jakarta"}).format(new Date(`${date}T00:00:00Z`)).toLowerCase();return{date,day,actual:sumAmount(rr),target:dailyTargetMap.get(weekday)||0}}).filter(x=>x.day<=cutoff);
  const lastRecorded=[...daily].reverse().find(x=>x.actual>0)||daily.at(-1)||{date:`${period}-01`,day:1,actual:0,target:0};
  const selectedDay=isCurrent?daily.find(x=>x.date===now)||lastRecorded:lastRecorded;
  const remaining=Math.max(0,target.amount-actual.amount),remainingDays=isCurrent?Math.max(1,dim-cutoff+1):0,needPerDay=remainingDays?remaining/remainingDays:0,projected=isCurrent&&cutoff?actual.amount/cutoff*dim:actual.amount,projectedAchievement=target.amount?projected/target.amount*100:0;
  const traffic=trafficRows.reduce((a,r)=>{const d=iso(r[0]);return a+(d.startsWith(period)&&Number(d.slice(8,10))<=cutoff?n(r[1]):0)},0),transactions=uniqueTransactions(periodRows),qty=periodRows.reduce((a,r)=>a+r.qty,0),cvr=traffic?transactions/traffic*100:0,upt=transactions?qty/transactions:0,atv=transactions?actual.amount/transactions:0;
  const lfl=pct(actual.amount,sumAmount(lyRows)),mtm=pct(actual.amount,sumAmount(prevRows));
  const weeks=[...new Set(periodRows.map(r=>r.week).filter(x=>/^Week \d+ Q\d+$/i.test(x)))].sort((a,b)=>weekRank(a)-weekRank(b)),currentWeek=weeks.at(-1)||"",previousWeek=weeks.at(-2)||"";
  const manualLatest=new Map<string,number>();for(const r of manualRows){if(s(r[0])!=="monthly"||s(r[1])!==period)continue;const keyName=s(r[2]);if(keyName.startsWith("lob-focus::"))manualLatest.set(keyName.slice("lob-focus::".length),n(r[3]));}
  const lobNames=["iPhone","Mac","iPad","Watch","AirPods"],lobRows=lobNames.map(name=>{const current=periodRows.filter(r=>lob(r)===name),qtyMonth=current.reduce((a,r)=>a+r.qty,0),weekQty=(w:string)=>current.filter(r=>r.week===w).reduce((a,r)=>a+r.qty,0),cw=weekQty(currentWeek),pw=weekQty(previousWeek),growth=pw?(cw-pw)/pw*100:(cw?100:0),aliases=name==="Mac"?["Mac","MacBook","MAC"]:name==="Watch"?["Watch","Apple Watch","APPLE WATCH"]:[name,name.toUpperCase()],manualTarget=aliases.map(a=>manualLatest.get(a)).find(v=>typeof v==="number")||0;return{name,qty:qtyMonth,target:manualTarget,achievement:manualTarget?qtyMonth/manualTarget*100:0,vsLastWeek:growth}});
  const progress=[{key:"amount",label:"Total Sales",actual:actual.amount,target:target.amount},{key:"device",label:"Device",actual:actual.device,target:target.device},{key:"accessories",label:"Accessories",actual:actual.accessories,target:target.accessories},{key:"vas",label:"VAS",actual:actual.vas,target:target.vas}].map(x=>({...x,achievement:x.target?x.actual/x.target*100:0}));
  const weakest=[...progress].filter(x=>x.target>0).sort((a,b)=>a.achievement-b.achievement)[0],strong=[...progress].filter(x=>x.target>0).sort((a,b)=>b.achievement-a.achievement)[0];
  let insight="Pencapaian store mengikuti pace bulan berjalan.";if(weakest&&strong){if(remaining>0&&remainingDays)insight=`${strong.label} paling dekat ke target, sementara ${weakest.label} masih tertinggal. Store membutuhkan rata-rata ${Math.round(needPerDay/1_000_000)} juta per hari untuk mencapai target bulan ini.`;else if(remaining<=0)insight=`Target sales bulan ini sudah tercapai. Fokus berikutnya menjaga performa ${weakest.label} agar pencapaian tetap seimbang.`;else insight=`${strong.label} menjadi pencapaian terkuat, sementara ${weakest.label} masih menjadi area utama untuk ditingkatkan.`}
  return NextResponse.json({period,store:"M238 PIM 2",target,actual,achievement:target.amount?actual.amount/target.amount*100:0,remaining,remainingDays,needPerDay,daily,today:{label:isCurrent?"Today":"Last Recorded",date:selectedDay?.date||"",sales:selectedDay?.actual||0,target:selectedDay?.target||0,achievement:selectedDay?.target?(selectedDay.actual/selectedDay.target)*100:0},projected,projectedAchievement,kpi:{lfl,mtm,cvr,upt,atv},progress,lob:lobRows,insight,meta:{traffic,transactions,qty,cutoff,lastYearSales:sumAmount(lyRows),previousMonthSales:sumAmount(prevRows)}},{headers:{"cache-control":"no-store"}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca pencapaian store"},{status:500})}
}
