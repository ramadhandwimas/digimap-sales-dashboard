import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";
import {summarizeLoginActivity} from "@/lib/login-activity";
const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk",TAB="Dashboard Login Activity";
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export async function GET(req:NextRequest){
 const e=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,k=process.env.GOOGLE_PRIVATE_KEY;if(!e||!k)return NextResponse.json({error:"Koneksi riwayat login belum tersedia."},{status:503});
 const date=req.nextUrl.searchParams.get("date")||today();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)return NextResponse.json({error:"Tanggal tidak valid."},{status:400});
 try{
  const[raw]=await getSheetRanges(MASTER_ID,[`'${TAB}'!A2:D`],e,k);
  return NextResponse.json(summarizeLoginActivity(raw,date),{headers:{"cache-control":"no-store"}})
 }catch(err){return NextResponse.json({date,rows:[],error:err instanceof Error?err.message:"Gagal membaca aktivitas login"},{status:500})}
}
