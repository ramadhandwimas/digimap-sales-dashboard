import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";
import {aggregateSales,isValidSale,parseSalesRow,productKey,type SalesRow} from "@/lib/m238-sales-sanitize";

const DASHBOARD_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const STORE="M238";
const s=(v:unknown)=>String(v??"").trim();
const n=(v:unknown)=>typeof v==="number"?v:Number(s(v).replace(/[^0-9.-]/g,""))||0;
const iso=(v:unknown)=>{if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);const x=s(v);if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);const m=x.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:""};
const monthNames=["januari","februari","maret","april","mei","juni","juli","agustus","september","oktober","november","desember"];
const currentPeriod=()=>new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());
const todayIso=()=>new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());
const daysInMonth=(period:string)=>new Date(Number(period.slice(0,4)),Number(period.slice(5,7)),0).getDate();
const pct=(a:number,b:number)=>b?(a-b)/b*100:0;
type Item={sale:SalesRow;week:string};
const amount=(items:Item[])=>aggregateSales(items.map(x=>x.sale)).amount;
const qty=(items:Item[])=>aggregateSales(items.map(x=>x.sale)).qty;
const weekEntries=(items:Item[])=>{const map=new Map<string,string>();for(const item of items){if(!/^Week \d+ Q\d+$/i.test(item.week))continue;const current=map.get(item.week);if(!current||item.sale.date<current)map.set(item.week,item.sale.date)}return[...map.entries()].sort((a,b)=>a[1].localeCompare(b[1])).map(([label])=>label)};
const lobName=(sale:SalesRow)=>{const key=productKey(sale);return key==="iphone"?"iPhone":key==="mac"?"Mac":key==="ipad"?"iPad":key==="watch"?"Watch":key==="airpods"?"AirPods":""};

