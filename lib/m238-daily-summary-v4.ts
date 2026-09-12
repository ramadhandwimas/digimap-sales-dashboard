import {unstable_cache} from "next/cache";
import {getSheetRanges} from "@/lib/google-sheets";

const SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const STORE="M238";
const FIRST_SUPPORTED_DATE="2025-01-01";

const text=(v:unknown)=>String(v??"").trim();
const up=(v:unknown)=>text(v).toUpperCase();
const num=(v:unknown)=>typeof v==="number"?v:Number(text(v).replace(/[^0-9.-]/g,""))||0;
const iso=(v:unknown)=>{
  if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);
  const s=text(v);
  if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
  const m=s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  return m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:"";
};
const normHeader=(v:unknown)=>up(v).replace(/[^A-Z0-9]+/g,"");
const col=(n:number)=>{let s="";for(let x=n+1;x>0;x=Math.floor((x-1)/26))s=String.fromCharCode(65+((x-1)%26))+s;return s};
const today=()=>new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());
const weekday=(d:string)=>new Intl.DateTimeFormat("id-ID",{weekday:"long",timeZone:"Asia/Jakarta"}).format(new Date(`${d}T00:00:00Z`)).toLowerCase();
const cacheKey=(period:string)=>`${STORE}:${period}`;

type Cred={email:string;key:string};
type Source={sheet:string};
type Schema={date:number,id:number,name:number,invoice:number,article:number,description:number,type:number,qty:number,amount:number,category:number,brand:number,core:number,scheme:number,vendor:number,week:number,store:number,max:number};
type Sales={date:string,id:string,name:string,invoice:string,article:string,description:string,type:string,qty:number,amount:number,category:string,brand:string,core:string,scheme:string,vendor:string,week:string,store:string};
export type DailyRow={date:string,totalSales:number,target:number,transaction:number,invoice:number,qty:number,upt:number,atv:number,traffic:number,cvr:number,breakdown:{device:number;accessories:number;vas:number},lob:{iphoneQty:number;macbookQty:number;ipadQty:number;appleWatchQty:number;airpodsQty:number},providers:{qoalaQty:number;qoalaValue:number;telkomselQty:number;telkomselValue:number;xlQty:number;xlValue:number;indosatQty:number;indosatValue:number}};
type Cached={at:number,rows:DailyRow[],rawRows:number,source:string};
type DateIndex={at:number,dates:string[]};

const schemaCache=new Map<string,Schema>();
const monthCache=new Map<string,Cached>();
const boundsCache=new Map<string,{start:number,end:number}>();
const dateIndexCache=new Map<string,DateIndex>();
const dateIndexPending=new Map<string,Promise<string[]>>();
let joinsCache:{at:number,targets:Map<string,number>,traffic:Map<string,number>}|undefined;

export function resolveSalesSource(year:number):Source{
  if(year===2025)return{sheet:"Data Copas Archive 2025"};
  if(year===2026)return{sheet:"Data Copas"};
  throw new Error(`Year ${year} belum didukung Daily Summary`);
}

function credentialsFromEnv():Cred{
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key=process.env.GOOGLE_PRIVATE_KEY;
  if(!email||!key)throw new Error("Google Sheets belum dikonfigurasi");
  return{email,key};
}

async function readDateColumn(sheet:string,dateCol:string,c:Cred){
  const [rows]=await getSheetRanges(SOURCE_ID,[`'${sheet}'!${dateCol}2:${dateCol}`],c.email,c.key);
  return(rows??[]).map(r=>iso(r?.[0]));
}

const sharedArchiveDateIndex=unstable_cache(
  async(dateCol:string)=>readDateColumn("Data Copas Archive 2025",dateCol,credentialsFromEnv()),
  ["m238-daily-summary-v4","date-index","archive-2025"],
  {revalidate:12*60*60},
);

const sharedCurrentDateIndex=unstable_cache(
  async(dateCol:string)=>readDateColumn("Data Copas",dateCol,credentialsFromEnv()),
  ["m238-daily-summary-v4","date-index","data-copas-2026"],
  {revalidate:60},
);

