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
 const[valueTargets,setValueTargets]=useState<TargetMap>({}),[valueDraft,setValueDraft]=useState<TargetMap>({});
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
  Promise.all([
   fetch(`/api/manual-target?scope=${targetScope}&period=${encodeURIComponent(activePeriod)}&group=product-focus&t=${Date.now()}`,{cache:"no-store"}),
   fetch(`/api/manual-target?scope=${targetScope}&period=${encodeURIComponent(activePeriod)}&group=product-focus-value&t=${Date.now()}`,{cache:"no-store"})
  ]).then(async([qr,vr])=>{const[qj,vj]=await Promise.all([qr.json(),vr.json()]);if(!qr.ok)throw new Error(qj?.error||"Gagal membaca target Qty");if(!vr.ok)throw new Error(vj?.error||"Gagal membaca target Value");return[qj,vj]}).then(([qj,vj])=>{
   if(!alive)return;const q:TargetMap={},v:TargetMap={};
   for(const s of SUPPLIERS){q[s]=Math.max(0,toNum(qj?.targets?.[s]?.target??(s==="IGA"?qj?.targets?.Iga?.target:0)));v[s]=Math.max(0,toNum(vj?.targets?.[s]?.target??(s==="IGA"?vj?.targets?.Iga?.target:0)))}
   setTargets(q);setDraft(q);setValueTargets(v);setValueDraft(v);setStaffRoster(Array.isArray(qj?.staff)?qj.staff:[]);
  }).catch(()=>{if(!alive)return;const q:TargetMap={},v:TargetMap={};for(const s of SUPPLIERS){q[s]=0;v[s]=0}setTargets(q);setDraft(q);setValueTargets(v);setValueDraft(v);setStaffRoster([])});
  return()=>{alive=false};
 },[targetScope,activePeriod]);

 const supplierMap=useMemo(()=>new Map((data?.thirdParty?.suppliers||[]).map(s=>[norm(s.supplier),s])),[data]);
 const supplierRows=useMemo(()=>SUPPLIERS.map(name=>{const src=supplierMap.get(norm(name));return src?{...src,supplier:name}:{supplier:name,qty:0,value:0,brands:[],staff:[]}}),[supplierMap]);
 const active=useMemo(()=>supplierRows.find(s=>norm(s.supplier)===norm(activeSupplier))||supplierRows[0],[supplierRows,activeSupplier]);
 const staffRows=useMemo(()=>{
  const sales=new Map((active?.staff||[]).map(r=>[norm(r.name),r]));const names=new Map<string,string>();
  for(const r of active?.staff||[]){if(r.name)names.set(norm(r.name),r.name)}for(const r of staffRoster){if(r.name)names.set(norm(r.name),r.name)}
  return [...names.entries()].map(([key,name])=>{const r=sales.get(key);return{name,qty:toNum(r?.qty),value:toNum(r?.value)}}).sort((a,b)=>b.qty-a.qty||b.value-a.value||a.name.localeCompare(b.name));
 },[active,staffRoster]);
 const totalTarget=SUPPLIERS.reduce((a,s)=>a+toNum(targets[s]),0),totalValueTarget=SUPPLIERS.reduce((a,s)=>a+toNum(valueTargets[s]),0);
 const totalAch=supplierRows.reduce((a,s)=>a+toNum(s.qty),0),totalValue=supplierRows.reduce((a,s)=>a+toNum(s.value),0);
 const overall=totalTarget?totalAch/totalTarget*100:0,overallValue=totalValueTarget?totalValue/totalValueTarget*100:0;
 const totalGap=Math.max(0,totalTarget-totalAch),totalValueGap=Math.max(0,totalValueTarget-totalValue);
 const activeTarget=toNum(targets[active?.supplier||""]),activeValueTarget=toNum(valueTargets[active?.supplier||""]),activeAch=toNum(active?.qty),activeValue=toNum(active?.value);
 const activePc=activeTarget?activeAch/activeTarget*100:0,activeValuePc=activeValueTarget?activeValue/activeValueTarget*100:0;
 const activeStatus=status(activeAch,activeTarget);

 const saveTarget=async()=>{
  setSaving(true);setMessage("");
  try{
   const qtyBody:TargetMap={},valueBody:TargetMap={};for(const s of SUPPLIERS){qtyBody[s]=Math.max(0,Math.floor(toNum(draft[s])));valueBody[s]=Math.max(0,Math.floor(toNum(valueDraft[s])))}
   const[qtyRes,valueRes]=await Promise.all([
    fetch("/api/manual-target",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scope:targetScope,period:activePeriod,group:"product-focus",targets:qtyBody})}),
    fetch("/api/manual-target",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scope:targetScope,period:activePeriod,group:"product-focus-value",targets:valueBody})})
   ]);
   const[qtyJson,valueJson]=await Promise.all([qtyRes.json(),valueRes.json()]);
   if(!qtyRes.ok){setMessage(qtyJson?.error||"Gagal menyimpan target Qty");return}if(!valueRes.ok){setMessage(valueJson?.error||"Gagal menyimpan target Value");return}
   setTargets(qtyBody);setDraft(qtyBody);setValueTargets(valueBody);setValueDraft(valueBody);setStaffRoster(Array.isArray(qtyJson?.staff)?qtyJson.staff:staffRoster);setTargetOpen(false);
  }catch{setMessage("Koneksi gagal saat menyimpan target.")}finally{setSaving(false)}
 };

 return <div className="space-y-5">
  <div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600 dark:text-blue-400">M238 • Target Fokus</p><h2 className="mt-1 text-3xl font-black">Product Fokus 3PP</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Target supplier Qty dan Value tersimpan per periode. Staff yang belum jualan tetap ditampilkan.</p></div>
  <section className={`${panel} p-4`}><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{(["week","month","range"] as FilterMode[]).map(f=><button key={f} onClick={()=>setFilterMode(f)} className={`rounded-xl px-4 py-2 text-sm font-bold ${filterMode===f?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{f==="week"?"Week":f==="month"?"Bulan":"Range Tanggal"}</button>)}</div><button onClick={()=>{setDraft({...targets});setValueDraft({...valueTargets});setMessage("");setTargetOpen(true)}} className="rounded-xl border px-4 py-2 text-sm font-black">Set Target 3PP</button></div><div className="mt-4 grid gap-3 md:grid-cols-3">{filterMode==="week"&&<label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Apple Week</span><select value={week} onChange={e=>setWeek(e.target.value)} className="h-11 w-full rounded-xl border px-3 font-semibold">{(data?.availableWeeks||[]).map(w=><option key={w} value={w}>{w}</option>)}</select></label>}{filterMode==="month"&&<label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Filter Bulan</span><select value={month} onChange={e=>setMonth(e.target.value)} className="h-11 w-full rounded-xl border px-3 font-semibold">{(data?.availableMonths||[]).map(m=><option key={m} value={m}>{monthName(m)}</option>)}</select></label>}{filterMode==="range"&&<><label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Dari Tanggal</span><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="h-11 w-full rounded-xl border px-3 font-semibold"/></label><label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Sampai Tanggal</span><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="h-11 w-full rounded-xl border px-3 font-semibold"/></label></>}</div><p className="mt-3 text-xs text-slate-500">Periode aktif: <b>{data?.periodLabel||activePeriod||"-"}</b></p></section>
  {loading?<div className={`${panel} p-8 text-center text-slate-500`}>Memuat Product Fokus 3PP…</div>:!data?<div className={`${panel} p-8 text-center text-slate-500`}>Data belum tersedia.</div>:<>
   <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{supplierRows.map(s=>{const tq=toNum(targets[s.supplier]),tv=toNum(valueTargets[s.supplier]),aq=toNum(s.qty),av=toNum(s.value),pq=tq?aq/tq*100:0,pv=tv?av/tv*100:0,st=status(aq,tq);return <div key={s.supplier} className={`${sub} p-4`}><div className="flex items-center justify-between"><p className="font-black">{s.supplier}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black ${statusClass(st)}`}>{st}</span></div><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><p className="text-slate-400">Target Qty</p><p className="font-black">{num.format(tq)}</p><p className="mt-2 text-slate-400">Ach Qty</p><p className="font-black">{num.format(aq)} • {pct(pq)}</p><p className="mt-2 text-slate-400">Gap Qty</p><p className="font-black">{num.format(Math.max(0,tq-aq))}</p></div><div><p className="text-slate-400">Target Value</p><p className="font-black">{money.format(tv)}</p><p className="mt-2 text-slate-400">Ach Value</p><p className="font-black">{money.format(av)} • {pct(pv)}</p><p className="mt-2 text-slate-400">Gap Value</p><p className="font-black">{money.format(Math.max(0,tv-av))}</p></div></div></div>})}</section>
   <section className={`${panel} p-4`}><div className="flex flex-wrap gap-x-7 gap-y-2 text-sm"><span><b>Target Qty:</b> {num.format(totalTarget)}</span><span><b>Ach Qty:</b> {num.format(totalAch)} ({pct(overall)})</span><span><b>Gap Qty:</b> {num.format(totalGap)}</span><span><b>Target Value:</b> {money.format(totalValueTarget)}</span><span><b>Ach Value:</b> {money.format(totalValue)} ({pct(overallValue)})</span><span><b>Gap Value:</b> {money.format(totalValueGap)}</span></div></section>
   <section className={`${panel} p-3`}><div className="overflow-x-auto"><div className="flex min-w-max gap-2">{supplierRows.map(s=><button key={s.supplier} onClick={()=>setActiveSupplier(s.supplier)} className={`rounded-xl border px-4 py-2 text-sm font-black ${norm(activeSupplier)===norm(s.supplier)?"border-blue-500 bg-blue-50 text-blue-700":"bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}>{s.supplier}</button>)}</div></div></section>
   <section className={`${panel} p-4`}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">Supplier Summary</p><h3 className="mt-1 text-xl font-black">{active?.supplier}</h3></div><div className="flex flex-wrap gap-x-6 gap-y-2 text-sm"><span><b>Target Qty:</b> {num.format(activeTarget)}</span><span><b>Ach Qty:</b> {num.format(activeAch)} ({pct(activePc)})</span><span><b>Target Value:</b> {money.format(activeValueTarget)}</span><span><b>Ach Value:</b> {money.format(activeValue)} ({pct(activeValuePc)})</span><span className={`rounded-full px-2 py-1 text-[10px] font-black ${statusClass(activeStatus)}`}>{activeStatus}</span></div></div></section>
   <section className={`${panel} overflow-hidden`}><div className="border-b px-5 py-4"><h3 className="font-black">Penjualan Staff • {active?.supplier}</h3><p className="mt-1 text-sm text-slate-500">Semua staff aktif tetap tampil termasuk yang Qty dan Value masih 0.</p></div><div className="overflow-x-auto"><table className="min-w-[700px] w-full text-sm"><thead><tr><th className="px-3 py-3 text-center">#</th><th className="px-4 py-3 text-left">Staff</th><th className="px-3 py-3 text-right">Qty</th><th className="px-3 py-3 text-right">Value</th><th className="px-3 py-3 text-right">Contribution %</th></tr></thead><tbody>{staffRows.map((r,i)=><tr key={`${active?.supplier}-${r.name}`} className="border-t"><td className="px-3 py-3 text-center font-bold">{i+1}</td><td className="px-4 py-3 font-bold">{r.name}</td><td className="px-3 py-3 text-right font-black">{num.format(r.qty)}</td><td className="px-3 py-3 text-right">{money.format(r.value)}</td><td className="px-3 py-3 text-right">{pct(activeValue?r.value/activeValue*100:0)}</td></tr>)}</tbody></table></div></section>
   <section className={`${panel} overflow-hidden`}><div className="border-b px-5 py-4"><h3 className="font-black">Detail Product • {active?.supplier}</h3><p className="mt-1 text-sm text-slate-500">Product supplier aktif, dikelompokkan berdasarkan brand existing.</p></div>{!active?.brands?.length?<div className="p-8 text-center text-sm text-slate-400">Belum ada penjualan product {active?.supplier} pada periode ini</div>:<div className="divide-y">{active.brands.map(b=><div key={`${active.supplier}-${b.code}-${b.name}`} className="p-4"><div><p className="font-black">{b.code} • {b.name}</p><p className="mt-1 text-xs text-slate-500">{num.format(b.qty)} qty • {money.format(b.value)}</p></div><div className="mt-3 overflow-x-auto"><table className="min-w-[850px] w-full text-sm"><thead><tr><th className="py-2 text-left">Article</th><th className="py-2 text-left">Product</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Value</th><th className="py-2 text-right">Contribution</th></tr></thead><tbody>{b.details.map((d,i)=><tr key={`${active.supplier}-${b.code}-${d.article}-${i}`} className="border-t"><td className="py-2 pr-3 font-mono text-xs">{d.article}</td><td className="py-2 pr-3 font-semibold">{d.name}</td><td className="py-2 text-right font-black">{num.format(d.qty)}</td><td className="py-2 text-right">{money.format(d.value)}</td><td className="py-2 text-right">{pct(b.qty?d.qty/b.qty*100:0)}</td></tr>)}</tbody></table></div></div>)}</div>}</section>
  </>}
  {targetOpen&&<div className="fixed inset-0 z-[140] grid place-items-center bg-black/35 p-4" onMouseDown={e=>{if(e.currentTarget===e.target)setTargetOpen(false)}}><div className={`${panel} w-full max-w-3xl bg-white p-5 shadow-2xl dark:bg-slate-950`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.16em] text-blue-600">Set Target 3PP</p><h3 className="mt-1 text-xl font-black">{data?.periodLabel||activePeriod||"Periode aktif"}</h3></div><button onClick={()=>setTargetOpen(false)} className="rounded-lg border px-3 py-1.5 text-sm font-black">✕</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{SUPPLIERS.map(s=><div key={s} className="rounded-xl border p-3"><div className="mb-3 font-black">{s}</div><div className="grid grid-cols-2 gap-3"><label><span className="text-xs font-black text-slate-500">Target Qty</span><input type="number" min="0" step="1" value={draft[s]??0} onChange={e=>setDraft(v=>({...v,[s]:Math.max(0,Math.floor(toNum(e.target.value)))}))} className="mt-2 h-10 w-full rounded-lg border px-3 text-right font-black"/></label><label><span className="text-xs font-black text-slate-500">Target Value</span><input type="number" min="0" step="1000" value={valueDraft[s]??0} onChange={e=>setValueDraft(v=>({...v,[s]:Math.max(0,Math.floor(toNum(e.target.value)))}))} className="mt-2 h-10 w-full rounded-lg border px-3 text-right font-black"/><span className="mt-1 block text-[11px] text-slate-500">{money.format(valueDraft[s]||0)}</span></label></div></div>)}</div><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"><div><b>Total Target Qty:</b> {num.format(SUPPLIERS.reduce((a,s)=>a+toNum(draft[s]),0))}</div><div><b>Total Target Value:</b> {money.format(SUPPLIERS.reduce((a,s)=>a+toNum(valueDraft[s]),0))}</div></div>{message&&<p className="mt-3 text-sm font-bold text-rose-600">{message}</p>}<div className="mt-5 flex justify-end gap-2"><button onClick={()=>setTargetOpen(false)} className="rounded-xl border px-4 py-2 text-sm font-black">Batal</button><button disabled={saving} onClick={saveTarget} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{saving?"Menyimpan...":"Simpan Target"}</button></div></div></div>}
 </div>;
}
