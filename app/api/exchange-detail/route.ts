import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {acquireCopasLock,releaseCopasLock,CopasInvoiceError} from "@/lib/copas-invoice-store";
import {readInvoiceExchangePlan,saveInvoiceExchange} from "@/lib/exchange-detail-store";
import {clearCachedSalesSource} from "@/lib/m238-sales-source-cache";
import {refreshDailySummaryPeriods} from "@/lib/m238-daily-summary-cache";
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"cache-control":"no-store"}});
export async function POST(req:NextRequest){
 const session=verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);if(!session)return json({error:"Silakan login kembali."},401);
 const origin=req.headers.get("origin");if(origin&&origin!==req.nextUrl.origin)return json({error:"Asal permintaan tidak valid."},403);
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return json({error:"Google Sheets belum tersedia."},503);
 const c={email,key};let locked=false,safe=true;
 try{const body=await req.json(),invoice=String(body.invoice??"").trim(),store=String(body.store??"");
  if(!/^\d{5,}$/.test(invoice)||!["M238","M996"].includes(store)||!["check","save"].includes(body.action))return json({error:"Pilih toko dan masukkan nomor invoice yang valid."},400);
  if(body.action==="save"){await acquireCopasLock(c);locked=true}
  const snapshot=await readInvoiceExchangePlan(c,invoice,store);
  if(body.action==="check")return json(snapshot.plan);
  if(body.planId!==snapshot.plan.planId)return json({error:"Data invoice atau exchange berubah. Cek ulang sebelum konfirmasi."},409);
  let result;try{result=await saveInvoiceExchange(c,snapshot,body.items,body.mode,`${session.nik} · ${session.name}`)}catch(e){if(e instanceof CopasInvoiceError)throw e;return json({error:e instanceof Error?e.message:"Pilihan exchange tidak valid."},400)}
  clearCachedSalesSource();let warning="";try{await refreshDailySummaryPeriods([result.date.slice(0,7)],c)}catch{warning="Exchange tersimpan. Ringkasan cache perlu dimuat ulang."}
  return json({ok:true,...result,warning,message:`Exchange dikonfirmasi: ${result.exchangedQty} qty dikurangi. ${result.remainingQty} qty senilai Rp${result.remainingAmount.toLocaleString("id-ID")} tetap dihitung.`});
 }catch(e){if(e instanceof CopasInvoiceError)safe=e.safeToUnlock;return json({error:e instanceof Error?e.message:"Exchange gagal diproses."},e instanceof CopasInvoiceError?e.status:500)}
 finally{if(locked&&safe)await releaseCopasLock(c).catch(e=>console.error("Exchange unlock",e))}
}
