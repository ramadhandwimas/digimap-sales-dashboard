export type FastSalesRow={date:string;id:string;name:string;invoice:string;article:string;description:string;type:string;qty:number;amount:number;category:string;brand:string;core:string;scheme:string;vendor:string;week:string;store:string;key:string};
export type FastDailyCache={date:string;id:string;name:string;store:string;accessories:number;vas:number;amount:number;invoices:number;qty:number;upt:number;atv:number;iphone:number;mac:number;ipad:number;watch:number;airpods:number;qoalaQty:number;qoalaValue:number;telkomselQty:number;telkomselValue:number;xlQty:number;xlValue:number;indosatQty:number;indosatValue:number;updatedAt:string;validation:string};

const text=(v:unknown)=>String(v??"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim();
const up=(v:unknown)=>text(v).toUpperCase();
const num=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/[^0-9.-]/g,""))||0;
export const isoDate=(v:unknown)=>{const x=text(v);if(/^\d{2}-\d{2}-\d{4}$/.test(x)){const[d,m,y]=x.split("-");return`${y}-${m}-${d}`}if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);return""};
const titleCase=(v:string)=>v.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());

export type Classification={type:string;category:string;brand:string;core:string;scheme:string;vendor:string;week:string;store:string};
export const classificationHeaders=["SAP Article","Type","Product Category","Brand","Core Product","Product Scheme","Vendor","Week","Store"];
export function buildClassificationMap(rows:unknown[][][]){const map=new Map<string,Classification>();for(const block of rows)for(const r of block){const article=up(r[4]);if(!article)continue;const scheme=up(r[12]),category=up(r[9]),brand=up(r[10]);if(!scheme&&!category&&!brand)continue;map.set(article,{type:text(r[6]),category,brand,core:up(r[11]),scheme,vendor:up(r[13]),week:text(r[14]),store:up(r[15])||"M238"})}return map}
export function classificationMapFromValues(rows:unknown[][]){const map=new Map<string,Classification>();for(const r of rows){const article=up(r[0]);if(!article)continue;map.set(article,{type:text(r[1]),category:up(r[2]),brand:up(r[3]),core:up(r[4]),scheme:up(r[5]),vendor:up(r[6]),week:text(r[7]),store:up(r[8])||"M238"})}return map}
export function classificationValues(map:Map<string,Classification>){return[...map.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([article,c])=>[article,c.type,c.category,c.brand,c.core,c.scheme,c.vendor,c.week,c.store])}

function conservativeFallback(article:string,description:string):Classification|undefined{const a=up(article),d=up(description),base={type:"",category:"",brand:"",core:"APPLE",scheme:"",vendor:"",week:"",store:"M238"};if(/VOUCHER|SHOPPING BAG|DEMO/.test(`${a} ${d}`))return undefined;if(/^KLA|QOALA|PROTEKSI/.test(a)||/QOALA|PROTEKSI/.test(d))return{...base,category:"PROTEKSI",brand:"QOALA",scheme:"VAS"};if(/TELKOMSEL|\bTSL\b/.test(`${a} ${d}`))return{...base,category:"PROVIDER",brand:"TELKOMSEL",scheme:"VAS"};if(/INDOSAT|\bIDT\b/.test(`${a} ${d}`))return{...base,category:"PROVIDER",brand:"INDOSAT",scheme:"VAS"};if(/^XXL|(^|\W)XL(\W|$)/.test(`${a} ${d}`))return{...base,category:"PROVIDER",brand:"XL",scheme:"VAS"};if(/IPHONE/.test(d))return{...base,category:"IPHONE",brand:"APPLE",scheme:"DEVICES"};if(/MACBOOK|MAC MINI|IMAC|MAC STUDIO|MAC PRO/.test(d))return{...base,category:"MAC",brand:"APPLE",scheme:"DEVICES"};if(/IPAD/.test(d)&&!/KEYBOARD|PENCIL|CASE|COVER|GLASS|TEMPERED/.test(d))return{...base,category:"IPAD",brand:"APPLE",scheme:"DEVICES"};if(/APPLE WATCH|WATCH SERIES|WATCH SE|WATCH ULTRA/.test(d))return{...base,category:"APPLE WATCH",brand:"APPLE",scheme:"DEVICES"};if(/AIRPODS/.test(d))return{...base,category:"AIRPODS",brand:"APPLE",scheme:"ACCESSORIES"};if(/^APP/.test(a)&&/PENCIL|KEYBOARD|MAGSAFE|ADAPTER|CABLE|CASE|COVER|STRAP/.test(d))return{...base,category:"APPLE ACCESSORIES",brand:"APPLE",scheme:"ACCESSORIES"};return undefined}

