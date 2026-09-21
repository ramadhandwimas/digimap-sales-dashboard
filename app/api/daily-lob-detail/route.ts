import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const NORMALIZED="SALES DASHBOARD DATA";
const STORE="M238";

const txt=(v:unknown)=>String(v??"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim();
const up=(v:unknown)=>txt(v).toUpperCase();
const num=(v:unknown)=>typeof v==="number"?v:Number(txt(v).replace(/\./g,"").replace(/,/g,".").replace(/[^0-9.-]/g,""))||0;
function iso(v:unknown){if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);const x=txt(v);if(/^\d{2}-\d{2}-\d{4}$/.test(x)){const[d,m,y]=x.split("-");return`${y}-${m}-${d}`}if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);return""}

type T={qty:number;value:number};
type ProductT=T&{name:string};
type StaffRec={id:string;name:string;products:Record<string,T>;total:T;deviceTotal:T;lob:Record<string,T>};
const fresh=():T=>({qty:0,value:0});
const add=(t:T,q:number,v:number)=>{t.qty+=q;t.value+=v};

function lobKey(category:string,scheme:string,brand:string,type:string,description:string){
 const c=up(category),s=up(scheme),b=up(brand),text=`${c} ${up(type)} ${up(description)}`;
 if(s==="DEVICES"){
  if(/IPHONE/.test(c)||/IPHONE/.test(text))return"iphone";
  if(/^MAC$|MACBOOK/.test(c)||/MACBOOK/.test(text))return"mac";
  if(/IPAD/.test(c)||/IPAD/.test(text))return"ipad";
  if(/APPLE WATCH|SMARTWATCH|WATCH/.test(c)||/APPLE WATCH|WATCH SERIES|WATCH SE|WATCH ULTRA/.test(text))return"watch";
 }
 if((s==="ACCESSORIES"||s==="DEVICES")&&b==="APPLE"&&(/AIRPODS/.test(c)||/AIRPODS/.test(text)))return"airpods";
 return"";
}
function prettyFallback(type:string,description:string,article:string){
 const t=txt(type),d=txt(description),a=txt(article);
 const raw=t||d||a||"";
 return raw.length>70?raw.slice(0,67)+"…":raw;
}
function productName(type:string,description:string,category:string,article:string){
 const x=`${type} ${description} ${category} ${article}`.toUpperCase().replace(/\s+/g," ");
 if(/IPHONE\s*17\s*PRO\s*MAX/.test(x))return"iPhone 17 Pro Max";
 if(/IPHONE\s*17\s*PRO/.test(x))return"iPhone 17 Pro";
 if(/IPHONE\s*17(?!\s*PRO)/.test(x))return"iPhone 17";
 if(/IPHONE\s*AIR/.test(x))return"iPhone Air";
 if(/IPHONE\s*16\s*PLUS/.test(x))return"iPhone 16 Plus";
 if(/IPHONE\s*16\s*PRO\s*MAX/.test(x))return"iPhone 16 Pro Max";
 if(/IPHONE\s*16\s*PRO/.test(x))return"iPhone 16 Pro";
 if(/IPHONE\s*16/.test(x))return"iPhone 16";
 if(/IPHONE\s*15\s*PLUS/.test(x))return"iPhone 15 Plus";
 if(/IPHONE\s*15\s*PRO\s*MAX/.test(x))return"iPhone 15 Pro Max";
 if(/IPHONE\s*15\s*PRO/.test(x))return"iPhone 15 Pro";
 if(/IPHONE\s*15/.test(x))return"iPhone 15";

 if(/MACBOOK.*NEO|\bMBN\b/.test(x))return"MacBook Neo";
 if(/MACBOOK\s*AIR.*M5|MBA.*M5/.test(x))return"MacBook Air M5";
 if(/MACBOOK\s*AIR.*M4|MBA.*M4/.test(x))return"MacBook Air M4";
 if(/MACBOOK\s*AIR.*M3|MBA.*M3/.test(x))return"MacBook Air M3";
 if(/MACBOOK\s*AIR.*M2|MBA.*M2/.test(x))return"MacBook Air M2";
 if(/MACBOOK\s*PRO.*M5|MBP.*M5/.test(x))return"MacBook Pro M5";
 if(/MACBOOK\s*PRO.*M4|MBP.*M4/.test(x))return"MacBook Pro M4";
 if(/MACBOOK\s*PRO.*M3|MBP.*M3/.test(x))return"MacBook Pro M3";

 if(/IPAD\s*AIR.*13.*M4/.test(x))return"iPad Air 13 M4";
 if(/IPAD\s*AIR.*11.*M4/.test(x))return"iPad Air 11 M4";
 if(/IPAD\s*PRO.*13/.test(x))return"iPad Pro 13";
 if(/IPAD\s*PRO.*11/.test(x))return"iPad Pro 11";
 if(/IPAD\s*MINI/.test(x))return"iPad mini";
 if(/\bIPAD\s*(?:11|11TH)\b/.test(x))return"iPad 11";

 if(/WATCH.*ULTRA.*3|AW.*ULTRA.*3/.test(x))return"Apple Watch Ultra 3";
 if(/WATCH.*SE.*3|AW.*SE.*3/.test(x))return"Apple Watch SE 3";
 if(/WATCH.*SERIES.*11|WATCH.*S11|AW.*S11/.test(x))return"Apple Watch Series 11";
 if(/WATCH.*SERIES.*10|WATCH.*S10|AW.*S10/.test(x))return"Apple Watch Series 10";

 if(/AIRPODS.*PRO.*3|APP.*PRO.*3/.test(x))return"AirPods Pro 3";
 if(/AIRPODS.*4.*ANC|AIRPODS.*ANC.*4/.test(x))return"AirPods 4 ANC";
 if(/AIRPODS.*4/.test(x))return"AirPods 4";

 return prettyFallback(type,description,article);
}

