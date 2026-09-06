import {NextRequest,NextResponse} from "next/server";
import {appendSheetValues,clearAndWrite,ensureSheet,getSheetRanges} from "@/lib/google-sheets";

const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const TAB="Dashboard Weekly Reason";
const HEADERS=["Week","Compare Week","Snapshot JSON","Updated At"];
const s=(v:unknown)=>String(v??"").trim();

async function setup(email:string,key:string){
 await ensureSheet(MASTER_ID,TAB,HEADERS,email,key);
 return (await getSheetRanges(MASTER_ID,[`'${TAB}'!A2:D1000`],email,key))[0]??[];
}

export async function GET(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 const week=s(req.nextUrl.searchParams.get("week"));
 try{
  const rows=await setup(email,key);
  if(!week)return NextResponse.json({weeks:rows.map(r=>s(r[0])).filter(Boolean)});
  const row=rows.find(r=>s(r[0])===week);
  if(!row)return NextResponse.json({found:false,week});
  let snapshot:unknown=null;
  try{snapshot=JSON.parse(s(row[2]))}catch{}
  return NextResponse.json({found:Boolean(snapshot),week,compareWeek:s(row[1]),snapshot,updatedAt:s(row[3])},{headers:{"cache-control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca weekly reason"},{status:500})}
}

export async function POST(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const body=await req.json() as {week?:string;compareWeek?:string;snapshot?:unknown};
  const week=s(body.week),compareWeek=s(body.compareWeek);
  if(!week||!body.snapshot)return NextResponse.json({error:"Week dan snapshot wajib diisi"},{status:400});
  const rows=await setup(email,key),payload=JSON.stringify(body.snapshot),updatedAt=new Date().toISOString(),index=rows.findIndex(r=>s(r[0])===week);
  if(index>=0){const row=index+2;await clearAndWrite(MASTER_ID,null,`'${TAB}'!A${row}:D${row}`,[[week,compareWeek,payload,updatedAt]],email,key,"RAW")}
  else await appendSheetValues(MASTER_ID,`'${TAB}'!A:D`,[[week,compareWeek,payload,updatedAt]],email,key);
  return NextResponse.json({ok:true,week,compareWeek,updatedAt});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal menyimpan weekly reason"},{status:500})}
}
