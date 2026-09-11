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
 const type=typeRaw.toUpperCase(),desc=descRaw.toUpperCase(),group=groupRaw.toUpperCase(),category=categoryRaw.toUpperCase(),brand=brandRaw.toUpperCase();
 const combined=`${type} ${desc} ${group} ${category}`;
 // Priority 1: exclude all DEMO rows before any product classification.
 if(combined.includes("DEMO"))return"excluded";
 // Priority 2: Devices — one article can only land in one device tab.
 if(type.includes("PHONE")||desc.includes("IPHONE"))return"iphone";
 if(type.includes("TABLET")||desc.includes("IPAD"))return"ipad";
 if(/NOTEBOOK|LAPTOP|DESKTOP|COMPUTER/.test(type)||/MACBOOK|IMAC|MAC MINI|MAC STUDIO|MAC PRO/.test(desc))return"mac";
 if(type.includes("WATCH")||desc.includes("APPLE WATCH")||/^AW\s/.test(desc))return"watch";
 // Priority 3: Apple accessories. Generic Pencil/Keyboard terms require Apple brand;
 // AirPods and explicit Apple/Magic product names are treated as Apple accessories.
 const isAirPods=/AIRPODS?/.test(desc)||/AIRPODS?/.test(type);
 const explicitAppleAccessory=/APPLE\s+PENCIL|APPLE\s+KEYBOARD|MAGIC\s+KEYBOARD/.test(desc);
 const genericAppleAccessory=brand==="APPLE"&&(/PENCIL|STYLUS|KEY ?BOARD/.test(`${desc} ${type}`));
 if(isAirPods||explicitAppleAccessory||genericAppleAccessory)return"apple-accessory";
 // Priority 4: every remaining Accessories row goes to third-party Accessories.
 if(group==="ACCESSORIES")return"accessories";
 return"other";
}
function todayJakarta(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}

async function readSource(force:boolean,email:string,key:string){if(!force&&cache&&Date.now()-cache.at<CACHE_MS)return cache.data;const [range]=await getSheetRanges(OPS,[`'${SHEET}'!A1:Q3299`],email,key);const src=(range??[]) as Row[];const storeRow=src[2]??[],dateRow=src[3]??[],header=src[7]??[];const stores=storeRow.slice(1).map(v=>String(v??"").trim()).filter(v=>/^M\d{3}$/i.test(v));const updates:Record<string,string>={};stores.forEach((code,i)=>updates[code]=dateKey(dateRow[i+1]));const idx=(name:string)=>header.findIndex(v=>String(v??"").trim().toLowerCase()===name.toLowerCase());const ai=idx("Article Number"),di=idx("Description"),bi=idx("Brand"),ci=idx("Category"),pgi=idx("Product Group"),ti=idx("Type"),bci=idx("Barcode");const storeCols=Object.fromEntries(stores.map(code=>[code,header.findIndex(v=>String(v??"").trim().toUpperCase()===code.toUpperCase())]));if(ai<0||di<0||!stores.length)throw new Error("Struktur SOH FINAL tidak dikenali");const rows=src.slice(8).map(r=>{const article=String(r[ai]??"").trim(),description=String(r[di]??"").trim();if(!article&&!description)return null;const stocks:Record<string,number>={};let totalArea=0;for(const code of stores){const q=storeCols[code]>=0?n(r[storeCols[code]]):0;stocks[code]=q;totalArea+=q}const brand=String(r[bi]??"").trim(),category=String(r[ci]??"").trim(),productGroup=String(r[pgi]??"").trim(),type=String(r[ti]??"").trim();return{article,description,brand,category,productGroup,type,barcode:String(r[bci]??"").trim(),stocks,totalArea,bucket:bucket(type,description,productGroup,category,brand)}}).filter(Boolean) as SohRow[];const data={stores,updates,rows,refreshedAt:new Date().toISOString()};cache={at:Date.now(),data};return data}

export async function GET(req:NextRequest){const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({error:"Data SOH Jakarta 1 gagal dimuat. Silakan coba kembali."},{status:503});const category=req.nextUrl.searchParams.get("category")||"iphone",force=req.nextUrl.searchParams.has("refresh")||req.nextUrl.searchParams.has("t");try{const data=await readSource(force,email,key),today=todayJakarta(),stores=data.stores.map(code=>({code,lastUpdate:data.updates[code]||"",updatedToday:!!data.updates[code]&&data.updates[code]===today}));return NextResponse.json({source:"SPW & SOH Jakarta 1",sheet:"SOH FINAL",category,today,refreshedAt:data.refreshedAt,movementAvailable:false,stores,rows:data.rows.filter(r=>r.bucket===category).map(({bucket,...r})=>r)},{headers:{"cache-control":"private, max-age=0, must-revalidate"}})}catch(e){console.error("jakarta1-soh",e);return NextResponse.json({error:"Data SOH Jakarta 1 gagal dimuat. Silakan coba kembali."},{status:500})}}
