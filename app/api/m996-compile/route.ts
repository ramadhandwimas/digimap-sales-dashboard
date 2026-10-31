import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";
import {compileM996} from "@/lib/m996-compile";

const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";

export async function GET(req:NextRequest){
 try{
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
  if(!email||!key)return NextResponse.json({error:"Koneksi Google Sheets belum dikonfigurasi."},{status:503});
  const period=String(req.nextUrl.searchParams.get("period")||"").trim();
  if(period&&!/^20\d{2}-\d{2}$/.test(period))return NextResponse.json({error:"Periode M996 tidak valid."},{status:400});
  const[values]=await getSheetRanges(MASTER_ID,["'SALES DASHBOARD DATA'!A2:Q65537"],email,key);
  return NextResponse.json(compileM996(values||[],period),{headers:{"cache-control":"private, max-age=30, stale-while-revalidate=60"}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Gagal compile data M996."},{status:500})}
}
