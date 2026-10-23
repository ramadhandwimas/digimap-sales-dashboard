"use client";
import {useId,useRef,useState} from "react";
export default function ExchangeInvoiceInput({onBusyChange,onSaved,disabled=false}:{disabled?:boolean;onBusyChange?:(busy:boolean)=>void;onSaved?:(invoice:string,added:boolean)=>void}={}){
 const id=useId(),active=useRef(false);
 const[invoice,setInvoice]=useState(""),[busy,setBusy]=useState(false),[notice,setNotice]=useState<{error:boolean;text:string}|null>(null);
 const save=async()=>{
  if(active.current||disabled||!invoice.trim())return;
  active.current=true;setBusy(true);onBusyChange?.(true);setNotice(null);
  try{
   const response=await fetch("/api/data-upload-ops",{method:"POST",headers:{"content-type":"application/json"},cache:"no-store",body:JSON.stringify({action:"exchange",noExchange:invoice.trim()})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||"Nomor invoice exchange gagal disimpan.");
   setNotice({error:false,text:result.message||"Nomor invoice exchange berhasil disimpan."});setInvoice("");onSaved?.(result.noExchange,result.added);
  }catch(error){setNotice({error:true,text:error instanceof Error?error.message:"Nomor invoice exchange gagal disimpan."})}
  finally{active.current=false;setBusy(false);onBusyChange?.(false)}
 };
 return <form className="space-y-4" onSubmit={event=>{event.preventDefault();void save()}} aria-label="Input nomor invoice exchange">
  <p className="text-sm leading-6 text-slate-500">Masukkan nomor invoice exchange untuk disimpan ke daftar kolom Y. Nomor tetap bisa disimpan saat transaksi masih pending.</p>
  <label htmlFor={id} className="block text-sm font-bold">Nomor invoice exchange</label>
  <input id={id} type="text" maxLength={100} autoComplete="off" value={invoice} disabled={busy||disabled} onChange={event=>{setInvoice(event.target.value);setNotice(null)}} placeholder="Contoh: 100051953" className="min-h-11 w-full rounded-xl border bg-white px-3 text-sm dark:bg-slate-950"/>
  {notice?<p role="status" className={`rounded-xl border p-3 text-sm ${notice.error?"border-rose-200 bg-rose-50 text-rose-700":"border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{notice.text}</p>:null}
  <button type="submit" disabled={busy||disabled||!invoice.trim()} className="min-h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-black text-white disabled:opacity-40">{busy?"Menyimpan…":"Simpan No Exchange"}</button>
 </form>;
}
