import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const s=(v:unknown)=>String(v??"").trim();
const n=(v:unknown)=>Number(String(v??0).replace(/[^0-9.-]/g,""))||0;
const CATEGORY_RANGES:Record<string,string>={
  "IPHONE":"'SOH'!C10:E200",
  "IPAD":"'SOH'!J10:L200",
  "MACBOOK":"'SOH'!Q10:S200",
  "APPLE WATCH":"'SOH'!X10:Z200",
  "AIRPODS, PENCIL & KEYBOARD":"'SOH'!AE10:AG200",
};
function isoDate(v:unknown){
  if(typeof v==="number"&&v>30000&&v<70000)return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);
  const x=s(v);
  let m=x.match(/\b(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/);if(m)return`${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
  m=x.match(/\b(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})\b/);if(m)return`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  return"";
}
function displayDate(v:string){if(!v)return"";const[y,m,d]=v.split("-");return`${d}-${m}-${y}`}

export async function GET(req:NextRequest){
  const e=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,k=process.env.GOOGLE_PRIVATE_KEY;
  if(!e||!k)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});

  const q=(req.nextUrl.searchParams.get("q")||"").toLowerCase().trim();
  const requested=(req.nextUrl.searchParams.get("category")||"").toUpperCase().trim();
  const selected=requested&&CATEGORY_RANGES[requested]?requested:"";
  const categories=selected?[selected]:Object.keys(CATEGORY_RANGES);
  const categoryRanges=categories.map(key=>CATEGORY_RANGES[key]);
  const ranges=["'SOH'!D6:D6","'RAW StockPosition'!F1:N40",...categoryRanges,"'RAW SalesPerson'!AB2:AJ65536"];
  const result=await getSheetRanges(ID,ranges,e,k);
  const dateRange=result[0]||[],rawHead=result[1]||[],categoryData=result.slice(2,2+categories.length),rawSales=result[2+categories.length]||[];

  const salesDates=rawSales.map(r=>isoDate(r[0])).filter(Boolean).sort();
  const soldDate=salesDates.at(-1)||"";
  const soldByArticle=new Map<string,number>();
  if(soldDate){
    for(const r of rawSales){
      const date=isoDate(r[0]),article=s(r[4]),qty=n(r[7]);
      if(date!==soldDate||!article||!qty)continue;
      const key=article.toUpperCase();
      soldByArticle.set(key,(soldByArticle.get(key)||0)+qty);
    }
  }

  const rows:{article:string;description:string;qty:number;soldQty:number;category:string}[]=[];
  categories.forEach((category,index)=>{
    for(const r of categoryData[index]||[]){
      const article=s(r[0]),description=s(r[1]),qty=n(r[2]);
      if(!article||article.toUpperCase()==="ARTICLE"||article.toUpperCase()==="GRAND TOTAL"||qty<=0)continue;
      if(/DEMO|\-D(?:\b|$)/i.test(`${article} ${description}`))continue;
      if(q&&!`${article} ${description}`.toLowerCase().includes(q))continue;
      rows.push({article,description,qty,soldQty:soldByArticle.get(article.toUpperCase())||0,category});
    }
  });

  const rawDates=rawHead.flat().map(isoDate).filter(Boolean).sort();
  const sheetDate=isoDate(dateRange?.[0]?.[0]);
  const updated=displayDate(rawDates.at(-1)||sheetDate);
  return NextResponse.json({updated,soldDate:displayDate(soldDate),category:selected||null,rows},{headers:{"Cache-Control":"public, s-maxage=30, stale-while-revalidate=60"}})
}
