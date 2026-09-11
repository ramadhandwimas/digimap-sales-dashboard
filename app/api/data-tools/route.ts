import {NextRequest,NextResponse} from "next/server";
import {batchClearRanges,batchWriteRanges,clearAndWrite,ensureSheets} from "@/lib/google-sheets";
import {cacheHeaders,normalizedHeaders} from "@/lib/m238-fast-sales";

const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const NORMALIZED="SALES DASHBOARD DATA",CACHE="DAILY SALES CACHE";

export async function POST(req:NextRequest){
 const e=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,k=process.env.GOOGLE_PRIVATE_KEY;
 if(!e||!k)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 const b=await req.json(),action=String(b.action||"");
 try{
  if(!["clear-spw","clear-soh"].includes(action))return NextResponse.json({error:"Action tidak dikenal"},{status:400});
  const pin=process.env.ADMIN_PASSCODE;if(!pin)return NextResponse.json({error:"ADMIN_PASSCODE belum dipasang di Vercel"},{status:503});if(String(b.passcode||"")!==pin)return NextResponse.json({error:"Passcode admin salah"},{status:403});
  if(action==="clear-spw"){
   await ensureSheets(MASTER_ID,[{title:NORMALIZED,headers:normalizedHeaders},{title:CACHE,headers:cacheHeaders}],e,k);
   await batchClearRanges(MASTER_ID,["'SPW'!A:C",`'${NORMALIZED}'!A2:Q50000`,`'${CACHE}'!A2:Z20000`],e,k);
   const cleared=["","","M238","",0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,new Date().toISOString(),"CLEARED"];
   await batchWriteRanges(MASTER_ID,[{range:`'${CACHE}'!A2`,values:[cleared]}],e,k,"RAW");
   return NextResponse.json({ok:true,message:"SPW aktif dan Fast Daily Sales berhasil dikosongkan. Silakan upload file terbaru."},{headers:{"cache-control":"no-store"}});
  }
  await clearAndWrite(MASTER_ID,"'SOH'!A:I","'SOH'!A1",[["","","","","","","","",""]],e,k,"RAW");
  return NextResponse.json({ok:true,message:"Clear SOH berhasil. Hanya MASTER DATA M238 / SOH yang dibersihkan."});
 }catch(err){const raw=err instanceof Error?err.message:"Operasi gagal";return NextResponse.json({error:/429/.test(raw)?"Google Sheets sedang membatasi request. Sistem sudah mencoba kembali; silakan coba beberapa saat lagi.":raw},{status:500})}
}
