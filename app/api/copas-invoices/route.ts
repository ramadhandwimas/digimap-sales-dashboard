import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {findCopasInvoice,selectCopasInvoice} from "@/lib/copas-invoices";
import {acquireCopasLock,releaseCopasLock,readCopasInvoiceSnapshot,removeCopasInvoice,CopasInvoiceError} from "@/lib/copas-invoice-store";
import {refreshDailySummaryPeriods} from "@/lib/m238-daily-summary-cache";
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"cache-control":"no-store"}});
export async function POST(request:NextRequest){
 const session=verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);if(!session)return json({error:"Silakan login kembali."},401);
 const origin=request.headers.get("origin");if(origin&&origin!==request.nextUrl.origin)return json({error:"Asal permintaan tidak valid."},403);
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return json({error:"Google Sheets belum dikonfigurasi."},503);
 const credentials={email,key};let locked=false,safeToUnlock=true;
 try{
  const body=await request.json(),invoice=String(body.invoice??"").trim();
  if(!invoice||invoice.length>100)return json({error:"Masukkan nomor invoice lengkap (maksimal 100 karakter)."},400);
  if(body.action!=="search"&&body.action!=="delete")return json({error:"Aksi tidak valid."},400);
  if(body.action==="delete"){
   if(!["exchange","cancel"].includes(body.reason))return json({error:"Pilih alasan exchange atau cancel."},400);
   await acquireCopasLock(credentials);locked=true;
  }
  const snapshot=await readCopasInvoiceSnapshot(credentials),plan=findCopasInvoice(snapshot.rows,invoice);
  if(plan.items.length>1000)return json({error:"Invoice memiliki lebih dari 1.000 baris. Hubungi pengelola untuk memeriksa data."},422);
  if(body.action==="search")return json({...plan,items:plan.items.map(({values,...item})=>{void values;return item}),totalQty:plan.items.reduce((sum,item)=>sum+item.qty,0),totalAmount:plan.items.reduce((sum,item)=>sum+item.amount,0)});
  if(!plan.items.length||body.planId!==plan.planId)return json({error:"Data Copas berubah setelah pemeriksaan. Cari ulang invoice sebelum menghapus."},409);
  let selected;try{selected=selectCopasInvoice(plan,body.selectedIds)}catch(error){return json({error:error instanceof Error?error.message:"Pilihan transaksi tidak valid."},400)}
  const result=await removeCopasInvoice(credentials,snapshot,selected,`${session.nik} · ${session.name}`,body.reason);locked=false;
  let warning="";try{await refreshDailySummaryPeriods([...new Set(selected.map(item=>item.date.slice(0,7)).filter(period=>/^\d{4}-\d{2}$/.test(period)))],credentials)}catch{warning="Data sudah dihapus, tetapi ringkasan belum berhasil diperbarui. Muat ulang atau perbarui ringkasan."}
  return json({ok:true,...result,deletedRows:selected.length,totalQty:selected.reduce((sum,item)=>sum+item.qty,0),totalAmount:selected.reduce((sum,item)=>sum+item.amount,0),warning,message:`${selected.length} baris transaksi dihapus dari Data Copas dan dicatat dalam riwayat ${body.reason}.`});
 }catch(error){if(error instanceof CopasInvoiceError)safeToUnlock=error.safeToUnlock;return json({error:error instanceof Error?error.message:"Pemeriksaan invoice gagal."},error instanceof CopasInvoiceError?error.status:500)}
 finally{if(locked&&safeToUnlock)await releaseCopasLock(credentials).catch(error=>console.error("Copas invoice unlock failed",error))}
}
