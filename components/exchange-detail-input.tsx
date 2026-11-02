"use client";
import {useRef,useState} from "react";
type Item={key:string;date:string;description:string;article:string;qty:number;amount:number;exchangeQty:number};
type Plan={invoice:string;store:string;planId:string;items:Item[];legacy:boolean;archived:boolean;collision:boolean};
const money=(n:number)=>`Rp${n.toLocaleString("id-ID")}`;
export default function ExchangeDetailInput({disabled=false,onBusyChange,onSaved}:{disabled?:boolean;onBusyChange?:(busy:boolean)=>void;onSaved?:(invoice:string)=>void}){
 const[invoice,setInvoice]=useState(""),[store,setStore]=useState("M238"),[mode,setMode]=useState("partial"),[plan,setPlan]=useState<Plan|null>(null),[quantities,setQuantities]=useState<Record<string,number>>({}),[review,setReview]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");const active=useRef(false);
 const reset=()=>{setPlan(null);setReview(false);setNotice("")};
 const request=async(action:"check"|"save")=>{
  if(active.current)return;active.current=true;setBusy(true);onBusyChange?.(true);setNotice("");
  try{const response=await fetch("/api/exchange-detail",{method:"POST",headers:{"content-type":"application/json"},cache:"no-store",body:JSON.stringify({action,invoice:invoice.trim(),store,mode,planId:plan?.planId,items:plan?.items.map(r=>({key:r.key,qty:mode==="all"?r.qty:quantities[r.key]??0}))})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Exchange gagal diproses.");
   if(action==="check"){setPlan(result);setQuantities(Object.fromEntries(result.items.map((r:Item)=>[r.key,r.exchangeQty])));setReview(false)}else{setPlan(null);setReview(false);setNotice(result.message+(result.warning?` ${result.warning}`:""));onSaved?.(invoice.trim())}
  }catch(e){setReview(false);setNotice(e instanceof Error?e.message:"Exchange gagal.")}finally{active.current=false;setBusy(false);onBusyChange?.(false)}
 };
 const totals=(plan?.items||[]).reduce((a,r)=>{const q=mode==="all"?r.qty:quantities[r.key]??0;return{exchange:a.exchange+q,remaining:a.remaining+r.qty-q,amount:a.amount+Math.round(r.amount*(r.qty-q)/r.qty*100)/100}},{exchange:0,remaining:0,amount:0});
 return <section className="space-y-4" aria-label="Exchange per barang">
  <h3 className="font-bold">Konfirmasi Exchange per Barang</h3><p className="text-sm leading-6 text-slate-500">Pilih toko dan cek invoice. Barang dengan qty exchange 0 tetap dihitung. Qty exchange adalah total qty yang ditukar, termasuk konfirmasi sebelumnya. Data baru berlaku setelah kamu konfirmasi.</p>
  <label className="block text-sm font-bold">Toko<select aria-label="Toko exchange" value={store} disabled={busy||disabled} onChange={e=>{setStore(e.target.value);reset()}} className="mt-2 min-h-11 w-full rounded-xl border bg-transparent px-3"><option>M238</option><option>M996</option></select></label>
  <label className="block text-sm font-bold">Nomor invoice<input aria-label="Nomor invoice detail exchange" value={invoice} inputMode="numeric" disabled={busy||disabled} onChange={e=>{setInvoice(e.target.value);reset()}} placeholder="Masukkan nomor invoice" className="mt-2 min-h-11 w-full rounded-xl border bg-transparent px-3"/></label>
  <button type="button" disabled={busy||disabled||!invoice.trim()} onClick={()=>void request("check")} className="min-h-11 w-full rounded-xl border px-4 font-bold disabled:opacity-40">{busy?"Memproses…":"Cek Barang dalam Invoice"}</button>
  {notice&&<p role="status" className="rounded-xl border p-3 text-sm">{notice}</p>}
  {plan&&<div className="space-y-3">{!plan.items.length?<p>Invoice belum ditemukan. Upload SPW atau lakukan Cut Off terlebih dahulu.</p>:<>
   {plan.legacy&&<p className="rounded-xl border p-3 text-sm">Invoice ini sebelumnya exchange penuh di kolom Y. Setelah konfirmasi, pengaturan diganti sesuai pilihan barang di bawah.</p>}
   {plan.archived||plan.collision?<p className="rounded-xl border p-3 text-sm">{plan.archived?"Invoice sudah masuk arsip exchange penuh. Arsip lama tetap dipertahankan.":"Invoice/artikel sama ada di dua POS. Pengaturan ditahan agar toko lain tidak ikut terpotong."}</p>:<>
    <label className="block text-sm font-bold">Jenis exchange<select aria-label="Jenis exchange" disabled={busy||disabled||review} value={mode} onChange={e=>{setMode(e.target.value);setReview(false)}} className="mt-2 min-h-11 w-full rounded-xl border bg-transparent px-3"><option value="partial">Exchange Sebagian</option><option value="all">Exchange Semua</option></select></label>
    {plan.items.map(r=><div key={r.key} className="space-y-2 rounded-xl border p-3 text-sm"><strong className="block">{r.description||r.article}</strong><p>{r.date} · {r.article}</p><p>Qty awal {r.qty} · {money(r.amount)}</p><label className="flex items-center justify-between gap-3">Qty exchange<input aria-label={`Qty exchange ${r.article} ${r.date} harga ${money(r.amount/r.qty)}`} type="number" min={0} max={r.qty} step={1} value={mode==="all"?r.qty:quantities[r.key]??0} disabled={busy||disabled||review||mode==="all"} onChange={e=>{setQuantities(q=>({...q,[r.key]:Math.min(r.qty,Math.max(0,Math.floor(Number(e.target.value)||0)))}));setReview(false)}} className="min-h-11 w-24 rounded-xl border bg-transparent px-3"/></label><p>Tetap dihitung: {r.qty-(mode==="all"?r.qty:quantities[r.key]??0)} qty</p></div>)}
    <div className="rounded-xl border p-3 text-sm"><strong>{review?"Konfirmasi akhir":"Ringkasan"}</strong><p>{totals.exchange} qty di-exchange.</p><p>{totals.remaining} qty senilai {money(totals.amount)} tetap dihitung.</p></div>
    {review?<div className="flex gap-2"><button type="button" disabled={busy||disabled} onClick={()=>setReview(false)} className="min-h-11 flex-1 rounded-xl border px-3 font-bold">Ubah Pilihan</button><button type="button" disabled={busy||disabled} onClick={()=>void request("save")} className="min-h-11 flex-1 rounded-xl bg-blue-600 px-3 font-bold text-white">Ya, Konfirmasi Exchange</button></div>:<button type="button" disabled={busy||disabled||totals.exchange<=0} onClick={()=>setReview(true)} className="min-h-11 w-full rounded-xl bg-blue-600 px-4 font-bold text-white disabled:opacity-40">Tinjau & Konfirmasi</button>}
   </>}
  </>}</div>}
 </section>;
}
