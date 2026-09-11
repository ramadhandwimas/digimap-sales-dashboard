import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const OPS="1BjLDXdi_5BgZCUUJAKba-xYRFf0RDmRTT0FW1be03WE";
const SHEET="Soh Final";
const CACHE_MS=45_000;
type Row=unknown[];
type SohRow={article:string;description:string;brand:string;category:string;productGroup:string;type:string;barcode:string;stocks:Record<string,number>;totalArea:number;bucket:string};
type Parsed={stores:string[];updates:Record<string,string>;rows:SohRow[];refreshedAt:string};
let cache:{at:number;data:Parsed}|null=null;

function n(v:unknown){if(typeof v==="number")return Number.isFinite(v)?v:0;const s=String(v??"").trim().replace(/\./g,"").replace(",",".").replace(/[^0-9.-]/g,"");const x=Number(s);return Number.isFinite(x)?x:0}
function dateKey(v:unknown){if(typeof v==="number"&&v>20000){const d=new Date(Date.UTC(1899,11,30)+v*86400000);return d.toISOString().slice(0,10)}const s=String(v??"").trim();let m=s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);if(m)return `${m[3]}-${m[2]}-${m[1]}`;m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:""}
function bucket(typeRaw:string,descRaw:string,groupRaw:string,categoryRaw:string,brandRaw:string){
 const type=typeRaw.trim().toUpperCase(),desc=descRaw.trim().toUpperCase(),group=groupRaw.trim().toUpperCase(),category=categoryRaw.trim().toUpperCase(),brand=brandRaw.trim().toUpperCase();
 const combined=`${type} ${desc} ${group} ${category}`;

 // 1) DEMO is excluded from the operational SOH view before all other rules.
 if(combined.includes("DEMO"))return"excluded";

 // Product/source fields are authoritative for deciding whether a row is an accessory.
 // Description is deliberately NOT used as the sole basis for device classification.
 const sourceAccessory=/ACCESSOR/.test(group)||/ACCESSOR/.test(category)||/ACCESSOR/.test(type)||/CASE|COVER|FOLIO|SLEEVE|BAND|STRAP|WALLET|CHARGER|ADAPTER|CABLE|HUB|POWER\s?BANK|SCREEN|PROTECTOR|TEMPERED|HEADSET|EARPHONE|STYLUS|KEY ?BOARD/.test(type);

 // 2) Actual devices only. A row marked as accessory by source fields can never become a device,
 // even when its Description contains IPHONE/IPAD/MACBOOK/APPLE WATCH.
 if(!sourceAccessory){
  if(/(^|\b)(PHONE|SMARTPHONE|MOBILE PHONE)(\b|$)/.test(type)||/(^|\b)IPHONE(\b|$)/.test(category)||/(^|\b)IPHONE(\b|$)/.test(group))return"iphone";
  if(/(^|\b)(TABLET)(\b|$)/.test(type)||/(^|\b)IPAD(\b|$)/.test(category)||/(^|\b)IPAD(\b|$)/.test(group))return"ipad";
  if(/NOTEBOOK|LAPTOP|COMPUTER/.test(type)||/MACBOOK/.test(category)||/MACBOOK/.test(group))return"mac";
  if(/(^|\b)(WATCH|SMARTWATCH)(\b|$)/.test(type)||/APPLE WATCH/.test(category)||/APPLE WATCH/.test(group))return"watch";
 }

 // 3) Apple accessories: AirPods / Pencil / Keyboard only.
 const appleAccessoryName=/AIRPODS?/.test(desc)||/APPLE\s+PENCIL/.test(desc)||/MAGIC\s+KEYBOARD|APPLE\s+KEYBOARD/.test(desc);
 const appleAccessoryType=/AIRPODS?|STYLUS|PENCIL|KEY ?BOARD/.test(type);
 const appleBrandAccessory=brand==="APPLE"&&(appleAccessoryName||appleAccessoryType);
 if(appleAccessoryName||appleBrandAccessory)return"apple-accessory";

 // 4) Remaining accessories go to the general Accessories tab.
 // Common accessory names are accepted here only as a final fallback, never as a device signal.
 const accessoryByName=/CASE|COVER|FOLIO|SLEEVE|BAND|STRAP|WALLET|CHARGER|ADAPTER|CABLE|HUB|POWER\s?BANK|SCREEN\s*PROTECTOR|TEMPERED|SOUNDCORE|HEADSET|EARPHONE/.test(desc);
 if(sourceAccessory||group==="ACCESSORIES"||category==="ACCESSORIES"||accessoryByName)return"accessories";
 return"other";
}
function todayJakarta(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}

async function readSource(force:boolean,email:string,key:string){if(!force&&cache&&Date.now()-cache.at<CACHE_MS)return cache.data;const [range]=await getSheetRanges(OPS,[`'${SHEET}'!A1:Q3299`],email,key);const src=(range??[]) as Row[];const storeRow=src[2]??[],dateRow=src[3]??[],header=src[7]??[];const stores=storeRow.slice(1).map(v=>String(v??"").trim()).filter(v=>/^M\d{3}$/i.test(v));const updates:Record<string,string>={};stores.forEach((code,i)=>updates[code]=dateKey(dateRow[i+1]));const idx=(name:string)=>header.findIndex(v=>String(v??"").trim().toLowerCase()===name.toLowerCase());const ai=idx("Article Number"),di=idx("Description"),bi=idx("Brand"),ci=idx("Category"),pgi=idx("Product Group"),ti=idx("Type"),bci=idx("Barcode");const storeCols=Object.fromEntries(stores.map(code=>[code,header.findIndex(v=>String(v??"").trim().toUpperCase()===code.toUpperCase())]));if(ai<0||di<0||!stores.length)throw new Error("Struktur SOH FINAL tidak dikenali");const rows=src.slice(8).map(r=>{const article=String(r[ai]??"").trim(),description=String(r[di]??"").trim();if(!article&&!description)return null;const stocks:Record<string,number>={};let totalArea=0;for(const code of stores){const q=storeCols[code]>=0?n(r[storeCols[code]]):0;stocks[code]=q;totalArea+=q}const brand=String(r[bi]??"").trim(),category=String(r[ci]??"").trim(),productGroup=String(r[pgi]??"").trim(),type=String(r[ti]??"").trim();return{article,description,brand,category,productGroup,type,barcode:String(r[bci]??"").trim(),stocks,totalArea,bucket:bucket(type,description,productGroup,category,brand)}}).filter(Boolean) as SohRow[];const data={stores,updates,rows,refreshedAt:new Date().toISOString()};cache={at:Date.now(),data};return data}

export async function GET(req:NextRequest){const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({error:"Data SOH Jakarta 1 gagal dimuat. Silakan coba kembali."},{status:503});const category=req.nextUrl.searchParams.get("category")||"iphone",force=req.nextUrl.searchParams.has("refresh")||req.nextUrl.searchParams.has("t");try{const data=await readSource(force,email,key),today=todayJakarta(),stores=data.stores.map(code=>({code,lastUpdate:data.updates[code]||"",updatedToday:!!data.updates[code]&&data.updates[code]===today}));return NextResponse.json({source:"SPW & SOH Jakarta 1",sheet:"SOH FINAL",category,today,refreshedAt:data.refreshedAt,movementAvailable:false,stores,rows:data.rows.filter(r=>r.bucket===category).map(({bucket,...r})=>r)},{headers:{"cache-control":"private, max-age=0, must-revalidate"}})}catch(e){console.error("jakarta1-soh",e);return NextResponse.json({error:"Data SOH Jakarta 1 gagal dimuat. Silakan coba kembali."},{status:500})}}
