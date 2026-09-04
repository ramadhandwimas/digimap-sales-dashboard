import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const SALES_2026="151Qfrz3RZnDMgZjKOPt5s_aS-zscSiOTCWodbUDWM1k";
const STORE_CODES=["M117","M118","M124","M127","M217","M227","M238","M255","M264"] as const;
type Row=unknown[];
type Focus={iphone17promax:number;iphone17pro:number;iphone17:number;iphone15:number;iphone16:number;iphoneAir:number;macbookAirM5:number;macbookNeo:number;ipad11:number;awSe3:number};
let cache=new Map<string,{at:number,data:unknown}>();
const CACHE_MS=5*60*1000;
const emptyFocus=():Focus=>({iphone17promax:0,iphone17pro:0,iphone17:0,iphone15:0,iphone16:0,iphoneAir:0,macbookAirM5:0,macbookNeo:0,ipad11:0,awSe3:0});
const add=(a:Focus,b:Focus)=>{(Object.keys(a) as (keyof Focus)[]).forEach(k=>a[k]+=b[k])};
function n(v:unknown){if(typeof v==="number")return Number.isFinite(v)?v:0;const x=Number(String(v??"").replace(/[^0-9.-]/g,""));return Number.isFinite(x)?x:0}
function dateKey(v:unknown){if(typeof v==="number"&&v>20000){const d=new Date(Date.UTC(1899,11,30)+v*86400000);return d.toISOString().slice(0,10)}const s=String(v??"").trim();let m=s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);if(m)return`${m[3]}-${m[2]}-${m[1]}`;m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:""}
function focusOf(desc:string,qty:number){const f=emptyFocus(),q=Math.max(0,qty),d=desc.toUpperCase().replace(/\s+/g," ");if(/IPHONE 17 PRO\s*MAX|IPHONE 17 PROMAX/.test(d))f.iphone17promax+=q;else if(/IPHONE 17 PRO/.test(d))f.iphone17pro+=q;else if(/IPHONE 17(?!\s*(PRO|AIR))/.test(d))f.iphone17+=q;if(/IPHONE 15/.test(d))f.iphone15+=q;if(/IPHONE 16/.test(d))f.iphone16+=q;if(/IPHONE\s+AIR/.test(d))f.iphoneAir+=q;if(/MACBOOK AIR/.test(d)&&/M5/.test(d))f.macbookAirM5+=q;if(/MACBOOK NEO/.test(d))f.macbookNeo+=q;if(/IPAD\s+11/.test(d))f.ipad11+=q;if(/(APPLE\s+WATCH|AW).*SE\s*3|WATCH\s+SE\s*3/.test(d))f.awSe3+=q;return f}
function hasFocus(f:Focus){return Object.values(f).some(v=>v!==0)}

export async function GET(req:NextRequest){
 const period=req.nextUrl.searchParams.get("period")||"2026-09";
 if(!/^2026-(0[1-9]|1[0-2])$/.test(period))return NextResponse.json({error:"Periode tidak valid"},{status:400});
 const hit=cache.get(period);if(hit&&Date.now()-hit.at<CACHE_MS)return NextResponse.json(hit.data,{headers:{"x-jakarta1-focus-cache":"HIT"}});
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const ranges=STORE_CODES.map(c=>`'${c}'!A:O`),data=await getSheetRanges(SALES_2026,ranges,email,key);
  const map=new Map<string,{date:string;store:string;staffId:string;staffName:string;focus:Focus}>();
  for(let i=0;i<STORE_CODES.length;i++){
   const store=STORE_CODES[i],rows=(data[i]??[]) as Row[];
   for(const row of rows.slice(1)){
    const date=dateKey(row[1]);if(!date.startsWith(period))continue;
    const qty=n(row[11]),f=focusOf(String(row[10]??""),qty);if(!hasFocus(f))continue;
    const staffId=String(row[4]??"").replace(/\.0$/,"").trim()||"UNKNOWN",staffName=String(row[5]??"").trim()||"Unknown";
    const k=`${date}|${store}|${staffId}`,cur=map.get(k)??{date,store,staffId,staffName,focus:emptyFocus()};add(cur.focus,f);map.set(k,cur);
   }
  }
  const rows=[...map.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.store.localeCompare(b.store)||a.staffName.localeCompare(b.staffName));
  const result={period,rows};cache.set(period,{at:Date.now(),data:result});return NextResponse.json(result,{headers:{"cache-control":"public, max-age=60, stale-while-revalidate=240","x-jakarta1-focus-cache":"MISS"}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca Product Focus"},{status:500})}
}
