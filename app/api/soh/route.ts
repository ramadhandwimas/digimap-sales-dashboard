import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const s=(v:unknown)=>String(v??"").trim();
const n=(v:unknown)=>Number(String(v??0).replace(/[^0-9.-]/g,""))||0;

export async function GET(req:NextRequest){
  const e=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,k=process.env.GOOGLE_PRIVATE_KEY;
  if(!e||!k)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});

  const ranges=["'SOH'!D6:D6","'SOH'!C10:E200","'SOH'!J10:L200","'SOH'!Q10:S200","'SOH'!X10:Z200","'SOH'!AE10:AG200"];
  const [dateRange,iphone,ipad,mac,watch,airpods]=await getSheetRanges(ID,ranges,e,k);
  const q=(req.nextUrl.searchParams.get("q")||"").toLowerCase();
  const groups:[string,unknown[][]][]=[
    ["IPHONE",iphone],["IPAD",ipad],["MACBOOK",mac],["APPLE WATCH",watch],["AIRPODS, PENCIL & KEYBOARD",airpods]
  ];
  const rows:{article:string;description:string;qty:number;category:string}[]=[];
  for(const [category,data] of groups){
    for(const r of data){
      const article=s(r[0]),description=s(r[1]),qty=n(r[2]);
      if(!article||article.toUpperCase()==="ARTICLE"||article.toUpperCase()==="GRAND TOTAL"||qty<=0)continue;
      if(/DEMO|\-D(?:\b|$)/i.test(`${article} ${description}`))continue;
      if(q&&!`${article} ${description}`.toLowerCase().includes(q))continue;
      rows.push({article,description,qty,category});
    }
  }
  return NextResponse.json({updated:s(dateRange?.[0]?.[0]),rows},{headers:{"Cache-Control":"no-store"}})
}
