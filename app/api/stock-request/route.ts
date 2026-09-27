import {NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const DASHBOARD_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const STORE="M238";

const s=(v:unknown)=>String(v??"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim();
const n=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/[^0-9.-]/g,""))||0;
const up=(v:unknown)=>s(v).toUpperCase();
function iso(v:unknown){
 if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);
 const x=s(v);
 if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);
 const m=x.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
 return m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:"";
}
function displayDate(v:string){if(!v)return"-";const[y,m,d]=v.split("-");return`${d}-${m}-${y}`}
function isVoucher(r:unknown[]){return /\bVOUCHER\b|E-?VOUCHER|GIFT\s*CARD/i.test([r[4],r[5],r[6],r[9],r[10],r[11],r[12],r[13]].map(s).join(" "))}

const ignoredTokens=new Set(["IPHONE","IPAD","APPLE","WATCH","MACBOOK","AIRPODS","AIR","PRO","MAX","SE","ULTRA","GB","TB","WIFI","CELLULAR","THE","AND","WITH","FOR"]);
function tokens(v:string){return up(v).replace(/[^A-Z0-9]+/g," ").split(/\s+/).filter(x=>x.length>=2&&!ignoredTokens.has(x))}

type Priority="Critical"|"High"|"Medium";
type StockItem={lob:string;article:string;description:string;soh:number;soldQty:number;lostCount:number;requestQty:number;priority:Priority;reason:string};
const rank:Record<Priority,number>={Critical:0,High:1,Medium:2};

function bestMatch(text:string,items:StockItem[]){
 const source=new Set(tokens(text));
 let best:StockItem|null=null;
 let bestScore=0;
 for(const item of items){
  let score=0;
  for(const token of tokens(`${item.article} ${item.description}`))if(source.has(token))score+=/\d/.test(token)?2:1;
  if(score>bestScore){best=item;bestScore=score}
 }
 return bestScore>=2?best:null;
}
function requestQty(soh:number,sold:number,lost:number){
 let result=Math.max(0,Math.ceil(sold*1.5+lost-soh));
 if(soh<=0&&(sold>0||lost>0))result=Math.max(result,2);
 if(soh<=1&&sold>=2)result=Math.max(result,sold);
 return result;
}
function priority(soh:number,sold:number,lost:number):Priority{
 if((soh<=0&&(sold>0||lost>0))||lost>=2)return"Critical";
 if(soh<=1&&(sold>=2||lost>0))return"High";
 return"Medium";
}

export async function GET(){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
 const key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const dashboardPromise=getSheetRanges(DASHBOARD_ID,[
   "'SOH'!D6:D6",
   "'RAW StockPosition'!F1:N40",
   "'SOH'!C10:E200",
   "'SOH'!J10:L200",
   "'SOH'!Q10:S200",
   "'SOH'!X10:Z200",
   "'SOH'!AE10:AG200",
   "'Data Copas'!A2:S50000"
  ],email,key);
  const feedbackPromise=getSheetRanges(MASTER_ID,["'Dashboard Feedback'!A2:G5000"],email,key).catch(()=>[[]] as unknown[][][]);
  const [dashboard,feedbackData]=await Promise.all([dashboardPromise,feedbackPromise]);
  const dateRange=dashboard[0]||[];
  const rawStockHead=dashboard[1]||[];
  const stockRanges=dashboard.slice(2,7);
  const salesRows=dashboard[7]||[];
  const feedbackRows=feedbackData[0]||[];

  const lobNames=["iPhone","iPad","MacBook","Apple Watch","AirPods"];
  const items:StockItem[]=[];
  stockRanges.forEach((rows,index)=>{
   for(const row of rows){
    const article=s(row[0]),description=s(row[1]),soh=n(row[2]);
    if(!article||/^ARTICLE$|GRAND TOTAL/i.test(article))continue;
    if(/DEMO|\-D(?:\b|$)/i.test(`${article} ${description}`))continue;
    items.push({lob:lobNames[index]||"Other",article,description,soh,soldQty:0,lostCount:0,requestQty:0,priority:"Medium",reason:""});
   }
  });

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
  for(const row of weekRows){
   const article=up(row[4]);
   if(article)salesByArticle.set(article,(salesByArticle.get(article)||0)+n(row[7]));
  }
  for(const item of items)item.soldQty=salesByArticle.get(up(item.article))||0;

  const stockFeedback=feedbackRows.filter(row=>{
   const date=iso(row[1]),text=s(row[5]);
   return Boolean(date&&from&&to&&date>=from&&date<=to&&/stok|stock|kosong|habis|tidak tersedia|warna tidak|kapasitas tidak/i.test(text));
  }).map(row=>s(row[5]));
  for(const text of stockFeedback){const match=bestMatch(text,items);if(match)match.lostCount+=1}

  for(const item of items){
   item.priority=priority(item.soh,item.soldQty,item.lostCount);
   item.requestQty=requestQty(item.soh,item.soldQty,item.lostCount);
   if(item.lostCount>0)item.reason=`${item.lostCount} lost/feedback terkait stock`;
   else if(item.soh<=0&&item.soldQty>0)item.reason="SOH 0 dengan sales week berjalan";
   else if(item.soh<=1&&item.soldQty>=2)item.reason="SOH kritis dibanding sell-out";
   else item.reason="Sales lebih cepat dibanding stock";
  }

  const recommendations=items.filter(item=>
   item.requestQty>0&&(
    (item.soh<=0&&item.soldQty>0)||
    item.lostCount>0||
    (item.soh<=1&&item.soldQty>=2)||
    (item.soldQty>=4&&item.soh<item.soldQty)
   )
  ).sort((a,b)=>rank[a.priority]-rank[b.priority]||b.lostCount-a.lostCount||b.soldQty-a.soldQty);
  const outOfStock=items.filter(item=>item.soh<=0).sort((a,b)=>b.soldQty-a.soldQty||b.lostCount-a.lostCount);

  const rawDates=rawStockHead.flat().map(iso).filter(Boolean).sort();
  const sheetDate=iso(dateRange[0]?.[0]);
  const sohUpdated=displayDate(rawDates.at(-1)||sheetDate);
  const weekSales=weekRows.reduce((sum,row)=>sum+n(row[7]),0);

  return NextResponse.json({
   week,
   period:{from,to},
   sohUpdated,
   summary:{recommendations:recommendations.length,outOfStock:outOfStock.length,weekSales,lostFeedback:stockFeedback.length},
   recommendations,
   outOfStock:outOfStock.slice(0,60),
   email:{subject:`Request Stock M238 Digimap PIM 2 - ${week}`,body:""}
  },{headers:{"cache-control":"private, max-age=60, stale-while-revalidate=180"}});
 }catch(e){
  return NextResponse.json({error:e instanceof Error?e.message:"Gagal compile stock request"},{status:500});
 }
}
