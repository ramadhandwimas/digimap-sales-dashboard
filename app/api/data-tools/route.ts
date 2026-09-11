import {NextRequest,NextResponse} from "next/server";
import {batchClearRanges,batchWriteRanges,ensureSheets,getGoogleSheetRequestCount} from "@/lib/google-sheets";
import {cacheHeaders,normalizedHeaders} from "@/lib/m238-fast-sales";
import {sohFastHeaders} from "@/lib/m238-fast-soh";

const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk",NORMALIZED="SALES DASHBOARD DATA",CACHE="DAILY SALES CACHE",SOH_CACHE="SOH FAST CACHE";
function friendly(e:unknown){const raw=e instanceof Error?e.message:"Operasi gagal";return/429|Too Many Requests/i.test(raw)?"Google Sheets sedang membatasi request. Sistem sudah mencoba kembali; silakan coba beberapa saat lagi.":raw}

export async function POST(req:NextRequest){
 const started=Date.now(),apiStart=getGoogleSheetRequestCount(),e=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,k=process.env.GOOGLE_PRIVATE_KEY;if(!e||!k)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 const b=await req.json(),action=String(b.action||"");if(!["clear-spw","clear-soh"].includes(action))return NextResponse.json({error:"Action tidak dikenal"},{status:400});const pin=process.env.ADMIN_PASSCODE;if(!pin)return NextResponse.json({error:"ADMIN_PASSCODE belum dipasang di Vercel"},{status:503});if(String(b.passcode||"")!==pin)return NextResponse.json({error:"Passcode admin salah"},{status:403});
 const timing={read:0,clear:0,write:0,total:0};
 try{
  if(action==="clear-spw"){
   let t=Date.now();try{await batchClearRanges(MASTER_ID,["'SPW'!A1:C65536",`'${NORMALIZED}'!A2:Q50000`,`'${CACHE}'!A2:Z20000`],e,k)}catch{await ensureSheets(MASTER_ID,[{title:NORMALIZED,headers:normalizedHeaders},{title:CACHE,headers:cacheHeaders}],e,k);timing.read=Date.now()-t;t=Date.now();await batchClearRanges(MASTER_ID,["'SPW'!A1:C65536",`'${NORMALIZED}'!A2:Q50000`,`'${CACHE}'!A2:Z20000`],e,k)}timing.clear=Date.now()-t;
   const cleared=["","","M238","",0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,new Date().toISOString(),"CLEARED"];t=Date.now();await batchWriteRanges(MASTER_ID,[{range:`'${CACHE}'!A2`,values:[cleared]}],e,k,"RAW");timing.write=Date.now()-t;timing.total=Date.now()-started;const apiRequests=getGoogleSheetRequestCount()-apiStart;console.info("M238_PERF",{op:"clear-spw",timing,apiRequests});
   return NextResponse.json({ok:true,message:"SPW aktif dan Fast Daily Sales berhasil dikosongkan. Silakan upload file terbaru.",performance:{...timing,apiRequests}},{headers:{"cache-control":"no-store"}})
  }
  let t=Date.now();try{await batchClearRanges(MASTER_ID,["'SOH'!A1:I10000",`'${SOH_CACHE}'!A2:F10000`],e,k)}catch{await ensureSheets(MASTER_ID,[{title:SOH_CACHE,headers:sohFastHeaders}],e,k);timing.read=Date.now()-t;t=Date.now();await batchClearRanges(MASTER_ID,["'SOH'!A1:I10000",`'${SOH_CACHE}'!A2:F10000`],e,k)}timing.clear=Date.now()-t;
  t=Date.now();await batchWriteRanges(MASTER_ID,[{range:`'${SOH_CACHE}'!A2`,values:[["","",0,"",new Date().toISOString(),"CLEARED"]]}],e,k,"RAW");timing.write=Date.now()-t;timing.total=Date.now()-started;const apiRequests=getGoogleSheetRequestCount()-apiStart;console.info("M238_PERF",{op:"clear-soh",timing,apiRequests});
  return NextResponse.json({ok:true,message:"SOH aktif dan cache SOH berhasil dikosongkan. Silakan upload file terbaru.",performance:{...timing,apiRequests}},{headers:{"cache-control":"no-store"}})
 }catch(err){timing.total=Date.now()-started;const error=friendly(err),apiRequests=getGoogleSheetRequestCount()-apiStart;console.warn("M238_PERF",{op:action,timing,apiRequests,error});return NextResponse.json({error,performance:{...timing,apiRequests}},{status:500})}
}