export function parseSpwToNormalized(rows:unknown[][],classification:Map<string,Classification>,store="M238"){
 let date="",id="",name="";const out=new Map<string,FastSalesRow>();let duplicateSkipped=0,unknownClassification=0,sourceItems=0;const unclassified:Array<{article:string;description:string;amount:number;id:string}>=[];
 for(let i=0;i<rows.length;i++){
  const a=text(rows[i]?.[0]),b=text(rows[i]?.[1]);const d=isoDate(a);if(d){date=d;continue}
  const staff=a.match(/^(\d{6,10})\s*\/\s*(.+)$/);if(staff){id=staff[1];name=titleCase(staff[2].trim());continue}
  if(!date||!id||!a||!b||/^TOTAL\s+FOR|^GRAND\s+TOTAL|^PAGE\s*:/i.test(a))continue;
  const next=rows[i+1]||[];if(typeof next[0]!=="number"||!text(next[1]))continue;
  const invoice=text(next[1]),amount=num(next[2]);sourceItems++;i++;if(!invoice||amount===0)continue;
  const article=up(b),description=a;if(/VOUCHER/i.test(`${article} ${description}`))continue;
  let c=classification.get(article);if(!c)c=conservativeFallback(article,description);if(!c){unknownClassification++;unclassified.push({article,description,amount,id})}
  const key=`${store}|${date}|${invoice}|${article}|${id}`;const existing=out.get(key);
  if(existing){existing.qty+=1;existing.amount+=amount;duplicateSkipped++;continue}
  out.set(key,{date,id,name,invoice,article,description,type:c?.type||"",qty:1,amount,category:c?.category||"",brand:c?.brand||"",core:c?.core||"",scheme:c?.scheme||"",vendor:c?.vendor||"",week:c?.week||"",store,key});
 }
 return{rows:[...out.values()],duplicateSkipped,unknownClassification,sourceItems,unclassified};
}