function field(map:Map<string,number>,aliases:string[],required=true){
  for(const a of aliases){const i=map.get(normHeader(a));if(i!=null)return i}
  if(required)throw new Error(`Header tidak ditemukan: ${aliases[0]}`);
  return-1;
}

async function schemaFor(source:Source,c:Cred){
  const cached=schemaCache.get(source.sheet);
  if(cached)return cached;
  const [rows]=await getSheetRanges(SOURCE_ID,[`'${source.sheet}'!A1:AZ1`],c.email,c.key);
  const h=rows?.[0]??[],m=new Map<string,number>();
  h.forEach((v,i)=>{if(text(v))m.set(normHeader(v),i)});
  const s:Schema={
    date:field(m,["Date"]),
    id:field(m,["Sales ID","NIK"]),
    name:field(m,["Sales Name","Staff Name"]),
    invoice:field(m,["Invoice","Transaction No"]),
    article:field(m,["SAP Article","Article"]),
    description:field(m,["SAP Description","Description"]),
    type:field(m,["Type"],false),
    qty:field(m,["QtyItem","Qty"]),
    amount:field(m,["LocalAmount","Local Amount","Amount"]),
    category:field(m,["ProductCategory","Product Category"]),
    brand:field(m,["Brand Name","Brand"]),
    core:field(m,["Core Product"]),
    scheme:field(m,["Product Scheme"]),
    vendor:field(m,["Vendor"],false),
    week:field(m,["Week"],false),
    store:field(m,["Store"]),
    max:Math.max(...m.values())
  };
  schemaCache.set(source.sheet,s);
  return s;
}

async function dateIndexFor(source:Source,schema:Schema,c:Cred,refresh=false){
  const dateCol=col(schema.date),key=`${source.sheet}:${dateCol}`;
  const ttl=source.sheet.includes("Archive")?12*3600000:60000;
  const cached=dateIndexCache.get(key);
  if(!refresh&&cached&&Date.now()-cached.at<ttl)return cached.dates;
  if(!refresh){
    const pending=dateIndexPending.get(key);
    if(pending)return pending;
  }
  const request=(async()=>{
    const dates=refresh
      ?await readDateColumn(source.sheet,dateCol,c)
      :source.sheet.includes("Archive")
        ?await sharedArchiveDateIndex(dateCol)
        :await sharedCurrentDateIndex(dateCol);
    dateIndexCache.set(key,{at:Date.now(),dates});
    return dates;
  })().finally(()=>dateIndexPending.delete(key));
  if(!refresh)dateIndexPending.set(key,request);
  return request;
}

async function boundsFor(period:string,source:Source,schema:Schema,c:Cred,refresh=false){
  const key=cacheKey(period),cached=boundsCache.get(key);
  if(!refresh&&cached)return cached;
  const dates=await dateIndexFor(source,schema,c,refresh);
  let start=0,end=0;
  for(let i=0;i<dates.length;i++){
    if(dates[i]?.slice(0,7)!==period)continue;
    const row=i+2;
    if(!start)start=row;
    end=row;
  }
  const b={start,end};
  boundsCache.set(key,b);
  return b;
}

function rowFrom(v:unknown[],s:Schema):Sales{return{
  date:iso(v[s.date]),id:text(v[s.id]),name:text(v[s.name]),invoice:text(v[s.invoice]),article:up(v[s.article]),description:text(v[s.description]),type:s.type>=0?text(v[s.type]):"",qty:num(v[s.qty]),amount:num(v[s.amount]),category:up(v[s.category]),brand:up(v[s.brand]),core:up(v[s.core]),scheme:up(v[s.scheme]),vendor:s.vendor>=0?up(v[s.vendor]):"",week:s.week>=0?text(v[s.week]):"",store:up(v[s.store])
}};

