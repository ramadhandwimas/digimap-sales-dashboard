import {NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const s=(v:unknown)=>String(v??"").trim();
const n=(v:unknown)=>Number(String(v??0).replace(/[^0-9.-]/g,""))||0;

function isoDate(v:unknown){
  if(typeof v==="number"&&v>30000&&v<70000)return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);
  const x=s(v);
  let m=x.match(/\b(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/);
  if(m)return`${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
  m=x.match(/\b(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})\b/);
  if(m)return`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  return"";
}
function displayDate(v:string){if(!v)return"";const[y,m,d]=v.split("-");return y&&m&&d?`${d}-${m}-${y}`:v}

export async function GET(){
  const e=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,k=process.env.GOOGLE_PRIVATE_KEY;
  if(!e||!k)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
  try{
    const ranges=[
      "'SOH'!D6:D6",
      "'RAW StockPosition'!F1:N40",
      "'SOH'!C10:E200",
      "'SOH'!J10:L200",
      "'SOH'!Q10:S200",
      "'SOH'!X10:Z200",
      "'SOH'!AE10:AG200",
    ];
    const [dateRange,rawHead,iphone,ipad,mac,watch,airpods]=await getSheetRanges(SOURCE_ID,ranges,e,k);
    const groups:[string,unknown[][]][]=[
      ["IPHONE",iphone],["IPAD",ipad],["MACBOOK",mac],["APPLE WATCH",watch],["AIRPODS, PENCIL & KEYBOARD",airpods],
    ];
    const rows:{article:string;description:string;qty:number;soldQty:number;category:string}[]=[];
    for(const [category,data] of groups){
      for(const r of data){
        const article=s(r[0]),description=s(r[1]),qty=n(r[2]);
        if(!article||article.toUpperCase()==="ARTICLE"||article.toUpperCase()==="GRAND TOTAL"||qty<0)continue;
        if(/DEMO|\-D(?:\b|$)/i.test(`${article} ${description}`))continue;
        rows.push({article,description,qty,soldQty:0,category});
      }
    }
    const rawDates=rawHead.flat().map(isoDate).filter(Boolean).sort();
    const sheetDate=isoDate(dateRange?.[0]?.[0]);
    const updated=displayDate(rawDates.at(-1)||sheetDate);
    return NextResponse.json({updated,rows,source:"promo-board-soh-readonly"},{headers:{"Cache-Control":"no-store"}});
  }catch(err){
    return NextResponse.json({error:err instanceof Error?err.message:"Gagal membaca SOH untuk Promo Board"},{status:500});
  }
}
