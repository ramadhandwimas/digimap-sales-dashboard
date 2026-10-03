"use client";

import {useMemo,useState} from "react";
import {Search,Tag} from "lucide-react";
import type {PromoCatalogItem} from "@/lib/promo-board-catalog";

const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const LOBS=["Semua","iPhone","Mac","iPad","Watch","AirPods"] as const;
const LABELS:Record<string,string>={Mac:"MacBook",Watch:"Apple Watch"};
const LOB_RANK:Record<string,number>={iPhone:0,Mac:1,iPad:2,Watch:3,AirPods:4};

function hasPromo(item:PromoCatalogItem){
  const p=item.group;
  return p.normalPrice>0&&p.promotionPrice>0&&p.promotionPrice<p.normalPrice;
}

// Promo tab is intentionally focused on current/relevant selling models.
// Older products remain available in Pricelist, but do not clutter this quick promo view.
function isCurrentSellingModel(item:PromoCatalogItem){
  const text=`${item.model} ${item.friendlyName} ${item.generation} ${item.chip}`.toLowerCase().replace(/\s+/g," ");
  if(item.lob==="iPhone")return /iphone (17|air|17e)/.test(text);
  if(item.lob==="Mac")return /macbook (neo|air.*m5|pro.*m5)/.test(text)||/\bm5\b/.test(text)&&/macbook/.test(text);
  if(item.lob==="iPad")return /ipad (11|.*a16|air.*m4|pro.*m5)/.test(text)||/ipad.*\b(a16|m4|m5)\b/.test(text);
  if(item.lob==="Watch")return /watch.*(series 11|se 3|ultra 3)/.test(text)||/apple watch.*\b(11|se3|se 3|ultra 3)\b/.test(text);
  if(item.lob==="AirPods")return /airpods (4|4 anc|pro 3)/.test(text);
  return false;
}

function promoStatus(item:PromoCatalogItem){
  const p=item.group;
  if(p.promoStatus==="ENDING_SOON")return p.daysRemaining===0?"Berakhir hari ini":p.daysRemaining===1?"Berakhir besok":`Sisa ${p.daysRemaining} hari`;
  if(p.promoStatus==="FURTHER_NOTICE")return"Further Notice";
  if(p.promoStatus==="UPCOMING")return"Akan Datang";
  return"Promo Aktif";
}

function stockLabel(item:PromoCatalogItem){
  if(item.totalSoh==null)return"SOH -";
  return `SOH ${item.stockCompleteness==="PARTIAL"?`${item.totalSoh}+`:item.totalSoh}`;
}

export default function PromoBoardPromoList({catalog}:{catalog:PromoCatalogItem[]}){
  const[lob,setLob]=useState<string>("Semua"),[query,setQuery]=useState("");
  const promos=useMemo(()=>catalog.filter(item=>hasPromo(item)&&isCurrentSellingModel(item)),[catalog]);
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return promos.filter(item=>(lob==="Semua"||item.lob===lob)&&(!q||[
      item.friendlyName,item.model,item.capacity,item.connectivity,item.generation,item.chip,
      ...item.stockVariants.flatMap(v=>[v.color,v.product.sapArticle,v.product.sapDescription]),
    ].join(" ").toLowerCase().includes(q))).sort((a,b)=>(LOB_RANK[a.lob]??99)-(LOB_RANK[b.lob]??99)||a.model.localeCompare(b.model,undefined,{numeric:true})||a.capacity.localeCompare(b.capacity,undefined,{numeric:true}));
  },[promos,lob,query]);
  const unique=useMemo(()=>{
    const seen=new Set<string>();
    return filtered.filter(item=>{const key=[item.lob,item.model,item.capacity,item.connectivity,item.group.promotionPrice].join("|");if(seen.has(key))return false;seen.add(key);return true});
  },[filtered]);

  return <section className="mt-4">
    <div className="rounded-3xl border bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari promo, capacity, warna, atau SAP..." className="h-12 w-full rounded-2xl border bg-transparent pl-10 pr-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-200"/></div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{LOBS.map(x=><button key={x} onClick={()=>setLob(x)} className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-black ${lob===x?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}>{LABELS[x]||x}</button>)}</div>
    </div>

    <div className="mt-4 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.14em] text-blue-600">Promo Current Product</p><p className="mt-1 text-sm text-slate-500">{unique.length} promo produk aktif & relevan tahun ini</p></div><div className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/30"><Tag className="size-5"/></div></div>

    {unique.length?<div className="mt-3 overflow-hidden rounded-3xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">{unique.map((item,index)=>{const p=item.group,saving=Math.max(0,p.normalPrice-p.promotionPrice);return <article key={item.key} className={`px-4 py-4 ${index?"border-t dark:border-slate-800":""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase tracking-[.12em] text-blue-600">{LABELS[item.lob]||item.lob}</span><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{promoStatus(item)}</span></div><h2 className="mt-1 truncate text-[15px] font-black">{item.model}</h2><p className="mt-0.5 text-xs font-semibold text-slate-500">{[item.capacity,item.connectivity].filter(Boolean).join(" • ")||"Semua varian"}</p></div>
        <div className="shrink-0 text-right"><p className="text-[15px] font-black text-blue-600">{money.format(p.promotionPrice)}</p><p className="mt-0.5 text-[10px] text-slate-400 line-through">{money.format(p.normalPrice)}</p></div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]"><span className="font-black text-emerald-600">Hemat {money.format(saving)} • {p.discountPercentage.toFixed(1)}%</span><span className="font-bold text-slate-500">{stockLabel(item)}</span><span className="font-bold text-slate-400">{item.stockVariants.length} varian</span></div>
      {p.remarks?<p className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate-400">{p.remarks}</p>:null}
    </article>})}</div>:<div className="mt-4 rounded-3xl border border-dashed p-8 text-center text-sm text-slate-400">Tidak ada promo current product untuk filter ini.</div>}
  </section>;
}