function kind(r:Sales){
  if(r.scheme==="DEVICES")return"device";
  if(r.scheme==="ACCESSORIES")return"accessories";
  if(r.scheme==="VAS")return"vas";
  const t=up(`${r.type} ${r.category} ${r.description}`);
  if(/QOALA|PROTEKSI|TELKOMSEL|INDOSAT|(^|\s)XL(\s|$)|XXL/.test(t))return"vas";
  if(/IPHONE|IPAD|MACBOOK|APPLE WATCH|WATCH SERIES|WATCH SE|WATCH ULTRA/.test(t))return"device";
  if(/AIRPODS|ACCESSOR|CASE|CABLE|ADAPTER|CHARGER|PENCIL|KEYBOARD|SCREEN/.test(t))return"accessories";
  return"other";
}

function product(r:Sales){
  const t=up(`${r.type} ${r.category} ${r.description}`);
  if(t.includes("AIRPODS"))return"airpods";
  if(t.includes("IPHONE"))return"iphone";
  if(t.includes("MACBOOK")||r.category==="MAC")return"mac";
  if(t.includes("IPAD"))return"ipad";
  if(/APPLE WATCH|WATCH SERIES|WATCH SE|WATCH ULTRA/.test(t))return"watch";
  return"";
}

function provider(r:Sales){
  const t=up(`${r.article} ${r.brand} ${r.vendor} ${r.description}`);
  if(t.includes("QOALA")||/(^|\s)KLA/.test(t))return"qoala";
  if(t.includes("TELKOMSEL")||/(^|\s)TSL(\s|$)/.test(t))return"telkomsel";
  if(t.includes("INDOSAT")||/(^|\s)IDT(\s|$)/.test(t))return"indosat";
  if(/(^|\s)XL(\s|$)|XXL/.test(t))return"xl";
  return"";
}

async function joins(c:Cred){
  if(joinsCache&&Date.now()-joinsCache.at<60000)return joinsCache;
  const [[tr],[fr]]=await Promise.all([
    getSheetRanges(SOURCE_ID,["Config!W1:X120"],c.email,c.key),
    getSheetRanges(MASTER_ID,["'Traffic'!A2:B1000"],c.email,c.key)
  ]);
  const targets=new Map<string,number>();
  for(const r of tr??[]){const d=text(r[0]).toLowerCase();if(d)targets.set(d,num(r[1]))}
  const traffic=new Map<string,number>();
  for(const r of fr??[]){const d=iso(r[0]);if(d)traffic.set(d,num(r[1]))}
  joinsCache={at:Date.now(),targets,traffic};
  return joinsCache;
}

async function loadMonth(period:string,c:Cred,refresh=false):Promise<Cached>{
  const key=cacheKey(period),current=period===today().slice(0,7),ttl=period.startsWith("2025-")?12*3600000:current?60000:15*60000,cached=monthCache.get(key);
  if(!refresh&&cached&&Date.now()-cached.at<ttl)return cached;
  const year=Number(period.slice(0,4)),source=resolveSalesSource(year),schema=await schemaFor(source,c),b=await boundsFor(period,source,schema,c,refresh);
  if(!b.start||!b.end||b.end<b.start){
    const empty={at:Date.now(),rows:[],rawRows:0,source:source.sheet};
    monthCache.set(key,empty);
    return empty;
  }
  const [raw]=await getSheetRanges(SOURCE_ID,[`'${source.sheet}'!A${b.start}:${col(schema.max)}${b.end}`],c.email,c.key),j=await joins(c);
  const rows=(raw??[]).map(v=>rowFrom(v,schema)).filter(r=>r.date.slice(0,7)===period&&r.store===STORE&&r.qty>0&&!/VOUCHER/.test(up(`${r.type} ${r.category} ${r.scheme} ${r.description} ${r.article}`)));
  const groups=new Map<string,Sales[]>();
  for(const r of rows){const a=groups.get(r.date)??[];a.push(r);groups.set(r.date,a)}
  const daily:DailyRow[]=[];
  for(const [date,list] of groups){
    const invoices=new Set(list.map(r=>r.invoice).filter(Boolean));
    let total=0,qty=0,device=0,accessories=0,vas=0,iphone=0,mac=0,ipad=0,watch=0,airpods=0,qq=0,qv=0,tq=0,tv=0,xq=0,xv=0,iq=0,iv=0;
    for(const r of list){
      total+=r.amount;qty+=r.qty;
      const k=kind(r);
      if(k==="device")device+=r.amount;else if(k==="accessories")accessories+=r.amount;else if(k==="vas")vas+=r.amount;
      const p=product(r);
      if(p==="iphone")iphone+=r.qty;else if(p==="mac")mac+=r.qty;else if(p==="ipad")ipad+=r.qty;else if(p==="watch")watch+=r.qty;else if(p==="airpods")airpods+=r.qty;
      if(k==="vas"){
        const v=provider(r);
        if(v==="qoala"){qq+=r.qty;qv+=r.amount}else if(v==="telkomsel"){tq+=r.qty;tv+=r.amount}else if(v==="xl"){xq+=r.qty;xv+=r.amount}else if(v==="indosat"){iq+=r.qty;iv+=r.amount}
      }
    }
    const inv=invoices.size,traffic=j.traffic.get(date)??0,target=j.targets.get(weekday(date))??0;
    daily.push({date,totalSales:total,target,transaction:inv,invoice:inv,qty,upt:inv?qty/inv:0,atv:inv?total/inv:0,traffic,cvr:traffic?inv/traffic*100:0,breakdown:{device,accessories,vas},lob:{iphoneQty:iphone,macbookQty:mac,ipadQty:ipad,appleWatchQty:watch,airpodsQty:airpods},providers:{qoalaQty:qq,qoalaValue:qv,telkomselQty:tq,telkomselValue:tv,xlQty:xq,xlValue:xv,indosatQty:iq,indosatValue:iv}});
  }
  daily.sort((a,b)=>a.date.localeCompare(b.date));
  const result={at:Date.now(),rows:daily,rawRows:(raw??[]).length,source:source.sheet};
  monthCache.set(key,result);
  return result;
}

