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

type Row={article:string;description:string;qty:number;soldQty:number;category:string};

export default function SohTabsPage(){
 const[q,setQ]=useState(""),[rows,setRows]=useState<Row[]>([]),[updated,setUpdated]=useState(""),[soldDate,setSoldDate]=useState(""),[active,setActive]=useState<(typeof groups)[number][0]>("IPHONE"),[loading,setLoading]=useState(true);
 useEffect(()=>{const t=setTimeout(async()=>{setLoading(true);try{const j=await(await fetch(`/api/soh?q=${encodeURIComponent(q)}`,{cache:"no-store"})).json();setRows(j.rows||[]);setUpdated(j.updated||"");setSoldDate(j.soldDate||"")}finally{setLoading(false)}},180);return()=>clearTimeout(t)},[q]);
 const filtered=useMemo(()=>rows.filter(r=>r.category===active),[rows,active]),total=filtered.reduce((a,r)=>a+r.qty,0),sold=filtered.reduce((a,r)=>a+r.soldQty,0),label=groups.find(([k])=>k===active)?.[1]||active;
 return <main className="min-h-screen bg-slate-50 p-5 text-slate-950 dark:bg-slate-900 dark:text-slate-100 sm:p-8"><a href="/" className="font-bold text-blue-600">← Dashboard</a><div className="mx-auto mt-6 max-w-7xl space-y-5"><div><h1 className="text-3xl font-black">Stock On Hand</h1><p className="mt-1 text-slate-500">SOH per kategori{updated?` • Update stock ${updated}`:""}{soldDate?` • Qty Sold ${soldDate}`:""}.</p></div>
 <section className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950"><input className={`${input} w-full`} value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari Article atau Description..."/></section>
 <section className="rounded-2xl border bg-white p-2 shadow-sm dark:bg-slate-950"><div className="flex gap-2 overflow-x-auto">{groups.map(([key,name])=><button key={key} onClick={()=>setActive(key)} className={`shrink-0 rounded-xl px-4 py-3 text-sm font-black ${active===key?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}>{name}</button>)}</div></section>
 <section className="rounded-2xl border bg-white shadow-sm dark:bg-slate-950"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="text-xl font-black">{label}</h2><p className="text-sm text-slate-500">Tampilan hanya kategori yang sedang dipilih.</p></div><div className="flex gap-2"><span className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-black text-blue-700">SOH {total}</span><span className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">Sold {sold}</span></div></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 dark:bg-slate-900"><tr><th className="p-3 text-left">Article</th><th className="p-3 text-left">Description</th><th className="p-3 text-right">Qty SOH</th><th className="p-3 text-right">Qty Sold</th><th className="p-3 text-right">Balance View</th></tr></thead><tbody>{loading?<tr><td colSpan={5} className="p-8 text-center text-slate-400">Memuat SOH...</td></tr>:filtered.length?filtered.map(r=><tr className="border-t" key={`${r.article}-${r.description}`}><td className="p-3 font-bold">{r.article}</td><td className="p-3">{r.description}</td><td className="p-3 text-right font-black">{r.qty}</td><td className="p-3 text-right font-black text-emerald-600">{r.soldQty}</td><td className="p-3 text-right font-semibold">{Math.max(0,r.qty-r.soldQty)}</td></tr>):<tr><td colSpan={5} className="p-8 text-center text-slate-400">Tidak ada data pada kategori/filter ini.</td></tr>}</tbody><tfoot><tr className="border-t-2 bg-slate-50 font-black dark:bg-slate-900"><td className="p-3" colSpan={2}>TOTAL</td><td className="p-3 text-right">{total}</td><td className="p-3 text-right text-emerald-600">{sold}</td><td className="p-3 text-right">{Math.max(0,total-sold)}</td></tr></tfoot></table></div></section>
 </div></main>
}
