import {NextRequest,NextResponse} from "next/server";
import {appendSheetValues,ensureSheet,getSheetRanges} from "@/lib/google-sheets";

const DASHBOARD_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const STORE="M238";
const HISTORY_SHEET="SOH History";
const HISTORY_HEADERS=["Date","Article","Description","LOB","SOH","Captured At"];

const s=(v:unknown)=>String(v??"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim();
const n=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/[^0-9.-]/g,""))||0;
const up=(v:unknown)=>s(v).toUpperCase();
function iso(v:unknown){
 if(typeof v==="number"){
  if(v<30000||v>70000)return"";
  return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);
 }
 const x=s(v);
 let m=x.match(/\b(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/);
 if(m)return`${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
 m=x.match(/\b(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})\b/);
 return m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:"";
}
function displayDate(v:string){if(!v)return"-";const[y,m,d]=v.split("-");return`${d}-${m}-${y}`}
function dayDiff(a:string,b:string){return Math.max(0,Math.round((Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/86400000))}
function minusDays(date:string,days:number){const d=new Date(date+"T00:00:00Z");d.setUTCDate(d.getUTCDate()-days);return d.toISOString().slice(0,10)}
function isVoucher(article:string,description:string){return /\bVOUCHER\b|E-?VOUCHER|GIFT\s*CARD/i.test(`${article} ${description}`)}
function inferLob(article:string,description:string){
 const text=up(`${article} ${description}`);
 if(/AIR\s*PODS?/.test(text))return"AirPods";
 if(/MACBOOK|\bMBA\b|\bMBP\b|MAC\s*NEO|\bNEO\b/.test(text))return"MacBook";
 if(/\bIPAD\b/.test(text))return"iPad";
 if(/APPLE\s*WATCH|\bWATCH\b|\bAW\s*(?:SE|S\d|ULTRA)/.test(text))return"Apple Watch";
 if(/\bIPHONE\b/.test(text))return"iPhone";
 return"";
}

const ignoredTokens=new Set(["IPHONE","IPAD","APPLE","WATCH","MACBOOK","AIRPODS","AIR","PRO","MAX","SE","ULTRA","GB","TB","WIFI","CELLULAR","THE","AND","WITH","FOR"]);
function tokens(v:string){return up(v).replace(/[^A-Z0-9]+/g," ").split(/\s+/).filter(x=>x.length>=2&&!ignoredTokens.has(x))}

type Priority="Critical"|"High"|"Medium";
type StockItem={
 lob:string;article:string;description:string;soh:number;soldQty:number;recentSoldQty:number;lostCount:number;
 requestQty:number;priority:Priority;reason:string;historyDays:number;historyPeak:number;previousSoh:number|null;stockDrop:number;inferredZero:boolean;
};
const rank:Record<Priority,number>={Critical:0,High:1,Medium:2};
function bestMatch(text:string,items:StockItem[]){
 const source=new Set(tokens(text));let best:StockItem|null=null,bestScore=0;
 for(const item of items){let score=0;for(const token of tokens(`${item.article} ${item.description}`))if(source.has(token))score+=/\d/.test(token)?2:1;if(score>bestScore){best=item;bestScore=score}}
 return bestScore>=2?best:null;
}
function weeklyRunRate(item:StockItem,recentDays:number){const recentWeeks=Math.max(1,recentDays/7);return Math.max(item.soldQty,Math.ceil(item.recentSoldQty/recentWeeks))}
function requestQty(item:StockItem,recentDays:number){
 const runRate=weeklyRunRate(item,recentDays);
 const target=Math.max(5,Math.ceil(runRate*1.5+item.lostCount*2));
 const restore=Math.max(0,item.historyPeak-item.soh);
 if(item.soh<=0)return Math.max(5,target,restore);
 return Math.max(0,Math.max(target,restore)-item.soh);
}
function priority(item:StockItem,recentDays:number):Priority{
 const runRate=weeklyRunRate(item,recentDays);
 if(item.soh<=0||item.lostCount>=2)return"Critical";
 if(item.soh<=1||item.lostCount>0||item.stockDrop>=3||runRate>item.soh)return"High";
 return"Medium";
}

type SalesRec={date:string;article:string;description:string;qty:number;week:string;store:string;year:string};
function stitchSales(parts:unknown[][][]){
 const [dates,articleDesc,qtys,weekStore,years]=parts;const len=Math.max(dates.length,articleDesc.length,qtys.length,weekStore.length,years.length);const out:SalesRec[]=[];
 for(let i=0;i<len;i++){
  const date=iso(dates[i]?.[0]),article=s(articleDesc[i]?.[0]),description=s(articleDesc[i]?.[1]),qty=n(qtys[i]?.[0]),week=s(weekStore[i]?.[0]),store=up(weekStore[i]?.[1]),year=s(years[i]?.[0]);
  if(date&&article&&store===STORE&&!isVoucher(article,description))out.push({date,article,description,qty,week,store,year});
 }
 return out;
}

export async function GET(){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  // Read only the Data Copas columns this compiler needs. This cuts the sales payload
  // from A:S (19 columns) to 7 columns and keeps history/feedback reads concurrent.
  const dashboardPromise=getSheetRanges(DASHBOARD_ID,[
   "'SOH'!D6:D6",
   "'SOH'!C10:E200","'SOH'!J10:L200","'SOH'!Q10:S200","'SOH'!X10:Z200","'SOH'!AE10:AG200",
   "'Data Copas'!A2:A50000","'Data Copas'!E2:F50000","'Data Copas'!H2:H50000","'Data Copas'!O2:P50000","'Data Copas'!S2:S50000"
  ],email,key);
  const historyPromise=getSheetRanges(DASHBOARD_ID,[`'${HISTORY_SHEET}'!A2:F10000`],email,key).then(x=>x[0]||[]).catch(()=>[] as unknown[][]);
  const feedbackPromise=getSheetRanges(MASTER_ID,["'Dashboard Feedback'!B2:B5000","'Dashboard Feedback'!F2:F5000"],email,key).catch(()=>[[],[]] as unknown[][][]);
  const [dashboard,historyRows,feedbackParts]=await Promise.all([dashboardPromise,historyPromise,feedbackPromise]);

  const dateRange=dashboard[0]||[];
  const stockRanges=dashboard.slice(1,6);
  const salesParts=dashboard.slice(6,11);
  const sales=stitchSales(salesParts);
  const latestDate=sales.map(x=>x.date).sort().at(-1)||"";
  const snapshotDate=iso(dateRange[0]?.[0])||latestDate||new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const latestSales=sales.filter(x=>x.date===latestDate);
  const latestWeek=latestSales.find(x=>x.week)?.week||sales.slice().reverse().find(x=>x.week)?.week||"Week berjalan";
  const latestYear=latestSales.find(x=>x.year)?.year||latestDate.slice(0,4);
  const weekRows=sales.filter(x=>x.week===latestWeek&&(!latestYear||x.year===latestYear));
  const weekDates=weekRows.map(x=>x.date).sort(),from=weekDates[0]||latestDate,to=weekDates.at(-1)||latestDate;
  const recentStart=latestDate?minusDays(latestDate,55):"";
  const recentRows=sales.filter(x=>!recentStart||x.date>=recentStart);
  const recentDays=latestDate&&recentStart?Math.max(7,dayDiff(recentStart,latestDate)+1):56;

  const lobNames=["iPhone","iPad","MacBook","Apple Watch","AirPods"];
  const items:StockItem[]=[];const byArticle=new Map<string,StockItem>();
  stockRanges.forEach((rows,index)=>{
   for(const row of rows){
    const article=s(row[0]),description=s(row[1]),soh=n(row[2]);
    if(!article||/^ARTICLE$|GRAND TOTAL/i.test(article)||/DEMO|\-D(?:\b|$)/i.test(`${article} ${description}`))continue;
    const item:StockItem={lob:lobNames[index]||inferLob(article,description)||"Other",article,description,soh,soldQty:0,recentSoldQty:0,lostCount:0,requestQty:0,priority:"Medium",reason:"",historyDays:0,historyPeak:soh,previousSoh:null,stockDrop:0,inferredZero:false};
    items.push(item);byArticle.set(up(article),item);
   }
  });

  // Data Copas is also a product catalog. If an article sold recently but is absent
  // from today's SOH list, treat it as an inferred SOH 0 candidate. This covers cases
  // such as MacBook Neo Blush disappearing entirely from the SOH output when empty.
  for(const row of recentRows){
   const keyArticle=up(row.article);if(byArticle.has(keyArticle))continue;
   const lob=inferLob(row.article,row.description);if(!lob||/DEMO|\-D(?:\b|$)/i.test(`${row.article} ${row.description}`))continue;
   const item:StockItem={lob,article:row.article,description:row.description,soh:0,soldQty:0,recentSoldQty:0,lostCount:0,requestQty:0,priority:"Critical",reason:"",historyDays:0,historyPeak:0,previousSoh:null,stockDrop:0,inferredZero:true};
   items.push(item);byArticle.set(keyArticle,item);
  }
  // History provides a second safety net for articles that were stocked recently but
  // have no recent sale after going empty.
  for(const row of historyRows){
   const date=iso(row[0]),article=s(row[1]),description=s(row[2]),lob=s(row[3]);
   if(!article||!date||byArticle.has(up(article))||(latestDate&&date<minusDays(latestDate,55)))continue;
   const knownLob=lob||inferLob(article,description);if(!knownLob)continue;
   const item:StockItem={lob:knownLob,article,description,soh:0,soldQty:0,recentSoldQty:0,lostCount:0,requestQty:0,priority:"Critical",reason:"",historyDays:0,historyPeak:0,previousSoh:null,stockDrop:0,inferredZero:true};
   items.push(item);byArticle.set(up(article),item);
  }

  for(const row of weekRows){const item=byArticle.get(up(row.article));if(item)item.soldQty+=row.qty}
  for(const row of recentRows){const item=byArticle.get(up(row.article));if(item)item.recentSoldQty+=row.qty}

  const historyByArticle=new Map<string,Array<{date:string;soh:number}>>();
  for(const row of historyRows){const date=iso(row[0]),article=up(row[1]);if(!date||!article)continue;const rows=historyByArticle.get(article)||[];rows.push({date,soh:n(row[4])});historyByArticle.set(article,rows)}
  for(const item of items){
   const rows=(historyByArticle.get(up(item.article))||[]).sort((a,b)=>a.date.localeCompare(b.date));const prior=rows.filter(x=>x.date<snapshotDate);
   item.historyDays=new Set(rows.map(x=>x.date)).size;item.historyPeak=Math.max(item.soh,...rows.map(x=>x.soh));item.previousSoh=prior.length?prior.at(-1)!.soh:null;item.stockDrop=item.previousSoh==null?0:Math.max(0,item.previousSoh-item.soh);
  }

  const feedbackDates=feedbackParts[0]||[],feedbackTexts=feedbackParts[1]||[];const stockFeedback:string[]=[];
  for(let i=0;i<Math.max(feedbackDates.length,feedbackTexts.length);i++){
   const date=iso(feedbackDates[i]?.[0]),text=s(feedbackTexts[i]?.[0]);
   if(date&&text&&from&&to&&date>=from&&date<=to&&/stok|stock|kosong|habis|tidak tersedia|warna tidak|kapasitas tidak/i.test(text))stockFeedback.push(text);
  }
  for(const text of stockFeedback){const match=bestMatch(text,items);if(match)match.lostCount+=1}

  for(const item of items){
   item.priority=priority(item,recentDays);item.requestQty=requestQty(item,recentDays);
   if(item.inferredZero)item.reason="Tidak muncul di SOH, terdeteksi dari histori penjualan/stock";
   else if(item.soh<=0)item.reason="SOH 0 - masuk request stock";
   else if(item.lostCount>0)item.reason=`${item.lostCount} lost/feedback terkait stock`;
   else if(item.stockDrop>=3)item.reason=`SOH turun ${item.stockDrop} unit dari snapshot sebelumnya`;
   else item.reason="Stock tipis dibanding penjualan";
  }

  const recommendations=items.filter(item=>item.soh<=0||item.lostCount>0||(item.soh<=1&&(item.soldQty>0||item.recentSoldQty>0))||(weeklyRunRate(item,recentDays)>item.soh&&item.soh<=3)||(item.stockDrop>=3&&item.soh<=2)).sort((a,b)=>rank[a.priority]-rank[b.priority]||b.lostCount-a.lostCount||b.soldQty-a.soldQty||b.recentSoldQty-a.recentSoldQty||a.soh-b.soh);
  const outOfStock=items.filter(item=>item.soh<=0).sort((a,b)=>Number(b.inferredZero)-Number(a.inferredZero)||b.soldQty-a.soldQty||b.recentSoldQty-a.recentSoldQty);
  const weekSales=weekRows.reduce((sum,row)=>sum+row.qty,0);

  return NextResponse.json({
   week:latestWeek,period:{from,to},sohUpdated:displayDate(snapshotDate),history:{snapshotDate,days:Math.max(1,...items.map(x=>x.historyDays))},
   summary:{recommendations:recommendations.length,outOfStock:outOfStock.length,weekSales,lostFeedback:stockFeedback.length},recommendations,outOfStock:outOfStock.slice(0,150),
   snapshot:items.slice(0,500).map(x=>({article:x.article,description:x.description,lob:x.lob,soh:x.soh})),
   email:{subject:`Request Stock M238 Digimap PIM 2 - ${latestWeek}`,body:""}
  },{headers:{"cache-control":"private, max-age=60, stale-while-revalidate=180","x-m238-stock-source":"soh+data-copas+feedback+history"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal compile stock request"},{status:500})}
}

export async function POST(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const body=await req.json() as{date?:string;items?:Array<{article?:string;description?:string;lob?:string;soh?:number}>};
  const date=iso(body.date)||new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const items=(body.items||[]).slice(0,500).filter(x=>s(x.article));
  if(!items.length)return NextResponse.json({ok:true,added:0});
  await ensureSheet(DASHBOARD_ID,HISTORY_SHEET,HISTORY_HEADERS,email,key);
  const [history]=await getSheetRanges(DASHBOARD_ID,[`'${HISTORY_SHEET}'!A2:B10000`],email,key);
  const existing=new Set((history||[]).filter(r=>iso(r[0])===date).map(r=>up(r[1])));
  const capturedAt=new Date().toISOString();
  const rows=items.filter(x=>!existing.has(up(x.article))).map(x=>[date,s(x.article),s(x.description),s(x.lob),n(x.soh),capturedAt]);
  if(rows.length)await appendSheetValues(DASHBOARD_ID,`'${HISTORY_SHEET}'!A:F`,rows,email,key,"RAW");
  return NextResponse.json({ok:true,added:rows.length});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal menyimpan snapshot SOH"},{status:500})}
}
