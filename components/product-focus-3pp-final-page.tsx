"use client";

import {useEffect,useMemo,useState} from "react";

type FilterMode="week"|"month"|"range";
type Tot={qty:number;value:number};
type Detail={name:string;article:string;qty:number;value:number};
type Brand={code:string;name:string;qty:number;value:number;details:Detail[]};
type Supplier={supplier:string;qty:number;value:number;brands:Brand[];staff:Array<{name:string;qty:number;value:number}>};
type StaffRef={id?:string;name:string;position?:string;share?:number};
type Payload={periodLabel:string;week:string;month:string;from:string;to:string;availableWeeks:string[];availableMonths:string[];thirdParty:{suppliers:Supplier[];total:Tot}};
type TargetMap=Record<string,number>;

const SUPPLIERS=["Hastag","Dino","IGA","IBacks","Handal","Omega","Torras"] as const;
const num=new Intl.NumberFormat("id-ID");
const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const pct=(v:number)=>`${new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(Number.isFinite(v)?v:0)}%`;
const today=()=>new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());
const norm=(v:unknown)=>String(v??"").trim().toLocaleLowerCase("id-ID");
const toNum=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)?n:0};
const monthName=(v:string)=>{if(!/^\d{4}-\d{2}$/.test(v))return v;const[y,m]=v.split("-").map(Number);return new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric"}).format(new Date(y,m-1,1))};
const panel="m238-soft-card rounded-2xl border";
const sub="m238-subcard rounded-2xl border";
const status=(ach:number,target:number)=>{const p=target?ach/target*100:0;return p>=100?"Achieve":p>=80?"Need Push":"Critical"};
const statusClass=(s:string)=>s==="Achieve"?"bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300":s==="Need Push"?"bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300":"bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300";

export default function ProductFocus3PPFinalPage(){
 const now=today(),initialMonth=now.slice(0,7);
 const[filterMode,setFilterMode]=useState<FilterMode>("week");
 const[week,setWeek]=useState(""),[month,setMonth]=useState(initialMonth),[from,setFrom]=useState(`${initialMonth}-01`),[to,setTo]=useState(now);
 const[data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[activeSupplier,setActiveSupplier]=useState<string>("Hastag");
 const[targetOpen,setTargetOpen]=useState(false),[targets,setTargets]=useState<TargetMap>({}),[draft,setDraft]=useState<TargetMap>({});
 const[staffRoster,setStaffRoster]=useState<StaffRef[]>([]),[saving,setSaving]=useState(false),[message,setMessage]=useState("");

 useEffect(()=>{
  let alive=true;const q=new URLSearchParams({mode:filterMode});
  if(filterMode==="week"&&week)q.set("week",week);if(filterMode==="month")q.set("month",month);if(filterMode==="range"){q.set("from",from);q.set("to",to)}
  setLoading(true);
  fetch(`/api/product-focus-3pp?${q.toString()}`,{cache:"no-store"}).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j?.error||"Gagal membaca Product Fokus 3PP");return j}).then(j=>{if(!alive)return;setData(j);if(filterMode==="week"&&!week&&j.week)setWeek(j.week);if(filterMode==="month"&&j.month)setMonth(j.month)}).catch(()=>{if(alive)setData(null)}).finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[filterMode,week,month,from,to]);

 const targetScope=filterMode==="week"?"weekly":filterMode==="month"?"monthly":"range";
 const activePeriod=filterMode==="week"?(data?.week||week):filterMode==="month"?month:`${from}|${to}`;
 useEffect(()=>{
  if(!activePeriod)return;let alive=true;
  fetch(`/api/manual-target?scope=${targetScope}&period=${encodeURIComponent(activePeriod)}&group=product-focus-value&t=${Date.now()}`,{cache:"no-store"})
   .then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j?.error||"Gagal membaca target Value");return j})
   .then(j=>{if(!alive)return;const v:TargetMap={};for(const s of SUPPLIERS)v[s]=Math.max(0,toNum(j?.targets?.[s]?.target??(s==="IGA"?j?.targets?.Iga?.target:0)));setTargets(v);setDraft(v);setStaffRoster(Array.isArray(j?.staff)?j.staff:[])})
   .catch(()=>{if(!alive)return;const v:TargetMap={};for(const s of SUPPLIERS)v[s]=0;setTargets(v);setDraft(v);setStaffRoster([])});
  return()=>{alive=false};
 },[targetScope,activePeriod]);

 const supplierMap=useMemo(()=>new Map((data?.thirdParty?.suppliers||[]).map(s=>[norm(s.supplier),s])),[data]);
 const supplierRows=useMemo(()=>SUPPLIERS.map(name=>{const src=supplierMap.get(norm(name));return src?{...src,supplier:name}:{supplier:name,qty:0,value:0,brands:[],staff:[]}}),[supplierMap]);
 const active=useMemo(()=>supplierRows.find(s=>norm(s.supplier)===norm(activeSupplier))||supplierRows[0],[supplierRows,activeSupplier]);
 const totalTarget=SUPPLIERS.reduce((a,s)=>a+toNum(targets[s]),0),totalValue=supplierRows.reduce((a,s)=>a+toNum(s.value),0),totalQty=supplierRows.reduce((a,s)=>a+toNum(s.qty),0);
 const overall=totalTarget?totalValue/totalTarget*100:0,totalGap=Math.max(0,totalTarget-totalValue);
 const activeTarget=toNum(targets[active?.supplier||""]),activeValue=toNum(active?.value),activeQty=toNum(active?.qty),activePc=activeTarget?activeValue/activeTarget*100:0,activeStatus=status(activeValue,activeTarget);
 const shareByName=useMemo(()=>new Map(staffRoster.map(s=>[norm(s.name),Math.max(0,toNum(s.share))])),[staffRoster]);
 const staffRows=useMemo(()=>{
  const sales=new Map((active?.staff||[]).map(r=>[norm(r.name),r]));const names=new Map<string,string>();
  for(const r of active?.staff||[])if(r.name)names.set(norm(r.name),r.name);for(const r of staffRoster)if(r.name)names.set(norm(r.name),r.name);
  return [...names.entries()].map(([key,name])=>{const r=sales.get(key),value=toNum(r?.value),qty=toNum(r?.qty),target=Math.round(activeTarget*(shareByName.get(key)||0));return{name,qty,value,target,gap:Math.max(0,target-value),ach:target?value/target*100:0}}).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name));
 },[active,staffRoster,shareByName,activeTarget]);

 const saveTarget=async()=>{
  setSaving(true);setMessage("");
  try{
   const body:TargetMap={};for(const s of SUPPLIERS)body[s]=Math.max(0,Math.floor(toNum(draft[s])));
   const res=await fetch("/api/manual-target",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scope:targetScope,period:activePeriod,group:"product-focus-value",targets:body})});
   const j=await res.json();if(!res.ok){setMessage(j?.error||"Gagal menyimpan target Value");return}
   setTargets(body);setDraft(body);setStaffRoster(Array.isArray(j?.staff)?j.staff:staffRoster);setTargetOpen(false);
  }catch{setMessage("Koneksi gagal saat menyimpan target.")}finally{setSaving(false)}
 };

 return <div className="space-y-5">
  <div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600 dark:text-blue-400">M238 • Target Fokus</p><h2 className="mt-1 text-3xl font-black">Product Fokus 3PP</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Target 3PP menggunakan Value (rupiah). Qty hanya ditampilkan sebagai actual unit.</p></div>
  <section className={`${panel} p-4`}><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{(["week","month","range"] as FilterMode[]).map(f=><button key={f} onClick={()=>setFilterMode(f)} className={`rounded-xl px-4 py-2 text-sm font-bold ${filterMode===f?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{f==="week"?"Week":f==="month"?"Bulan":"Range Tanggal"}</button>)}</div><button onClick={()=>{setDraft({...targets});setMessage("");setTargetOpen(true)}} className="rounded-xl border px-4 py-2 text-sm font-black">Set Target 3PP</button></div><div className="mt-4 grid gap-3 md:grid-cols-3">{filterMode==="week"&&<label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Apple Week</span><select value={week} onChange={e=>setWeek(e.target.value)} className="h-11 w-full rounded-xl border px-3 font-semibold">{(data?.availableWeeks||[]).map(w=><option key={w} value={w}>{w}</option>)}</select></label>}{filterMode==="month"&&<label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Filter Bulan</span><select value={month} onChange={e=>setMonth(e.target.value)} className="h-11 w-full rounded-xl border px-3 font-semibold">{(data?.availableMonths||[]).map(m=><option key={m} value={m}>{monthName(m)}</option>)}</select></label>}{filterMode==="range"&&<><label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Dari Tanggal</span><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="h-11 w-full rounded-xl border px-3 font-semibold"/></label><label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Sampai Tanggal</span><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="h-11 w-full rounded-xl border px-3 font-semibold"/></label></>}</div><p className="mt-3 text-xs text-slate-500">Periode aktif: <b>{data?.periodLabel||activePeriod||"-"}</b></p></section>
  {loading?<div className={`${panel} p-8 text-center text-slate-500`}>Memuat Product Fokus 3PP…</div>:!data?<div className={`${panel} p-8 text-center text-slate-500`}>Data belum tersedia.</div>:<>
   <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{supplierRows.map(s=>{const target=toNum(targets[s.supplier]),value=toNum(s.value),qty=toNum(s.qty),ach=target?value/target*100:0,gap=Math.max(0,target-value),st=status(value,target);return <div key={s.supplier} className={`${sub} p-4`}><div className="flex items-center justify-between"><p className="font-black">{s.supplier}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black ${statusClass(st)}`}>{st}</span></div><div className="mt-3 space-y-2 text-xs"><div><p className="text-slate-400">Target Value</p><p className="text-base font-black">{money.format(target)}</p></div><div><p className="text-slate-400">Achievement</p><p className="font-black">{money.format(value)} • {pct(ach)}</p></div><div><p className="text-slate-400">Gap Value</p><p className="font-black">{money.format(gap)}</p></div><div><p className="text-slate-400">Actual Qty</p><p className="font-black">{num.format(qty)} unit</p></div></div></div>})}</section>
   <section className={`${panel} p-4`}><div className="flex flex-wrap gap-x-7 gap-y-2 text-sm"><span><b>Target Value:</b> {money.format(totalTarget)}</span><span><b>Ach Value:</b> {money.format(totalValue)} ({pct(overall)})</span><span><b>Gap Value:</b> {money.format(totalGap)}</span><span><b>Actual Qty:</b> {num.format(totalQty)} unit</span></div></section>
   <section className={`${panel} p-3`}><div className="overflow-x-auto"><div className="flex min-w-max gap-2">{supplierRows.map(s=><button key={s.supplier} onClick={()=>setActiveSupplier(s.supplier)} className={`rounded-xl border px-4 py-2 text-sm font-black ${norm(activeSupplier)===norm(s.supplier)?"border-blue-500 bg-blue-50 text-blue-700":"bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}>{s.supplier}</button>)}</div></div></section>
   <section className={`${panel} p-4`}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">Supplier Summary</p><h3 className="mt-1 text-xl font-black">{active?.supplier}</h3></div><div className="flex flex-wrap gap-x-6 gap-y-2 text-sm"><span><b>Target:</b> {money.format(activeTarget)}</span><span><b>Ach:</b> {money.format(activeValue)} ({pct(activePc)})</span><span><b>Qty:</b> {num.format(activeQty)}</span><span className={`rounded-full px-2 py-1 text-[10px] font-black ${statusClass(activeStatus)}`}>{activeStatus}</span></div></div></section>
   <section className={`${panel} overflow-hidden`}><div className="border-b px-5 py-4"><h3 className="font-black">Penjualan Staff • {active?.supplier}</h3><p className="mt-1 text-sm text-slate-500">Target staff otomatis mengikuti %T. Qty tetap sebagai informasi actual.</p></div><div className="overflow-x-auto"><table className="min-w-[850px] w-full text-sm"><thead><tr><th className="px-3 py-3 text-center">#</th><th className="px-4 py-3 text-left">Staff</th><th className="px-3 py-3 text-right">Target Value</th><th className="px-3 py-3 text-right">Ach Value</th><th className="px-3 py-3 text-right">Ach %</th><th className="px-3 py-3 text-right">Gap</th><th className="px-3 py-3 text-right">Qty</th></tr></thead><tbody>{staffRows.map((r,i)=><tr key={`${active?.supplier}-${r.name}`} className="border-t"><td className="px-3 py-3 text-center font-bold">{i+1}</td><td className="px-4 py-3 font-bold">{r.name}</td><td className="px-3 py-3 text-right">{money.format(r.target)}</td><td className="px-3 py-3 text-right font-black">{money.format(r.value)}</td><td className="px-3 py-3 text-right">{pct(r.ach)}</td><td className="px-3 py-3 text-right">{money.format(r.gap)}</td><td className="px-3 py-3 text-right">{num.format(r.qty)}</td></tr>)}</tbody></table></div></section>
   <section className={`${panel} overflow-hidden`}><div className="border-b px-5 py-4"><h3 className="font-black">Detail Product • {active?.supplier}</h3></div>{!active?.brands?.length?<div className="p-8 text-center text-sm text-slate-400">Belum ada penjualan product {active?.supplier} pada periode ini</div>:<div className="divide-y">{active.brands.map(b=><div key={`${active.supplier}-${b.code}-${b.name}`} className="p-4"><div><p className="font-black">{b.code} • {b.name}</p><p className="mt-1 text-xs text-slate-500">{num.format(b.qty)} qty • {money.format(b.value)}</p></div><div className="mt-3 overflow-x-auto"><table className="min-w-[850px] w-full text-sm"><thead><tr><th className="py-2 text-left">Article</th><th className="py-2 text-left">Product</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Value</th><th className="py-2 text-right">Contribution</th></tr></thead><tbody>{b.details.map((d,i)=><tr key={`${active.supplier}-${b.code}-${d.article}-${i}`} className="border-t"><td className="py-2 pr-3 font-mono text-xs">{d.article}</td><td className="py-2 pr-3 font-semibold">{d.name}</td><td className="py-2 text-right font-black">{num.format(d.qty)}</td><td className="py-2 text-right">{money.format(d.value)}</td><td className="py-2 text-right">{pct(b.value?d.value/b.value*100:0)}</td></tr>)}</tbody></table></div></div>)}</div>}</section>
  </>}
  {targetOpen&&<div className="fixed inset-0 z-[140] grid place-items-center bg-black/35 p-4" onMouseDown={e=>{if(e.currentTarget===e.target)setTargetOpen(false)}}><div className={`${panel} max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-2xl dark:bg-slate-950`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.16em] text-blue-600">Set Target 3PP</p><h3 className="mt-1 text-xl font-black">{data?.periodLabel||activePeriod||"Periode aktif"}</h3><p className="mt-1 text-xs text-slate-500">Target menggunakan Value (rupiah), bukan Qty.</p></div><button onClick={()=>setTargetOpen(false)} className="rounded-lg border px-3 py-1.5 text-sm font-black">✕</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{SUPPLIERS.map(s=><label key={s} className="rounded-xl border p-3"><span className="font-black">{s}</span><span className="mt-3 block text-xs font-black text-slate-500">Target Value</span><input type="number" min="0" step="1000" value={draft[s]??0} onChange={e=>setDraft(v=>({...v,[s]:Math.max(0,Math.floor(toNum(e.target.value)))}))} className="mt-2 h-11 w-full rounded-lg border px-3 text-right font-black"/><span className="mt-1 block text-[11px] text-slate-500">{money.format(draft[s]||0)}</span></label>)}</div><div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"><b>Total Target Value:</b> {money.format(SUPPLIERS.reduce((a,s)=>a+toNum(draft[s]),0))}</div>{message&&<p className="mt-3 text-sm font-bold text-rose-600">{message}</p>}<div className="mt-5 flex justify-end gap-2"><button onClick={()=>setTargetOpen(false)} className="rounded-xl border px-4 py-2 text-sm font-black">Batal</button><button disabled={saving} onClick={saveTarget} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{saving?"Menyimpan...":"Simpan Target"}</button></div></div></div>}
 </div>;
}
