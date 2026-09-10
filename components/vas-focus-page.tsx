"use client";

import {useEffect,useMemo,useState} from "react";

type FilterMode="week"|"month"|"range";
type StaffShare={id?:string;name:string;position?:string;share:number};
type ProviderStaff={name:string;qty:number;value:number;deviceQty:number;deviceValue:number;ar:number};
type Provider={name:string;qty:number;value:number;staff:ProviderStaff[]};
type Payload={periodLabel?:string;week?:string;month?:string;from?:string;to?:string;availableWeeks?:string[];availableMonths?:string[];vas?:{providers?:Provider[];total?:{qty?:number;value?:number}}};
type TargetMap=Record<string,number>;

const VAS=["Qoala","Telkomsel","XL","Indosat"] as const;
const num=new Intl.NumberFormat("id-ID");
const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const toNum=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)?n:0};
const pct=(v:number)=>`${new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(Number.isFinite(v)?v:0)}%`;
const today=()=>new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());
const monthName=(v:string)=>{if(!/^\d{4}-\d{2}$/.test(v))return v;const[y,m]=v.split("-").map(Number);return new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric"}).format(new Date(y,m-1,1))};
const panel="m238-soft-card rounded-2xl border";
const sub="m238-subcard rounded-2xl border";
function achStatus(ach:number,target:number){const p=target>0?ach/target*100:0;return p>=100?"Achieve":p>=80?"Need Push":"Critical"}
function arStatus(ar:number){return ar>=40?"Achieve":ar>=30?"Need Push":"Critical"}
function badgeClass(s:string){return s==="Achieve"?"bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300":s==="Need Push"?"bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300":"bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"}

export default function VasFocusPage(){
 const now=today(),initialMonth=now.slice(0,7);
 const[filterMode,setFilterMode]=useState<FilterMode>("week");
 const[week,setWeek]=useState("");
 const[month,setMonth]=useState(initialMonth);
 const[from,setFrom]=useState(`${initialMonth}-01`);
 const[to,setTo]=useState(now);
 const[data,setData]=useState<Payload|null>(null);
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState("");
 const[activeVAS,setActiveVAS]=useState<string>("Qoala");
 const[targetOpen,setTargetOpen]=useState(false);
 const[targets,setTargets]=useState<TargetMap>({});
 const[draft,setDraft]=useState<TargetMap>({});
 const[staffShares,setStaffShares]=useState<StaffShare[]>([]);
 const[saving,setSaving]=useState(false);
 const[message,setMessage]=useState("");

 useEffect(()=>{
  let alive=true;
  const q=new URLSearchParams({mode:filterMode});
  if(filterMode==="week"&&week)q.set("week",week);
  if(filterMode==="month")q.set("month",month);
  if(filterMode==="range"){q.set("from",from);q.set("to",to)}
  setLoading(true);setError("");
  fetch(`/api/target-focus?${q.toString()}`,{cache:"no-store"})
   .then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j?.error||"Gagal membaca data VAS Fokus");return j})
   .then((j:Payload)=>{if(!alive)return;setData(j||{});if(!week&&j?.week)setWeek(j.week);if(!month&&j?.month)setMonth(j.month)})
   .catch(e=>{if(!alive)return;setData({});setError(e instanceof Error?e.message:"Gagal membaca data VAS Fokus")})
   .finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[filterMode,week,month,from,to]);

 const targetScope=filterMode==="week"?"weekly":filterMode==="month"?"monthly":"range";
 const targetPeriod=filterMode==="week"?(data?.week||week):filterMode==="month"?month:`${from}|${to}`;

 useEffect(()=>{
  if(!targetPeriod)return;
  let alive=true;
  fetch(`/api/manual-target?scope=${targetScope}&period=${encodeURIComponent(targetPeriod)}&group=vas-focus`,{cache:"no-store"})
   .then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j?.error||"Gagal membaca target");return j})
   .then(j=>{if(!alive)return;const next:TargetMap={};for(const v of VAS)next[v]=Math.max(0,toNum(j?.targets?.[v]?.target));setTargets(next);setDraft(next);setStaffShares(Array.isArray(j?.staff)?j.staff:[])})
   .catch(()=>{if(!alive)return;const zero:Object={};const next:TargetMap={};for(const v of VAS)next[v]=0;void zero;setTargets(next);setDraft(next);setStaffShares([])});
  return()=>{alive=false};
 },[targetScope,targetPeriod]);

 const rawProviders=Array.isArray(data?.vas?.providers)?data!.vas!.providers!:[];
 const providerMap=useMemo(()=>new Map(rawProviders.map(p=>[String(p?.name||"").trim().toUpperCase(),p])),[rawProviders]);
 const providers=useMemo(()=>VAS.map(name=>{const p=providerMap.get(name.toUpperCase());return {name,qty:toNum(p?.qty),value:toNum(p?.value),staff:Array.isArray(p?.staff)?p!.staff:[] as ProviderStaff[]}}),[providerMap]);
 const active=useMemo(()=>providers.find(p=>p.name===activeVAS)??providers[0]??{name:"Qoala",qty:0,value:0,staff:[] as ProviderStaff[]},[providers,activeVAS]);
 const totalTarget=VAS.reduce((a,v)=>a+toNum(targets[v]),0);
 const totalAch=providers.reduce((a,p)=>a+p.qty,0);
 const totalValue=providers.reduce((a,p)=>a+p.value,0);
 const overall=totalTarget>0?totalAch/totalTarget*100:0;
 const totalGap=Math.max(0,totalTarget-totalAch);
 const shareByName=useMemo(()=>new Map((staffShares||[]).map(s=>[String(s?.name||"").trim().toUpperCase(),Math.max(0,toNum(s?.share))])),[staffShares]);
 const staffRows=useMemo(()=>{
  const rows=Array.isArray(active?.staff)?active.staff:[];
  return rows.map(r=>{
   const name=String(r?.name||"Tanpa Nama").trim()||"Tanpa Nama";
   const qty=toNum(r?.qty),value=toNum(r?.value),deviceQty=toNum(r?.deviceQty),ar=toNum(r?.ar);
   const share=shareByName.get(name.toUpperCase())||0;
   const target=Math.round(toNum(targets[active.name])*share);
   const gap=Math.max(0,target-qty);
   const status=active.name==="Qoala"?arStatus(ar):achStatus(qty,target);
   return {name,qty,value,deviceQty,ar,target,gap,status};
  }).sort((a,b)=>b.qty-a.qty||a.name.localeCompare(b.name));
 },[active,shareByName,targets]);

 const save=async()=>{
  setSaving(true);setMessage("");
  try{
   const body:TargetMap={};for(const v of VAS)body[v]=Math.max(0,Math.floor(toNum(draft[v])));
   const r=await fetch("/api/manual-target",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scope:targetScope,period:targetPeriod,group:"vas-focus",targets:body})});
   const j=await r.json();
   if(!r.ok){setMessage(j?.error||"Gagal menyimpan target");return}
   setTargets(body);setStaffShares(Array.isArray(j?.staff)?j.staff:staffShares);setTargetOpen(false);
  }catch{setMessage("Koneksi gagal saat menyimpan target.")}finally{setSaving(false)}
 };

 return <div className="space-y-5">
  <div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600 dark:text-blue-400">M238 • Target Fokus</p><h2 className="mt-1 text-3xl font-black">VAS Fokus</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Target berbasis Qty, actual tetap menampilkan Qty, Value, Device Qty dan AR.</p></div>

  <section className={`${panel} p-4`}>
   <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{(["week","month","range"] as FilterMode[]).map(f=><button key={f} onClick={()=>setFilterMode(f)} className={`rounded-xl px-4 py-2 text-sm font-bold ${filterMode===f?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{f==="week"?"Week":f==="month"?"Bulan":"Range Tanggal"}</button>)}</div><button onClick={()=>{setDraft({...targets});setMessage("");setTargetOpen(true)}} className="rounded-xl border px-4 py-2 text-sm font-black">Set Target VAS</button></div>
   <div className="mt-4 grid gap-3 md:grid-cols-3">{filterMode==="week"&&<label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Apple Week</span><select value={week} onChange={e=>setWeek(e.target.value)} className="h-11 w-full rounded-xl border px-3 font-semibold">{(data?.availableWeeks??[]).map(w=><option key={w} value={w}>{w}</option>)}</select></label>}{filterMode==="month"&&<label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Filter Bulan</span><select value={month} onChange={e=>setMonth(e.target.value)} className="h-11 w-full rounded-xl border px-3 font-semibold">{(data?.availableMonths??[]).map(m=><option key={m} value={m}>{monthName(m)}</option>)}</select></label>}{filterMode==="range"&&<><label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Dari Tanggal</span><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="h-11 w-full rounded-xl border px-3 font-semibold"/></label><label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Sampai Tanggal</span><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="h-11 w-full rounded-xl border px-3 font-semibold"/></label></>}</div>
   <p className="mt-3 text-xs text-slate-500">Periode aktif: <b>{data?.periodLabel||targetPeriod||"-"}</b></p>
  </section>

  {loading?<div className={`${panel} p-8 text-center text-slate-500`}>Memuat VAS Fokus…</div>:<>
   {error&&<div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">Data VAS belum dapat dibaca: {error}</div>}

   <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{providers.map(p=>{const t=toNum(targets[p.name]),pc=t>0?p.qty/t*100:0,g=Math.max(0,t-p.qty),st=achStatus(p.qty,t);return <div key={p.name} className={`${sub} p-4`}><div className="flex items-center justify-between gap-2"><p className="font-black">{p.name}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black ${badgeClass(st)}`}>{st}</span></div><div className="mt-3 grid grid-cols-4 gap-2 text-xs"><div><p className="text-slate-400">Target</p><p className="mt-1 font-black">{num.format(t)}</p></div><div><p className="text-slate-400">Ach</p><p className="mt-1 font-black">{num.format(p.qty)}</p></div><div><p className="text-slate-400">Ach %</p><p className="mt-1 font-black">{pct(pc)}</p></div><div><p className="text-slate-400">Gap</p><p className="mt-1 font-black">{num.format(g)}</p></div></div></div>})}</section>

   <section className={`${panel} p-4`}><div className="flex flex-wrap gap-x-7 gap-y-2 text-sm"><span><b>Total Target:</b> {num.format(totalTarget)} Qty</span><span><b>Achievement:</b> {num.format(totalAch)} Qty</span><span><b>Overall:</b> {pct(overall)}</span><span><b>Gap:</b> {num.format(totalGap)} Qty</span><span><b>Total Value:</b> {money.format(totalValue)}</span></div></section>

   <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{providers.map(p=><div key={p.name} className={`${sub} p-4`}><p className="font-black">{p.name}</p><p className="mt-2 text-2xl font-black">{num.format(p.qty)} qty</p><p className="mt-1 text-sm text-slate-500">{money.format(p.value)}</p></div>)}</section>

   <section className={`${panel} p-3`}><div className="overflow-x-auto"><div className="flex min-w-max gap-2">{VAS.map(name=><button key={name} onClick={()=>setActiveVAS(name)} className={`rounded-xl border px-4 py-2 text-sm font-black ${activeVAS===name?"border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/25 dark:text-blue-300":"bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}>{name}</button>)}</div></div></section>

   <section key={active.name} className={`${panel} overflow-hidden`}><div className="border-b px-5 py-4"><h3 className="font-black">Penjualan Staff • {active.name}</h3>{active.name==="Qoala"&&<p className="mt-1 text-sm text-slate-500">AR existing: Qty Qoala ÷ Qty Device staff. Status AR: Achieve ≥40%, Need Push 30–39.9%, Critical &lt;30%.</p>}</div>{staffRows.length===0?<div className="p-8 text-center text-sm text-slate-400">Belum ada penjualan {active.name} pada periode ini</div>:<div className="overflow-x-auto"><table className="min-w-[900px] w-full text-sm"><thead><tr><th className="px-4 py-3 text-left">Staff</th><th className="px-3 py-3 text-right">Target</th><th className="px-3 py-3 text-right">Qty</th><th className="px-3 py-3 text-right">Gap</th><th className="px-3 py-3 text-right">Value</th><th className="px-3 py-3 text-right">Device Qty</th><th className="px-3 py-3 text-right">AR</th><th className="px-3 py-3 text-left">Status</th></tr></thead><tbody>{staffRows.map(r=><tr key={`${active.name}-${r.name}`} className="border-t"><td className="px-4 py-3 font-bold">{r.name}</td><td className="px-3 py-3 text-right">{num.format(r.target)}</td><td className="px-3 py-3 text-right font-black">{num.format(r.qty)}</td><td className="px-3 py-3 text-right">{num.format(r.gap)}</td><td className="px-3 py-3 text-right">{money.format(r.value)}</td><td className="px-3 py-3 text-right">{num.format(r.deviceQty)}</td><td className="px-3 py-3 text-right font-black">{pct(r.ar)}</td><td className="px-3 py-3"><span title={r.status==="Critical"?"Rekomendasi: training / roleplay VAS":r.status==="Need Push"?"Perlu push pencapaian VAS":"Target/AR tercapai"} className={`rounded-full px-2 py-1 text-[10px] font-black ${badgeClass(r.status)}`}>{r.status}</span></td></tr>)}</tbody></table></div>}</section>
  </>}

  {targetOpen&&<div className="fixed inset-0 z-[140] grid place-items-center bg-black/35 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setTargetOpen(false)}}><div className="m238-soft-card w-full max-w-lg rounded-2xl border bg-white p-5 shadow-2xl dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-600">Set Target VAS</p><h3 className="mt-1 text-xl font-black">{data?.periodLabel||targetPeriod||"-"}</h3></div><button onClick={()=>setTargetOpen(false)} className="rounded-lg border px-3 py-1.5 text-sm font-bold">Tutup</button></div><div className="mt-4 space-y-3">{VAS.map(v=><label key={v} className="flex items-center justify-between gap-4"><span className="font-bold">{v}</span><input type="number" min="0" step="1" value={draft[v]??0} onChange={e=>setDraft(x=>({...x,[v]:Math.max(0,Math.floor(toNum(e.target.value)))}))} className="h-10 w-36 rounded-xl border px-3 text-right font-black"/></label>)}</div><div className="mt-4 border-t pt-4 text-sm"><b>Total Target:</b> {num.format(VAS.reduce((a,v)=>a+toNum(draft[v]),0))} Qty</div>{message&&<p className="mt-3 text-sm font-bold text-rose-600">{message}</p>}<div className="mt-5 flex justify-end gap-2"><button onClick={()=>setTargetOpen(false)} className="rounded-xl border px-4 py-2 text-sm font-bold">Batal</button><button disabled={saving} onClick={save} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{saving?"Menyimpan…":"Simpan Target"}</button></div></div></div>}
 </div>
}
