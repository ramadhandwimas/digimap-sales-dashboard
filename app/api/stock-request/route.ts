import {NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const DASHBOARD_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const STORE="M238";
const s=(v:unknown)=>String(v??"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim();
const n=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/[^0-9.-]/g,""))||0;
const up=(v:unknown)=>s(v).toUpperCase();
function iso(v:unknown){if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);const x=s(v);if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);const m=x.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:""}
function displayDate(v:string){if(!v)return"-";const[y,m,d]=v.split("-");return`${d}-${m}-${y}`}
const stop=new Set(["IPHONE","IPAD","APPLE","WATCH","MACBOOK","AIRPODS","AIR","PRO","MAX","SE","ULTRA","GB","TB","THE","AND","WITH","FOR","CASE","CLEAR","MAGSAFE","WIFI","CELLULAR"]);
function tokens(v:string){return up(v).replace(/[^A-Z0-9]+/g," ").split(/\s+/).filter(x=>x.length>=2&&!stop.has(x))}
function isVoucher(r:unknown[]){return /\bVOUCHER\b|E-?VOUCHER|GIFT\s*CARD/i.test([r[4],r[5],r[6],r[9],r[10],r[11],r[12],r[13]].map(s).join(" "))}

type Priority="Critical"|"High"|"Medium";
type StockItem={lob:string;article:string;description:string;soh:number;soldQty:number;lostCount:number;requestQty:number;priority:Priority;reason:string};
const priorityRank:Record<Priority,number>={Critical:0,High:1,Medium:2};
function bestMatch(raw:string,items:StockItem[]){const rt=new Set(tokens(raw));let best:{item:StockItem;score:number}|null=null;for(const item of items){const its=tokens(`${item.article} ${item.description}`);let score=0;for(const t of its)if(rt.has(t))score+=/\d/.test(t)?2:1;if(score>(best?.score||0))best={item,score}}return best&&best.score>=2?best.item:null}
function priorityOf(soh:number,sold:number,lost:number):Priority{if((soh<=0&&(sold>0||lost>0))||lost>=2)return"Critical";if(soh<=1&&(sold>=2||lost>0))return"High";return"Medium"}
function requestOf(soh:number,sold:number,lost:number){let qty=Math.max(0,Math.ceil(sold*1.5+lost-soh));if(soh<=0&&(sold>0||lost>0))qty=Math.max(qty,2);if(soh<=1&&sold>=2)qty=Math.max(qty,sold);return qty}
function subjectFor(week:string){return`Request Stock M238 Digimap PIM 2 - ${week}`}
function bodyFor(week:string,from:string,to:string,updated:string,items:StockItem[],oos:number){const lost=items.reduce((a,x)=>a+x.lostCount,0),sold=items.reduce((a,x)=>a+x.soldQty,0);const grouped=new Map<string,StockItem[]>();for(const x of items){if(!grouped.has(x.lob))grouped.set(x.lob,[]);grouped.get(x.lob)!.push(x)}const lines:string[]=["Dear MD Team,","",`Mohon support stock untuk M238 Digimap PIM 2 berdasarkan evaluasi ${week} (${displayDate(from)} s.d. ${displayDate(to)}).`,`SOH update: ${updated||"-"}.`,`Ringkasan: ${items.length} item prioritas • ${oos} item SOH 0 • ${sold} unit sold pada item prioritas • ${lost} indikasi lost/feedback terkait stock.`,`","Detail request:"];for(const[lob,rows]of grouped){lines.push("",lob);for(const r of rows)lines.push(`- ${r.description||r.article} (${r.article}) | Sold ${r.soldQty} | SOH ${r.soh} | Lost ${r.lostCount} | Request ${r.requestQty} unit | ${r.priority}`)}lines.push("","Mohon dibantu untuk support replenishment item di atas agar opportunity penjualan tidak lost karena ketersediaan stock.","","Terima kasih.","Regards,","M238 Digimap PIM 2");return lines.join("\n")}

export async function GET(){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const [dashboard,master]=await Promise.all([
   getSheetRanges(DASHBOARD_ID,["'SOH'!D6:D6","'RAW StockPosition'!F1:N40","'SOH'!C10:E200","'SOH'!J10:L200","'SOH'!Q10:S200","'SOH'!X10:Z200","'SOH'!AE10:AG200","'Data Copas'!A2:S50000"],email,key),
   getSheetRanges(MASTER_ID,["'Dashboard Feedback'!A2:G5000"],email,key).catch(()=>[[]] as unknown[][][])
  ]);
  const [dateRange,rawHead,iphone,ipad,mac,watch,airpods,dataRows]=dashboard;
  const feedbackRows=master[0]||[];
  const groups:Array<[string,unknown[][]]>=[["iPhone",iphone||[]],["iPad",ipad||[]],["MacBook",mac||[]],["Apple Watch",watch||[]],["AirPods",airpods||[]]];
  const items:StockItem[]=[];
  for(const[lob,rows]of groups){for(const r of rows){const article=s(r[0]),description=s(r[1]),soh=n(r[2]);if(!article||/^ARTICLE$|GRAND TOTAL/i.test(article)||/DEMO|\-D(?:\b|$)/i.test(`${article} ${description}`))continue;items.push({lob,article,description,soh,soldQty:0,lostCount:0,requestQty:0,priority:"Medium",reason:""})}}

  const validRows=(dataRows||[]).filter(r=>up(r[15])===STORE&&!isVoucher(r)&&iso(r[0]));
  const latestDate=validRows.map(r=>iso(r[0])).sort().at(-1)||"";
  const latestRows=validRows.filter(r=>iso(r[0])===latestDate);
  const week=s(latestRows.find(r=>s(r[14]))?.[14])||s(validRows.slice().reverse().find(r=>s(r[14]))?.[14])||"Week berjalan";
  const year=s(latestRows.find(r=>s(r[18]))?.[18])||latestDate.slice(0,4);
  const weekRows=validRows.filter(r=>s(r[14])===week&&(!year||s(r[18])===year));
  const dates=weekRows.map(r=>iso(r[0])).filter(Boolean).sort(),from=dates[0]||latestDate,to=dates.at(-1)||latestDate;
  const byArticle=new Map<string,number>();for(const r of weekRows){const article=up(r[4]),qty=n(r[7]);if(article)byArticle.set(article,(byArticle.get(article)||0)+qty)}
  for(const item of items)item.soldQty=byArticle.get(up(item.article))||0;

  const stockFeedback=feedbackRows.filter(r=>{const d=iso(r[1]),text=s(r[5]);return Boolean(d&&from&&to&&d>=from&&d<=to&&/stok|stock|kosong|habis|tidak tersedia|warna tidak|kapasitas tidak/i.test(text))}).map(r=>s(r[5]));
  for(const raw of stockFeedback){const match=bestMatch(raw,items);if(match)match.lostCount++}
  for(const item of items){item.priority=priorityOf(item.soh,item.soldQty,item.lostCount);item.requestQty=requestOf(item.soh,item.soldQty,item.lostCount);item.reason=item.lostCount?`${item.lostCount} feedback/lost stock`:item.soh<=0&&item.soldQty>0?"SOH 0 dengan sales week berjalan":item.soh<=1&&item.soldQty>=2?"SOH kritis vs sell-out":"Sales lebih cepat dari stock"}
  const recommendations=items.filter(x=>x.requestQty>0&&((x.soh<=0&&x.soldQty>0)||x.lostCount>0||(x.soh<=1&&x.soldQty>=2)||(x.soldQty>=4&&x.soh<x.soldQty))).sort((a,b)=>priorityRank[a.priority]-priorityRank[b.priority]||b.lostCount-a.lostCount||b.soldQty-a.soldQty);
  const outOfStock=items.filter(x=>x.soh<=0).sort((a,b)=>b.soldQty-a.soldQty||b.lostCount-a.lostCount);
  const rawDates=(rawHead||[]).flat().map(iso).filter(Boolean).sort();const sheetDate=iso(dateRange?.[0]?.[0]);const sohUpdated=displayDate(rawDates.at(-1)||sheetDate);
  return NextResponse.json({week,period:{from,to},sohUpdated,summary:{recommendations:recommendations.length,outOfStock:outOfStock.length,weekSales:weekRows.reduce((a,r)=>a+n(r[7]),0),lostFeedback:stockFeedback.length},recommendations,outOfStock:outOfStock.slice(0,60),email:{subject:subjectFor(week),body:bodyFor(week,from,to,sohUpdated,recommendations,outOfStock.length)}},{headers:{"cache-control":"private, max-age=60, stale-while-revalidate=180"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal compile stock request"},{status:500})}
}
