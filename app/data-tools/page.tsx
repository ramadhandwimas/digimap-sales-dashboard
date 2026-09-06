"use client";
import {useRef,useState} from "react";
const card="rounded-2xl border bg-white p-5 shadow-sm";
const MASTER_URL="https://docs.google.com/spreadsheets/d/1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk/edit";
type Notice={type:"success"|"error";title:string;text:string}|null;
export default function Page(){
  const spw=useRef<HTMLInputElement>(null),soh=useRef<HTMLInputElement>(null),[notice,setNotice]=useState<Notice>(null),[busy,setBusy]=useState(""),[pin,setPin]=useState("");
  const show=(type:"success"|"error",title:string,text:string)=>setNotice({type,title,text:`${text} • ${new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}`});
  const upload=async(kind:"spw"|"soh")=>{
    const input=(kind==="spw"?spw:soh).current,f=input?.files?.[0];
    if(!f)return show("error",`Upload ${kind.toUpperCase()} belum dijalankan`,`Pilih file Excel ${kind.toUpperCase()} terlebih dahulu.`);
    setBusy(`upload-${kind}`);setNotice(null);
    try{
      const body=new FormData();body.append("file",f);
      const r=await fetch(kind==="spw"?"/api/upload-spw":"/api/upload-soh",{method:"POST",body,cache:"no-store"}),j=await r.json();
      if(!r.ok)show("error",`Upload ${kind.toUpperCase()} gagal`,j.error||"Periksa file lalu coba kembali.");
      else{show("success",`Upload ${kind.toUpperCase()} berhasil`,`${f.name} • ${j.rows} baris sudah masuk ke MASTER DATA M238 dan tervalidasi sebelum dipakai dashboard.`);if(input)input.value="";}
    }catch{show("error",`Upload ${kind.toUpperCase()} gagal`,"Koneksi terputus atau server tidak merespons. Coba ulangi.")}finally{setBusy("")}
  };
  const action=async(a:string)=>{
    const label=a==="cutoff-spw"?"Cut Off SPW":a==="clear-spw"?"Clear SPW":"Clear SOH";
    if(a==="cutoff-spw"&&!confirm("Lanjut Cut Off SPW? Data hasil RAW SalesPerson AB–AR akan ditambahkan ke Data Copas."))return;
    if(a.startsWith("clear")&&!confirm(`Yakin ingin ${label}? Data upload yang ada akan dibersihkan.`))return;
    setBusy(a);setNotice(null);
    try{
      const r=await fetch("/api/data-tools",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:a,passcode:pin}),cache:"no-store"}),j=await r.json();
      if(!r.ok)show("error",`${label} gagal`,j.error||"Operasi tidak dapat diselesaikan.");
      else show("success",`${label} berhasil`,j.message||`${label} selesai diproses.`);
    }catch{show("error",`${label} gagal`,"Koneksi terputus atau server tidak merespons. Coba ulangi.")}finally{setBusy("")}
  };
  const btn=(key:string)=>busy===key?"Memproses...":null;
  return <main className="min-h-screen bg-slate-50 p-5 sm:p-8"><a href="/" className="font-bold text-blue-600">← Dashboard</a><div className="mx-auto mt-6 max-w-5xl space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-black">Data Upload</h1><p className="text-slate-500">Excel dikonversi ke native Google Sheets di MASTER DATA M238 lebih dulu, lalu dashboard membaca hasil yang sudah tervalidasi.</p></div><a href={MASTER_URL} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white">Buka MASTER DATA M238 ↗</a></div>
  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><b>Arsitektur baru aktif:</b> SPW → MASTER DATA M238 / SPW → RAW SalesPerson & dashboard. SOH → MASTER DATA M238 / SOH → RAW StockPosition & dashboard. Feedback, CX/Member, Schedule Snapshot, Daily Target Snapshot, Daily Sales Snapshot, dan Feedback Summary juga sudah diarahkan ke MASTER DATA M238.</div>
  {notice&&<div role="alert" aria-live="polite" className={`rounded-2xl border p-4 ${notice.type==="success"?"border-emerald-300 bg-emerald-50 text-emerald-900":"border-red-300 bg-red-50 text-red-900"}`}><div className="font-black">{notice.type==="success"?"✓ ":"⚠ "}{notice.title}</div><div className="mt-1 text-sm font-semibold">{notice.text}</div></div>}
  <div className="grid gap-5 md:grid-cols-2"><section className={card}><h2 className="text-lg font-black">Upload SPW</h2><p className="mt-1 text-sm text-slate-500">File SPW dibaca sebagai nilai native Google Sheets di tab SPW terlebih dahulu, sehingga tanggal, staff, article, invoice dan amount tidak berubah format.</p><input ref={spw} type="file" accept=".xlsx,.xls" className="mt-4 w-full rounded-xl border p-2"/><button disabled={!!busy} onClick={()=>upload("spw")} className="mt-3 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">{btn("upload-spw")||"Upload SPW"}</button></section>
  <section className={card}><h2 className="text-lg font-black">Cut Off SPW</h2><p className="mt-1 text-sm text-slate-500">Menambahkan hasil RAW SalesPerson AB–AR ke Data Copas tanpa menimpa histori sebelumnya.</p><button disabled={!!busy} onClick={()=>action("cutoff-spw")} className="mt-6 w-full rounded-xl bg-slate-800 px-5 py-3 font-bold text-white disabled:opacity-50">{btn("cutoff-spw")||"Cut Off SPW"}</button></section>
  <section className={card}><h2 className="text-lg font-black">Upload SOH</h2><p className="mt-1 text-sm text-slate-500">File SOH dikonversi ke MASTER DATA M238 / SOH dan baru diteruskan setelah price, qty dan total terbaca sebagai angka.</p><input ref={soh} type="file" accept=".xlsx,.xls" className="mt-4 w-full rounded-xl border p-2"/><button disabled={!!busy} onClick={()=>upload("soh")} className="mt-3 w-full rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-50">{btn("upload-soh")||"Upload SOH"}</button></section>
  <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-red-700">Admin Clear</h2><p className="mt-1 text-sm text-slate-500">Clear hanya untuk kebutuhan admin dan tetap memakai passcode agar data tidak terhapus tidak sengaja.</p><input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="Passcode Admin" className="mt-4 h-11 w-full rounded-xl border px-3"/><div className="mt-3 grid grid-cols-2 gap-3"><button disabled={!!busy||!pin} onClick={()=>action("clear-spw")} className="rounded-xl bg-red-600 px-4 py-3 font-bold text-white disabled:opacity-40">{btn("clear-spw")||"Clear SPW"}</button><button disabled={!!busy||!pin} onClick={()=>action("clear-soh")} className="rounded-xl bg-red-600 px-4 py-3 font-bold text-white disabled:opacity-40">{btn("clear-soh")||"Clear SOH"}</button></div><p className="mt-3 text-xs font-semibold text-slate-500">Clear hanya dapat dijalankan dengan ADMIN_PASSCODE yang tersimpan di Vercel.</p></section></div></div></main>;
}
