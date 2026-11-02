"use client";
import ExchangeDetailInput from "./exchange-detail-input";
import {useId,useRef,useState} from "react";
export default function ExchangeInvoiceInput({onBusyChange,onSaved,disabled=false}:{disabled?:boolean;onBusyChange?:(busy:boolean)=>void;onSaved?:(invoice:string,added:boolean)=>void}={}){
 const id=useId(),active=useRef(false);
 const[invoice,setInvoice]=useState(""),[busy,setBusy]=useState(false),[notice,setNotice]=useState<{error:boolean;text:string}|null>(null);
 const [legacyReview,setLegacyReview]=useState(false);
 const [detailBusy,setDetailBusy]=useState(false);
 const [period,setPeriod]=useState(()=>{const d=new Date();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-1);return d.toISOString().slice(0,7)});
 const [plan,setPlan]=useState<{planId:string;invoices:string[];newInvoices:string[];alreadyArchived:number;clearRows:number[];pending:string[];kept:string[]}|null>(null),[history,setHistory]=useState<string[][]|null>(null);
 const [includeUnmatched,setIncludeUnmatched]=useState(false);
 const archive=async(action:"check"|"archive"|"history")=>{
  if(active.current||disabled||detailBusy)return;active.current=true;setBusy(true);onBusyChange?.(true);setNotice(null);
  try{const response=await fetch("/api/exchange-archive",{method:"POST",headers:{"content-type":"application/json"},cache:"no-store",body:JSON.stringify({action,period,includeUnmatched,planId:plan?.planId})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Arsip gagal diproses.");
   if(action==="history")setHistory(result.history);else if(action==="check"){setPlan(result);setHistory(null)}else{setPlan(null);setHistory(null);setNotice({error:false,text:result.message})}
  }catch(error){setPlan(null);setNotice({error:true,text:error instanceof Error?error.message:"Arsip gagal."})}finally{active.current=false;setBusy(false);onBusyChange?.(false)}
 };
 const downloadHistory=()=>{if(!history)return;const content=[['Period','Invoice','Archived At','Archived By'],...history].map(row=>row.map(cell=>'"'+String(cell??'').replaceAll('"','""')+'"').join(',')).join('\r\n'),url=URL.createObjectURL(new Blob(['\uFEFF'+content],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='Arsip-Exchange.csv';link.click();URL.revokeObjectURL(url)};
 const save=async()=>{
  if(active.current||disabled||detailBusy||!invoice.trim())return;
  if(!legacyReview){setLegacyReview(true);return}
  active.current=true;setBusy(true);onBusyChange?.(true);setNotice(null);
  try{
   const response=await fetch("/api/data-upload-ops",{method:"POST",headers:{"content-type":"application/json"},cache:"no-store",body:JSON.stringify({action:"exchange",noExchange:invoice.trim()})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||"Nomor invoice exchange gagal disimpan.");
   setNotice({error:false,text:result.message||"Nomor invoice exchange berhasil disimpan."});setInvoice("");setLegacyReview(false);onSaved?.(result.noExchange,result.added);
  }catch(error){setLegacyReview(false);setNotice({error:true,text:error instanceof Error?error.message:"Nomor invoice exchange gagal disimpan."})}
  finally{active.current=false;setBusy(false);onBusyChange?.(false)}
 };
 return <><ExchangeDetailInput disabled={busy||disabled} onBusyChange={value=>{setDetailBusy(value);onBusyChange?.(value)}} onSaved={invoice=>onSaved?.(invoice,true)}/><details className="mt-6 rounded-xl border p-3"><summary className="cursor-pointer font-bold">Daftar Exchange Penuh / Invoice Pending (Kolom Y)</summary><form className="space-y-4" onSubmit={event=>{event.preventDefault();void save()}} aria-label="Input nomor invoice exchange">
  <p className="text-sm leading-6 text-slate-500">Masukkan nomor invoice exchange untuk disimpan ke daftar kolom Y. Nomor tetap bisa disimpan saat transaksi masih pending.</p>
  <label htmlFor={id} className="block text-sm font-bold">Nomor invoice exchange</label>
  <input id={id} type="text" maxLength={100} autoComplete="off" value={invoice} disabled={busy||disabled||detailBusy} onChange={event=>{setInvoice(event.target.value);setLegacyReview(false);setNotice(null)}} placeholder="Contoh: 100051953" className="min-h-11 w-full rounded-xl border bg-white px-3 text-sm dark:bg-slate-950"/>
  {notice?<p role="status" className={`rounded-xl border p-3 text-sm ${notice.error?"border-rose-200 bg-rose-50 text-rose-700":"border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{notice.text}</p>:null}
  {legacyReview&&<p className="rounded-xl border p-3 text-sm">Konfirmasi invoice <strong>{invoice.trim()}</strong>: seluruh barang dan qty pada nomor ini akan dianggap exchange penuh. Untuk memilih sebagian barang, gunakan menu Konfirmasi Exchange per Barang di atas.</p>}
  <button type="submit" disabled={busy||disabled||detailBusy||!invoice.trim()} className="min-h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-black text-white disabled:opacity-40">{busy?"Menyimpan…":legacyReview?"Ya, Simpan Exchange Penuh":"Simpan No Exchange"}</button>
 </form></details>
 <section className="mt-6 space-y-3 border-t pt-5" aria-label="Compile exchange bulanan">
  <h3 className="font-bold">Compile Exchange Bulanan</h3>
  <p className="text-sm leading-6 text-slate-500">Simpan exchange bulan yang sudah selesai ke arsip, lalu kosongkan nomor yang terverifikasi dari kolom Y. Laporan bulan lama tetap membaca arsip. Nomor yang belum ditemukan ditampilkan untuk dicocokkan; kamu dapat mengonfirmasi bulannya. Invoice yang terbukti berada di bulan lain tetap di Y.</p>
  <label className="block text-sm font-bold">Bulan arsip<input aria-label="Bulan arsip" type="month" value={period} disabled={busy||disabled||detailBusy} onChange={e=>{setPeriod(e.target.value);setPlan(null)}} className="mt-2 min-h-11 w-full rounded-xl border bg-transparent px-3"/></label>
  <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={includeUnmatched} disabled={busy||disabled||detailBusy} onChange={e=>{setIncludeUnmatched(e.target.checked);setPlan(null)}}/><span>Saya memastikan nomor yang belum ditemukan adalah invoice bulan {period}. Sertakan ke arsip bulan ini.</span></label>
  <button type="button" disabled={busy||disabled||detailBusy||!period} onClick={()=>void archive("check")} className="min-h-11 w-full rounded-xl border px-4 text-sm font-bold disabled:opacity-40">Cek & Compile Exchange</button>
  {plan&&<div className="space-y-3 rounded-xl border p-3 text-sm"><p><strong>Total {plan.invoices.length} invoice bulan {period}</strong>: {plan.alreadyArchived} sudah tersimpan dan {plan.newInvoices.length} tambahan. {plan.clearRows.length} sel Y akan dikosongkan.</p><p>{plan.kept.length} nomor dari bulan lain/lebih dari satu bulan tetap di Y.</p>{plan.pending.length>0&&<div><p>{plan.pending.length} nomor belum ditemukan di Data Copas/log/SPW: {includeUnmatched?"diarsipkan sesuai konfirmasi bulan kamu.":"tetap di Y sampai bulannya dikonfirmasi."}</p><p className="break-words">{plan.pending.join(", ")}</p></div>}<p className="max-h-32 overflow-auto break-words">{plan.invoices.join(", ")||"Belum ada exchange yang cocok dengan bulan ini."}</p><button type="button" disabled={busy||disabled||detailBusy||!plan.invoices.length} onClick={()=>void archive("archive")} className="min-h-11 w-full rounded-xl bg-blue-600 px-4 font-bold text-white disabled:opacity-40">Arsipkan & Bersihkan Y</button></div>}
  <button type="button" disabled={busy||disabled||detailBusy} onClick={()=>void archive("history")} className="min-h-11 w-full rounded-xl border px-4 text-sm font-bold">Lihat Arsip Exchange</button>
  {history&&<div className="space-y-2 text-sm"><p>{history.length} invoice tersimpan.</p><div className="max-h-48 overflow-auto">{history.map((r,i)=><p key={i}>{r[0]} · {r[1]}</p>)}</div><button type="button" onClick={downloadHistory} className="min-h-11 w-full rounded-xl border px-4 font-bold">Download Arsip CSV</button></div>}
 </section></>;
}
