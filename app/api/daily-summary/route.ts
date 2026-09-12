import {NextRequest,NextResponse} from "next/server"
import {getSheetRanges} from "@/lib/google-sheets"
import type {DailySummaryPayload,DailySummaryRow} from "@/lib/daily-summary-types"

const SHEET_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0"
const MASTER_DATA_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk"
const STORE="M238"
const CURRENT_TTL=60_000
const HISTORICAL_TTL=24*60*60*1000
const INDEX_TTL_CURRENT=5*60_000
const INDEX_TTL_ARCHIVE=24*60*60*1000
const TRAFFIC_INDEX_TTL=5*60_000

type HeaderMap=Record<string,number>
type SourceIndex={sheet:string;headers:string[];map:HeaderMap;dates:string[];expiresAt:number}
type SalesRow={date:string;invoice:string;article:string;description:string;type:string;qty:number;amount:number;category:string;brand:string;core:string;scheme:string;vendor:string;store:string}
type CacheEntry={expiresAt:number;data:DailySummaryPayload}

const sourceCache=new Map<string,SourceIndex>()
const sourcePending=new Map<string,Promise<SourceIndex>>()
const responseCache=new Map<string,CacheEntry>()
const responsePending=new Map<string,Promise<DailySummaryPayload>>()
let configCache:{expiresAt:number;rows:unknown[][]}|undefined
let trafficIndexCache:{expiresAt:number;dates:string[]}|undefined
let trafficIndexPending:Promise<string[]>|undefined

const s=(v:unknown)=>String(v??"").trim()
const up=(v:unknown)=>s(v).toUpperCase()
const n=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/[^0-9.-]/g,""))||0
const norm=(v:unknown)=>s(v).toLowerCase().replace(/[^a-z0-9]/g,"")
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms))

