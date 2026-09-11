import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const SALES:Record<string,string>={
  "2025":"1NnRW70VyrtV8c89_M08gTnOGbtzeldSy8gL-gm4GjJ0",
  "2026":"151Qfrz3RZnDMgZjKOPt5s_aS-zscSiOTCWodbUDWM1k"
};
const STORES=["M117","M118","M124","M127","M217","M227","M238","M255","M264"] as const;
const CACHE_MS=60_000;
type Raw=unknown[];
type TierKey="0"|"1"|"2"|"3"|"4";
type DeviceKey="iphone"|"macbook"|"ipad"|"watch";
type DeviceLine={product:string;article:string;description:string;qty:number;rate:number;incentive:number;transaction:string};
type AccessoryLine={article:string;description:string;qty:number;unitPrice:number;tier:string;rate:number;incentive:number;transaction:string};
type QoalaLine={article:string;description:string;qty:number;unitPrice:number;bucket:"< 1.315.000"|">= 1.315.000";rate:number;incentive:number;transaction:string};
type Calc={
 key:string;id:string;name:string;store:string;
 qty:{iphone:number;macbook:number;ipad:number;watch:number;accessories:number;qoala:number};
 incentive:{iphone:number;macbook:number;ipad:number;watch:number;accessories:number;qoala:number;total:number};
 accessoryTiers:Record<TierKey,{qty:number;rate:number;incentive:number}>;
 qoalaTiers:{low:{qty:number;rate:number;incentive:number};high:{qty:number;rate:number;incentive:number}};
 deviceLines:DeviceLine[];accessoryLines:AccessoryLine[];qoalaLines:QoalaLine[];
 invalidAccessoryRows:number;invalidAccessoryQty:number;invalidQoalaRows:number;
 totalSoldQty:number;totalTransactions:number;duplicateRowsSkipped:number;sanityWarning:boolean;
 _transactions:Set<string>;
};
type Cached={at:number;rows:Calc[]};
const cache=new Map<string,Cached>();

const s=(v:unknown)=>String(v??"").trim();
const up=(v:unknown)=>s(v).toUpperCase();
const normalizeName=(v:unknown)=>up(v).replace(/\s+/g," ").trim();
const containsVoucher=(row:Raw)=>row.some(v=>up(v).includes("VOUCHER"));
function n(v:unknown){if(typeof v==="number")return Number.isFinite(v)?v:0;const x=Number(s(v).replace(/\s/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(",",".").replace(/[^0-9.-]/g,""));return Number.isFinite(x)?x:0}
function iso(v:unknown){if(typeof v==="number"&&v>20000)return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);const x=s(v);let m=x.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);if(m)return`${m[3]}-${m[2]}-${m[1]}`;m=x.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:""}
function accessoryTier(price:number):{key:TierKey;rate:number}{if(price<=599000)return{key:"0",rate:5000};if(price<=2000000)return{key:"1",rate:10000};if(price<=4000000)return{key:"2",rate:20000};if(price<=6000000)return{key:"3",rate:40000};return{key:"4",rate:80000}}
function fresh(key:string,id:string,name:string,store:string):Calc{return{key,id,name,store,qty:{iphone:0,macbook:0,ipad:0,watch:0,accessories:0,qoala:0},incentive:{iphone:0,macbook:0,ipad:0,watch:0,accessories:0,qoala:0,total:0},accessoryTiers:{"0":{qty:0,rate:5000,incentive:0},"1":{qty:0,rate:10000,incentive:0},"2":{qty:0,rate:20000,incentive:0},"3":{qty:0,rate:40000,incentive:0},"4":{qty:0,rate:80000,incentive:0}},qoalaTiers:{low:{qty:0,rate:15000,incentive:0},high:{qty:0,rate:50000,incentive:0}},deviceLines:[],accessoryLines:[],qoalaLines:[],invalidAccessoryRows:0,invalidAccessoryQty:0,invalidQoalaRows:0,totalSoldQty:0,totalTransactions:0,duplicateRowsSkipped:0,sanityWarning:false,_transactions:new Set<string>()}}
function isQoala(group:string,category:string,type:string,desc:string,article:string){if(group!=="VAS")return false;const t=`${category} ${type} ${desc} ${article}`;return t.includes("QOALA")||t.includes("KLA")||category.includes("PROTEKSI")}
function deviceKind(group:string,category:string,type:string,desc:string):DeviceKey|null{
 if(group!=="DEVICES")return null;
 const demo=`${category} ${type} ${desc}`.includes("DEMO");if(demo)return null;
 if(category==="IPHONE")return"iphone";
 if(category==="MAC"||category==="MACBOOK")return"macbook";
 if(category==="IPAD")return"ipad";
 if(category==="APPLE WATCH"||category==="WATCH")return"watch";
 return null;
}
function headerIndex(header:Raw,name:string){const target=name.trim().toUpperCase();return header.findIndex(v=>up(v)===target)}