const monthBefore=(p:string)=>{let[y,m]=p.split("-").map(Number);m--;if(!m){m=12;y--}return`${y}-${String(m).padStart(2,"0")}`};
const supportedPeriod=(p:string)=>/^20\d{2}-\d{2}$/.test(p)&&p>="2025-01"&&p<=today().slice(0,7)&&(p.startsWith("2025-")||p.startsWith("2026-"));

export function invalidateDailySummaryPeriod(period:string){
  monthCache.delete(cacheKey(period));
  boundsCache.delete(cacheKey(period));
  const year=Number(period.slice(0,4));
  if(year===2025||year===2026){
    const sheet=resolveSalesSource(year).sheet;
    for(const key of [...dateIndexCache.keys()])if(key.startsWith(`${sheet}:`))dateIndexCache.delete(key);
    for(const key of [...dateIndexPending.keys()])if(key.startsWith(`${sheet}:`))dateIndexPending.delete(key);
  }
}

export async function getDailySummaryV4(opts:{mode:"monthly"|"range",period?:string,from?:string,to?:string,refresh?:boolean},c:Cred){
  const started=Date.now();
  let from="",to="",periods:string[]=[],previousPeriods:string[]=[];
  if(opts.mode==="monthly"){
    const p=opts.period??today().slice(0,7);
    if(!supportedPeriod(p))throw new Error("Periode Daily Summary hanya tersedia Januari 2025 sampai bulan berjalan 2026");
    from=`${p}-01`;
    to=p===today().slice(0,7)?today():`${p}-${String(new Date(Number(p.slice(0,4)),Number(p.slice(5,7)),0).getDate()).padStart(2,"0")}`;
    periods=[p];
    const prev=monthBefore(p);
    previousPeriods=supportedPeriod(prev)?[prev]:[];
  }else{
    from=opts.from??"";
    to=opts.to??"";
    if(!/^20\d{2}-\d{2}-\d{2}$/.test(from)||!/^20\d{2}-\d{2}-\d{2}$/.test(to)||from>to)throw new Error("Range tanggal tidak valid");
    if(from<FIRST_SUPPORTED_DATE||to>today())throw new Error("Range Daily Summary hanya tersedia Januari 2025 sampai tanggal berjalan 2026");
    let y=Number(from.slice(0,4)),m=Number(from.slice(5,7)),ey=Number(to.slice(0,4)),em=Number(to.slice(5,7));
    while(y<ey||(y===ey&&m<=em)){
      const p=`${y}-${String(m).padStart(2,"0")}`;
      if(supportedPeriod(p))periods.push(p);
      m++;if(m===13){m=1;y++}
    }
    const days=Math.floor((Date.parse(to)-Date.parse(from))/86400000)+1,pe=new Date(Date.parse(from)-86400000),ps=new Date(pe.getTime()-(days-1)*86400000);
    previousPeriods=[...new Set([ps.toISOString().slice(0,7),pe.toISOString().slice(0,7)].filter(supportedPeriod))];
  }

  const all=[...new Set([...periods,...previousPeriods])];
  const loaded=await Promise.all(all.map(p=>loadMonth(p,c,Boolean(opts.refresh&&periods.includes(p)))));
  const by=new Map(all.map((p,i)=>[p,loaded[i]]));
  const rows=periods.flatMap(p=>by.get(p)?.rows??[]).filter(r=>r.date>=from&&r.date<=to);
  let prevRows:DailyRow[]=[];
  if(opts.mode==="monthly")prevRows=previousPeriods.flatMap(p=>by.get(p)?.rows??[]);
  else{
    const days=Math.floor((Date.parse(to)-Date.parse(from))/86400000)+1,pe=new Date(Date.parse(from)-86400000).toISOString().slice(0,10),ps=new Date(Date.parse(pe)-(days-1)*86400000).toISOString().slice(0,10);
    prevRows=previousPeriods.flatMap(p=>by.get(p)?.rows??[]).filter(r=>r.date>=ps&&r.date<=pe);
  }

  const sum=(arr:DailyRow[])=>arr.reduce((a,r)=>({sales:a.sales+r.totalSales,target:a.target+r.target,tx:a.tx+r.transaction,qty:a.qty+r.qty,traffic:a.traffic+r.traffic,device:a.device+r.breakdown.device,acc:a.acc+r.breakdown.accessories,vas:a.vas+r.breakdown.vas,iphone:a.iphone+r.lob.iphoneQty,mac:a.mac+r.lob.macbookQty,ipad:a.ipad+r.lob.ipadQty,watch:a.watch+r.lob.appleWatchQty,airpods:a.airpods+r.lob.airpodsQty}),{sales:0,target:0,tx:0,qty:0,traffic:0,device:0,acc:0,vas:0,iphone:0,mac:0,ipad:0,watch:0,airpods:0});
  const s=sum(rows),p=sum(prevRows),best=rows.length?[...rows].sort((a,b)=>b.totalSales-a.totalSales)[0]:null,low=rows.length?[...rows].sort((a,b)=>a.totalSales-b.totalSales)[0]:null;
  return{
    period:{mode:opts.mode,from,to,source:[...new Set(periods.map(p=>by.get(p)?.source).filter((v):v is string=>Boolean(v)))]},
    summary:{totalSales:s.sales,target:s.target,achievementPct:s.target?s.sales/s.target*100:0,transaction:s.tx,invoice:s.tx,qty:s.qty,upt:s.tx?s.qty/s.tx:0,atv:s.tx?s.sales/s.tx:0,traffic:s.traffic,cvr:s.traffic?s.tx/s.traffic*100:0,previousPct:p.sales?(s.sales-p.sales)/p.sales*100:null,previousTotal:p.sales,bestDay:best?{date:best.date,amount:best.totalSales}:null,lowestDay:low?{date:low.date,amount:low.totalSales}:null},
    breakdown:{device:s.device,accessories:s.acc,vas:s.vas,iphoneQty:s.iphone,macbookQty:s.mac,ipadQty:s.ipad,appleWatchQty:s.watch,airpodsQty:s.airpods},
    trend:rows.map(r=>({date:r.date,sales:r.totalSales})),
    dailyRows:rows,
    metrics:{rawRowsRead:periods.reduce((n,p)=>n+(by.get(p)?.rawRows??0),0),backendMs:Date.now()-started,cache:periods.map(p=>({period:p,ageMs:Date.now()-(by.get(p)?.at??Date.now())}))}
  };
}
