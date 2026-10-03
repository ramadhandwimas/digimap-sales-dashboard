"use client";

import {useMemo,useState} from "react";
import {Search,Tag} from "lucide-react";
import type {PromoCatalogItem} from "@/lib/promo-board-catalog";

const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const LOBS=["Semua","iPhone","Mac","iPad","Watch","AirPods"] as const;
const LABELS:Record<string,string>={Mac:"MacBook",Watch:"Apple Watch"};

function hasPromo(item:PromoCatalogItem){
  const p=item.group;
  return p.normalPrice>0&&p.promotionPrice>0&&p.promotionPrice<p.normalPrice;
}

function promoStatus(item:PromoCatalogItem){
  const p=item.group;
  if(p.promoStatus==="ENDING_SOON")return p.daysRemaining===0?"Berakhir Hari Ini":p.daysRemaining===1?"Berakhir Besok":`Sisa ${p.daysRemaining} Hari`;
  if(p.promoStatus==="FURTHER_NOTICE")return"Further Notice";
  if(p.promoStatus==="UPCOMING")return"Akan Datang";
  return"Promo Aktif";
}

export default function PromoBoardPromoList({catalog}:{catalog:PromoCatalogItem[]}){
  const[lob,setLob]=useState<string>("Semua"),[query,setQuery]=useState("");
  const promos=useMemo(()=>catalog.filter(hasPromo),[catalog]);
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return promos.filter(item=>(lob==="Semua"||item.lob===lob)&&(!q||[
      item.friendlyName,item.model,item.capacity,item.connectivity,item.generation,item.chip,
      ...item.stockVariants.flatMap(v=>[v.color,v.product.sapArticle,v.product.sapDescription]),
    ].join(" ").toLowerCase().includes(q))).sort((a,b)=>a.lob.localeCompare(b.lob)||a.model.localeCompare(b.model,undefined,{numeric:true})||a.capacity.localeCompare(b.capacity,undefined,{numeric:true}));
  },[promos,lob,query]);
  const unique=useMemo(()=>{
    const seen=new Set<string>();
    return filtered.filter(item=>{const key=[item.lob,item.model,item.capacity,item.connectivity,item.group.promotionPrice].join("|");if(seen.has(key))return false;seen.add(key);return true});
  },[filtered]);

  return <section className="mt-4">
    <div className="rounded-3xl border bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari produk promo, capacity, warna, atau SAP..." className="h-12 w-full rounded-2xl border bg-transparent pl-10 pr-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-200"/></div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{LOBS.map(x=><button key={x} onClick={()=>setLob(x)} className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-black ${lob===x?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}>{LABELS[x]||x}</button>)}</div>
    </div>
    <div className="mt-4 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.14em] text-blue-600">Promo</p><p className="mt-1 text-sm text-slate-500">{unique.length} pilihan promo dari pricelist aktif</p></div><div className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/30"><Tag className="size-5"/></div></div>
    {unique.length?<div className="mt-3 grid gap-3 sm:grid-cols-2">{unique.map(item=>{const p=item.group,saving=Math.max(0,p.normalPrice-p.promotionPrice);return <article key={item.key} className="rounded-3xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-blue-600">{LABELS[item.lob]||item.lob}</p><h2 className="mt-1 text-lg font-black">{item.model}</h2><p className="mt-1 text-xs font-bold text-slate-500">{[item.capacity,item.connectivity].filter(Boolean).join(" • ")}</p></div><span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">{promoStatus(item)}</span></div><div className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-[10px] font-black uppercase text-slate-400">Harga Promo</p><p className="mt-1 text-xl font-black text-blue-600">{money.format(p.promotionPrice)}</p><p className="mt-1 text-xs text-slate-400 line-through">{money.format(p.normalPrice)}</p><p className="mt-2 text-xs font-black text-emerald-600">Hemat {money.format(saving)} • {p.discountPercentage.toFixed(1)}%</p></div><div className="mt-3 flex items-center justify-between text-xs"><span className="font-bold text-slate-500">SOH {item.totalSoh==null?"belum terbaca":item.stockCompleteness==="PARTIAL"?`${item.totalSoh}+`:item.totalSoh}</span><span className="font-black text-slate-400">{item.stockVariants.length} varian</span></div>{p.remarks?<p className="mt-3 border-t pt-3 text-xs leading-5 text-slate-500 dark:border-slate-800">{p.remarks}</p>:null}</article>})}</div>:<div className="mt-4 rounded-3xl border border-dashed p-8 text-center text-sm text-slate-400">Tidak ada promo untuk filter ini.</div>}
  </section>;
}