export async function GET(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 const period=req.nextUrl.searchParams.get("period")||currentPeriod();
 if(!/^20\d{2}-\d{2}$/.test(period))return NextResponse.json({error:"Periode tidak valid"},{status:400});
 try{
  const[[dataRows,archiveRows,configRows],[trafficRows,manualRows]]=await Promise.all([
   getSheetRanges(DASHBOARD_ID,["'Data Copas'!A2:S50000","'Data Copas Archive 2025'!A2:S40000","Config!A1:AZ120"],email,key),
   getSheetRanges(MASTER_ID,["'Traffic'!A2:B2000","'Dashboard Manual Target'!A2:E5000"],email,key).catch(()=>[[],[]])
  ]);
  const parse=(raw:unknown[]):Item=>({sale:parseSalesRow(raw),week:s(raw[14])}),all=[...archiveRows.map(parse),...dataRows.map(parse)].filter(({sale})=>isValidSale(sale)&&(!sale.store||sale.store===STORE));
  const now=todayIso(),isCurrent=period===now.slice(0,7),dim=daysInMonth(period),cutoff=isCurrent?Number(now.slice(8,10)):dim,periodRows=all.filter(({sale})=>sale.date.startsWith(period)&&Number(sale.date.slice(8,10))<=cutoff);
  const year=Number(period.slice(0,4)),month=Number(period.slice(5,7)),prevDate=new Date(Date.UTC(year,month-2,1)),prevPeriod=prevDate.toISOString().slice(0,7),lastYearPeriod=`${year-1}-${period.slice(5,7)}`,prevCutoff=Math.min(cutoff,daysInMonth(prevPeriod)),lyCutoff=Math.min(cutoff,daysInMonth(lastYearPeriod));
  const prevRows=all.filter(({sale})=>sale.date.startsWith(prevPeriod)&&Number(sale.date.slice(8,10))<=prevCutoff),lyRows=all.filter(({sale})=>sale.date.startsWith(lastYearPeriod)&&Number(sale.date.slice(8,10))<=lyCutoff);
  const monthLabel=`${monthNames[month-1]} ${year}`,targetRow=configRows.find(r=>s(r[16]).toLowerCase()===monthLabel),target={amount:n(targetRow?.[17]),device:n(targetRow?.[18]),accessories:n(targetRow?.[19]),vas:n(targetRow?.[20])},actualAgg=aggregateSales(periodRows.map(x=>x.sale)),actual={amount:actualAgg.amount,device:actualAgg.device,accessories:actualAgg.accessories,vas:actualAgg.vas};
  const dailyTargetMap=new Map<string,number>();for(const r of configRows){const day=s(r[22]).toLowerCase();if(day)dailyTargetMap.set(day,n(r[23]))}
  const daily=Array.from({length:dim},(_,i)=>{const day=i+1,date=`${period}-${String(day).padStart(2,"0")}`,rr=periodRows.filter(({sale})=>sale.date===date),weekday=new Intl.DateTimeFormat("id-ID",{weekday:"long",timeZone:"Asia/Jakarta"}).format(new Date(`${date}T00:00:00Z`)).toLowerCase();return{date,day,actual:amount(rr),target:dailyTargetMap.get(weekday)||0}}).filter(x=>x.day<=cutoff),lastRecorded=[...daily].reverse().find(x=>x.actual>0)||daily.at(-1)||{date:`${period}-01`,day:1,actual:0,target:0},selectedDay=isCurrent?daily.find(x=>x.date===now)||lastRecorded:lastRecorded;
  const remaining=Math.max(0,target.amount-actual.amount),remainingDays=isCurrent?Math.max(1,dim-cutoff+1):0,needPerDay=remainingDays?remaining/remainingDays:0,projected=isCurrent&&cutoff?actual.amount/cutoff*dim:actual.amount,projectedAchievement=target.amount?projected/target.amount*100:0;
  const traffic=trafficRows.reduce((a,r)=>{const d=iso(r[0]);return a+(d.startsWith(period)&&Number(d.slice(8,10))<=cutoff?n(r[1]):0)},0),transactions=actualAgg.invoices,totalQty=actualAgg.qty,cvr=traffic?transactions/traffic*100:0,upt=actualAgg.upt,atv=actualAgg.atv,lfl=pct(actual.amount,amount(lyRows)),mtm=pct(actual.amount,amount(prevRows));
  const weeks=weekEntries(periodRows),currentWeek=weeks.at(-1)||"",previousWeek=weeks.at(-2)||"";
  const manualLatest=new Map<string,number>();for(const r of manualRows){if(s(r[0])!=="monthly"||s(r[1])!==period)continue;const keyName=s(r[2]);if(keyName.startsWith("lob-focus::"))manualLatest.set(keyName.slice("lob-focus::".length),n(r[3]))}
  const names=["iPhone","Mac","iPad","Watch","AirPods"],lobRows=names.map(name=>{const current=periodRows.filter(({sale})=>lobName(sale)===name),qtyMonth=qty(current),weekQty=(w:string)=>qty(current.filter(x=>x.week===w)),cw=weekQty(currentWeek),pw=weekQty(previousWeek),growth=pw?(cw-pw)/pw*100:(cw?100:0),aliases=name==="Mac"?["Mac","MacBook","MAC"]:name==="Watch"?["Watch","Apple Watch","APPLE WATCH"]:[name,name.toUpperCase()],manualTarget=aliases.map(a=>manualLatest.get(a)).find(v=>typeof v==="number")||0;return{name,qty:qtyMonth,target:manualTarget,achievement:manualTarget?qtyMonth/manualTarget*100:0,vsLastWeek:growth}});
  const progress=[{key:"amount",label:"Total Sales",actual:actual.amount,target:target.amount},{key:"device",label:"Device",actual:actual.device,target:target.device},{key:"accessories",label:"Accessories",actual:actual.accessories,target:target.accessories},{key:"vas",label:"VAS",actual:actual.vas,target:target.vas}].map(x=>({...x,achievement:x.target?x.actual/x.target*100:0})),weakest=[...progress].filter(x=>x.target>0).sort((a,b)=>a.achievement-b.achievement)[0],strong=[...progress].filter(x=>x.target>0).sort((a,b)=>b.achievement-a.achievement)[0];
  let insight="Pencapaian store mengikuti pace bulan berjalan.";if(weakest&&strong){if(remaining>0&&remainingDays)insight=`${strong.label} paling dekat ke target, sementara ${weakest.label} masih tertinggal. Store membutuhkan rata-rata ${Math.round(needPerDay/1_000_000)} juta per hari untuk mencapai target bulan ini.`;else if(remaining<=0)insight=`Target sales bulan ini sudah tercapai. Fokus berikutnya menjaga performa ${weakest.label} agar pencapaian tetap seimbang.`;else insight=`${strong.label} menjadi pencapaian terkuat, sementara ${weakest.label} masih menjadi area utama untuk ditingkatkan.`}
  return NextResponse.json({period,store:"M238 PIM 2",target,actual,achievement:target.amount?actual.amount/target.amount*100:0,remaining,remainingDays,needPerDay,daily,today:{label:isCurrent?"Today":"Last Recorded",date:selectedDay?.date||"",sales:selectedDay?.actual||0,target:selectedDay?.target||0,achievement:selectedDay?.target?(selectedDay.actual/selectedDay.target)*100:0},projected,projectedAchievement,kpi:{lfl,mtm,cvr,upt,atv},progress,lob:lobRows,insight,classificationSource:"m238-sales-sanitize",meta:{traffic,transactions,qty:totalQty,cutoff,lastYearSales:amount(lyRows),previousMonthSales:amount(prevRows),currentWeek,previousWeek}},{headers:{"cache-control":"no-store"}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca pencapaian store"},{status:500})}
}
