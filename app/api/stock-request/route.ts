import {NextResponse} from "next/server";
import {appendSheetValues,ensureSheet,getSheetRanges} from "@/lib/google-sheets";

const DASHBOARD_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const STORE="M238";
const HISTORY_SHEET="SOH History";

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
function isVoucher(r:unknown[]){return /\bVOUCHER\b|E-?VOUCHER|GIFT\s*CARD/i.test([r[4],r[5],r[6],r[9],r[10],r[11],r[12],r[13]].map(s).join(" "))}

const ignoredTokens=new Set(["IPHONE","IPAD","APPLE","WATCH","MACBOOK","AIRPODS","AIR","PRO","MAX","SE","ULTRA","GB","TB","WIFI","CELLULAR","THE","AND","WITH","FOR"]);
function tokens(v:string){return up(v).replace(/[^A-Z0-9]+/g," ").split(/\s+/).filter(x=>x.length>=2&&!ignoredTokens.has(x))}

type Priority="Critical"|"High"|"Medium";
type StockItem={
 lob:string;article:string;description:string;soh:number;soldQty:number;lostCount:number;
 requestQty:number;priority:Priority;reason:string;historyDays:number;historyPeak:number;previousSoh:number|null;stockDrop:number;
};
const rank:Record<Priority,number>={Critical:0,High:1,Medium:2};

function bestMatch(text:string,items:StockItem[]){
 const source=new Set(tokens(text));
 let best:StockItem|null=null,bestScore=0;
 for(const item of items){
  let score=0;
  for(const token of tokens(`${item.article} ${item.description}`))if(source.has(token))score+=/\d/.test(token)?2:1;
  if(score>bestScore){best=item;bestScore=score}
 }
 return bestScore>=2?best:null;
}
function requestQty(item:StockItem){
 const restore=Math.max(0,item.historyPeak-item.soh);
 const velocity=Math.max(0,Math.ceil(item.soldQty*1.25+item.lostCount-item.soh));
 if(item.soh<=0)return Math.max(5,restore,velocity);
 if(item.lostCount>0||item.soh<=1||item.soldQty>=4)return Math.max(5,restore,velocity);
 return Math.max(0,restore,velocity);
}
function priority(item:StockItem):Priority{
 if(item.soh<=0||item.lostCount>=2)return"Critical";
 if(item.soh<=1||item.lostCount>0||item.stockDrop>=3)return"High";
 return"Medium";
}

