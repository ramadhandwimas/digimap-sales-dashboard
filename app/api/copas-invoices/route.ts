import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {checkRawExchangeInvoices,selectCopasInvoice} from "@/lib/copas-invoices";
import {acquireCopasLock,releaseCopasLock,readCopasInvoiceSnapshot,readRawExchangeColumn,removeCopasInvoice,compactCopasRows,CopasInvoiceError} from "@/lib/copas-invoice-store";
import {refreshDailySummaryPeriods} from "@/lib/m238-daily-summary-cache";
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"cache-control":"no-store"}});
export async function POST(request:NextRequest){
 const session=verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);if(!session)return json({error:"Silakan login kembali."},401);
 const origin=request.headers.get("origin");if(origin&&origin!==request.nextUrl.origin)return json({error:"Asal permintaan tidak valid."},403);
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return json({error:"Google Sheets belum dikonfigurasi."},503);
 const credentials={email,key};let locked=false,safeToUnlock=true;
 try{
  const body=await request.json();
  if(body.action!=="check"&&body.action!=="delete"&&body.action!=="compact")return json({error:"Aksi tidak valid."},400);
  if(body.action==="delete"||body.action==="compact"){
   if(body.action==="delete"&&!["exchange","cancel"].includes(body.reason))return json({error:"Pilih alasan exchange atau cancel."},400);
   await acquireCopasLock(credentials);locked=true;
  }
  const snapshot=await readCopasInvoiceSnapshot(credentials);
  if(body.action==="compact"){
   const result=await compactCopasRows(credentials,snapshot);locked=false;
   return json({ok:true,...result,message:result.compactedRows?`${result.compactedRows} baris kosong dirapikan. Urutan transaksi tetap sama.`:"Data Copas sudah rapi. Tidak ada baris kosong di antara transaksi."});
  }
  const exchangeColumn=await readRawExchangeColumn(credentials,snapshot.sheets),plan=checkRawExchangeInvoices(snapshot.rows,exchangeColumn);
  if(body.action==="check")return json({planId:plan.planId,groups:plan.groups.map(group=>({...group,items:group.items.map(({values,...item})=>{void values;return item})})),sourceInvoiceCount:plan.sourceInvoiceCount,foundInvoiceCount:plan.foundInvoiceCount,notFoundInvoiceCount:plan.notFoundInvoiceCount,totalRows:plan.totalRows,totalQty:plan.totalQty,totalAmount:plan.totalAmount});
  if(!plan.items.length||body.planId!==plan.planId)return json({error:"Daftar invoice kolom Y atau Data Copas berubah. Cek ulang sebelum menghapus."},409);
  let selected;try{selected=selectCopasInvoice(plan,body.selectedIds)}catch(error){return json({error:error instanceof Error?error.message:"Pilihan transaksi tidak valid."},400)}
  const result=await removeCopasInvoice(credentials,snapshot,selected,`${session.nik} · ${session.name}`,body.reason);locked=false;
  let warning="";try{await refreshDailySummaryPeriods([...new Set(selected.map(item=>item.date.slice(0,7)).filter(period=>/^\d{4}-\d{2}$/.test(period)))],credentials)}catch{warning="Data sudah dihapus, tetapi ringkasan belum berhasil diperbarui. Muat ulang atau perbarui ringkasan."}
  return json({ok:true,...result,deletedRows:selected.length,totalQty:selected.reduce((sum,item)=>sum+item.qty,0),totalAmount:selected.reduce((sum,item)=>sum+item.amount,0),warning,message:`${selected.length} baris transaksi dihapus dari Data Copas dan dicatat dalam riwayat ${body.reason}. Baris Data Copas sudah dirapikan.`});
 }catch(error){if(error instanceof CopasInvoiceError)safeToUnlock=error.safeToUnlock;return json({error:error instanceof Error?error.message:"Pemeriksaan invoice gagal."},error instanceof CopasInvoiceError?error.status:500)}
 finally{if(locked&&safeToUnlock)await releaseCopasLock(credentials).catch(error=>console.error("Copas invoice unlock failed",error))}
}
