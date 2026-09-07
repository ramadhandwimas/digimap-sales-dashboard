"use client";

import { useEffect, useMemo, useState } from "react";

type Mode = "lob-focus" | "product-focus" | "vas-focus";
type FilterMode = "week" | "month" | "range";
type Tot = { qty:number; value:number };
type Supplier = { supplier:string;qty:number;value:number;brands:Array<{code:string;name:string;qty:number;value:number;details:Array<{name:string;qty:number;value:number}>}>;staff:Array<{name:string;qty:number;value:number}> };
type Provider = { name:string;qty:number;value:number;staff:Array<{name:string;qty:number;value:number;deviceQty:number;deviceValue:number;ar:number}> };
type Payload = {
  mode:FilterMode; periodLabel:string; week:string; month:string; from:string; to:string; availableWeeks:string[]; availableMonths:string[];
  lob:{ products:Array<{name:string;qty:number;value:number}>; staff:Array<{name:string;products:Record<string,Tot>;total:Tot;deviceTotal:Tot}>; total:Tot };
  thirdParty:{ suppliers:Supplier[]; total:Tot };
  vas:{ providers:Provider[]; total:Tot };
};

const num = new Intl.NumberFormat("id-ID");
const money = new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const pct = (v:number) => `${new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(v)}%`;
const monthName=(v:string)=>{if(!/^\d{4}-\d{2}$/.test(v))return v;const[y,m]=v.split("-").map(Number);return new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric"}).format(new Date(y,m-1,1))};

function Summary({label,total}:{label:string;total:Tot}){
  return <div className="grid gap-3 sm:grid-cols-2">
    <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">Total Qty</p><p className="mt-2 text-2xl font-black">{num.format(total.qty)}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>
    <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">Total Value</p><p className="mt-2 text-2xl font-black">{money.format(total.value)}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>
  </div>
}

export default function TargetFocusPage({mode}:{mode:Mode}){
  const [data,setData]=useState<Payload|null>(null);
  const [loading,setLoading]=useState(true);
  const [filterMode,setFilterMode]=useState<FilterMode>("week");
  const [week,setWeek]=useState("");
  const [month,setMonth]=useState("2026-09");
  const [from,setFrom]=useState("2026-08-01");
  const [to,setTo]=useState("2026-09-01");
  const [supplierTab,setSupplierTab]=useState("Hastag");
  const [providerTab,setProviderTab]=useState("Qoala");

  useEffect(()=>{
    const q=new URLSearchParams({mode:filterMode});
    if(filterMode==="week"&&week)q.set("week",week);
    if(filterMode==="month")q.set("month",month);
    if(filterMode==="range"){q.set("from",from);q.set("to",to)}
    setLoading(true);
    fetch(`/api/target-focus?${q.toString()}`,{cache:"no-store"})
      .then(r=>r.json())
      .then(j=>{setData(j);if(!week&&j.week)setWeek(j.week);if(j.month)setMonth(j.month);if(filterMode!=="range"&&j.from&&j.to){setFrom(j.from);setTo(j.to)}})
      .finally(()=>setLoading(false));
  },[filterMode,week,month,from,to]);

  const title=mode==="lob-focus"?"LOB Target Fokus":mode==="product-focus"?"Product Fokus 3PP":"VAS Fokus";
  const sub=mode==="lob-focus"?"Penjualan device product fokus per staff dan total":mode==="product-focus"?"Accessories 3PP per supplier dengan detail staff":"Qoala, Telkomsel, XL dan Indosat per staff";
  const productNames=useMemo(()=>data?.lob.products.map(x=>x.name)??[],[data]);
  const activeSupplier=data?.thirdParty.suppliers.find(x=>x.supplier===supplierTab)??data?.thirdParty.suppliers[0];
  const activeProvider=data?.vas.providers.find(x=>x.name===providerTab)??data?.vas.providers[0];

  return <div className="space-y-5">
    <div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">M238 • Target Fokus</p><h2 className="mt-1 text-3xl font-black">{title}</h2><p className="mt-1 text-sm text-slate-500">{sub}</p></div>

    <section className="rounded-2xl border bg-white p-4">
      <div className="flex flex-wrap gap-2">
        {(["week","month","range"] as FilterMode[]).map(f=><button key={f} type="button" onClick={()=>setFilterMode(f)} className={`rounded-xl px-4 py-2 text-sm font-bold ${filterMode===f?"bg-blue-600 text-white":"bg-slate-100 text-slate-600"}`}>{f==="week"?"Week":f==="month"?"Bulan":"Range Tanggal"}</button>)}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {filterMode==="week"&&<label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Filter Week</span><select value={week} onChange={e=>setWeek(e.target.value)} className="h-11 w-full rounded-xl border bg-white px-3 font-semibold">{(data?.availableWeeks??[]).map(w=><option key={w} value={w}>{w}</option>)}</select></label>}
        {filterMode==="month"&&<label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Filter Bulan</span><select value={month} onChange={e=>setMonth(e.target.value)} className="h-11 w-full rounded-xl border bg-white px-3 font-semibold">{(data?.availableMonths??[]).map(m=><option key={m} value={m}>{monthName(m)}</option>)}</select></label>}
        {filterMode==="range"&&<>
          <label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Dari Tanggal</span><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="h-11 w-full rounded-xl border bg-white px-3 font-semibold"/></label>
          <label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Sampai Tanggal</span><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="h-11 w-full rounded-xl border bg-white px-3 font-semibold"/></label>
        </>}
      </div>
      <p className="mt-3 text-xs text-slate-500">Periode aktif: <b>{data?.periodLabel||"-"}</b></p>
    </section>

    {loading?<div className="rounded-2xl border bg-white p-8 text-center text-slate-400">Memuat data Target Fokus…</div>:!data?<div className="rounded-2xl border bg-white p-8 text-center text-slate-400">Data belum tersedia.</div>:mode==="lob-focus"?<>
      <Summary label={data.periodLabel} total={data.lob.total}/>
      <section className="overflow-hidden rounded-2xl border bg-white"><div className="border-b px-5 py-4"><h3 className="font-black">Product Fokus Device</h3><p className="mt-1 text-sm text-slate-500">Hanya membaca Product Scheme = DEVICES.</p></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr><th className="px-4 py-3 text-left">Product</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Value</th></tr></thead><tbody>{data.lob.products.map(r=><tr key={r.name} className="border-t"><td className="px-4 py-3 font-bold">{r.name}</td><td className="px-4 py-3 text-right font-black">{num.format(r.qty)}</td><td className="px-4 py-3 text-right">{money.format(r.value)}</td></tr>)}<tr className="border-t bg-slate-50 font-black"><td className="px-4 py-3">TOTAL</td><td className="px-4 py-3 text-right">{num.format(data.lob.total.qty)}</td><td className="px-4 py-3 text-right">{money.format(data.lob.total.value)}</td></tr></tbody></table></div></section>
      <section className="overflow-hidden rounded-2xl border bg-white"><div className="border-b px-5 py-4"><h3 className="font-black">Penjualan Staff M238</h3><p className="mt-1 text-sm text-slate-500">Qty product fokus yang berhasil dijual setiap staff.</p></div><div className="overflow-x-auto"><table className="min-w-[1100px] text-sm"><thead><tr><th className="sticky left-0 bg-slate-50 px-4 py-3 text-left">Staff</th>{productNames.map(p=><th key={p} className="px-3 py-3 text-right">{p}</th>)}<th className="px-3 py-3 text-right">TOTAL</th></tr></thead><tbody>{data.lob.staff.map(r=><tr key={r.name} className="border-t"><td className="sticky left-0 bg-white px-4 py-3 font-bold">{r.name}</td>{productNames.map(p=><td key={p} className="px-3 py-3 text-right">{num.format(r.products[p]?.qty||0)}</td>)}<td className="px-3 py-3 text-right font-black">{num.format(r.total.qty)}</td></tr>)}</tbody></table></div></section>
    </>:mode==="product-focus"?<>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.thirdParty.suppliers.map(s=><button key={s.supplier} type="button" onClick={()=>setSupplierTab(s.supplier)} className={`rounded-2xl border p-4 text-left ${supplierTab===s.supplier?"border-blue-500 bg-blue-50":"bg-white"}`}><p className="font-black">{s.supplier}</p><p className="mt-1 text-sm text-slate-500">{num.format(s.qty)} qty • {money.format(s.value)}</p></button>)}</div>
      {activeSupplier&&<><Summary label={`${activeSupplier.supplier} • ${data.periodLabel}`} total={{qty:activeSupplier.qty,value:activeSupplier.value}}/>
      <section className="overflow-hidden rounded-2xl border bg-white"><div className="border-b px-5 py-4"><h3 className="font-black">Penjualan Staff • {activeSupplier.supplier}</h3></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr><th className="px-4 py-3 text-left">Staff</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Value</th></tr></thead><tbody>{activeSupplier.staff.length?activeSupplier.staff.map(r=><tr key={r.name} className="border-t"><td className="px-4 py-3 font-bold">{r.name}</td><td className="px-4 py-3 text-right font-black">{num.format(r.qty)}</td><td className="px-4 py-3 text-right">{money.format(r.value)}</td></tr>):<tr><td colSpan={3} className="p-8 text-center text-slate-400">Belum ada penjualan.</td></tr>}<tr className="border-t bg-slate-50 font-black"><td className="px-4 py-3">TOTAL {activeSupplier.supplier.toUpperCase()}</td><td className="px-4 py-3 text-right">{num.format(activeSupplier.qty)}</td><td className="px-4 py-3 text-right">{money.format(activeSupplier.value)}</td></tr></tbody></table></div></section>
      <section className="overflow-hidden rounded-2xl border bg-white"><div className="border-b px-5 py-4"><h3 className="font-black">Detail Brand • {activeSupplier.supplier}</h3></div><div className="divide-y">{activeSupplier.brands.map(b=><div key={b.code} className="p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black">{b.name}</p><p className="text-sm font-bold">{num.format(b.qty)} qty • {money.format(b.value)}</p></div>{b.details.length>0&&<div className="mt-3 overflow-x-auto"><table className="min-w-full text-sm"><tbody>{b.details.map(d=><tr key={d.name} className="border-t"><td className="py-2 pr-3">{d.name}</td><td className="px-3 py-2 text-right font-bold">{num.format(d.qty)}</td><td className="pl-3 py-2 text-right">{money.format(d.value)}</td></tr>)}</tbody></table></div>}</div>)}</div></section></>}
    </>:<>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{data.vas.providers.map(p=><button key={p.name} type="button" onClick={()=>setProviderTab(p.name)} className={`rounded-2xl border p-4 text-left ${providerTab===p.name?"border-blue-500 bg-blue-50":"bg-white"}`}><p className="font-black">{p.name}</p><p className="mt-1 text-sm text-slate-500">{num.format(p.qty)} qty • {money.format(p.value)}</p></button>)}</div>
      {activeProvider&&<><Summary label={`${activeProvider.name} • ${data.periodLabel}`} total={{qty:activeProvider.qty,value:activeProvider.value}}/><section className="overflow-hidden rounded-2xl border bg-white"><div className="border-b px-5 py-4"><h3 className="font-black">Penjualan Staff • {activeProvider.name}</h3>{activeProvider.name==="Qoala"&&<p className="mt-1 text-sm text-slate-500">AR = Qty Qoala ÷ total Qty Device staff pada periode yang sama.</p>}</div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr><th className="px-4 py-3 text-left">Staff</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Value</th>{activeProvider.name==="Qoala"&&<><th className="px-4 py-3 text-right">Device Qty</th><th className="px-4 py-3 text-right">Device Value</th><th className="px-4 py-3 text-right">AR</th></>}</tr></thead><tbody>{activeProvider.staff.length?activeProvider.staff.map(r=><tr key={r.name} className="border-t"><td className="px-4 py-3 font-bold">{r.name}</td><td className="px-4 py-3 text-right font-black">{num.format(r.qty)}</td><td className="px-4 py-3 text-right">{money.format(r.value)}</td>{activeProvider.name==="Qoala"&&<><td className="px-4 py-3 text-right">{num.format(r.deviceQty)}</td><td className="px-4 py-3 text-right">{money.format(r.deviceValue)}</td><td className="px-4 py-3 text-right font-black">{pct(r.ar)}</td></>}</tr>):<tr><td colSpan={6} className="p-8 text-center text-slate-400">Belum ada penjualan.</td></tr>}</tbody></table></div></section></>}
    </>}
  </div>
}