export function rowClass(r:FastSalesRow){if(r.scheme==="VAS")return"VAS";if(r.scheme==="ACCESSORIES")return"ACC";if(r.scheme==="DEVICES")return"DEVICE";return"UNCLASSIFIED"}
function product(r:FastSalesRow){if(r.brand!=="APPLE")return"";if(r.scheme==="ACCESSORIES"&&/AIRPODS/.test(r.category))return"airpods";if(r.scheme!=="DEVICES")return"";if(/IPHONE/.test(r.category))return"iphone";if(/^(MAC|MACBOOK|MAC BOOK)$/.test(r.category)||/MACBOOK/.test(r.type))return"mac";if(/IPAD/.test(r.category))return"ipad";if(/APPLE WATCH|SMARTWATCH|WATCH/.test(r.category))return"watch";return""}
function vasType(r:FastSalesRow){if(r.scheme!=="VAS")return"";const t=`${r.article} ${r.category} ${r.brand} ${r.vendor} ${r.description}`.toUpperCase().replace(/\s+/g," ");if(t.includes("QOALA")||/(^|\s)KLA/.test(t)||t.includes("PROTEKSI"))return"qoala";if(t.includes("TELKOMSEL")||/(^|\s)TSL(\s|$)/.test(t))return"telkomsel";if(t.includes("INDOSAT")||/(^|\s)IDT(\s|$)/.test(t))return"indosat";if(/(^|\s)XL(\s|$)|XXL/.test(t))return"xl";return""}
export function aggregateDaily(rows:FastSalesRow[],validation="PENDING_RAW_SYNC"){
 const groups=new Map<string,FastSalesRow[]>();for(const r of rows){if(!r.date||!r.id||r.qty<=0)continue;const k=`${r.date}|${r.id}|${r.store}`;const list=groups.get(k)||[];list.push(r);groups.set(k,list)}
 const now=new Date().toISOString();const out:FastDailyCache[]=[];
 for(const list of groups.values()){
  const first=list[0],invoices=new Set(list.map(x=>x.invoice).filter(Boolean));let accessories=0,vas=0,amount=0,qty=0,iphone=0,mac=0,ipad=0,watch=0,airpods=0,qoalaQty=0,qoalaValue=0,telkomselQty=0,telkomselValue=0,xlQty=0,xlValue=0,indosatQty=0,indosatValue=0;
  for(const r of list){amount+=r.amount;qty+=r.qty;const cls=rowClass(r);if(cls==="ACC")accessories+=r.amount;if(cls==="VAS")vas+=r.amount;const p=product(r);if(p==="iphone")iphone+=r.qty;else if(p==="mac")mac+=r.qty;else if(p==="ipad")ipad+=r.qty;else if(p==="watch")watch+=r.qty;else if(p==="airpods")airpods+=r.qty;const vt=vasType(r);if(vt==="qoala"){qoalaQty+=r.qty;qoalaValue+=r.amount}else if(vt==="telkomsel"){telkomselQty+=r.qty;telkomselValue+=r.amount}else if(vt==="xl"){xlQty+=r.qty;xlValue+=r.amount}else if(vt==="indosat"){indosatQty+=r.qty;indosatValue+=r.amount}}
  const inv=invoices.size;out.push({date:first.date,id:first.id,name:first.name,store:first.store,accessories,vas,amount,invoices:inv,qty,upt:inv?qty/inv:0,atv:inv?amount/inv:0,iphone,mac,ipad,watch,airpods,qoalaQty,qoalaValue,telkomselQty,telkomselValue,xlQty,xlValue,indosatQty,indosatValue,updatedAt:now,validation});
 }
 return out;
}

export const normalizedHeaders=["Date","Sales ID","Sales Name","Invoice","SAP Article","SAP Description","Type","Qty","Local Amount","Product Category","Brand","Core Product","Product Scheme","Vendor","Week","Store","Source Key"];
export const cacheHeaders=["Date","Sales ID","Sales Name","Store","ACC Amount","VAS Amount","Achievement","Invoice Count","Total Qty","UPT","ATV","iPhone Qty","MacBook Qty","iPad Qty","Apple Watch Qty","AirPods Qty","Qoala Qty","Qoala Value","Telkomsel Qty","Telkomsel Value","XL Qty","XL Value","Indosat Qty","Indosat Value","Updated At","Validation Status"];
export const normalizedValues=(r:FastSalesRow)=>[r.date,r.id,r.name,r.invoice,r.article,r.description,r.type,r.qty,r.amount,r.category,r.brand,r.core,r.scheme,r.vendor,r.week,r.store,r.key];
export const cacheValues=(r:FastDailyCache)=>[r.date,r.id,r.name,r.store,r.accessories,r.vas,r.amount,r.invoices,r.qty,r.upt,r.atv,r.iphone,r.mac,r.ipad,r.watch,r.airpods,r.qoalaQty,r.qoalaValue,r.telkomselQty,r.telkomselValue,r.xlQty,r.xlValue,r.indosatQty,r.indosatValue,r.updatedAt,r.validation];
export function cacheFromValues(r:unknown[]):FastDailyCache{return{date:isoDate(r[0]),id:text(r[1]),name:text(r[2]),store:up(r[3])||"M238",accessories:num(r[4]),vas:num(r[5]),amount:num(r[6]),invoices:num(r[7]),qty:num(r[8]),upt:num(r[9]),atv:num(r[10]),iphone:num(r[11]),mac:num(r[12]),ipad:num(r[13]),watch:num(r[14]),airpods:num(r[15]),qoalaQty:num(r[16]),qoalaValue:num(r[17]),telkomselQty:num(r[18]),telkomselValue:num(r[19]),xlQty:num(r[20]),xlValue:num(r[21]),indosatQty:num(r[22]),indosatValue:num(r[23]),updatedAt:text(r[24]),validation:text(r[25])}}