function parseRow(r:unknown[]){
 return{
  date:iso(r[0]),id:txt(r[1]),name:txt(r[2]),article:txt(r[4]),description:txt(r[5]),type:txt(r[6]),
  qty:num(r[7]),value:num(r[8]),category:txt(r[9]),brand:txt(r[10]),scheme:txt(r[12]),store:up(r[15])
 };
}

export async function GET(req:NextRequest){
 const date=req.nextUrl.searchParams.get("date")||new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const[normalized]=await getSheetRanges(MASTER_ID,[`'${NORMALIZED}'!A2:Q50000`],email,key);
  let rows=(normalized||[]).map(parseRow).filter(r=>r.date===date&&(!r.store||r.store===STORE));

  let source="MASTER DATA M238 → SALES DASHBOARD DATA";
  if(!rows.length){
   const[dataCopas]=await getSheetRanges(SOURCE_ID,["'Data Copas'!A2:S50000"],email,key);
   rows=(dataCopas||[]).map(parseRow).filter(r=>r.date===date&&(!r.store||r.store===STORE));
   source="Data Copas fallback";
  }

  const staff=new Map<string,StaffRec>();
  const productTotals=new Map<string,T>();
  for(const r of rows){
   const key=lobKey(r.category,r.scheme,r.brand,r.type,r.description);
   if(!key||r.qty===0)continue;
   const personKey=r.id||r.name;if(!personKey)continue;
   let rec=staff.get(personKey);
   if(!rec){rec={id:r.id||personKey,name:r.name||personKey,products:{},total:fresh(),deviceTotal:fresh(),lob:{iphone:fresh(),mac:fresh(),ipad:fresh(),watch:fresh(),airpods:fresh()}};staff.set(personKey,rec)}
   const model=productName(r.type,r.description,r.category,r.article);
   rec.products[model]||=fresh();
   add(rec.products[model],r.qty,r.value);add(rec.total,r.qty,r.value);add(rec.deviceTotal,r.qty,r.value);add(rec.lob[key],r.qty,r.value);
   const total=productTotals.get(model)||fresh();add(total,r.qty,r.value);productTotals.set(model,total);
  }

  const products:ProductT[]=[...productTotals.entries()].map(([name,t])=>({name,...t})).sort((a,b)=>b.qty-a.qty||a.name.localeCompare(b.name));
  return NextResponse.json({
   date,source,
   staff:[...staff.values()],
   lob:{products,staff:[...staff.values()]}
  },{headers:{"Cache-Control":"private, max-age=30, stale-while-revalidate=60"}});
 }catch(e){
  return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca Daily LOB"},{status:500})
 }
}
