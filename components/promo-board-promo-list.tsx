"use client";

import {useMemo,useState} from "react";
import {Search,Tag} from "lucide-react";
import type {PromoCatalogItem} from "@/lib/promo-board-catalog";

const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const LOBS=["Semua","iPhone","Mac","iPad","Watch","AirPods"] as const;
const LABELS:Record<string,string>={Mac:"MacBook",Watch:"Apple Watch"};
const LOB_RANK:Record<string,number>={iPhone:0,Mac:1,iPad:2,Watch:3,AirPods:4};

function jakartaToday(){
  return new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());
}

function isPromoCurrentlyValid(item:PromoCatalogItem){
  const p=item.group;
  if(!(p.normalPrice>0&&p.promotionPrice>0&&p.promotionPrice<p.normalPrice))return false;
  if(!["ACTIVE","ENDING_SOON","FURTHER_NOTICE"].includes(p.promoStatus))return false;
  if(p.promoStatus==="FURTHER_NOTICE"||p.promoPeriodType==="FURTHER_NOTICE")return true;

  const today=jakartaToday();
  if(p.promoStartDate&&p.promoStartDate>today)return false;
  if(p.promoEndDate&&p.promoEndDate<today)return false;
  return true;
}

function modelRecencyScore(item:PromoCatalogItem){
  const text=`${item.model} ${item.friendlyName} ${item.generation} ${item.chip}`.toLowerCase().replace(/\s+/g," ");

  if(item.lob==="iPhone"){
    const series=text.match(/iphone\s+(\d{2})/i);
    if(series)return Number(series[1])*100+(text.includes("pro max")?40:text.includes("pro")?30:text.includes("plus")?20:10);
    if(/iphone\s+air/.test(text))return 1705;
    return 0;
  }

  if(item.lob==="Mac"){
    const chip=text.match(/\bm(\d+)\b/i);
    if(chip)return 1000+Number(chip[1])*100+(text.includes("pro")?30:text.includes("air")?20:10);
    if(text.includes("neo"))return 1490;
    return 0;
  }

  if(item.lob==="iPad"){
    const mChip=text.match(/\bm(\d+)\b/i);
    if(mChip)return 1000+Number(mChip[1])*100+(text.includes("pro")?30:text.includes("air")?20:10);
    const aChip=text.match(/\ba(\d+)\b/i);
    if(aChip)return 500+Number(aChip[1]);
    const gen=text.match(/ipad\s+(\d+)/i);
    if(gen)return Number(gen[1])*10;
    return 0;
  }

  if(item.lob==="Watch"){
    const series=text.match(/series\s*(\d+)/i);
    if(series)return 1000+Number(series[1])*10;
    const ultra=text.match(/ultra\s*(\d+)/i);
    if(ultra)return 950+Number(ultra[1])*10;
    const se=text.match(/se\s*(\d+)/i);
    if(se)return 900+Number(se[1])*10;
    return 0;
  }

  if(item.lob==="AirPods"){
    const pro=text.match(/airpods\s+pro\s*(\d+)/i);
    if(pro)return 1000+Number(pro[1])*100;
    const base=text.match(/airpods\s*(\d+)/i);
    if(base)return 900+Number(base[1])*100+(text.includes("anc")?10:0);
    return 0;
  }

  return 0;
}

function promoStatus(item:PromoCatalogItem){
  const p=item.group;
  if(p.promoStatus==="ENDING_SOON")return p.daysRemaining===0?"Berakhir hari ini":p.daysRemaining===1?"Berakhir besok":`Sisa ${p.daysRemaining} hari`;
  if(p.promoStatus==="FURTHER_NOTICE")return"Further Notice";
  return"Promo Aktif";
}

function stockLabel(item:PromoCatalogItem){
  if(item.totalSoh==null)return"SOH -";
  return `SOH ${item.stockCompleteness==="PARTIAL"?`${item.totalSoh}+`:item.totalSoh}`;
}

export default function PromoBoardPromoList({catalog}:{catalog:PromoCatalogItem[]}){
  const[lob,setLob]=useState<string>("Semua"),[query,setQuery]=useState("");
  const promos=useMemo(()=>catalog.filter(isPromoCurrentlyValid),[catalog]);
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return promos.filter(item=>(lob==="Semua"||item.lob===lob)&&(!q||[
      item.friendlyName,item.model,item.capacity,item.connectivity,item.generation,item.chip,
      ...item.stockVariants.flatMap(v=>[v.color,v.product.sapArticle,v.product.sapDescription]),
    ].join(" ").toLowerCase().includes(q))).sort((a,b)=>
      (LOB_RANK[a.lob]??99)-(LOB_RANK[b.lob]??99)||
      modelRecencyScore(b)-modelRecencyScore(a)||
      b.model.localeCompare(a.model,undefined,{numeric:true})||
      a.capacity.localeCompare(b.capacity,undefined,{numeric:true})
    );
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

    <div className="mt-4 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.14em] text-blue-600">Promo Aktif</p><p className="mt-1 text-sm text-slate-500">{unique.length} promo yang masih berlaku • tipe terbaru di atas</p></div><div className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/30"><Tag className="size-5"/></div></div>

    {unique.length?<div className="mt-3 overflow-hidden rounded-3xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">{unique.map((item,index)=>{const p=item.group,saving=Math.max(0,p.normalPrice-p.promotionPrice);return <article key={item.key} className={`px-4 py-4 ${index?"border-t dark:border-slate-800":""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase tracking-[.12em] text-blue-600">{LABELS[item.lob]||item.lob}</span><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{promoStatus(item)}</span></div><h2 className="mt-1 truncate text-[15px] font-black">{item.model}</h2><p className="mt-0.5 text-xs font-semibold text-slate-500">{[item.capacity,item.connectivity].filter(Boolean).join(" • ")||"Semua varian"}</p></div>
        <div className="shrink-0 text-right"><p className="text-[15px] font-black text-blue-600">{money.format(p.promotionPrice)}</p><p className="mt-0.5 text-[10px] text-slate-400 line-through">{money.format(p.normalPrice)}</p></div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]"><span className="font-black text-emerald-600">Hemat {money.format(saving)} • {p.discountPercentage.toFixed(1)}%</span><span className="font-bold text-slate-500">{stockLabel(item)}</span><span className="font-bold text-slate-400">{item.stockVariants.length} varian</span></div>
      {p.remarks?<p className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate-400">{p.remarks}</p>:null}
    </article>})}</div>:<div className="mt-4 rounded-3xl border border-dashed p-8 text-center text-sm text-slate-400">Tidak ada promo aktif untuk filter ini.</div>}
  </section>;
}
