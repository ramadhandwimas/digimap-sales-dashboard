import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const SALES_2026="151Qfrz3RZnDMgZjKOPt5s_aS-zscSiOTCWodbUDWM1k";
const STORE_CODES=["M117","M118","M124","M127","M217","M227","M238","M255","M264"] as const;
type Row=unknown[];
function n(v:unknown){if(typeof v==="number")return Number.isFinite(v)?v:0;const s=String(v??"").trim();if(!s)return 0;const cleaned=s.replace(/\s/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(",",".").replace(/[^0-9.-]/g,"");const x=Number(cleaned);return Number.isFinite(x)?x:0}
function dateKey(v:unknown){if(typeof v==="number"&&v>20000){const d=new Date(Date.UTC(1899,11,30)+v*86400000);return d.toISOString().slice(0,10)}const s=String(v??"").trim();let m=s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);if(m)return `${m[3]}-${m[2]}-${m[1]}`;m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:""}
function weekInfo(date:string){const d=new Date(`${date}T00:00:00Z`),anchor=new Date("2026-06-28T00:00:00Z"),days=Math.floor((d.getTime()-anchor.getTime())/86400000),weekIndex=Math.floor(days/7);let qIndex=Math.floor(weekIndex/13),w=((weekIndex%13)+13)%13+1;let q=4+qIndex;while(q<1)q+=4;while(q>4)q-=4;const start=new Date(anchor.getTime()+weekIndex*7*86400000),end=new Date(start.getTime()+6*86400000);return{key:start.toISOString().slice(0,10),label:`Week ${w} Q${q}`,start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)}}
function lob(cat:string,desc:string){const x=`${cat} ${desc}`;if(x.includes("AIRPOD"))return"AirPods";if(x.includes("IPHONE"))return"iPhone";if(x.includes("MAC")||x.includes("MACBOOK")||x.includes("MBA")||x.includes("MBP")||x.includes("MBN"))return"MacBook";if(x.includes("IPAD"))return"iPad";if(x.includes("WATCH")||/\bAW\b/.test(x))return"Watch";return"Other"}
function prettyType(cat:string,desc:string){const x=`${cat} ${desc}`.replace(/\s+/g," ").toUpperCase();
 if(/AIRPODS?\s*PRO.*(GEN\s*3|3RD|3)/.test(x))return"AirPods Pro Gen3";if(/AIRPODS?\s*MAX/.test(x))return"AirPods Max 2";if(/AIRPODS?\s*4/.test(x))return"AirPods 4";
 if(/IPHONE\s*17\s*PRO\s*MAX/.test(x))return"iPhone 17 Pro Max";if(/IPHONE\s*17\s*PRO/.test(x))return"iPhone 17 Pro";if(/IPHONE\s*17E/.test(x))return"iPhone 17e";if(/IPHONE\s*AIR/.test(x))return"iPhone AIR";if(/IPHONE\s*17/.test(x))return"iPhone 17";if(/IPHONE\s*16\s*PRO\s*MAX/.test(x))return"iPhone 16 Pro Max";if(/IPHONE\s*16\s*PLUS/.test(x))return"iPhone 16 Plus";if(/IPHONE\s*16/.test(x))return"iPhone 16";if(/IPHONE\s*15/.test(x))return"iPhone 15";
 if(/MACBOOK\s*NEO|\bMBN\b/.test(x)){const size=x.match(/(13|15)[\s\"-]*(INCH|IN)?/)?.[1]??"13";return`MBN ${size}\"`};if(/MACBOOK\s*AIR|\bMBA\b/.test(x)){const size=x.match(/(13|15)[\s\"-]*(INCH|IN)?/)?.[1]??"13",chip=x.match(/\bM[1-9]\b/)?.[0]??"";return`MBA ${size}\"${chip?` ${chip}`:""}`};if(/MACBOOK\s*PRO|\bMBP\b/.test(x)){const size=x.match(/(14|16)[\s\"-]*(INCH|IN)?/)?.[1]??"14",chip=x.match(/\bM[1-9](?:\s*PRO|\s*MAX)?\b/)?.[0]??"";return`MBP ${size}\"${chip?` ${chip}`:""}`};if(/STUDIO\s*DISPLAY/.test(x))return"STUDIO DISPLAY";
 if(/IPAD\s*AIR\s*13/.test(x)){const chip=x.match(/\bM[1-9]\b/)?.[0]??"";return`iPad Air 13\"${chip?` ${chip}`:""}`};if(/IPAD\s*AIR\s*11/.test(x)){const chip=x.match(/\bM[1-9]\b/)?.[0]??"";return`iPad Air 11\"${chip?` ${chip}`:""}`};if(/IPAD\s*PRO\s*13/.test(x)){const chip=x.match(/\bM[1-9]\b/)?.[0]??"";return`iPad Pro 13\"${chip?` ${chip}`:""}`};if(/IPAD\s*PRO\s*11/.test(x)){const chip=x.match(/\bM[1-9]\b/)?.[0]??"";return`iPad Pro 11\"${chip?` ${chip}`:""}`};if(/IPAD\s*11/.test(x))return"iPad 11";
 if(/WATCH.*ULTRA/.test(x))return"Apple Watch Ultra";if(/WATCH.*SE\s*3|\bAW\s*SE\s*3/.test(x))return"Apple Watch SE 3";if(/WATCH.*S(ERIES)?\s*11|\bAW\s*S11/.test(x))return"Apple Watch S11";
 return desc.replace(/\s+/g," ").trim().replace(/\b\w/g,m=>m.toUpperCase())||cat;
}
function vasType(cat:string,desc:string){const x=`${cat} ${desc}`;if(x.includes("QOALA")||x.includes("PROTEKSI"))return"QOALA";if(x.includes("TELKOMSEL")||x.includes("HALO"))return"TELKOMSEL";if(x.includes("XL")||x.includes("MYPRIO"))return"XL";if(x.includes("INDOSAT")||x.includes("IM3"))return"INDOSAT";return"OTHER"}

export async function GET(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const rowsByStore=await getSheetRanges(SALES_2026,STORE_CODES.map(c=>`'${c}'!A:O`),email,key);
  const detail=new Map<string,{key:string;label:string;start:string;end:string;store:string;category:string;type:string;qty:number;amount:number}>(),vas=new Map<string,{key:string;label:string;start:string;end:string;store:string;category:string;qty:number;amount:number}>();
  for(let i=0;i<STORE_CODES.length;i++)for(const row of (rowsByStore[i]??[] as Row[]).slice(1)){
   const d=dateKey(row[1]);if(!d.startsWith("2026-"))continue;const code=STORE_CODES[i],cat=String(row[6]??"").toUpperCase(),group=String(row[8]??"").toUpperCase(),desc=String(row[10]??"").toUpperCase(),qty=n(row[11]),amount=n(row[13]),w=weekInfo(d);
   const category=lob(cat,desc);if(group==="DEVICES"&&category!=="Other"){const type=prettyType(cat,desc),k=`${w.key}|${code}|${category}|${type}`,x=detail.get(k)??{...w,store:code,category,type,qty:0,amount:0};x.qty+=qty;x.amount+=amount;detail.set(k,x)}
   if(group==="VAS"){const category=vasType(cat,desc),k=`${w.key}|${code}|${category}`,x=vas.get(k)??{...w,store:code,category,qty:0,amount:0};x.qty+=qty;x.amount+=amount;vas.set(k,x)}
  }
  return NextResponse.json({year:"2026",source:"Data Compile 2026 Jakarta 1",sourceId:SALES_2026,stores:STORE_CODES,detail:[...detail.values()],vas:[...vas.values()],generatedAt:new Date().toISOString()},{headers:{"cache-control":"no-store, max-age=0"}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca detail weekly Jakarta 1"},{status:500,headers:{"cache-control":"no-store"}})}
}