export async function GET(){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
 const key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  await ensureSheet(DASHBOARD_ID,HISTORY_SHEET,["Date","Article","Description","LOB","SOH","Captured At"],email,key);
  const dashboardPromise=getSheetRanges(DASHBOARD_ID,[
   "'SOH'!D6:D6",
   "'RAW StockPosition'!F1:N40",
   "'SOH'!C10:E200",
   "'SOH'!J10:L200",
   "'SOH'!Q10:S200",
   "'SOH'!X10:Z200",
   "'SOH'!AE10:AG200",
   "'Data Copas'!A2:S50000",
   `'${HISTORY_SHEET}'!A2:F50000`
  ],email,key);
  const feedbackPromise=getSheetRanges(MASTER_ID,["'Dashboard Feedback'!A2:G5000"],email,key).catch(()=>[[]] as unknown[][][]);
  const [dashboard,feedbackData]=await Promise.all([dashboardPromise,feedbackPromise]);
  const dateRange=dashboard[0]||[];
  const rawStockHead=dashboard[1]||[];
  const stockRanges=dashboard.slice(2,7);
  const salesRows=dashboard[7]||[];
  const historyRows=dashboard[8]||[];
  const feedbackRows=feedbackData[0]||[];

  const lobNames=["iPhone","iPad","MacBook","Apple Watch","AirPods"];
  const items:StockItem[]=[];
  stockRanges.forEach((rows,index)=>{
   for(const row of rows){
    const article=s(row[0]),description=s(row[1]),soh=n(row[2]);
    if(!article||/^ARTICLE$|GRAND TOTAL/i.test(article))continue;
    if(/DEMO|\-D(?:\b|$)/i.test(`${article} ${description}`))continue;
    items.push({lob:lobNames[index]||"Other",article,description,soh,soldQty:0,lostCount:0,requestQty:0,priority:"Medium",reason:"",historyDays:0,historyPeak:soh,previousSoh:null,stockDrop:0});
   }
  });

  const rawDates=rawStockHead.flat().map(iso).filter(Boolean).sort();
  const snapshotDate=iso(dateRange[0]?.[0])||rawDates.at(-1)||new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const existingToday=new Set(historyRows.filter(r=>iso(r[0])===snapshotDate).map(r=>up(r[1])));
  const capturedAt=new Date().toISOString();
  const missingSnapshot=items.filter(x=>!existingToday.has(up(x.article))).map(x=>[snapshotDate,x.article,x.description,x.lob,x.soh,capturedAt]);
  if(missingSnapshot.length)await appendSheetValues(DASHBOARD_ID,`'${HISTORY_SHEET}'!A:F`,missingSnapshot,email,key,"RAW");

  const historyByArticle=new Map<string,Array<{date:string;soh:number}>>();
  for(const row of historyRows){
   const date=iso(row[0]),article=up(row[1]);
   if(!date||!article)continue;
   const rows=historyByArticle.get(article)||[];rows.push({date,soh:n(row[4])});historyByArticle.set(article,rows);
  }
  for(const item of items){
   const rows=(historyByArticle.get(up(item.article))||[]).sort((a,b)=>a.date.localeCompare(b.date));
   const prior=rows.filter(x=>x.date<snapshotDate);
   item.historyDays=new Set(rows.map(x=>x.date)).size+(existingToday.has(up(item.article))?0:1);
   item.historyPeak=Math.max(item.soh,...rows.map(x=>x.soh));
   item.previousSoh=prior.length?prior.at(-1)!.soh:null;
   item.stockDrop=item.previousSoh==null?0:Math.max(0,item.previousSoh-item.soh);
  }

  const validSales=salesRows.filter(row=>up(row[15])===STORE&&iso(row[0])&&!isVoucher(row));
  const latestDate=validSales.map(row=>iso(row[0])).sort().at(-1)||"";
  const latestRows=validSales.filter(row=>iso(row[0])===latestDate);
  const latestWeekRow=latestRows.find(row=>s(row[14]))||validSales.slice().reverse().find(row=>s(row[14]));
  const week=s(latestWeekRow?.[14])||"Week berjalan";
  const year=s(latestWeekRow?.[18])||latestDate.slice(0,4);
  const weekRows=validSales.filter(row=>s(row[14])===week&&(!year||s(row[18])===year));
  const weekDates=weekRows.map(row=>iso(row[0])).filter(Boolean).sort();
  const from=weekDates[0]||latestDate;
  const to=weekDates.at(-1)||latestDate;

  const salesByArticle=new Map<string,number>();
  for(const row of weekRows){const article=up(row[4]);if(article)salesByArticle.set(article,(salesByArticle.get(article)||0)+n(row[7]))}
  for(const item of items)item.soldQty=salesByArticle.get(up(item.article))||0;

  const stockFeedback=feedbackRows.filter(row=>{
   const date=iso(row[1]),text=s(row[5]);
   return Boolean(date&&from&&to&&date>=from&&date<=to&&/stok|stock|kosong|habis|tidak tersedia|warna tidak|kapasitas tidak/i.test(text));
  }).map(row=>s(row[5]));
  for(const text of stockFeedback){const match=bestMatch(text,items);if(match)match.lostCount+=1}

  for(const item of items){
   item.priority=priority(item);
   item.requestQty=requestQty(item);
   if(item.soh<=0)item.reason="SOH 0 - masuk request stock";
   else if(item.lostCount>0)item.reason=`${item.lostCount} lost/feedback terkait stock`;
   else if(item.stockDrop>=3)item.reason=`SOH turun ${item.stockDrop} unit dari snapshot sebelumnya`;
   else if(item.soh<=1&&item.soldQty>=2)item.reason="SOH kritis dibanding penjualan week berjalan";
   else item.reason="Penjualan week berjalan lebih cepat dibanding stock";
  }

  const recommendations=items.filter(item=>
   item.soh<=0||
   item.lostCount>0||
   (item.soh<=1&&item.soldQty>=2)||
   (item.soldQty>=4&&item.soh<item.soldQty)||
   (item.stockDrop>=3&&item.soh<=2)
  ).sort((a,b)=>rank[a.priority]-rank[b.priority]||b.lostCount-a.lostCount||b.soldQty-a.soldQty||a.soh-b.soh);
  const outOfStock=items.filter(item=>item.soh<=0).sort((a,b)=>b.soldQty-a.soldQty||b.lostCount-a.lostCount);
  const weekSales=weekRows.reduce((sum,row)=>sum+n(row[7]),0);

  return NextResponse.json({
   week,
   period:{from,to},
   sohUpdated:displayDate(snapshotDate),
   history:{snapshotDate,days:Math.max(1,...items.map(x=>x.historyDays))},
   summary:{recommendations:recommendations.length,outOfStock:outOfStock.length,weekSales,lostFeedback:stockFeedback.length},
   recommendations,
   outOfStock:outOfStock.slice(0,100),
   email:{subject:`Request Stock M238 Digimap PIM 2 - ${week}`,body:""}
  },{headers:{"cache-control":"private, max-age=30, stale-while-revalidate=60"}});
 }catch(e){
  return NextResponse.json({error:e instanceof Error?e.message:"Gagal compile stock request"},{status:500});
 }
}
