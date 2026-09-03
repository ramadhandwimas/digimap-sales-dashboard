import {NextRequest,NextResponse} from "next/server";
import {appendSheetValues,ensureSheet,getSheetRanges} from "@/lib/google-sheets";

const SHEET_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const TAB="Dashboard CX Member";
const HEADERS=["Timestamp","Date","Staff ID","Name","CX","New Member"];
const text=(v:unknown)=>String(v??"").trim();
const num=(v:unknown)=>Number(v)||0;

export async function GET(req:NextRequest){
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
  if(!email||!key)return NextResponse.json({rows:[]});
  try{
    await ensureSheet(SHEET_ID,TAB,HEADERS,email,key);
    const [rows]=await getSheetRanges(SHEET_ID,[`'${TAB}'!A2:F5000`],email,key);
    const period=req.nextUrl.searchParams.get("period")||"",date=req.nextUrl.searchParams.get("date")||"";
    return NextResponse.json({rows:rows.filter(r=>(!period||text(r[1]).startsWith(period))&&(!date||text(r[1])===date)).map(r=>({timestamp:text(r[0]),date:text(r[1]),staffId:text(r[2]),name:text(r[3]),cx:num(r[4]),member:num(r[5])}))});
  }catch(e){return NextResponse.json({rows:[],error:e instanceof Error?e.message:"Gagal membaca CX dan member"});}
}

export async function POST(req:NextRequest){
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
  if(!email||!key)return NextResponse.json({error:"Google Sheets belum tersambung"},{status:500});
  try{
    const body=await req.json() as {date?:string;staffId?:string;name?:string;cx?:number;member?:number};
    const date=text(body.date),staffId=text(body.staffId),name=text(body.name),cx=Math.max(0,num(body.cx)),member=Math.max(0,num(body.member));
    if(!date||!staffId||!name)return NextResponse.json({error:"Staff dan tanggal wajib diisi"},{status:400});
    await ensureSheet(SHEET_ID,TAB,HEADERS,email,key);
    const timestamp=new Date().toISOString();
    await appendSheetValues(SHEET_ID,`'${TAB}'!A:F`,[[timestamp,date,staffId,name,cx,member]],email,key);
    return NextResponse.json({ok:true,timestamp,date,staffId,name,cx,member});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal menyimpan CX dan member"},{status:500});}
}
