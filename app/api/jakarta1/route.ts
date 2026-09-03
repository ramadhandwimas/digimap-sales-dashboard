import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const SALES_2026="151Qfrz3RZnDMgZjKOPt5s_aS-zscSiOTCWodbUDWM1k";
const OPS="1BjLDXdi_5BgZCUUJAKba-xYRFf0RDmRTT0FW1be03WE";
const STORE_CODES=["M117","M118","M124","M127","M217","M227","M238","M255","M264"] as const;
const STORE_NAMES:Record<string,string>={
 M117:"DIGIMAP PLAZA SENAYAN",M118:"Digimap Pondok Indah Mall 3",M124:"DIGIMAP PACIFICPLACE",M127:"DIGIMAP APP Lotte Avenue",M217:"DIGIMAP BLOK - M PLAZA",M227:"Digimap Aeon Tanjung Barat",M238:"Digimap AAR Pondok Indah Mall 2",M255:"Digimap Antasari Place",M264:"Digimap Plaza Semanggi"
};
const MONTHS=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
type Row=unknown[];
let cache=new Map<string,{at:number,data:unknown}>();
const CACHE_MS=5*60*1000;

function n(v:unknown){if(typeof v==="number")return Number.isFinite(v)?v:0;const s=String(v??"").trim();if(!s)return 0;const cleaned=s.replace(/\s/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(",",".").replace(/[^0-9.-]/g,"");const x=Number(cleaned);return Number.isFinite(x)?x:0}
function dateKey(v:unknown){if(typeof v==="number"&&v>20000){const d=new Date(Date.UTC(1899,11,30)+v*86400000);return d.toISOString().slice(0,10)}const s=String(v??"").trim();let m=s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);if(m)return `${m[3]}-${m[2]}-${m[1]}`;m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:""}
function emptyStore(code:string){return{code,name:STORE_NAMES[code],target:{amount:0,device:0,acc:0,vas:0},achievement:0,device:0,acc:0,vas:0,qty:0,transactions:0,upt:0,atv:0,nps:null as number|null,point:0,focus:{iphone:0,macbook:0,ipad:0,watch:0,airpods:0}}}
function parseTargets(rows:Row[],monthName:string){const out:Record<string,{amount:number;device:number;acc:number;vas:number}>={};let active=false;for(const row of rows){const first=String(row[0]??"").trim();if(MONTHS.some(m=>m.toLowerCase()===first.toLowerCase())){active=first.toLowerCase()===monthName.toLowerCase();continue}if(!active)continue;if(String(row[1]??"").trim().toLowerCase()==="total")break;if(STORE_CODES.includes(first as any))out[first]={amount:n(row[3]),device:n(row[4]),acc:n(row[5]),vas:n(row[6])}}return out}
function parseNps(rows:Row[],monthIdx:number){const out:Record<string,number|null>={};for(const row of rows.slice(2)){const label=String(row[0]??"");const code=STORE_CODES.find(c=>label.includes(c));if(code){const v=row[monthIdx+1];out[code]=v===undefined||v===null||v===""?null:n(v)}}return out}
function parseStaffMaster(rows:Row[]){const out:Record<string,{id:string;name:string;store:string;position:string;share:number}>={};for(const row of rows.slice(1)){const store=String(row[0]??"").trim();if(!STORE_CODES.includes(store as any))continue;const id=String(row[1]??"").replace(/\.0$/,"").trim(),name=String(row[2]??"").trim(),position=String(row[3]??"").trim(),share=n(row[4]);if(name){const key=id||`${store}|${name.toUpperCase()}`;out[key]={id:key,name,store,position,share}}}return out}
function accessoryIncentive(amount:number){if(amount<=599000)return 5000;if(amount<=2000000)return 10000;if(amount<=4000000)return 20000;if(amount<=6000000)return 40000;return 80000}
function qoalaIncentive(amount:number){return amount<1315000?15000:50000}
function deviceIncentive(cat:string){if(cat.includes("MAC"))return 30000;if(cat.includes("IPHONE"))return 15000;if(cat.includes("IPAD"))return 10000;if(cat.includes("WATCH"))return 10000;return 0}