function iso(v:unknown){
  if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10)
  const x=s(v)
  if(/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(x)){const[d,m,y]=x.split(/[-/]/);return`${y}-${m}-${d}`}
  if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10)
  return""
}
function sourceForYear(year:number){if(year===2026)return"Data Copas";if(year===2025)return"Data Copas Archive 2025";throw new Error(`Year ${year} belum didukung Daily Summary`)}
function monthEnd(period:string){const[y,m]=period.split("-").map(Number);return`${period}-${String(new Date(y,m,0).getDate()).padStart(2,"0")}`}
function monthLabel(period:string){return new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric",timeZone:"Asia/Jakarta"}).format(new Date(`${period}-01T00:00:00Z`))}
function previousPeriod(period:string){const d=new Date(`${period}-01T00:00:00Z`);d.setUTCMonth(d.getUTCMonth()-1);return d.toISOString().slice(0,7)}
function colLetter(index:number){let x=index+1,out="";while(x){const r=(x-1)%26;out=String.fromCharCode(65+r)+out;x=Math.floor((x-1)/26)}return out}

const aliases:Record<string,string[]>={
 date:["date"],salesId:["salesid"],salesName:["salesname"],invoice:["invoice"],article:["saparticle","article"],description:["sapdescription","description"],type:["type"],qty:["qtyitem","qty"],amount:["localamount","amount"],category:["productcategory"],brand:["brandname","brand"],core:["coreproduct"],scheme:["productscheme"],vendor:["vendor"],week:["week"],store:["store"],month:["month"],year:["yearly","year"]
}
function makeMap(headers:string[]){const normalized=headers.map(norm),map:HeaderMap={};for(const[key,names]of Object.entries(aliases)){const i=normalized.findIndex(h=>names.includes(h));if(i>=0)map[key]=i}for(const key of ["date","invoice","article","description","type","qty","amount","category","brand","core","scheme","vendor","store"]){if(map[key]===undefined)throw new Error(`Header wajib tidak ditemukan: ${key}`)}return map}

async function withRetry<T>(fn:()=>Promise<T>){let last:unknown;for(let i=0;i<3;i++){try{return await fn()}catch(e){last=e;const msg=e instanceof Error?e.message:"";if(!msg.includes("429")&&i===0)throw e;if(i<2)await sleep(250*Math.pow(2,i))}}throw last}

async function getIndex(sheet:string,email:string,key:string,force=false){
 const cached=sourceCache.get(sheet);if(!force&&cached&&cached.expiresAt>Date.now())return cached
 const existing=sourcePending.get(sheet);if(existing&&!force)return existing
 const request=(async()=>{const[headerRows,dateRows]=await withRetry(()=>getSheetRanges(SHEET_ID,[`'${sheet}'!1:1`,`'${sheet}'!A2:A`],email,key));const headers=(headerRows[0]??[]).map(s),map=makeMap(headers),dates=dateRows.map(r=>iso(r[0]));const archive=sheet.includes("Archive"),value={sheet,headers,map,dates,expiresAt:Date.now()+(archive?INDEX_TTL_ARCHIVE:INDEX_TTL_CURRENT)};sourceCache.set(sheet,value);return value})().finally(()=>sourcePending.delete(sheet))
 sourcePending.set(sheet,request);return request
}

async function getConfig(email:string,key:string,force=false){if(!force&&configCache&&configCache.expiresAt>Date.now())return configCache.rows;const[rows]=await withRetry(()=>getSheetRanges(SHEET_ID,["Config!A1:AG55"],email,key));configCache={rows,expiresAt:Date.now()+5*60_000};return rows}

function rangeBounds(dates:string[],start:string,end:string){let first=-1,last=-1;for(let i=0;i<dates.length;i++){const d=dates[i];if(!d||d<start||d>end)continue;if(first<0)first=i;last=i}return first<0?null:{first:first+2,last:last+2}}
function parse(row:unknown[],map:HeaderMap):SalesRow{return{date:iso(row[map.date]),invoice:s(row[map.invoice]),article:s(row[map.article]),description:s(row[map.description]),type:s(row[map.type]),qty:n(row[map.qty]),amount:n(row[map.amount]),category:up(row[map.category]),brand:up(row[map.brand]),core:up(row[map.core]),scheme:up(row[map.scheme]),vendor:up(row[map.vendor]),store:up(row[map.store])}}
function valid(r:SalesRow){return r.store===STORE&&r.date&&r.scheme!=="VOUCHER"&&!up(r.description).includes("VOUCHER")}
function kind(r:SalesRow){const text=`${r.category} ${up(r.type)} ${up(r.description)}`;if(r.scheme==="VAS")return"vas";if(r.scheme==="ACCESSORIES")return"accessories";if(r.scheme==="DEVICES")return"device";if(/IPHONE|IPAD|MAC|APPLE WATCH/.test(text))return"device";return"other"}
function product(r:SalesRow){const text=`${r.category} ${up(r.type)} ${up(r.description)}`;if(text.includes("MAC"))return"macbook";if(text.includes("IPHONE"))return"iphone";if(text.includes("IPAD"))return"ipad";if(text.includes("APPLE WATCH")||/\bAW\b/.test(text))return"appleWatch";if(text.includes("AIRPODS"))return"airpods";return"other"}
function provider(r:SalesRow,name:string){const text=`${r.article} ${r.brand} ${r.vendor} ${r.description}`.toUpperCase();if(kind(r)!=="vas")return false;if(name==="qoala")return text.includes("QOALA")||text.includes("KLA");if(name==="telkomsel")return text.includes("TELKOMSEL")||text.includes("TSL");if(name==="xl")return text.includes("XXL")||text.includes(" XL ")||text.includes("XL/");if(name==="indosat")return text.includes("INDOSAT")||text.includes("IDT");return false}

async function readRows(start:string,end:string,email:string,key:string,force=false){
 const years=[...new Set([Number(start.slice(0,4)),Number(end.slice(0,4))])]
 const rows:SalesRow[]=[];const sources:string[]=[];let rowsRead=0
 for(const year of years){const segStart=year===Number(start.slice(0,4))?start:`${year}-01-01`,segEnd=year===Number(end.slice(0,4))?end:`${year}-12-31`,sheet=sourceForYear(year),idx=await getIndex(sheet,email,key,force),bounds=rangeBounds(idx.dates,segStart,segEnd);sources.push(sheet);if(!bounds)continue;const maxCol=Math.max(...Object.values(idx.map));const range=`'${sheet}'!A${bounds.first}:${colLetter(maxCol)}${bounds.last}`;const[raw]=await withRetry(()=>getSheetRanges(SHEET_ID,[range],email,key));rowsRead+=raw.length;for(const r of raw){const parsed=parse(r,idx.map);if(parsed.date>=segStart&&parsed.date<=segEnd&&valid(parsed))rows.push(parsed)}}
 return{rows,sources:[...new Set(sources)],rowsRead}
}

async function getTrafficIndex(email:string,key:string,force=false){
 if(!force&&trafficIndexCache&&trafficIndexCache.expiresAt>Date.now())return trafficIndexCache.dates
 if(trafficIndexPending&&!force)return trafficIndexPending
 trafficIndexPending=(async()=>{const[rows]=await withRetry(()=>getSheetRanges(MASTER_DATA_ID,["Traffic!A2:A1000"],email,key));const dates=rows.map(r=>iso(r[0]));trafficIndexCache={dates,expiresAt:Date.now()+TRAFFIC_INDEX_TTL};return dates})().finally(()=>{trafficIndexPending=undefined})
 return trafficIndexPending
}
async function readTraffic(start:string,end:string,email:string,key:string,force=false){
 if(end<"2026-01-01"||start>"2026-12-31")return new Map<string,number>()
 const dates=await getTrafficIndex(email,key,force),bounds=rangeBounds(dates,start,end);if(!bounds)return new Map<string,number>()
 const[rows]=await withRetry(()=>getSheetRanges(MASTER_DATA_ID,[`Traffic!A${bounds.first}:B${bounds.last}`],email,key));const map=new Map<string,number>();for(const r of rows){const date=iso(r[0]),count=n(r[1]);if(date>=start&&date<=end&&count>0)map.set(date,count)}return map
}

function dailyTarget(config:unknown[][],date:string){const day=new Intl.DateTimeFormat("id-ID",{weekday:"long",timeZone:"Asia/Jakarta"}).format(new Date(`${date}T00:00:00Z`)).toLowerCase();const row=config.find(r=>s(r[22]).toLowerCase()===day);return n(row?.[23])}
function monthlyTarget(config:unknown[][],period:string){const label=monthLabel(period).toLowerCase();const row=config.find(r=>s(r[16]).toLowerCase()===label);return n(row?.[17])}

function aggregate(rows:SalesRow[],config:unknown[][],traffic=new Map<string,number>()){const byDate=new Map<string,SalesRow[]>();for(const row of rows){const a=byDate.get(row.date)??[];a.push(row);byDate.set(row.date,a)}const dailyRows:DailySummaryRow[]=[...byDate.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([date,dayRows])=>{const invoices=new Set(dayRows.map(r=>r.invoice).filter(Boolean));let totalSales=0,device=0,accessories=0,vas=0,qty=0,iphone=0,macbook=0,ipad=0,appleWatch=0,airpods=0;const p={qoalaQty:0,qoalaValue:0,telkomselQty:0,telkomselValue:0,xlQty:0,xlValue:0,indosatQty:0,indosatValue:0};for(const r of dayRows){const units=Math.max(0,r.qty);totalSales+=r.amount;qty+=r.qty;const k=kind(r);if(k==="device")device+=r.amount;else if(k==="accessories")accessories+=r.amount;else if(k==="vas")vas+=r.amount;const prod=product(r);if(prod==="iphone"&&k==="device")iphone+=units;if(prod==="macbook"&&k==="device")macbook+=units;if(prod==="ipad"&&k==="device")ipad+=units;if(prod==="appleWatch"&&k==="device")appleWatch+=units;if(prod==="airpods"&&k==="accessories")airpods+=units;for(const name of ["qoala","telkomsel","xl","indosat"] as const)if(provider(r,name)){p[`${name}Qty`]+=units;p[`${name}Value`]+=r.amount}}const transaction=invoices.size,target=dailyTarget(config,date),trafficCount=traffic.get(date)??null;return{date,day:new Intl.DateTimeFormat("id-ID",{weekday:"short",timeZone:"Asia/Jakarta"}).format(new Date(`${date}T00:00:00Z`)),totalSales,target,achievementPct:target?totalSales/target*100:0,transaction,invoice:transaction,qty,upt:transaction?qty/transaction:0,atv:transaction?totalSales/transaction:0,traffic:trafficCount,cvr:trafficCount?transaction/trafficCount*100:null,breakdown:{device,accessories,vas},lob:{iphone,macbook,ipad,appleWatch,airpods},providers:p}});return dailyRows}
function summarize(dailyRows:DailySummaryRow[],target:number){const totalSales=dailyRows.reduce((a,d)=>a+d.totalSales,0),transaction=dailyRows.reduce((a,d)=>a+d.transaction,0),qty=dailyRows.reduce((a,d)=>a+d.qty,0),device=dailyRows.reduce((a,d)=>a+d.breakdown.device,0),accessories=dailyRows.reduce((a,d)=>a+d.breakdown.accessories,0),vas=dailyRows.reduce((a,d)=>a+d.breakdown.vas,0),sum=(key:keyof DailySummaryRow["lob"])=>dailyRows.reduce((a,d)=>a+d.lob[key],0),trafficRows=dailyRows.filter(d=>d.traffic!=null&&d.traffic>0),traffic=trafficRows.length?trafficRows.reduce((a,d)=>a+(d.traffic??0),0):null,trafficTransactions=trafficRows.reduce((a,d)=>a+d.transaction,0),bestDay=dailyRows.length?[...dailyRows].sort((a,b)=>b.totalSales-a.totalSales)[0]:null,lowestDay=dailyRows.length?[...dailyRows].sort((a,b)=>a.totalSales-b.totalSales)[0]:null;return{summary:{totalSales,target,achievementPct:target?totalSales/target*100:0,transaction,invoice:transaction,qty,upt:transaction?qty/transaction:0,atv:transaction?totalSales/transaction:0,traffic,cvr:traffic?trafficTransactions/traffic*100:null,previousPct:null as number|null,bestDay,lowestDay},breakdown:{device,accessories,vas,iphoneQty:sum("iphone"),macbookQty:sum("macbook"),ipadQty:sum("ipad"),appleWatchQty:sum("appleWatch"),airpodsQty:sum("airpods")}}}

async function build(req:NextRequest,email:string,key:string,force:boolean):Promise<DailySummaryPayload>{const started=Date.now(),mode=req.nextUrl.searchParams.get("mode")==="custom"?"custom":"monthly" as const,period=req.nextUrl.searchParams.get("period")||new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());let startDate="",endDate="",label="";if(mode==="monthly"){if(!/^202[56]-\d{2}$/.test(period))throw new Error("Period tidak valid");startDate=`${period}-01`;endDate=monthEnd(period);label=monthLabel(period)}else{startDate=req.nextUrl.searchParams.get("start")||"";endDate=req.nextUrl.searchParams.get("end")||"";if(!/^202[56]-\d{2}-\d{2}$/.test(startDate)||!/^202[56]-\d{2}-\d{2}$/.test(endDate)||startDate>endDate)throw new Error("Custom range tidak valid");label=`${startDate} – ${endDate}`}
 const[config,current,traffic]=await Promise.all([getConfig(email,key,force),readRows(startDate,endDate,email,key,force),readTraffic(startDate,endDate,email,key,force)]),dailyRows=aggregate(current.rows,config,traffic),target=mode==="monthly"?monthlyTarget(config,period):dailyRows.reduce((a,d)=>a+d.target,0),tot=summarize(dailyRows,target)
 if(mode==="monthly"){const prev=previousPeriod(period),prevRows=await readRows(`${prev}-01`,monthEnd(prev),email,key,force),prevDaily=aggregate(prevRows.rows,config),prevSales=prevDaily.reduce((a,d)=>a+d.totalSales,0);tot.summary.previousPct=prevSales?(tot.summary.totalSales-prevSales)/prevSales*100:null;current.rowsRead+=prevRows.rowsRead;current.sources.push(...prevRows.sources)}
 const warnings:string[]=[];if(Number(startDate.slice(0,4))===2025)warnings.push("Traffic M238 yang diaudit mulai tersedia 1 Januari 2026; Traffic/CVR 2025 ditampilkan kosong.");if(dailyRows.some(d=>d.traffic==null))warnings.push("Sebagian tanggal belum memiliki Traffic valid; CVR periode hanya memakai tanggal dengan Traffic > 0.")
 const payload:DailySummaryPayload={mode,source:[...new Set(current.sources)],store:STORE,period:{label,startDate,endDate,...(mode==="monthly"?{year:Number(period.slice(0,4)),month:Number(period.slice(5,7))}:{})},summary:tot.summary,breakdown:tot.breakdown,trend:dailyRows.map(d=>({date:d.date,sales:d.totalSales})),dailyRows,meta:{generatedAt:new Date().toISOString(),cache:"miss",rowsRead:current.rowsRead,serverMs:Date.now()-started,trafficSource:"MASTER DATA M238 / Traffic",warnings}}
 payload.meta.payloadBytes=new TextEncoder().encode(JSON.stringify(payload)).length;return payload}

