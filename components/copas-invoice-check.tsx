"use client";
import {useRef,useState} from "react";
import {Search,Trash2,ReceiptText,LoaderCircle} from "lucide-react";
type Item={id:string;row:number;date:string;staff:string;staffId:string;invoice:string;article:string;description:string;qty:number;amount:number;store:string;week:string};
type Result={invoice:string;planId:string;items:Item[];totalQty:number;totalAmount:number};
const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const input="min-h-11 w-full rounded-xl border bg-white px-3 text-sm dark:bg-slate-950";
export default function CopasInvoiceCheck({onBusyChange,onChanged}:{onBusyChange?:(busy:boolean)=>void;onChanged?:()=>void|Promise<void>}={}){
 const[invoice,setInvoice]=useState(""),[result,setResult]=useState<Result|null>(null),[selected,setSelected]=useState<string[]>([]),[reason,setReason]=useState("exchange"),[busy,setBusy]=useState<"search"|"delete"|null>(null),[notice,setNotice]=useState<{error:boolean;text:string}|null>(null);
 const active=useRef(false);
 const chosen=result?.items.filter(item=>selected.includes(item.id))||[];
 const request=async(action:"search"|"delete")=>{
  if(active.current||!invoice.trim()||action==="delete"&&!chosen.length)return;
  if(action==="delete"&&!window.confirm(`Hapus ${chosen.length} baris invoice ${result?.invoice} dari Data Copas?\nQty: ${chosen.reduce((sum,item)=>sum+item.qty,0)} · ${money.format(chosen.reduce((sum,item)=>sum+item.amount,0))}\nAlasan: ${reason}\n\nData yang dipilih dicatat dalam riwayat dan dilewati saat Cut Off berikutnya.`))return;
  active.current=true;setBusy(action);onBusyChange?.(true);setNotice(null);
  if(action==="search"){setResult(null);setSelected([])}
  try{
   const response=await fetch("/api/copas-invoices",{method:"POST",headers:{"content-type":"application/json"},cache:"no-store",body:JSON.stringify({action,invoice:action==="delete"?result?.invoice:invoice.trim(),planId:result?.planId,selectedIds:selected,reason})});
   const data=await response.json();
   if(!response.ok){if(response.status===409){setResult(null);setSelected([])}throw new Error(data.error||"Pemeriksaan invoice gagal.")}
   if(action==="search")setResult(data);
   else{setResult(null);setSelected([]);setNotice({error:false,text:`${data.message}${data.warning?` ${data.warning}`:""}`});try{await onChanged?.()}catch{setNotice({error:false,text:`${data.message} Muat ulang dashboard untuk melihat ringkasan terbaru.`})}}
  }catch(error){setNotice({error:true,text:error instanceof Error?error.message:"Pemeriksaan invoice gagal."})}
  finally{active.current=false;setBusy(null);onBusyChange?.(false)}
 };
 return <section className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950 sm:p-5" aria-label="Cek Invoice Exchange/Cancel">
  <div className="flex items-start gap-3"><ReceiptText className="mt-1 shrink-0 text-blue-600" size={23}/><div><h3 className="font-extrabold">Cek Invoice Exchange/Cancel</h3><p className="mt-1 text-sm text-slate-500">Cari nomor invoice lengkap yang sudah tercatat di Data Copas.</p></div></div>
  <form onSubmit={event=>{event.preventDefault();void request("search")}} className="flex flex-col gap-2 sm:flex-row"><label className="flex-1"><span className="mb-1 block text-xs font-bold">Nomor invoice</span><input className={input} value={invoice} disabled={!!busy} maxLength={100} onChange={event=>{setInvoice(event.target.value);setResult(null);setSelected([]);setNotice(null)}} placeholder="Masukkan nomor invoice lengkap"/></label><button type="submit" disabled={!!busy||!invoice.trim()} className="flex min-h-11 items-center justify-center gap-2 self-stretch rounded-xl bg-blue-600 px-4 text-sm font-black text-white disabled:opacity-40 sm:self-end">{busy==="search"?<LoaderCircle size={17} className="animate-spin"/>:<Search size={17}/>}Cari Invoice</button></form>
  {notice?<div role="status" className={`rounded-xl p-3 text-sm ${notice.error?"bg-rose-50 text-rose-700":"bg-emerald-50 text-emerald-700"}`}>{notice.text}</div>:null}
  {result?result.items.length?<>
   <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"><b>Invoice {result.invoice}</b><p>{result.items.length} baris · Qty {result.totalQty} · {money.format(result.totalAmount)}</p><p className="mt-2 text-xs text-slate-500">Periksa tanggal, toko, dan staff. Centang hanya baris transaksi exchange/cancel yang ingin dihapus.</p></div>
   <label className="flex min-h-11 items-center gap-3 text-sm font-bold"><input type="checkbox" disabled={!!busy} checked={selected.length===result.items.length} onChange={event=>setSelected(event.target.checked?result.items.map(item=>item.id):[])} className="size-4 accent-blue-600"/>Pilih semua {result.items.length} baris</label>
   <div className="max-h-[34rem] space-y-2 overflow-y-auto">{result.items.map(item=><label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${selected.includes(item.id)?"border-blue-300 bg-blue-50 dark:bg-blue-950/30":""}`}><input type="checkbox" aria-label={`Pilih baris ${item.row}`} disabled={!!busy} checked={selected.includes(item.id)} onChange={event=>setSelected(current=>event.target.checked?[...current,item.id]:current.filter(id=>id!==item.id))} className="mt-1 size-4 shrink-0 accent-blue-600"/><span className="min-w-0 flex-1 break-words text-sm"><strong>{item.description||item.article}</strong><span className="mt-1 block text-xs text-slate-500">{item.article} · Baris {item.row}</span><span className="mt-1 block text-xs">{item.date||"Tanggal tidak tersedia"} · {item.store||"Toko tidak tersedia"} · {item.staff||item.staffId}</span><span className="mt-2 block font-bold">Qty {item.qty} · {money.format(item.amount)}</span></span></label>)}</div>
   <div className="space-y-3 border-t pt-4"><label className="block text-xs font-bold">Alasan penghapusan<select aria-label="Alasan penghapusan" className={`${input} mt-1`} value={reason} disabled={!!busy} onChange={event=>setReason(event.target.value)}><option value="exchange">Exchange</option><option value="cancel">Cancel transaksi</option></select></label><p className="text-sm"><b>{chosen.length} baris dipilih</b> · Qty {chosen.reduce((sum,item)=>sum+item.qty,0)} · {money.format(chosen.reduce((sum,item)=>sum+item.amount,0))}</p><button type="button" onClick={()=>void request("delete")} disabled={!!busy||!chosen.length} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-black text-white disabled:opacity-40">{busy==="delete"?<LoaderCircle size={17} className="animate-spin"/>:<Trash2 size={17}/>}Hapus {chosen.length} Baris dari Data Copas</button><p className="text-xs leading-5 text-slate-500">Penghapusan mencatat salinan data dan alasan ke riwayat exchange/cancel. Baris lain dan urutan sheet tetap.</p></div>
  </>:<p role="status" className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Invoice {result.invoice} tidak ditemukan di Data Copas.</p>:null}
 </section>;
}
