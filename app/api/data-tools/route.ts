import {NextRequest,NextResponse} from "next/server";
import {clearAndWrite} from "@/lib/google-sheets";

const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";

export async function POST(req:NextRequest){
 const e=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,k=process.env.GOOGLE_PRIVATE_KEY;
 if(!e||!k)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 const b=await req.json(),action=String(b.action||"");
 try{
  if(!["clear-spw","clear-soh"].includes(action))return NextResponse.json({error:"Action tidak dikenal"},{status:400});
  const pin=process.env.ADMIN_PASSCODE;
  if(!pin)return NextResponse.json({error:"ADMIN_PASSCODE belum dipasang di Vercel"},{status:503});
  if(String(b.passcode||"")!==pin)return NextResponse.json({error:"Passcode admin salah"},{status:403});
  if(action==="clear-spw"){
   await clearAndWrite(MASTER_ID,"'SPW'!A:C","'SPW'!A1",[["","",""]],e,k,"RAW");
   return NextResponse.json({ok:true,message:"Clear SPW berhasil. Hanya MASTER DATA M238 / SPW yang dibersihkan."});
  }
  await clearAndWrite(MASTER_ID,"'SOH'!A:I","'SOH'!A1",[["","","","","","","","",""]],e,k,"RAW");
  return NextResponse.json({ok:true,message:"Clear SOH berhasil. Hanya MASTER DATA M238 / SOH yang dibersihkan."});
 }catch(err){return NextResponse.json({error:err instanceof Error?err.message:"Operasi gagal"},{status:500})}
}
