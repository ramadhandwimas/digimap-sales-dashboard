"use client";

import {useEffect,useMemo,useState} from "react";

type FilterMode="week"|"month"|"range";
type Tot={qty:number;value:number};
type Product={name:string;qty:number;value:number};
type StaffRow={id?:string;name:string;products:Record<string,Tot>;total:Tot;deviceTotal:Tot};
type ProductCatalog={
 iPhone:string[];
 MacBook:string[];
 iPad:string[];
 "Apple Watch":string[];
};
type Payload={periodLabel:string;week:string;month:string;from:string;to:string;availableWeeks:string[];availableMonths:string[];productCatalog?:ProductCatalog;productFocus?:string[];lob:{products:Product[];staff:StaffRow[];total:Tot}};
type TargetMap=Record<string,number>;

const num=new Intl.NumberFormat("id-ID");
const pct=(v:number)=>`${new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(Number.isFinite(v)?v:0)}%`;
const today=()=>new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());
const monthName=(v:string)=>{if(!/^\d{4}-\d{2}$/.test(v))return v;const[y,m]=v.split("-").map(Number);return new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric"}).format(new Date(y,m-1,1))};
const panel="m238-soft-card rounded-2xl border";
const sub="m238-subcard rounded-2xl border";
function status(ach:number,target:number){if(target<=0)return"Critical";const a=ach/target*100;return a>=100?"Achieve":a>=80?"Need Push":"Critical"}
function statusClass(s:string){return s==="Achieve"?"bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300":s==="Need Push"?"bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300":"bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"}

export default function LobTargetFocusPage(){
 const now=today(),initialMonth=now.slice(0,7);
 const[filterMode,setFilterMode]=useState<FilterMode>("week"),[week,setWeek]=useState(""),[month,setMonth]=useState(initialMonth),[from,setFrom]=useState(`${initialMonth}-01`),[to,setTo]=useState(now),[filterRestored,setFilterRestored]=useState(false);

 useEffect(()=>{
  try{
   const raw=localStorage.getItem("m238-lob-target-focus-filter");
   if(raw){
    const saved=JSON.parse(raw);
    if(saved.filterMode==="week"||saved.filterMode==="month"||saved.filterMode==="range")setFilterMode(saved.filterMode);
    if(typeof saved.week==="string")setWeek(saved.week);
    if(typeof saved.month==="string"&&saved.month)setMonth(saved.month);
    if(typeof saved.from==="string"&&saved.from)setFrom(saved.from);
    if(typeof saved.to==="string"&&saved.to)setTo(saved.to);
   }
  }catch{}
  setFilterRestored(true);
 },[]);

 useEffect(()=>{
  if(!filterRestored)return;
  try{
   localStorage.setItem("m238-lob-target-focus-filter",JSON.stringify({filterMode,week,month,from,to}));
  }catch{}
 },[filterRestored,filterMode,week,month,from,to]);
 const[data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[targetOpen,setTargetOpen]=useState(false),[targets,setTargets]=useState<TargetMap>({}),[draft,setDraft]=useState<TargetMap>({}),[saving,setSaving]=useState(false),[message,setMessage]=useState(""),[selectedProduct,setSelectedProduct]=useState("");
 const[focusCategory,setFocusCategory]=useState<"Semua"|"iPhone"|"MacBook"|"iPad"|"Apple Watch">("Semua");
 const[activeProducts,setActiveProducts]=useState<string[]>([]);
 const[activeDraft,setActiveDraft]=useState<string[]>([]);
 const[performanceOpen,setPerformanceOpen]=useState(false),[staffOpen,setStaffOpen]=useState(false);
 useEffect(()=>{const q=new URLSearchParams({mode:filterMode});if(filterMode==="week"&&week)q.set("week",week);if(filterMode==="month")q.set("month",month);if(filterMode==="range"){q.set("from",from);q.set("to",to)}setLoading(true);fetch(`/api/lob-target-focus?${q.toString()}`,{cache:"no-store"}).then(r=>r.json()).then(j=>{setData(j);if(!week&&j.week)setWeek(j.week);if(j.month&&!month)setMonth(j.month)}).finally(()=>setLoading(false))},[filterMode,week,month,from,to]);
 const targetScope=filterMode==="week"?"weekly":filterMode==="month"?"monthly":"range";
 const targetPeriod=filterMode==="week"?(data?.week||week):filterMode==="month"?month:`${from}|${to}`;
 const products=useMemo(()=>activeProducts.length?activeProducts:(data?.productFocus??[]),[activeProducts,data]);
 const productCatalog=data?.productCatalog;
 const allCatalogProducts=useMemo(()=>productCatalog?[
  ...productCatalog.iPhone,
  ...productCatalog.MacBook,
  ...productCatalog.iPad,
  ...productCatalog["Apple Watch"]
 ]:[],[productCatalog]);
 const visibleCatalogProducts=useMemo(()=>{
  if(!productCatalog)return[];
  if(focusCategory==="Semua")return allCatalogProducts;
  return productCatalog[focusCategory]??[];
 },[productCatalog,focusCategory,allCatalogProducts]);

 const loadProducts=useMemo(
  ()=>allCatalogProducts.length?allCatalogProducts:(data?.productFocus??[]),
  [allCatalogProducts,data]
 );

 

 useEffect(()=>{
  const initial=data?.productFocus??[];
  if(!activeProducts.length&&initial.length){
   setActiveProducts(initial);
   setActiveDraft(initial);
  }
 },[data]);

 const toggleActiveDraft=(product:string)=>{
  setActiveDraft(prev=>prev.includes(product)?prev.filter(x=>x!==product):[...prev,product]);
 };

 useEffect(()=>{
  if(!targetPeriod||!loadProducts.length)return;
  let alive=true;
  fetch(`/api/manual-target?scope=${targetScope}&period=${encodeURIComponent(targetPeriod)}&group=lob-focus-active`,{cache:"no-store"})
   .then(r=>r.json())
   .then(j=>{
    if(!alive||j.error)return;
    const saved=j.targets||{};
    const keys=Object.keys(saved);
    const next=keys.length
      ? loadProducts.filter(p=>Number(saved[p]?.target||0)>0)
      : (data?.productFocus??[]);
    setActiveProducts(next);
    setActiveDraft(next);
   })
   .catch(()=>{});
  return()=>{alive=false};
 },[targetScope,targetPeriod,loadProducts,data?.productFocus]);
 useEffect(()=>{if(!products.length){setSelectedProduct("");return}setSelectedProduct(v=>products.includes(v)?v:products[0])},[products]);
 useEffect(()=>{if(!targetPeriod||!loadProducts.length){setTargets({});setDraft({});return}let alive=true;fetch(`/api/manual-target?scope=${targetScope}&period=${encodeURIComponent(targetPeriod)}&group=lob-focus`,{cache:"no-store"}).then(r=>r.json()).then(j=>{if(!alive||j.error)return;const next:TargetMap={};for(const p of loadProducts)next[p]=Math.max(0,Number(j.targets?.[p]?.target||0));setTargets(next);setDraft(next)}).catch(()=>{});return()=>{alive=false}},[targetScope,targetPeriod,loadProducts]);
 const actualByProduct=useMemo(()=>Object.fromEntries((data?.lob.products||[]).map(p=>[p.name,Number(p.qty||0)])) as TargetMap,[data]);
 const staffRows=useMemo(()=>[...(data?.lob.staff||[])].map(r=>({...r,focusTotal:products.reduce((a,p)=>a+Number(r.products[p]?.qty||0),0)})).sort((a,b)=>b.focusTotal-a.focusTotal||a.name.localeCompare(b.name)),[data,products]);
 const teamFocusQty=useMemo(()=>staffRows.reduce((a,r)=>a+r.focusTotal,0),[staffRows]);
 const totalTarget=products.reduce((a,p)=>a+(targets[p]||0),0),totalAch=products.reduce((a,p)=>a+(actualByProduct[p]||0),0),overall=totalTarget?totalAch/totalTarget*100:0,gap=Math.max(0,totalTarget-totalAch);
 const selectedTarget=targets[selectedProduct]||0,selectedAch=actualByProduct[selectedProduct]||0,selectedPct=selectedTarget?selectedAch/selectedTarget*100:0,selectedGap=Math.max(0,selectedTarget-selectedAch);
 const selectedRanking=useMemo(()=>staffRows.map(r=>({id:r.id,name:r.name,qty:Number(r.products[selectedProduct]?.qty||0)})).sort((a,b)=>b.qty-a.qty||a.name.localeCompare(b.name)),[staffRows,selectedProduct]);
 const performanceSummary=useMemo(()=>{let achieve=0,needPush=0,critical=0;for(const p of products){const st=status(actualByProduct[p]||0,targets[p]||0);if(st==="Achieve")achieve++;else if(st==="Need Push")needPush++;else critical++}return{achieve,needPush,critical}},[products,actualByProduct,targets]);
 const saveTarget=async()=>{
 setSaving(true);
 setMessage("");
 try{
  const bodyTargets:TargetMap={};
  for(const p of loadProducts){
   bodyTargets[p]=Math.max(0,Number(draft[p]||0));
  }

  const activeTargets:TargetMap={};
  for(const p of loadProducts){
   activeTargets[p]=activeDraft.includes(p)?1:0;
  }

  const [targetRes,activeRes]=await Promise.all([
   fetch("/api/manual-target",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({
     scope:targetScope,
     period:targetPeriod,
     group:"lob-focus",
     targets:bodyTargets
    })
   }),
   fetch("/api/manual-target",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({
     scope:targetScope,
     period:targetPeriod,
     group:"lob-focus-active",
     targets:activeTargets
    })
   })
  ]);

  const [targetJson,activeJson]=await Promise.all([
   targetRes.json(),
   activeRes.json()
  ]);

  if(!targetRes.ok){
   setMessage(targetJson.error||"Gagal menyimpan target");
   return;
  }

  if(!activeRes.ok){
   setMessage(activeJson.error||"Gagal menyimpan Product Focus");
   return;
  }

  setTargets({...bodyTargets});
  setDraft({...bodyTargets});
  setActiveProducts([...activeDraft]);
  setTargetOpen(false);
  setMessage("Target dan Product Focus tersimpan");
 }catch{
  setMessage("Koneksi gagal saat menyimpan target.");
 }finally{
  setSaving(false);
 }
};

return <div className="space-y-5"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600 dark:text-blue-400">M238 • Target Fokus</p><h2 className="mt-1 text-3xl font-black">LOB Target Fokus</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Monitoring Product Focus aktif berbasis Qty / Unit.</p></div>
 <section className={`${panel} p-4`}><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{(["week","month","range"] as FilterMode[]).map(f=><button key={f} onClick={()=>setFilterMode(f)} className={`rounded-xl px-4 py-2 text-sm font-bold ${filterMode===f?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{f==="week"?"Week":f==="month"?"Bulan":"Range Tanggal"}</button>)}</div></div><div className="mt-4 grid gap-3 md:grid-cols-3">{filterMode==="week"&&<label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Apple Week</span><select value={week} onChange={e=>setWeek(e.target.value)} className="h-11 w-full rounded-xl border px-3 font-semibold">{(data?.availableWeeks??[]).map(w=><option key={w} value={w}>{w}</option>)}</select></label>}{filterMode==="month"&&<label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Filter Bulan</span><select value={month} onChange={e=>setMonth(e.target.value)} className="h-11 w-full rounded-xl border px-3 font-semibold">{(data?.availableMonths??[]).map(m=><option key={m} value={m}>{monthName(m)}</option>)}</select></label>}{filterMode==="range"&&<><label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Dari Tanggal</span><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="h-11 w-full rounded-xl border px-3 font-semibold"/></label><label><span className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Sampai Tanggal</span><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="h-11 w-full rounded-xl border px-3 font-semibold"/></label></>}</div><p className="mt-3 text-xs text-slate-500">Periode aktif: <b>{data?.periodLabel||"-"}</b></p></section>
 {loading?<div className={`${panel} p-8 text-center text-slate-500`}>Memuat data Product Focus…</div>:!data?<div className={`${panel} p-8 text-center text-slate-500`}>Data belum tersedia.</div>:products.length===0?<div className={`${panel} p-8 text-center text-slate-500`}>Belum ada Product Focus aktif pada periode ini.</div>:<>
 <section className={`${panel} p-4`}><div className="flex items-center justify-between gap-3"><div><h3 className="font-black">Product Focus Aktif</h3><p className="mt-1 text-sm text-slate-500">Tap product untuk melihat detail kontribusi.</p></div><button onClick={()=>{setDraft({...targets});setMessage("");setTargetOpen(true)}} className="shrink-0 rounded-xl border px-4 py-2 text-sm font-black">Kelola Product Focus</button></div><div className="mt-4 overflow-x-auto pb-1"><div className="flex min-w-max gap-2">{products.map(p=><button key={p} onClick={()=>setSelectedProduct(p)} className={`rounded-full border px-4 py-2 text-sm font-bold ${selectedProduct===p?"border-blue-600 bg-blue-600 text-white":"bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}>{p}</button>)}</div></div></section>
 {selectedProduct&&<section className={`${panel} p-4`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-600">Detail Product</p><h3 className="mt-1 text-xl font-black">{selectedProduct}</h3></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${statusClass(status(selectedAch,selectedTarget))}`}>{status(selectedAch,selectedTarget)}</span></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><div><p className="text-xs text-slate-400">Target</p><p className="mt-1 text-xl font-black">{num.format(selectedTarget)}</p></div><div><p className="text-xs text-slate-400">Achievement</p><p className="mt-1 text-xl font-black">{num.format(selectedAch)}</p></div><div><p className="text-xs text-slate-400">Achievement %</p><p className="mt-1 text-xl font-black">{pct(selectedPct)}</p></div><div><p className="text-xs text-slate-400">Gap</p><p className="mt-1 text-xl font-black">{num.format(selectedGap)}</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-600 transition-all" style={{width:`${Math.min(100,Math.max(0,selectedPct))}%`}}/></div><div className="mt-4 border-t pt-4"><p className="text-sm font-black">Ranking Staff Contribution</p><div className="mt-2 space-y-2">{selectedRanking.length?selectedRanking.map((r,i)=><div key={r.id||r.name} className="flex items-center justify-between text-sm"><span><b>{i+1}.</b> {r.name}</span><b>{num.format(r.qty)} Unit</b></div>):<p className="text-sm text-slate-400">Belum ada penjualan product ini.</p>}</div></div></section>}
 <section className={`${panel} overflow-hidden`}><button type="button" onClick={()=>setPerformanceOpen(v=>!v)} aria-expanded={performanceOpen} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"><div><h3 className="font-black">Performance per Product</h3><p className="mt-1 text-sm text-slate-500">{products.length} Product Focus • {performanceSummary.achieve} Achieve • {performanceSummary.needPush} Need Push{performanceSummary.critical?` • ${performanceSummary.critical} Critical`:""}</p></div><span className={`text-lg transition-transform duration-200 ${performanceOpen?"rotate-180":""}`}>⌄</span></button><div className={`grid transition-[grid-template-rows] duration-200 ease-out ${performanceOpen?"grid-rows-[1fr]":"grid-rows-[0fr]"}`}><div className="overflow-hidden">{performanceOpen&&<div className="grid gap-3 border-t p-4 sm:grid-cols-2 xl:grid-cols-3">{products.map(p=>{const target=targets[p]||0,ach=actualByProduct[p]||0,pc=target?ach/target*100:0,g=Math.max(0,target-ach),st=status(ach,target);return <button key={p} onClick={()=>setSelectedProduct(p)} className={`${sub} p-4 text-left ${selectedProduct===p?"ring-2 ring-blue-500/40":""}`}><div className="flex items-start justify-between gap-2"><p className="font-black">{p}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black ${statusClass(st)}`}>{st}</span></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-slate-400">Target</p><p className="mt-1 text-lg font-black">{num.format(target)}</p></div><div><p className="text-xs text-slate-400">Achievement</p><p className="mt-1 text-lg font-black">{num.format(ach)}</p></div><div><p className="text-xs text-slate-400">Achievement %</p><p className="mt-1 text-lg font-black">{pct(pc)}</p></div><div><p className="text-xs text-slate-400">Gap</p><p className="mt-1 text-lg font-black">{num.format(g)}</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-600" style={{width:`${Math.min(100,Math.max(0,pc))}%`}}/></div></button>})}</div>}</div></div></section>
 <section className={`${panel} p-4`}><h3 className="font-black">Overall Summary</h3><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"><div><p className="text-xs text-slate-400">Total Target</p><p className="mt-1 text-xl font-black">{num.format(totalTarget)}</p></div><div><p className="text-xs text-slate-400">Total Achievement</p><p className="mt-1 text-xl font-black">{num.format(totalAch)}</p></div><div><p className="text-xs text-slate-400">Overall Achievement</p><p className="mt-1 text-xl font-black">{pct(overall)}</p></div><div><p className="text-xs text-slate-400">Total Gap</p><p className="mt-1 text-xl font-black">{num.format(gap)}</p></div></div></section>
 <section className={`${panel} overflow-hidden`}><button type="button" onClick={()=>setStaffOpen(v=>!v)} aria-expanded={staffOpen} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"><div><h3 className="font-black">Staff Contribution</h3><p className="mt-1 text-sm text-slate-500">{staffRows.length} Staff • Total {num.format(teamFocusQty)} Unit</p></div><span className={`text-lg transition-transform duration-200 ${staffOpen?"rotate-180":""}`}>⌄</span></button><div className={`grid transition-[grid-template-rows] duration-200 ease-out ${staffOpen?"grid-rows-[1fr]":"grid-rows-[0fr]"}`}><div className="overflow-hidden">{staffOpen&&<div className="overflow-x-auto border-t"><table className="min-w-[900px] w-full text-sm"><thead><tr><th className="sticky left-0 bg-white px-4 py-3 text-left dark:bg-slate-950">Staff</th>{products.map(p=><th key={p} className="px-3 py-3 text-right">{p}</th>)}<th className="px-3 py-3 text-right">Total</th></tr></thead><tbody>{staffRows.map(r=><tr key={r.id||r.name} className="border-t"><td className="sticky left-0 bg-white px-4 py-3 font-bold dark:bg-slate-950">{r.name}</td>{products.map(p=><td key={p} className="px-3 py-3 text-right">{num.format(r.products[p]?.qty||0)}</td>)}<td className="px-3 py-3 text-right font-black">{num.format(r.focusTotal)}</td></tr>)}</tbody></table></div>}</div></div></section>
 </>}
 {targetOpen&&<div className="fixed inset-0 z-[120] grid place-items-center bg-black/35 p-3 sm:p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setTargetOpen(false)}}>
 <div className="m238-soft-card max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border bg-white p-4 shadow-2xl dark:bg-slate-900 sm:p-5">
  <div className="flex items-start justify-between gap-3">
   <div>
    <p className="text-xs font-bold uppercase tracking-[.14em] text-blue-600">Kelola Product Focus</p>
    <h3 className="mt-1 text-xl font-black">{data?.periodLabel||targetPeriod}</h3>
    <p className="mt-1 text-sm text-slate-500">Pilih produk yang ingin ditampilkan dan tentukan target Qty / Unit.</p>
   </div>
   <button onClick={()=>setTargetOpen(false)} className="rounded-lg border px-3 py-1.5 text-sm font-bold">Tutup</button>
  </div>

  <div className="mt-5 grid gap-4 lg:grid-cols-[190px_minmax(0,1fr)_260px]">

   <div className="space-y-2">
    <p className="mb-2 text-xs font-bold uppercase tracking-[.12em] text-slate-500">Pilih Kategori</p>
    {(["Semua","iPhone","MacBook","iPad","Apple Watch"] as const).map(cat=>
     <button
      key={cat}
      type="button"
      onClick={()=>setFocusCategory(cat)}
      className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition ${
       focusCategory===cat
        ?"border-blue-600 bg-blue-600 text-white"
        :"bg-white text-slate-700 hover:border-blue-300 dark:bg-slate-900 dark:text-slate-200"
      }`}
     >
      {cat}
     </button>
    )}
   </div>

   <div className="min-w-0 rounded-xl border p-3">
    <div className="mb-3 flex items-center justify-between gap-3">
     <div>
      <p className="font-black">
       {focusCategory==="Semua"?"Daftar Semua Produk":`Daftar Produk - ${focusCategory}`}
      </p>
      <p className="text-xs text-slate-500">{visibleCatalogProducts.length} produk tersedia</p>
     </div>
    </div>

    <div className="max-h-[48vh] space-y-2 overflow-y-auto pr-1">
     {visibleCatalogProducts.map(product=>{
      const checked=activeDraft.includes(product);
      return <div key={product} className={`grid grid-cols-[minmax(0,1fr)_110px] items-center gap-3 rounded-xl border p-3 ${checked?"border-blue-300 bg-blue-50/50 dark:bg-blue-950/20":"bg-white dark:bg-slate-900"}`}>
       <label className="flex min-w-0 cursor-pointer items-center gap-3">
        <input
         type="checkbox"
         checked={checked}
         onChange={()=>toggleActiveDraft(product)}
         className="h-4 w-4 shrink-0"
        />
        <span className="truncate text-sm font-bold">{product}</span>
       </label>

       <div>
        <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Target</p>
        <input
         type="number"
         min="0"
         step="1"
         disabled={!checked}
         value={draft[product]??0}
         onChange={e=>setDraft(v=>({...v,[product]:Math.max(0,Math.floor(Number(e.target.value)||0))}))}
         className="h-9 w-full rounded-lg border px-2 text-right text-sm font-black disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800"
        />
       </div>
      </div>
     })}

     {!visibleCatalogProducts.length&&
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
       Belum ada produk pada kategori ini.
      </div>
     }
    </div>
   </div>

   <div className="rounded-xl border bg-blue-50/40 p-3 dark:bg-blue-950/10">
    <div className="flex items-center justify-between gap-2">
     <p className="font-black text-blue-700 dark:text-blue-300">Product Focus Aktif</p>
     <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">{activeDraft.length}</span>
    </div>

    <div className="mt-3 max-h-[42vh] space-y-2 overflow-y-auto">
     {activeDraft.map(product=>
      <div key={product} className="flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-sm dark:bg-slate-900">
       <div className="min-w-0">
        <p className="truncate font-bold">{product}</p>
        <p className="text-xs text-slate-500">Target {num.format(draft[product]||0)} Unit</p>
       </div>
       <button
        type="button"
        onClick={()=>toggleActiveDraft(product)}
        className="shrink-0 rounded-md px-2 py-1 font-black text-slate-400 hover:bg-rose-50 hover:text-rose-600"
       >
        ×
       </button>
      </div>
     )}

     {!activeDraft.length&&
      <div className="rounded-lg border border-dashed p-4 text-center text-xs text-slate-500">
       Belum ada Product Focus yang dipilih.
      </div>
     }
    </div>
   </div>
  </div>

  <div className="mt-5 border-t pt-4">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
     <p className="text-sm font-bold">Total Product Focus: {activeDraft.length}</p>
     <p className="text-xs text-slate-500">Total Target: {num.format(activeDraft.reduce((a,p)=>a+(draft[p]||0),0))} Unit</p>
     {message&&<p className="mt-1 text-sm font-bold text-rose-600">{message}</p>}
    </div>

    <div className="flex gap-2">
     <button
      type="button"
      onClick={()=>{
       setActiveDraft([...activeProducts]);
       setDraft({...targets});
       setTargetOpen(false);
      }}
      className="rounded-xl border px-4 py-2 text-sm font-bold"
     >
      Batal
     </button>
     <button
      type="button"
      disabled={saving}
      onClick={saveTarget}
      className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-black text-white disabled:opacity-50"
     >
      {saving?"Menyimpan...":"Simpan"}
     </button>
    </div>
   </div>
  </div>
 </div>
</div>}
 </div>
}
