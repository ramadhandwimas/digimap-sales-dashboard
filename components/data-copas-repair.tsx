"use client";
import {useState} from "react";
import {CircleCheck,LoaderCircle,WandSparkles} from "lucide-react";

type Notice={kind:"success"|"error";text:string}|null;

export default function DataCopasRepair(){
 const[busy,setBusy]=useState(false),[notice,setNotice]=useState<Notice>(null);
 const repair=async()=>{
  setBusy(true);setNotice(null);
  try{
   const previewResponse=await fetch("/api/data-upload-ops",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"repair-copas",dryRun:true}),cache:"no-store"});
   const preview=await previewResponse.json();
   if(!previewResponse.ok)throw new Error(preview.error||"Pengecekan Data Copas gagal");
   if(!Number(preview.repairRows||0)){setNotice({kind:"success",text:preview.message||"Data Copas sudah sesuai dengan Master terbaru."});return}
   const unresolved=Number(preview.unresolvedNARows||0)?`\n${preview.unresolvedNARows} baris N/A belum memiliki SAP Article di Master dan tidak akan diubah.`:"";
   const approved=window.confirm(`${preview.message}\nTotal ${preview.changedCells} sel klasifikasi akan disesuaikan.${unresolved}\n\nLanjutkan perbaikan? Kolom transaksi, Qty, Amount, Week, Store, dan Concept tidak akan diubah.`);
   if(!approved)return;
   const response=await fetch("/api/data-upload-ops",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"repair-copas",planId:preview.planId}),cache:"no-store"});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Perbaikan Data Copas gagal");
   setNotice({kind:"success",text:result.message||"Data Copas berhasil diperbaiki."});
   window.dispatchEvent(new CustomEvent("m238:data-activity",{detail:{label:"Perbaiki Data Copas",timestamp:new Date().toISOString(),detail:`${result.repairRows??0} baris • ${result.changedCells??0} sel`}}));
  }catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Perbaikan Data Copas gagal"})}
  finally{setBusy(false)}
 };
 return <section className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950 sm:p-5" aria-label="Cek dan perbaiki Data Copas">
  <div className="flex items-start gap-3"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950"><WandSparkles size={20}/></span><div><h3 className="font-extrabold">Cek &amp; Perbaiki Data Copas</h3><p className="mt-1 text-sm text-slate-500">Cocokkan kembali SAP Article dengan Master terbaru dan perbaiki klasifikasi N/A atau yang berbeda.</p></div></div>
  <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500 dark:bg-slate-900">Yang diperbaiki: Type, Product Category, Brand, Core Product, Product Scheme, dan Vendor. Data transaksi, Qty, dan Amount tidak diubah.</p>
  {notice?<div role="status" className={`mt-3 rounded-xl border p-3 text-sm font-bold ${notice.kind==="success"?"border-emerald-200 bg-emerald-50 text-emerald-700":"border-rose-200 bg-rose-50 text-rose-700"}`}>{notice.kind==="success"?<CircleCheck className="mr-2 inline size-4"/>:null}{notice.text}</div>:null}
  <button type="button" disabled={busy} onClick={()=>void repair()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{busy?<LoaderCircle className="size-4 animate-spin"/>:<WandSparkles className="size-4"/>}{busy?"Memeriksa Data Copas…":"Cek & Perbaiki Sekarang"}</button>
 </section>
}
