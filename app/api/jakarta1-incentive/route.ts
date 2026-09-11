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
type Calc={
 key:string;id:string;name:string;store:string;
 qty:{iphone:number;macbook:number;ipad:number;watch:number;accessories:number;qoala:number};
 incentive:{iphone:number;macbook:number;ipad:number;watch:number;accessories:number;qoala:number;total:number};
 accessoryTiers:Record<TierKey,{qty:number;rate:number;incentive:number}>;
 qoalaTiers:{low:{qty:number;rate:number;incentive:number};high:{qty:number;rate:number;incentive:number}};
 invalidAccessoryRows:number;invalidAccessoryQty:number;invalidQoalaRows:number;
};
type Cached={at:number;rows:Calc[]};
const cache=new Map<string,Cached>();

const s=(v:unknown)=>String(v??"").trim();
const up=(v:unknown)=>s(v).toUpperCase();
function n(v:unknown){if(typeof v==="number")return Number.isFinite(v)?v:0;const x=Number(s(v).replace(/\s/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(",",".").replace(/[^0-9.-]/g,""));return Number.isFinite(x)?x:0}
function iso(v:unknown){if(typeof v==="number"&&v>20000)return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);const x=s(v);let m=x.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);if(m)return`${m[3]}-${m[2]}-${m[1]}`;m=x.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:""}
function accessoryTier(price:number):{key:TierKey;rate:number}{if(price<=599000)return{key:"0",rate:5000};if(price<=2000000)return{key:"1",rate:10000};if(price<=4000000)return{key:"2",rate:20000};if(price<=6000000)return{key:"3",rate:40000};return{key:"4",rate:80000}}
function fresh(key:string,id:string,name:string,store:string):Calc{return{key,id,name,store,qty:{iphone:0,macbook:0,ipad:0,watch:0,accessories:0,qoala:0},incentive:{iphone:0,macbook:0,ipad:0,watch:0,accessories:0,qoala:0,total:0},accessoryTiers:{"0":{qty:0,rate:5000,incentive:0},"1":{qty:0,rate:10000,incentive:0},"2":{qty:0,rate:20000,incentive:0},"3":{qty:0,rate:40000,incentive:0},"4":{qty:0,rate:80000,incentive:0}},qoalaTiers:{low:{qty:0,rate:15000,incentive:0},high:{qty:0,rate:50000,incentive:0}},invalidAccessoryRows:0,invalidAccessoryQty:0,invalidQoalaRows:0}}
function isQoala(group:string,category:string,brand:string,type:string,desc:string){if(group!=="VAS")return false;const t=`${category} ${brand} ${type} ${desc}`;return t.includes("QOALA")||t.includes("KLA")||category.includes("PROTEKSI")}

async function calculate(period:string,force:boolean,email:string,key:string){
 const c=cache.get(period);if(!force&&c&&Date.now()-c.at<CACHE_MS)return c.rows;
 const year=period.slice(0,4),id=SALES[year];if(!id)throw new Error("Source tahun tidak tersedia");
 const ranges=await getSheetRanges(id,STORES.map(code=>`'${code}'!A:O`),email,key);
 const byKey=new Map<string,Calc>();
 for(let si=0;si<STORES.length;si++){
  const store=STORES[si],rows=(ranges[si]??[]) as Raw[];
  for(const r of rows.slice(1)){
   const date=iso(r[1]);if(!date.startsWith(period))continue;
   const staffId=s(r[4]).replace(/\.0$/,"");const staffName=s(r[5]);if(!staffId&&!staffName)continue;
   const name=staffName||staffId,idKey=staffId||name.toUpperCase(),rowKey=`${store}|${idKey}`;
   let out=byKey.get(rowKey);if(!out){out=fresh(rowKey,idKey,name,store);byKey.set(rowKey,out)}
   const category=up(r[6]),brand=up(r[7]),group=up(r[8]),type=up(r[9]),desc=up(r[10]),qty=Math.max(0,n(r[11])),amount=n(r[13]);
   if(qty<=0)continue;
   const combined=`${category} ${brand} ${group} ${type} ${desc}`;if(combined.includes("DEMO"))continue;
   if(brand==="APPLE"&&group==="DEVICES"){
    if(category==="IPHONE"||category.includes("IPHONE")){out.qty.iphone+=qty;out.incentive.iphone+=qty*15000}
    else if(category==="MAC"||category.includes("MACBOOK")){out.qty.macbook+=qty;out.incentive.macbook+=qty*30000}
    else if(category==="IPAD"||category.includes("IPAD")){out.qty.ipad+=qty;out.incentive.ipad+=qty*10000}
    else if(category==="APPLE WATCH"||category==="WATCH"||category.includes("APPLE WATCH")){out.qty.watch+=qty;out.incentive.watch+=qty*10000}
   }else if(group==="ACCESSORIES"){
    const unit=Math.abs(amount)/qty;
    if(!Number.isFinite(unit)||unit<=0){out.invalidAccessoryRows++;out.invalidAccessoryQty+=qty}
    else{const tier=accessoryTier(unit),line=tier.rate*qty;out.qty.accessories+=qty;out.incentive.accessories+=line;out.accessoryTiers[tier.key].qty+=qty;out.accessoryTiers[tier.key].incentive+=line}
   }else if(isQoala(group,category,brand,type,desc)){
    const unit=Math.abs(amount)/qty;
    if(!Number.isFinite(unit)||unit<=0)out.invalidQoalaRows++;
    else{const target=unit>=1315000?out.qoalaTiers.high:out.qoalaTiers.low;const line=target.rate*qty;out.qty.qoala+=qty;out.incentive.qoala+=line;target.qty+=qty;target.incentive+=line}
   }
  }
 }
 const rows=[...byKey.values()].map(r=>{r.incentive.total=r.incentive.iphone+r.incentive.macbook+r.incentive.ipad+r.incentive.watch+r.incentive.accessories+r.incentive.qoala;return r}).sort((a,b)=>b.incentive.total-a.incentive.total||a.name.localeCompare(b.name));
 cache.set(period,{at:Date.now(),rows});return rows;
}

export async function GET(req:NextRequest){
 const period=req.nextUrl.searchParams.get("period")||"2026-09";
 if(!/^(2025|2026)-(0[1-9]|1[0-2])$/.test(period))return NextResponse.json({error:"Periode tidak valid"},{status:400});
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const force=req.nextUrl.searchParams.has("refresh"),rows=await calculate(period,force,email,key),detailKey=req.nextUrl.searchParams.get("detailKey");
  if(detailKey){const row=rows.find(r=>r.key===detailKey);if(!row)return NextResponse.json({error:"Detail staff tidak ditemukan"},{status:404});return NextResponse.json({period,row},{headers:{"cache-control":"private, max-age=0, must-revalidate"}})}
  const summaryRows=rows.map(({accessoryTiers,qoalaTiers,...r})=>r);
  return NextResponse.json({period,stores:STORES,rows:summaryRows},{headers:{"cache-control":"private, max-age=0, must-revalidate"}});
 }catch(e){console.error("jakarta1-incentive",e);return NextResponse.json({error:"Data Est Incentive Jakarta 1 gagal dimuat. Silakan coba kembali."},{status:500})}
}
