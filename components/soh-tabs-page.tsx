"use client";
import {useEffect,useMemo,useState} from "react";

const groups=[
 ["IPHONE","iPhone"],
 ["IPAD","iPad"],
 ["MACBOOK","Mac"],
 ["APPLE WATCH","Apple Watch"],
 ["AIRPODS, PENCIL & KEYBOARD","AirPods, Pencil & Keyboard"],
] as const;
const input="h-11 rounded-xl border bg-white px-3 dark:bg-slate-900";
const PAGE_SIZE=50;
type Row={article:string;description:string;qty:number;soldQty:number;category:string};

export default function SohTabsPage(){
 const[q,setQ]=useState(""),[rows,setRows]=useState<Row[]>([]),[updated,setUpdated]=useState(""),[soldDate,setSoldDate]=useState(""),[active,setActive]=useState<(typeof groups)[number][0]>("IPHONE"),[loading,setLoading]=useState(true),[error,setError]=useState(""),[page,setPage]=useState(1);
 useEffect(()=>{setPage(1)},[active,q]);
 useEffect(()=>{
  const controller=new AbortController();
  const t=setTimeout(async()=>{setLoading(true);setError("");try{const url=`/api/soh?category=${encodeURIComponent(active)}&q=${encodeURIComponent(q)}`;const r=await fetch(url,{signal:controller.signal});const j=await r.json();if(!r.ok||j?.error)throw new Error(j?.error||"SOH gagal dimuat");setRows(Array.isArray(j.rows)?j.rows:[]);setUpdated(j.updated||"");setSoldDate(j.soldDate||"")}catch(e){if(controller.signal.aborted)return;setRows([]);setError(e instanceof Error?e.message:"SOH gagal dimuat")}finally{if(!controller.signal.aborted)setLoading(false)}},300);
  return()=>{clearTimeout(t);controller.abort()}
 },[q,active]);
 const filtered=useMemo(()=>rows.filter(r=>r.category===active),[rows,active]),total=filtered.reduce((a,r)=>a+r.qty,0),sold=filtered.reduce((a,r)=>a+r.soldQty,0),label=groups.find(([k])=>k===active)?.[1]||active,totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)),safePage=Math.min(page,totalPages),visible=filtered.slice((safePage-1)*PAGE_SIZE,safePage*PAGE_SIZE);
 return <main className="min-h-screen bg-slate-50 p-5 text-slate-950 dark:bg-slate-900 dark:text-slate-100 sm:p-8"><a href="/" className="font-bold text-blue-600">← Dashboard</a><div className="mx-auto mt-6 max-w-7xl space-y-5"><div><h1 className="text-3xl font-black">Stock On Hand</h1><p className="mt-1 text-slate-500">SOH per kategori{updated?` • Update stock ${updated}`:""}{soldDate?` • Qty Sold ${soldDate}`:""}.</p></div>
 <section className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950"><input className={`${input} w-full`} value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari Article atau Description..."/></section>
 <section className="rounded-2xl border bg-white p-2 shadow-sm dark:bg-slate-950"><div className="flex gap-2 overflow-x-auto">{groups.map(([key,name])=><button key={key} onClick={()=>setActive(key)} className={`shrink-0 rounded-xl px-4 py-3 text-sm font-black ${active===key?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}>{name}</button>)}</div></section>
 <section className="rounded-2xl border bg-white shadow-sm dark:bg-slate-950"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="text-xl font-black">{label}</h2><p className="text-sm text-slate-500">Tampilan hanya kategori yang sedang dipilih.</p></div><div className="flex gap-2"><span className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-black text-blue-700">SOH {total}</span><span className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">Sold {sold}</span></div></div>{error?<div className="m-5 rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>:null}<div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 dark:bg-slate-900"><tr><th className="p-3 text-left">Article</th><th className="p-3 text-left">Description</th><th className="p-3 text-right">Qty SOH</th><th className="p-3 text-right">Qty Sold</th><th className="p-3 text-right">Balance View</th></tr></thead><tbody>{loading?<tr><td colSpan={5} className="p-8 text-center text-slate-400">Memuat SOH...</td></tr>:visible.length?visible.map(r=><tr className="border-t" key={`${r.article}-${r.description}`}><td className="p-3 font-bold">{r.article}</td><td className="p-3">{r.description}</td><td className="p-3 text-right font-black">{r.qty}</td><td className="p-3 text-right font-black text-emerald-600">{r.soldQty}</td><td className="p-3 text-right font-semibold">{Math.max(0,r.qty-r.soldQty)}</td></tr>):!error?<tr><td colSpan={5} className="p-8 text-center text-slate-400">Tidak ada data pada kategori/filter ini.</td></tr>:null}</tbody><tfoot><tr className="border-t-2 bg-slate-50 font-black dark:bg-slate-900"><td className="p-3" colSpan={2}>TOTAL</td><td className="p-3 text-right">{total}</td><td className="p-3 text-right text-emerald-600">{sold}</td><td className="p-3 text-right">{Math.max(0,total-sold)}</td></tr></tfoot></table></div>{!loading&&!error&&filtered.length>PAGE_SIZE?<div className="flex items-center justify-between gap-3 border-t p-4 text-sm"><span className="text-slate-500">{filtered.length} item • {PAGE_SIZE} per halaman</span><div className="flex items-center gap-2"><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40">Sebelumnya</button><span className="font-bold">{safePage}/{totalPages}</span><button disabled={safePage>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40">Berikutnya</button></div></div>:null}</section>
 </div></main>
}
