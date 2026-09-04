import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const SALES_2026="151Qfrz3RZnDMgZjKOPt5s_aS-zscSiOTCWodbUDWM1k";
type Focus={iphone15:number;macbookNeo:number;ipad11:number;watchSe:number};

function n(v:unknown){if(typeof v==="number")return Number.isFinite(v)?v:0;const x=Number(String(v??"").replace(/,/g,"."));return Number.isFinite(x)?x:0}
function dateKey(v:unknown){if(typeof v==="number"&&v>20000){const d=new Date(Date.UTC(1899,11,30)+v*86400000);return d.toISOString().slice(0,10)}const s=String(v??"").trim();let m=s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);if(m)return `${m[3]}-${m[2]}-${m[1]}`;m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:""}
function emptyFocus():Focus{return{iphone15:0,macbookNeo:0,ipad11:0,watchSe:0}}
function addFocus(f:Focus,desc:string,qty:number){const d=desc.toUpperCase().replace(/\s+/g," "),q=Math.max(0,qty);if(/IPHONE 15/.test(d))f.iphone15+=q;if(/MACBOOK NEO/.test(d))f.macbookNeo+=q;if(/IPAD\s+11/.test(d))f.ipad11+=q;if(/(APPLE\s+WATCH|WATCH|AW).*SE/.test(d))f.watchSe+=q}

export async function GET(req:NextRequest){
 const period=req.nextUrl.searchParams.get("period")||"2026-09";
 if(!/^2026-(0[1-9]|1[0-2])$/.test(period))return NextResponse.json({error:"Periode tidak valid"},{status:400});
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const [rows]=await getSheetRanges(SALES_2026,["'M238'!A:O"],email,key);
  const map=new Map<string,{date:string;staffId:string;staffName:string;focus:Focus}>();
  for(const row of (rows??[]).slice(1)){
   const date=dateKey(row[1]);if(!date.startsWith(period))continue;
   const staffId=String(row[4]??"").replace(/\.0$/,"").trim();
   const staffName=String(row[5]??"").trim();
   if(!staffName)continue;
   const qty=n(row[11]),desc=String(row[10]??"");
   const k=`${date}|${staffId||staffName.toUpperCase()}`;
   const rec=map.get(k)??{date,staffId:staffId||staffName.toUpperCase(),staffName,focus:emptyFocus()};
   addFocus(rec.focus,desc,qty);map.set(k,rec);
  }
  return NextResponse.json({period,rows:[...map.values()]},{headers:{"cache-control":"public, max-age=60, stale-while-revalidate=240"}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca product focus M238"},{status:500})}
}
