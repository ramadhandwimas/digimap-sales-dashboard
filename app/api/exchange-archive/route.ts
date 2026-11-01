import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {acquireCopasLock,releaseCopasLock,CopasInvoiceError} from "@/lib/copas-invoice-store";
import {readExchangeHistory,readExchangeArchivePlan,applyExchangeArchive} from "@/lib/exchange-archive-store";
import {clearCachedSalesSource} from "@/lib/m238-sales-source-cache";
const json=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{"cache-control":"no-store"}});
export async function POST(req:NextRequest){
 const session=verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);if(!session)return json({error:"Silakan login kembali."},401);
 const origin=req.headers.get("origin");if(origin&&origin!==req.nextUrl.origin)return json({error:"Asal permintaan tidak valid."},403);
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return json({error:"Koneksi Google Sheets belum tersedia."},503);
 const c={email,key};let locked=false,safe=true;
 try{
  const body=await req.json();if(body.action==="history"){const {history}=await readExchangeHistory(c);return json({history})}
  if(!["check","archive"].includes(body.action))return json({error:"Aksi tidak valid."},400);
  const period=String(body.period||""),current=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit"}).format(new Date());
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(period)||period>=current)return json({error:"Pilih bulan yang sudah selesai."},400);
  await acquireCopasLock(c);locked=true;
  const state=await readExchangeArchivePlan(c,period,body.includeUnmatched===true);
  if(body.action==="check")return json(state.plan);
  if(body.planId!==state.plan.planId)return json({error:"Daftar exchange berubah. Cek ulang sebelum mengarsipkan."},409);
  await applyExchangeArchive(c,state,`${session.nik} · ${session.name}`);clearCachedSalesSource();
  return json({ok:true,...state.plan,message:`${state.plan.invoices.length} invoice tersimpan di arsip ${period}. ${state.plan.clearRows.length} sel kolom Y dikosongkan. ${state.plan.includeUnmatched?"Nomor yang belum ditemukan diarsipkan berdasarkan konfirmasi bulan pengguna.":`${state.plan.pending.length} nomor belum ditemukan tetap disimpan di Y.`}`});
 }catch(e){if(e instanceof CopasInvoiceError)safe=e.safeToUnlock;return json({error:e instanceof Error?e.message:"Arsip gagal."},e instanceof CopasInvoiceError?e.status:500)}
 finally{if(locked&&safe)await releaseCopasLock(c).catch(e=>console.error("Exchange archive unlock",e))}
}
