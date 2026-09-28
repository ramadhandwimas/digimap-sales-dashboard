import {NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const DASHBOARD_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const STORE="M238";
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
function minusDays(date:string,days:number){const d=new Date(date+"T00:00:00Z");d.setUTCDate(d.getUTCDate()-days);return d.toISOString().slice(0,10)}
const accessory=/CASE|COVER|FOLIO|SMART\s*FOLIO|GLASS|TEMPERED|SCREEN|PROTECTOR|KEYBOARD|PENCIL|AIR\s*PODS?|EARPODS|CABLE|CHARGER|ADAPTER|ADAPTOR|MOUSE|TRACKPAD|BAND|STRAP|SLEEVE|HUB|DOCK|POWER|WALLET|MAGSAFE|UNI\s*Q|STM|UAG|IMPACT|MOVEMENT|CAM\s*CLICK|AC\s*PLUS|APPLECARE|CARE\s*PLUS|WARRANTY|SERVICE|ACCESSORY|ACCY/i;
function isDevice(article:string,description:string){
 const text=up(`${article} ${description}`);
 if(!/^APP/i.test(article)||accessory.test(text))return false;
 return /\bIPHONE\b|\bIPAD\b|MACBOOK|\bMBA\b|\bMBP\b|MAC\s*NEO|\bNEO\b|APPLE\s*WATCH|\bWATCH\b|\bAW\s*(?:SE|S\d|ULTRA)/.test(text);
}

export async function GET(){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const [dates,articleDesc,qtys,stores]=await getSheetRanges(DASHBOARD_ID,["'Data Copas'!A2:A50000","'Data Copas'!E2:F50000","'Data Copas'!H2:H50000","'Data Copas'!P2:P50000"],email,key);
  const len=Math.max(dates.length,articleDesc.length,qtys.length,stores.length);
  let latest="";
  for(let i=0;i<len;i++){const d=iso(dates[i]?.[0]);if(d&&d>latest)latest=d}
  const start=latest?minusDays(latest,29):"";
  const qtyByArticle:Record<string,number>={};
  for(let i=0;i<len;i++){
   const date=iso(dates[i]?.[0]),article=s(articleDesc[i]?.[0]),description=s(articleDesc[i]?.[1]),store=up(stores[i]?.[0]);
   if(!date||!article||store!==STORE||!latest||date<start||date>latest||!isDevice(article,description))continue;
   const keyArticle=up(article);qtyByArticle[keyArticle]=(qtyByArticle[keyArticle]||0)+n(qtys[i]?.[0]);
  }
  return NextResponse.json({from:start,to:latest,qtyByArticle},{headers:{"cache-control":"private, max-age=120, stale-while-revalidate=300"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca demand 30 hari"},{status:500})}
}
