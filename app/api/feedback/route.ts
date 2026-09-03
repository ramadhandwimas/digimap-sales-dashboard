import {NextRequest,NextResponse} from "next/server";
import {appendSheetValues,ensureSheet,getSheetRanges} from "@/lib/google-sheets";

const SHEET_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const TAB="Dashboard Feedback";
const HEADERS=["Timestamp","Date","Staff ID","Name","Category","Raw Feedback","Professional Feedback"];
const text=(v:unknown)=>String(v??"").trim();

function professional(raw:string,category:string,name:string){
  const labels:{[key:string]:string}={external:"Faktor External",promo:"Promo Berjalan",performance:"Staff Performance",stock:"Ketersediaan Stok"};
  return `${labels[category]??category}: ${name} belum mencapai target harian. ${raw}`;
}

export async function GET(req:NextRequest){
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
  if(!email||!key)return NextResponse.json({rows:[]});
  try{
    await ensureSheet(SHEET_ID,TAB,HEADERS,email,key);
    const [rows]=await getSheetRanges(SHEET_ID,[`'${TAB}'!A2:G5000`],email,key);
    const period=req.nextUrl.searchParams.get("period")||"",date=req.nextUrl.searchParams.get("date")||"";
    return NextResponse.json({rows:rows.filter(r=>(!period||text(r[1]).startsWith(period))&&(!date||text(r[1])===date)).map(r=>({timestamp:text(r[0]),date:text(r[1]),staffId:text(r[2]),name:text(r[3]),category:text(r[4]),raw:text(r[5]),professional:text(r[6])}))});
  }catch(e){return NextResponse.json({rows:[],error:e instanceof Error?e.message:"Gagal membaca feedback"});}
}

export async function POST(req:NextRequest){
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
  if(!email||!key)return NextResponse.json({error:"Google Sheets belum tersambung"},{status:500});
  try{
    const body=await req.json() as {date?:string;staffId?:string;name?:string;category?:string;feedback?:string};
    const date=text(body.date),staffId=text(body.staffId),name=text(body.name),category=text(body.category),raw=text(body.feedback);
    if(!date||!staffId||!name||!category||!raw)return NextResponse.json({error:"Data feedback belum lengkap"},{status:400});
    await ensureSheet(SHEET_ID,TAB,HEADERS,email,key);
    const polished=professional(raw,category,name),timestamp=new Date().toISOString();
    await appendSheetValues(SHEET_ID,`'${TAB}'!A:G`,[[timestamp,date,staffId,name,category,raw,polished]],email,key);
    return NextResponse.json({ok:true,timestamp,date,staffId,name,category,raw,professional:polished});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal menyimpan feedback"},{status:500});}
}
