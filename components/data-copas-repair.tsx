"use client";
import {useState} from "react";
import {AlertTriangle,ArrowRight,CircleCheck,ListChecks,LoaderCircle,WandSparkles} from "lucide-react";

type Notice={kind:"success"|"error";text:string}|null;
type RepairChange={column:string;field:string;from:string;to:string};
type RepairItem={row:number;article:string;description:string;changes:RepairChange[]};
type RepairIssue={row:number;article:string;description:string;detail:string};
type Preview={
 checkedRows:number;
 rowsWithNA:number;
 naRepairRows:number;
 vendorRows:number;
 repairRows:number;
 changedCells:number;
 unresolvedNARows:number;
 repairItems:RepairItem[];
 repairItemsTotal:number;
 issues:RepairIssue[];
 planId:string;
 message:string;
};

export default function DataCopasRepair(){
 const[busy,setBusy]=useState<"check"|"apply"|null>(null);
 const[notice,setNotice]=useState<Notice>(null);
 const[preview,setPreview]=useState<Preview|null>(null);

 const check=async()=>{
  setBusy("check");setNotice(null);setPreview(null);
  try{
   const response=await fetch("/api/data-upload-ops",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"repair-copas",dryRun:true}),cache:"no-store"});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Pengecekan Data Copas gagal");
   setPreview(result);
   if(!Number(result.rowsWithNA||0))setNotice({kind:"success",text:"Data Copas sudah bersih. Tidak ada N/A pada kolom klasifikasi."});
  }catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Pengecekan Data Copas gagal"})}
  finally{setBusy(null)}
 };

 const apply=async()=>{
  if(!preview?.repairRows)return;
  const approved=window.confirm(`Perbaiki ${preview.repairRows} baris dan ${preview.changedCells} sel sesuai daftar?\n\nN/A akan diisi dari Master dan Vendor akan mengikuti PT Name terbaru. Qty dan Amount tidak diubah.`);
  if(!approved)return;
  setBusy("apply");setNotice(null);
  try{
   const response=await fetch("/api/data-upload-ops",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"repair-copas",planId:preview.planId}),cache:"no-store"});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Perbaikan Data Copas gagal");
   setNotice({kind:"success",text:result.message||"Data Copas berhasil diperbaiki."});
   setPreview(null);
   window.dispatchEvent(new CustomEvent("m238:data-activity",{detail:{label:"Perbaiki Data Copas",timestamp:new Date().toISOString(),detail:`${result.repairRows??0} baris • ${result.changedCells??0} sel`}}));
  }catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Perbaikan Data Copas gagal"})}
  finally{setBusy(null)}
 };

 return <section className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950 sm:p-5" aria-label="Cek dan perbaiki Data Copas">
  <div className="flex items-start gap-3"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950"><WandSparkles size={20}/></span><div><h3 className="font-extrabold">Cek &amp; Perbaiki Data Copas</h3><p className="mt-1 text-sm text-slate-500">Cari N/A, tampilkan daftar perbaikannya, lalu isi dari Master terbaru.</p></div></div>
  <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500 dark:bg-slate-900">Sel N/A diisi dari Master terbaru. Nama Vendor juga disamakan dengan PT Name terbaru pada Master!I:L jika referensinya tersedia. Qty, Amount, dan klasifikasi lain yang sudah terisi tidak diubah.</p>
  {notice?<div role="status" className={`mt-3 rounded-xl border p-3 text-sm font-bold ${notice.kind==="success"?"border-emerald-200 bg-emerald-50 text-emerald-700":"border-rose-200 bg-rose-50 text-rose-700"}`}>{notice.kind==="success"?<CircleCheck className="mr-2 inline size-4"/>:null}{notice.text}</div>:null}

  {preview?<div className="mt-4 space-y-3">
   <div className="grid grid-cols-3 gap-2">
    <Summary value={preview.repairRows} label="Siap diperbaiki" tone="blue"/>
    <Summary value={preview.vendorRows} label="Vendor di-update" tone={preview.vendorRows?"blue":"slate"}/>
    <Summary value={preview.unresolvedNARows} label="Perlu diperiksa" tone={preview.unresolvedNARows?"amber":"slate"}/>
   </div>
   <p className="text-xs text-slate-500">Ditemukan {preview.rowsWithNA} baris N/A, termasuk {preview.naRepairRows} baris yang aman diperbaiki. Nilai Vendor akan mengikuti PT Name terbaru dari Master.</p>

   {preview.repairItems.length?<details open className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 dark:border-blue-900 dark:bg-blue-950/20">
    <summary className="cursor-pointer text-sm font-black text-blue-800 dark:text-blue-200">Daftar yang akan diperbaiki ({preview.repairItemsTotal})</summary>
    {preview.repairItemsTotal>preview.repairItems.length?<p className="mt-2 text-xs text-blue-700">Menampilkan {preview.repairItems.length} baris pertama dari {preview.repairItemsTotal}. Semua baris tetap mengikuti daftar pemeriksaan saat disimpan.</p>:null}
    <div className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">{preview.repairItems.map(item=><article key={`${item.row}-${item.article}`} className="rounded-xl border bg-white p-3 text-xs dark:bg-slate-950">
     <div className="font-black">Baris {item.row} · {item.article}</div>
     <div className="mt-1 text-slate-500">{item.description||"Tanpa deskripsi"}</div>
     <div className="mt-2 space-y-1">{item.changes.map(change=><div key={change.column} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-900">
      <span><b>{change.column} · {change.field}</b><br/><span className="text-rose-600">{change.from||"Kosong"}</span></span><ArrowRight className="size-3.5 text-slate-400"/><span className="font-bold text-emerald-700 break-words">{change.to}</span>
     </div>)}</div>
    </article>)}</div>
   </details>:null}

   {preview.issues.length?<details open className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/20">
    <summary className="cursor-pointer text-sm font-black text-amber-800 dark:text-amber-200">Perlu diperiksa manual ({preview.issues.length})</summary>
    <div className="mt-3 space-y-2">{preview.issues.map(issue=><article key={`${issue.row}-${issue.article}`} className="rounded-xl border border-amber-100 bg-white p-3 text-xs dark:bg-slate-950">
     <div className="flex gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600"/><div><div className="font-black">Baris {issue.row} · {issue.article}</div><div className="mt-1 text-slate-500">{issue.description}</div><div className="mt-1 font-bold text-amber-700">{issue.detail}</div></div></div>
    </article>)}</div>
   </details>:null}

   {preview.repairRows?<button type="button" disabled={Boolean(busy)} onClick={()=>void apply()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{busy==="apply"?<LoaderCircle className="size-4 animate-spin"/>:<WandSparkles className="size-4"/>}{busy==="apply"?"Memperbaiki Data…":`Perbaiki ${preview.repairRows} Baris Sekarang`}</button>:null}
  </div>:null}

  <button type="button" disabled={Boolean(busy)} onClick={()=>void check()} className={`${preview?"mt-3 bg-white text-blue-700 ring-1 ring-blue-200 dark:bg-slate-950":"mt-4 bg-blue-600 text-white"} flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black disabled:opacity-50`}>{busy==="check"?<LoaderCircle className="size-4 animate-spin"/>:<ListChecks className="size-4"/>}{busy==="check"?"Memeriksa Data Copas…":preview?"Cek Ulang Data Copas":"Cek Data Copas"}</button>
 </section>
}

function Summary({value,label,tone}:{value:number;label:string;tone:"blue"|"amber"|"slate"}){
 const colors=tone==="blue"?"border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200":tone==="amber"?"border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200":"border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";
 return <div className={`rounded-xl border p-2.5 ${colors}`}><div className="text-xl font-black">{value}</div><div className="mt-1 text-[10px] font-bold leading-4 sm:text-xs">{label}</div></div>
}
