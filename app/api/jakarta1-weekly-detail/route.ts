import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const SALES:Record<string,string>={
  "2025":"1NnRW70VyrtV8c89_M08gTnOGbtzeldSy8gL-gm4GjJ0",
  "2026":"151Qfrz3RZnDMgZjKOPt5s_aS-zscSiOTCWodbUDWM1k"
};
const STORE_CODES=["M117","M118","M124","M127","M217","M227","M238","M255","M264"] as const;
type Row=unknown[];
function n(v:unknown){if(typeof v==="number")return Number.isFinite(v)?v:0;const s=String(v??"").trim();if(!s)return 0;const cleaned=s.replace(/\s/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(",",".").replace(/[^0-9.-]/g,"");const x=Number(cleaned);return Number.isFinite(x)?x:0}
function dateKey(v:unknown){if(typeof v==="number"&&v>20000){const d=new Date(Date.UTC(1899,11,30)+v*86400000);return d.toISOString().slice(0,10)}const s=String(v??"").trim();let m=s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);if(m)return `${m[3]}-${m[2]}-${m[1]}`;m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:""}
function weekInfo(date:string){const d=new Date(`${date}T00:00:00Z`),anchor=new Date("2026-06-28T00:00:00Z"),days=Math.floor((d.getTime()-anchor.getTime())/86400000),weekIndex=Math.floor(days/7);let qIndex=Math.floor(weekIndex/13),w=((weekIndex%13)+13)%13+1;let q=4+qIndex;while(q<1)q+=4;while(q>4)q-=4;const start=new Date(anchor.getTime()+weekIndex*7*86400000),end=new Date(start.getTime()+6*86400000);return{key:start.toISOString().slice(0,10),label:`Week ${w} Q${q}`,start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)}}
function lob(cat:string,desc:string){const x=`${cat} ${desc}`;if(x.includes("AIRPOD"))return"AirPods";if(x.includes("IPHONE"))return"iPhone";if(x.includes("MAC")||x.includes("MACBOOK"))return"Macbook";if(x.includes("IPAD"))return"iPad";if(x.includes("WATCH")||/\bAW\b/.test(x))return"Watch";return"Other"}
function productType(cat:string,desc:string){const d=desc.replace(/\s+/g," ").trim();return d||cat||"Unknown"}
function vasType(cat:string,desc:string){const x=`${cat} ${desc}`;if(x.includes("QOALA")||x.includes("PROTEKSI"))return"QOALA";if(x.includes("TELKOMSEL")||x.includes("HALO"))return"TELKOMSEL";if(x.includes("XL")||x.includes("MYPRIO"))return"XL";if(x.includes("INDOSAT")||x.includes("IM3"))return"INDOSAT";return"OTHER"}

export async function GET(req:NextRequest){
 const year=req.nextUrl.searchParams.get("year")||"2026";
 if(!/^(2025|2026)$/.test(year))return NextResponse.json({error:"Tahun tidak valid"},{status:400});
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const rowsByStore=await getSheetRanges(SALES[year],STORE_CODES.map(c=>`'${c}'!A:O`),email,key);
  const detail=new Map<string,{key:string;label:string;start:string;end:string;store:string;category:string;type:string;qty:number;amount:number}>(),vas=new Map<string,{key:string;label:string;start:string;end:string;store:string;category:string;qty:number;amount:number}>();
  for(let i=0;i<STORE_CODES.length;i++)for(const row of (rowsByStore[i]??[] as Row[]).slice(1)){
   const d=dateKey(row[1]);if(!d.startsWith(`${year}-`))continue;const code=STORE_CODES[i],cat=String(row[6]??"").toUpperCase(),group=String(row[8]??"").toUpperCase(),desc=String(row[10]??"").toUpperCase(),qty=n(row[11]),amount=n(row[13]),w=weekInfo(d);
   const category=lob(cat,desc);if(group==="DEVICES"&&category!=="Other"){const type=productType(cat,desc),k=`${w.key}|${code}|${category}|${type}`,x=detail.get(k)??{...w,store:code,category,type,qty:0,amount:0};x.qty+=qty;x.amount+=amount;detail.set(k,x)}
   if(group==="VAS"){const category=vasType(cat,desc),k=`${w.key}|${code}|${category}`,x=vas.get(k)??{...w,store:code,category,qty:0,amount:0};x.qty+=qty;x.amount+=amount;vas.set(k,x)}
  }
  return NextResponse.json({year,source:`Data Compile ${year} Jakarta 1`,stores:STORE_CODES,detail:[...detail.values()],vas:[...vas.values()]},{headers:{"cache-control":"public, max-age=60, stale-while-revalidate=240"}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca detail weekly Jakarta 1"},{status:500})}
}