export async function GET(req:NextRequest){const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({error:"Google service account belum dikonfigurasi"},{status:500});const force=req.nextUrl.searchParams.get("refresh")==="1",cacheKey=req.nextUrl.searchParams.toString().replace(/(^|&)refresh=1(&|$)/,"$1");const cached=responseCache.get(cacheKey);if(!force&&cached&&cached.expiresAt>Date.now())return NextResponse.json({...cached.data,meta:{...cached.data.meta,cache:"hit"}},{headers:{"cache-control":"private, max-age=15","x-daily-summary-cache":"hit"}});try{let request=responsePending.get(cacheKey);if(!request||force){request=build(req,email,key,force);responsePending.set(cacheKey,request)}const data=await request;const currentMonth=new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date()),isCurrent=data.period.startDate.startsWith(currentMonth)||data.period.endDate.startsWith(currentMonth);responseCache.set(cacheKey,{data,expiresAt:Date.now()+(isCurrent?CURRENT_TTL:HISTORICAL_TTL)});return NextResponse.json(data,{headers:{"cache-control":isCurrent?"private, max-age=15":"private, max-age=300","x-daily-summary-cache":"miss"}})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Daily Summary gagal dimuat"},{status:500,headers:{"cache-control":"no-store"}})}finally{responsePending.delete(cacheKey)}}