export async function GET(req:NextRequest){
 const period=req.nextUrl.searchParams.get("period")||"2026-09";
 if(!/^2026-(0[1-9]|1[0-2])$/.test(period))return NextResponse.json({error:"Periode tidak valid"},{status:400});
 const force=req.nextUrl.searchParams.has("refresh")||req.nextUrl.searchParams.has("t");const cached=cache.get(period);if(!force&&cached&&Date.now()-cached.at<CACHE_MS)return NextResponse.json(cached.data,{headers:{"x-jakarta1-cache":"HIT"}});
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const salesRanges=STORE_CODES.map(c=>`'${c}'!A:O`);
  const [salesRangesData,ops]=await Promise.all([
   getSheetRanges(SALES_2026,salesRanges,email,key),
   getSheetRanges(OPS,["'Master Data'!Y1:AE160","'Master Data'!S1:X130","'Data Nps'!A:M"],email,key)
  ]);
  const monthIdx=Number(period.slice(5,7))-1,monthName=MONTHS[monthIdx],targets=parseTargets(ops[0]??[],monthName),staffMaster=parseStaffMaster(ops[1]??[]),nps=parseNps(ops[2]??[],monthIdx);
  const stores=Object.fromEntries(STORE_CODES.map(c=>[c,emptyStore(c)])) as Record<string,ReturnType<typeof emptyStore>>;
  const storeTx:Record<string,Set<string>>=Object.fromEntries(STORE_CODES.map(c=>[c,new Set<string>()]));
  const daily:Record<string,Record<string,{date:string;store:string;target:number;achievement:number;acc:number;vas:number;qty:number;transactions:Set<string>;iphone:number;macbook:number;ipad:number;watch:number;airpods:number;qoala:number;telkomsel:number;xl:number;indosat:number}>>={};
  const staffAgg:Record<string,{id:string;name:string;store:string;position:string;share:number;amount:number;qty:number;tx:Set<string>;iphone:number;macbook:number;ipad:number;watch:number;qoala:number;incentive:{iphone:number;macbook:number;ipad:number;watch:number;accessories:number;qoala:number}}>={};
  const daysInMonth=new Date(2026,monthIdx+1,0).getDate();
  for(let si=0;si<STORE_CODES.length;si++){
   const code=STORE_CODES[si],rows=(salesRangesData[si]??[]) as Row[],store=stores[code];store.target=targets[code]??store.target;store.nps=nps[code]??null;
   for(const row of rows.slice(1)){
    const d=dateKey(row[1]);if(!d.startsWith(period))continue;
    const staffId=String(row[4]??"").replace(/\.0$/,"").trim(),staffName=String(row[5]??"").trim(),cat=String(row[6]??"").toUpperCase(),group=String(row[8]??"").toUpperCase(),desc=String(row[10]??"").toUpperCase(),qty=n(row[11]),amount=n(row[13]),txn=String(row[14]??"").trim();
    store.achievement+=amount;store.qty+=qty;if(txn)storeTx[code].add(`${code}|${txn}`);if(group==="DEVICES")store.device+=amount;else if(group==="ACCESSORIES")store.acc+=amount;else if(group==="VAS")store.vas+=amount;
    if(cat.includes("IPHONE"))store.focus.iphone+=qty;else if(cat==="MAC"||cat.includes("MACBOOK"))store.focus.macbook+=qty;else if(cat.includes("IPAD"))store.focus.ipad+=qty;else if(cat.includes("WATCH"))store.focus.watch+=qty;else if(cat.includes("AIRPODS"))store.focus.airpods+=qty;
    daily[d]=daily[d]??{};const dr=daily[d][code]??{date:d,store:code,target:(store.target.amount||0)/daysInMonth,achievement:0,acc:0,vas:0,qty:0,transactions:new Set<string>(),iphone:0,macbook:0,ipad:0,watch:0,airpods:0,qoala:0,telkomsel:0,xl:0,indosat:0};daily[d][code]=dr;dr.achievement+=amount;dr.qty+=qty;if(txn)dr.transactions.add(`${code}|${txn}`);if(group==="ACCESSORIES")dr.acc+=amount;if(group==="VAS")dr.vas+=amount;if(cat.includes("IPHONE"))dr.iphone+=qty;else if(cat==="MAC"||cat.includes("MACBOOK"))dr.macbook+=qty;else if(cat.includes("IPAD"))dr.ipad+=qty;else if(cat.includes("WATCH"))dr.watch+=qty;else if(cat.includes("AIRPODS"))dr.airpods+=qty;if(cat.includes("PROTEKSI")||desc.includes("QOALA"))dr.qoala+=amount;if(desc.includes("TELKOMSEL")||desc.includes("HALO"))dr.telkomsel+=amount;if(desc.includes("XL")||desc.includes("MYPRIO"))dr.xl+=amount;if(desc.includes("INDOSAT")||desc.includes("IM3"))dr.indosat+=amount;
    const master=staffMaster[staffId]||Object.values(staffMaster).find(s=>s.store===code&&s.name.trim().toUpperCase()===staffName.toUpperCase());if(master){const sk=master.id;const sa=staffAgg[sk]??{...master,amount:0,qty:0,tx:new Set<string>(),iphone:0,macbook:0,ipad:0,watch:0,qoala:0,incentive:{iphone:0,macbook:0,ipad:0,watch:0,accessories:0,qoala:0}};staffAgg[sk]=sa;sa.amount+=amount;sa.qty+=qty;if(txn)sa.tx.add(`${code}|${txn}`);if(cat.includes("IPHONE")){sa.iphone+=qty;sa.incentive.iphone+=Math.max(0,qty)*15000}else if(cat==="MAC"||cat.includes("MACBOOK")){sa.macbook+=qty;sa.incentive.macbook+=Math.max(0,qty)*30000}else if(cat.includes("IPAD")){sa.ipad+=qty;sa.incentive.ipad+=Math.max(0,qty)*10000}else if(cat.includes("WATCH")){sa.watch+=qty;sa.incentive.watch+=Math.max(0,qty)*10000}if(group==="ACCESSORIES"&&qty>0)sa.incentive.accessories+=accessoryIncentive(amount)*qty;if(cat.includes("PROTEKSI")&&qty>0){sa.qoala+=amount;sa.incentive.qoala+=qoalaIncentive(amount)*qty}}
   }
  }
  STORE_CODES.forEach(code=>{const s=stores[code];s.transactions=storeTx[code].size;s.upt=s.transactions?s.qty/s.transactions:0;s.atv=s.transactions?s.achievement/s.transactions:0;s.point=s.target.amount?s.achievement/s.target.amount*100:0});
  const storeList=STORE_CODES.map(c=>stores[c]);const areaTarget=storeList.reduce((a,s)=>({amount:a.amount+s.target.amount,device:a.device+s.target.device,acc:a.acc+s.target.acc,vas:a.vas+s.target.vas}),{amount:0,device:0,acc:0,vas:0}),area=storeList.reduce((a,s)=>({achievement:a.achievement+s.achievement,device:a.device+s.device,acc:a.acc+s.acc,vas:a.vas+s.vas,qty:a.qty+s.qty,transactions:a.transactions+s.transactions}),{achievement:0,device:0,acc:0,vas:0,qty:0,transactions:0});const validNps=storeList.map(s=>s.nps).filter((v):v is number=>typeof v==="number");
  const dailyRows=Object.values(daily).flatMap(x=>Object.values(x)).map(r=>({date:r.date,store:r.store,target:r.target,achievement:r.achievement,acc:r.acc,vas:r.vas,upt:r.transactions.size?r.qty/r.transactions.size:0,iphone:r.iphone,macbook:r.macbook,ipad:r.ipad,watch:r.watch,airpods:r.airpods,qoala:r.qoala,telkomsel:r.telkomsel,xl:r.xl,indosat:r.indosat})).sort((a,b)=>a.date.localeCompare(b.date)||a.store.localeCompare(b.store));
  const staff=Object.values(staffAgg).map(s=>{const target=(targets[s.store]?.amount??0)*s.share,upt=s.tx.size?s.qty/s.tx.size:0,point=target?s.amount/target*100:0,totalIncentive=Object.values(s.incentive).reduce((a,b)=>a+b,0);return{id:s.id,name:s.name,store:s.store,position:s.position,target,achievement:s.amount,iphone:s.iphone,macbook:s.macbook,ipad:s.ipad,watch:s.watch,qoala:s.qoala,upt,point,status:point>=100?"Achieved":point>=80?"On Track":"Need Push",incentive:{...s.incentive,total:totalIncentive}}}).sort((a,b)=>b.achievement-a.achievement);
  const now=new Date(),currentPeriod=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit"}).format(now),todayDay=Number(new Intl.DateTimeFormat("en",{timeZone:"Asia/Jakarta",day:"2-digit"}).format(now)),elapsed=period<currentPeriod?daysInMonth:period===currentPeriod?todayDay:0;
  const reason=storeList.map(s=>{const targetToDate=s.target.amount*(elapsed/daysInMonth),pct=targetToDate?s.achievement/targetToDate*100:0;return{store:s.code,name:s.name,target:targetToDate,achievement:s.achievement,pct,status:pct>=100?"On Track":"Need Feedback"}});
  const result={period,monthName,stores:storeList,area:{target:areaTarget,...area,achievementPct:areaTarget.amount?area.achievement/areaTarget.amount*100:0,upt:area.transactions?area.qty/area.transactions:0,atv:area.transactions?area.achievement/area.transactions:0,nps:validNps.length?validNps.reduce((a,b)=>a+b,0)/validNps.length:null},daily:dailyRows,staff,reason,meta:{storeCodes:STORE_CODES,storeNames:STORE_NAMES,targetSource:"Master Data Y:AE",staffSource:"Master Data S:X",incentiveSource:"Master Data S105 onward",salesSource:"Data Compile 2026 per Store Code"}};
  cache.set(period,{at:Date.now(),data:result});return NextResponse.json(result,{headers:{"cache-control":"public, max-age=60, stale-while-revalidate=240","x-jakarta1-cache":"MISS"}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca data Jakarta 1"},{status:500})}
}
