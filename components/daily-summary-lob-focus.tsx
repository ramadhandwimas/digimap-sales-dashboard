"use client";
import {useEffect,useMemo,useState} from "react";
import {ChevronDown,ChevronUp,SlidersHorizontal} from "lucide-react";

type Mode="monthly"|"range";
type Tot={qty:number;value:number};
type Product={name:string;qty:number;value:number};
type ProductCatalog={iPhone:string[];MacBook:string[];iPad:string[];"Apple Watch":string[]};
type FocusPayload={productCatalog?:ProductCatalog;lob:{products:Product[]}};
type TargetMap=Record<string,number>;
const num=new Intl.NumberFormat("id-ID");
const pct=(v:number)=>`${new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(Number.isFinite(v)?v:0)}%`;

export default function DailySummaryLobFocus({mode,period,from,to}:{mode:Mode;period:string;from:string;to:string}){
 const[data,setData]=useState<FocusPayload|null>(null),[targets,setTargets]=useState<TargetMap>({}),[draft,setDraft]=useState<TargetMap>({}),[category,setCategory]=useState<"Semua"|"iPhone"|"MacBook"|"iPad"|"Apple Watch">("Semua"),[saving,setSaving]=useState(false),[message,setMessage]=useState(""),[collapsed,setCollapsed]=useState(false),[selectorOpen,setSelectorOpen]=useState(false),[selected,setSelected]=useState<string[]>([]);
 const scope=mode==="monthly"?"monthly":"range",targetPeriod=mode==="monthly"?period:`${from}|${to}`;
 useEffect(()=>{let alive=true;const q=mode==="monthly"?`mode=month&month=${encodeURIComponent(period)}`:`mode=range&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;Promise.all([fetch(`/api/lob-target-focus?${q}`,{cache:"no-store"}).then(r=>r.json()),fetch(`/api/manual-target?scope=${scope}&period=${encodeURIComponent(targetPeriod)}&group=lob-focus`,{cache:"no-store"}).then(r=>r.json())]).then(([focus,manual])=>{if(!alive)return;setData(focus);const catalog=focus.productCatalog as ProductCatalog|undefined,all=catalog?[...catalog.iPhone,...catalog.MacBook,...catalog.iPad,...catalog["Apple Watch"]]:[];const next:TargetMap={};for(const p of all)next[p]=Math.max(0,Number(manual.targets?.[p]?.target||0));setTargets(next);setDraft(next)}).catch(()=>alive&&setMessage("LOB Focus belum berhasil dimuat."));return()=>{alive=false}},[mode,period,from,to,scope,targetPeriod]);
 useEffect(()=>{try{const raw=localStorage.getItem("m238_daily_summary_lob_selected");if(raw){const v=JSON.parse(raw);if(Array.isArray(v))setSelected(v.filter(x=>typeof x==="string"))}}catch{}},[]);
 const saveSelected=(next:string[])=>{setSelected(next);try{localStorage.setItem("m238_daily_summary_lob_selected",JSON.stringify(next))}catch{}};
 const catalog=data?.productCatalog;
 const all=useMemo(()=>catalog?[...catalog.iPhone,...catalog.MacBook,...catalog.iPad,...catalog["Apple Watch"]]:[],[catalog]);
 const shown=useMemo(()=>{const base=category==="Semua"?all:(catalog?.[category]??[]);return selected.length?base.filter(p=>selected.includes(p)):base},[category,all,catalog,selected]);
 const actual=useMemo(()=>Object.fromEntries((data?.lob?.products||[]).map(p=>[p.name,Number(p.qty||0)])) as TargetMap,[data]);
 const totalTarget=all.reduce((a,p)=>a+(targets[p]||0),0),totalActual=all.reduce((a,p)=>a+(actual[p]||0),0);
 const save=async()=>{setSaving(true);setMessage("");try{const r=await fetch("/api/manual-target",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scope,period:targetPeriod,group:"lob-focus",targets:Object.fromEntries(all.map(p=>[p,Math.max(0,Number(draft[p]||0))]))})}),j=await r.json();if(!r.ok)throw new Error(j.error||"Gagal menyimpan target");setTargets({...draft});setMessage("Target LOB tersimpan. Target yang sama juga dipakai di menu LOB Target Fokus.")}catch(e){setMessage(e instanceof Error?e.message:"Gagal menyimpan target")}finally{setSaving(false)}};
 return <section className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
  <div className="flex items-start justify-between gap-3">
   <div><h3 className="font-extrabold">Target LOB Focus</h3><p className="mt-1 text-sm text-slate-500">Actual dari Data Copas. Pilih hanya type yang ingin ditampilkan.</p></div>
   <button onClick={()=>setCollapsed(v=>!v)} className="grid size-10 shrink-0 place-items-center rounded-xl border" aria-label={collapsed?"Buka LOB Focus":"Sembunyikan LOB Focus"}>{collapsed?<ChevronDown size={18}/>:<ChevronUp size={18}/>}</button>
  </div>
  {!collapsed&&<>
  <div className="mt-4 flex flex-wrap items-center gap-2"><button onClick={()=>setSelectorOpen(v=>!v)} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black"><SlidersHorizontal size={14}/>Pilih Type {selected.length?`(${selected.length})`:""}</button>{(["Semua","iPhone","MacBook","iPad","Apple Watch"] as const).map(x=><button key={x} onClick={()=>setCategory(x)} className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-bold ${category===x?"border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300":"bg-white text-slate-500 dark:bg-slate-900"}`}>{x}</button>)}</div>
  {selectorOpen?<div className="mt-3 rounded-2xl border bg-slate-50 p-3 dark:bg-slate-900"><div className="mb-3 flex flex-wrap gap-2"><button onClick={()=>saveSelected(all)} className="rounded-lg border bg-white px-3 py-1.5 text-xs font-bold dark:bg-slate-950">Pilih Semua</button><button onClick={()=>saveSelected([])} className="rounded-lg border bg-white px-3 py-1.5 text-xs font-bold dark:bg-slate-950">Reset</button></div><div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">{all.map(p=>{const active=selected.includes(p);return <button key={p} onClick={()=>saveSelected(active?selected.filter(x=>x!==p):[...selected,p])} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${active?"border-blue-600 bg-blue-600 text-white":"bg-white dark:bg-slate-950"}`}>{p}</button>})}</div></div>:null}
  <div className="mt-4 overflow-hidden rounded-2xl border">
   <div className="grid grid-cols-[1.5fr_.55fr_.8fr_.65fr] gap-2 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-900"><span>Device</span><span className="text-right">Actual</span><span className="text-right">Target</span><span className="text-right">Ach</span></div>
   {shown.map(p=>{const a=actual[p]||0,t=targets[p]||0;return <div key={p} className="grid grid-cols-[1.5fr_.55fr_.8fr_.65fr] items-center gap-2 border-t px-3 py-2.5 text-xs"><b className="min-w-0 truncate">{p}</b><b className="text-right">{num.format(a)}</b><input inputMode="numeric" value={draft[p]||""} onChange={e=>setDraft(v=>({...v,[p]:Math.max(0,Number(e.target.value.replace(/[^0-9]/g,""))||0)}))} placeholder="0" className="h-9 min-w-0 rounded-lg border bg-white px-2 text-right font-black dark:bg-slate-900"/><b className="text-right">{t?pct(a/t*100):"—"}</b></div>})}
  </div>
  <div className="mt-4 rounded-2xl bg-blue-50 p-4 dark:bg-blue-950/20"><div className="grid grid-cols-3 gap-3 text-sm"><div><span className="text-xs text-slate-500">Total Target</span><b className="mt-1 block">{totalTarget?num.format(totalTarget):"—"}</b></div><div><span className="text-xs text-slate-500">Actual</span><b className="mt-1 block">{num.format(totalActual)}</b></div><div><span className="text-xs text-slate-500">Ach</span><b className="mt-1 block">{totalTarget?pct(totalActual/totalTarget*100):"—"}</b></div></div></div>
  {message?<p className="mt-3 text-xs font-bold text-slate-600 dark:text-slate-300">{message}</p>:null}
  <div className="mt-4 flex justify-end"><button onClick={save} disabled={saving||!all.length} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{saving?"Menyimpan...":"Simpan Target"}</button></div>
  </>}
 </section>
}