async function calculate(period:string,force:boolean,email:string,key:string){
 const c=cache.get(period);if(!force&&c&&Date.now()-c.at<CACHE_MS)return c.rows;
 const year=period.slice(0,4),id=SALES[year];if(!id)throw new Error("Source tahun tidak tersedia");
 const ranges=await getSheetRanges(id,STORES.map(code=>`'${code}'!A:O`),email,key);
 const byKey=new Map<string,Calc>();
 for(let si=0;si<STORES.length;si++){
  const store=STORES[si],rows=(ranges[si]??[]) as Raw[];if(!rows.length)continue;
  const h=rows[0];
  const ix={date:headerIndex(h,"Tanggal"),staffId:headerIndex(h,"Employee Number"),staffName:headerIndex(h,"Nama Staff"),category:headerIndex(h,"Product Category"),type:headerIndex(h,"Type"),group:headerIndex(h,"Product Group"),article:headerIndex(h,"Article Number"),desc:headerIndex(h,"Description"),qty:headerIndex(h,"Qty"),normalPrice:headerIndex(h,"Harga Normal"),localAmount:headerIndex(h,"Local Amount"),txn:headerIndex(h,"Transaction No")};
  if(Object.values(ix).some(v=>v<0))throw new Error(`Header sales ${store} tidak lengkap`);
  const seen=new Set<string>();
  for(const r of rows.slice(1)){
   const date=iso(r[ix.date]);if(!date.startsWith(period))continue;
   if(containsVoucher(r))continue;
   const staffId=s(r[ix.staffId]).replace(/\.0$/,"");const staffName=s(r[ix.staffName]);const exactName=normalizeName(staffName);if(!staffId&&!exactName)continue;
   const idKey=staffId?`NIK:${staffId}`:`NAME:${exactName}`,rowKey=`${store}|${idKey}`,displayName=staffName||staffId;
   let out=byKey.get(rowKey);if(!out){out=fresh(rowKey,staffId||exactName,displayName,store);byKey.set(rowKey,out)}
   const category=up(r[ix.category]),type=up(r[ix.type]),group=up(r[ix.group]),article=s(r[ix.article]),desc=s(r[ix.desc]),qtyRaw=n(r[ix.qty]),qty=qtyRaw>0?qtyRaw:0,normalPrice=n(r[ix.normalPrice]),localAmount=n(r[ix.localAmount]),txn=s(r[ix.txn]);
   if(qty<=0)continue;
   const combined=`${category} ${type} ${group} ${up(desc)}`;if(combined.includes("DEMO"))continue;
   if(txn){const duplicateKey=[store,date,txn,idKey,article,qty,localAmount,normalPrice,category,group].join("|");if(seen.has(duplicateKey)){out.duplicateRowsSkipped++;continue}seen.add(duplicateKey)}
   out.totalSoldQty+=qty;if(txn)out._transactions.add(txn);
   const dk=deviceKind(group,category,type,up(desc));
   if(dk){const rate=dk==="iphone"?15000:dk==="macbook"?30000:10000,line=rate*qty;out.qty[dk]+=qty;out.incentive[dk]+=line;out.deviceLines.push({product:dk==="iphone"?"iPhone":dk==="macbook"?"MacBook":dk==="ipad"?"iPad":"Apple Watch",article,description:desc,qty,rate,incentive:line,transaction:txn});continue}
   if(group==="ACCESSORIES"){
    const unit=Math.abs(localAmount)/qty;
    if(!Number.isFinite(unit)||unit<=0){out.invalidAccessoryRows++;out.invalidAccessoryQty+=qty;continue}
    const tier=accessoryTier(unit),line=tier.rate*qty;out.qty.accessories+=qty;out.incentive.accessories+=line;out.accessoryTiers[tier.key].qty+=qty;out.accessoryTiers[tier.key].incentive+=line;out.accessoryLines.push({article,description:desc,qty,unitPrice:unit,tier:`Tier ${tier.key}`,rate:tier.rate,incentive:line,transaction:txn});continue
   }
   if(isQoala(group,category,type,up(desc),up(article))){
    const unit=Math.abs(localAmount)/qty;if(!Number.isFinite(unit)||unit<=0){out.invalidQoalaRows++;continue}
    const high=unit>=1315000,target=high?out.qoalaTiers.high:out.qoalaTiers.low,line=target.rate*qty;out.qty.qoala+=qty;out.incentive.qoala+=line;target.qty+=qty;target.incentive+=line;out.qoalaLines.push({article,description:desc,qty,unitPrice:unit,bucket:high?">= 1.315.000":"< 1.315.000",rate:target.rate,incentive:line,transaction:txn});
   }
  }
 }
 const rows=[...byKey.values()].map(r=>{r.totalTransactions=r._transactions.size;r.sanityWarning=r.qty.accessories>r.totalSoldQty;r.incentive.total=r.incentive.iphone+r.incentive.macbook+r.incentive.ipad+r.incentive.watch+r.incentive.accessories+r.incentive.qoala;return r}).sort((a,b)=>b.incentive.total-a.incentive.total||a.name.localeCompare(b.name));
 cache.set(period,{at:Date.now(),rows});return rows;
}

export async function GET(req:NextRequest){
 const period=req.nextUrl.searchParams.get("period")||"2026-09";
 if(!/^(2025|2026)-(0[1-9]|1[0-2])$/.test(period))return NextResponse.json({error:"Periode tidak valid"},{status:400});
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const force=req.nextUrl.searchParams.has("refresh"),rows=await calculate(period,force,email,key),detailKey=req.nextUrl.searchParams.get("detailKey");
  if(detailKey){const row=rows.find(r=>r.key===detailKey);if(!row)return NextResponse.json({error:"Detail staff tidak ditemukan"},{status:404});const{_transactions,...safe}=row;return NextResponse.json({period,row:safe},{headers:{"cache-control":"private, max-age=0, must-revalidate"}})}
  const summaryRows=rows.map(({accessoryTiers,qoalaTiers,deviceLines,accessoryLines,qoalaLines,_transactions,...r})=>r);
  return NextResponse.json({period,stores:STORES,rows:summaryRows},{headers:{"cache-control":"private, max-age=0, must-revalidate"}});
 }catch(e){console.error("jakarta1-incentive",e);return NextResponse.json({error:"Data Est Incentive Jakarta 1 gagal dimuat. Silakan coba kembali."},{status:500})}
}
