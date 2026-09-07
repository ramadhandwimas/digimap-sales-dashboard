"use client";

import { useEffect, useMemo, useState } from "react";

type Mode = "lob-focus" | "product-focus" | "vas-focus";
type Tot = { qty:number; value:number };
type Payload = {
  week:string;
  availableWeeks:string[];
  lob:{ products:Array<{name:string;qty:number;value:number}>; staff:Array<{name:string;products:Record<string,Tot>;total:Tot}>; total:Tot };
  thirdParty:{ suppliers:Array<{supplier:string;qty:number;value:number;brands:Array<{code:string;name:string;qty:number;value:number;details:Array<{name:string;qty:number;value:number}>}>}>; total:Tot };
  vas:{ providers:Array<{name:string;qty:number;value:number}>; total:Tot };
};

const num = new Intl.NumberFormat("id-ID");
const money = new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});

function Summary({label,total}:{label:string;total:Tot}){
  return <div className="grid gap-3 sm:grid-cols-2">
    <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">Total Qty</p><p className="mt-2 text-2xl font-black">{num.format(total.qty)}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>
    <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">Total Value</p><p className="mt-2 text-2xl font-black">{money.format(total.value)}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>
  </div>
}

export default function TargetFocusPage({mode}:{mode:Mode}){
  const [data,setData]=useState<Payload|null>(null),[week,setWeek]=useState(""),[loading,setLoading]=useState(true);
  useEffect(()=>{setLoading(true);fetch(`/api/target-focus${week?`?week=${encodeURIComponent(week)}`:""}`,{cache:"no-store"}).then(r=>r.json()).then(j=>{setData(j);if(!week&&j.week)setWeek(j.week)}).finally(()=>setLoading(false))},[week]);
  const title=mode==="lob-focus"?"LOB Target Fokus":mode==="product-focus"?"Product Fokus 3PP":"VAS Fokus";
  const sub=mode==="lob-focus"?"Penjualan device product fokus per staff dan total":mode==="product-focus"?"Accessories 3PP per supplier, brand, detail, qty dan value":"Qoala, Telkomsel, XL dan Indosat";
  const productNames=useMemo(()=>data?.lob.products.map(x=>x.name)??[],[data]);
  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">M238 • Target Fokus</p><h2 className="mt-1 text-3xl font-black">{title}</h2><p className="mt-1 text-sm text-slate-500">{sub}</p></div>
      <label className="min-w-[190px]"><span className="mb-1 block text-[11px] font-bold uppercase tracking-[.1em] text-slate-400">Week</span><select value={week} onChange={e=>setWeek(e.target.value)} className="h-11 w-full rounded-xl border bg-white px-3 font-semibold">{(data?.availableWeeks??[]).map(w=><option key={w} value={w}>{w}</option>)}</select></label>
    </div>
    {loading?<div className="rounded-2xl border bg-white p-8 text-center text-slate-400">Memuat data Target Fokus…</div>:!data?<div className="rounded-2xl border bg-white p-8 text-center text-slate-400">Data belum tersedia.</div>:mode==="lob-focus"?<>
      <Summary label={data.week} total={data.lob.total}/>
      <section className="overflow-hidden rounded-2xl border bg-white"><div className="border-b px-5 py-4"><h3 className="font-black">Product Fokus Device</h3><p className="mt-1 text-sm text-slate-500">Semua hanya membaca Product Scheme = DEVICES.</p></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr><th className="px-4 py-3 text-left">Product</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Value</th></tr></thead><tbody>{data.lob.products.map(r=><tr key={r.name} className="border-t"><td className="px-4 py-3 font-bold">{r.name}</td><td className="px-4 py-3 text-right font-black">{num.format(r.qty)}</td><td className="px-4 py-3 text-right">{money.format(r.value)}</td></tr>)}<tr className="border-t bg-slate-50 font-black"><td className="px-4 py-3">TOTAL</td><td className="px-4 py-3 text-right">{num.format(data.lob.total.qty)}</td><td className="px-4 py-3 text-right">{money.format(data.lob.total.value)}</td></tr></tbody></table></div></section>
      <section className="overflow-hidden rounded-2xl border bg-white"><div className="border-b px-5 py-4"><h3 className="font-black">Penjualan Staff</h3><p className="mt-1 text-sm text-slate-500">Qty product fokus yang berhasil dijual setiap staff.</p></div><div className="overflow-x-auto"><table className="min-w-[1100px] text-sm"><thead><tr><th className="sticky left-0 bg-slate-50 px-4 py-3 text-left">Staff</th>{productNames.map(p=><th key={p} className="px-3 py-3 text-right">{p}</th>)}<th className="px-3 py-3 text-right">TOTAL</th></tr></thead><tbody>{data.lob.staff.map(r=><tr key={r.name} className="border-t"><td className="sticky left-0 bg-white px-4 py-3 font-bold">{r.name}</td>{productNames.map(p=><td key={p} className="px-3 py-3 text-right">{num.format(r.products[p]?.qty||0)}</td>)}<td className="px-3 py-3 text-right font-black">{num.format(r.total.qty)}</td></tr>)}</tbody></table></div></section>
    </>:mode==="product-focus"?<>
      <Summary label={data.week} total={data.thirdParty.total}/>
      <div className="space-y-4">{data.thirdParty.suppliers.map(s=><section key={s.supplier} className="overflow-hidden rounded-2xl border bg-white"><div className="flex items-center justify-between gap-4 border-b px-5 py-4"><div><h3 className="text-lg font-black">{s.supplier}</h3><p className="text-sm text-slate-500">{num.format(s.qty)} qty • {money.format(s.value)}</p></div></div>{s.brands.length? <div className="divide-y">{s.brands.map(b=><div key={b.code} className="p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-black">{b.code} • {b.name}</p><p className="text-xs text-slate-500">Qty {num.format(b.qty)} • {money.format(b.value)}</p></div></div><div className="mt-3 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr><th className="py-2 pr-3 text-left">Detail Accessories</th><th className="px-3 py-2 text-right">Qty</th><th className="pl-3 py-2 text-right">Value</th></tr></thead><tbody>{b.details.map(d=><tr key={d.name} className="border-t"><td className="py-2 pr-3">{d.name}</td><td className="px-3 py-2 text-right font-bold">{num.format(d.qty)}</td><td className="pl-3 py-2 text-right">{money.format(d.value)}</td></tr>)}</tbody></table></div></div>)}</div>:<div className="p-5 text-sm text-slate-400">Belum ada penjualan supplier ini pada {data.week}.</div>}</section>)}</div>
    </>:<>
      <Summary label={data.week} total={data.vas.total}/>
      <section className="overflow-hidden rounded-2xl border bg-white"><div className="grid sm:grid-cols-2 lg:grid-cols-4">{data.vas.providers.map(p=><div key={p.name} className="border-b p-5 sm:border-r"><p className="text-sm font-bold text-slate-500">{p.name}</p><p className="mt-2 text-2xl font-black">{num.format(p.qty)} qty</p><p className="mt-1 text-sm text-slate-500">{money.format(p.value)}</p></div>)}</div><div className="flex justify-between gap-4 border-t bg-slate-50 px-5 py-4 font-black"><span>TOTAL VAS</span><span>{num.format(data.vas.total.qty)} qty • {money.format(data.vas.total.value)}</span></div></section>
    </>}
  </div>
}
