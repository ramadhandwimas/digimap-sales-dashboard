"use client";

import {useCallback,useEffect,useState} from "react";

const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const num=new Intl.NumberFormat("id-ID");
const pct=(v:number)=>`${new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(v)}%`;
type Agg={qty:number;amount:number};
type Analysis={review:string;actionPlan:string;target:number;achievement:number;gap:number};
type Weekly={labelA:string;labelB:string;periodA:{start:string;end:string};periodB:{start:string;end:string};availableWeeks:string[];a:{scheme:Record<string,Agg>;lob:Record<string,Record<string,Agg>>};b:{scheme:Record<string,Agg>;lob:Record<string,Record<string,Agg>>};analysis:Record<string,Analysis>;feedbackSummary:string;targets:{lob:Record<string,number>};error?:string};
type DailySummary={qty:number;invoices:number};
type SavedSnapshot={data:Weekly;trafficA:number;trafficB:number;dailyA?:DailySummary;dailyB?:DailySummary;savedAt:string};
const lobOrder:[string,string][]=[["AIRPODS","AirPods"],["APPLE WATCH","Apple Watch"],["IPAD","iPad"],["IPHONE","iPhone"],["MAC","MacBook"]];
function total(values:Record<string,Agg>={}){return Object.values(values).reduce((a,r)=>({qty:a.qty+(r.qty||0),amount:a.amount+(r.amount||0)}),{qty:0,amount:0})}
function rank(label:string){const m=label.match(/Week\s*(\d+)\s*Q(\d+)/i);return Number(m?.[2]||0)*100+Number(m?.[1]||0)}
function previousWeek(weeks:string[],week:string){const sorted=[...weeks].sort((a,b)=>rank(a)-rank(b)),i=sorted.indexOf(week);return i>0?sorted[i-1]:(sorted[0]||week)}
function dates(start:string,end:string){const out:string[]=[];if(!start||!end)return out;const d=new Date(`${start}T00:00:00Z`),e=new Date(`${end}T00:00:00Z`);while(d<=e){out.push(d.toISOString().slice(0,10));d.setUTCDate(d.getUTCDate()+1)}return out}
async function conversionSummary(start:string,end:string){const rows=await Promise.all(dates(start,end).map(async date=>{const r=await fetch(`/api/daily?date=${date}`,{cache:"no-store"});if(!r.ok)return {qty:0,invoices:0};const j=await r.json();return {qty:Number(j.total?.qty||0),invoices:Number(j.total?.invoices||0)}}));return rows.reduce((a,r)=>({qty:a.qty+r.qty,invoices:a.invoices+r.invoices}),{qty:0,invoices:0})}
function humanPlan(key:string,review:string,feedback:string){
 const text=`${review} ${feedback}`.toLowerCase(),extra:string[]=[];
 if(/stok|stock|kosong|tidak tersedia/.test(text))extra.push("cek stok high demand dan konsolidasi lebih awal bila ada gap");
 if(/harga|budget|promo|diskon|compare|kompetitor/.test(text))extra.push("maksimalkan promo aktif dan opsi BNPL pada customer yang masih compare");
 if(/follow|belum closing|menunggu/.test(text))extra.push("follow up kembali seluruh customer yang belum closing");
 if(/traffic|sepi|opportunity/.test(text))extra.push("maksimalkan setiap opportunity yang masuk dan jangan lepas kebutuhan tambahan");
 const tail=extra.length?` ${extra.slice(0,2).join(", lalu ")}.`:"";
 if(key==="AIRPODS")return `Maksimalkan AirPods Try On dan voucher Rp250 ribu, lalu attachment AirPods pada setiap penjualan device.${tail}`;
 if(key==="MAC")return `Maksimalkan MacBook Try On dan voucher Rp600 ribu, demo sesuai kebutuhan customer, lalu follow up customer yang masih pending.${tail}`;
 if(key==="IPAD")return `Maksimalkan iPad Try On dan voucher Rp600 ribu, arahkan demo sesuai use case, serta dorong attachment Pencil atau keyboard.${tail}`;
 if(key==="IPHONE")return /iphone\s*18/.test(text)?`Simpan dan follow up customer yang masih menunggu iPhone 18, sambil tawarkan opsi iPhone yang tersedia jika kebutuhan customer tidak bisa menunggu.${tail}`:`Fokus ke tipe iPhone yang turun, pastikan stok high demand tersedia, dan follow up customer yang belum closing.${tail}`;
 return `Fokus ke tipe Watch yang turun, cek stok ukuran/warna yang dicari, dan gunakan demo fitur health/fitness untuk membantu closing.${tail}`;
}

export default function WeeklyReasonPage(){
 const[weeks,setWeeks]=useState<string[]>([]),[selected,setSelected]=useState(""),[snapshot,setSnapshot]=useState<SavedSnapshot|null>(null),[loading,setLoading]=useState(true),[source,setSource]=useState<"saved"|"generated"|"">(""),[error,setError]=useState("");
 const hydrateConversion=useCallback(async(saved:SavedSnapshot)=>{if(saved.dailyA&&saved.dailyB)return saved;const[a,b]=await Promise.all([conversionSummary(saved.data.periodA.start,saved.data.periodA.end),conversionSummary(saved.data.periodB.start,saved.data.periodB.end)]);return {...saved,dailyA:a,dailyB:b}},[]);
 const build=useCallback(async(week:string,force=false,knownWeeks?:string[])=>{
  if(!week)return;
  setLoading(true);setError("");
  try{
   if(!force){const saved=await fetch(`/api/weekly-reason-snapshot?week=${encodeURIComponent(week)}`,{cache:"no-store"}).then(r=>r.json());if(saved.found&&saved.snapshot){const hydrated=await hydrateConversion(saved.snapshot as SavedSnapshot);setSnapshot(hydrated);setSource("saved");return}}
   const list=knownWeeks||weeks,compare=previousWeek(list,week),w=await fetch(`/api/weekly?from=${encodeURIComponent(compare)}&to=${encodeURIComponent(week)}`,{cache:"no-store"}).then(r=>r.json()) as Weekly;
   if(w.error)throw new Error(w.error);
   const [ta,tb,da,db]=await Promise.all([fetch(`/api/traffic?from=${w.periodA.start}&to=${w.periodA.end}`,{cache:"no-store"}).then(r=>r.json()),fetch(`/api/traffic?from=${w.periodB.start}&to=${w.periodB.end}`,{cache:"no-store"}).then(r=>r.json()),conversionSummary(w.periodA.start,w.periodA.end),conversionSummary(w.periodB.start,w.periodB.end)]);
   const next:SavedSnapshot={data:w,trafficA:Number(ta.total||0),trafficB:Number(tb.total||0),dailyA:da,dailyB:db,savedAt:new Date().toISOString()};
   setSnapshot(next);setSource("generated");
   const save=await fetch("/api/weekly-reason-snapshot",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({week:w.labelB,compareWeek:w.labelA,snapshot:next})});
   if(!save.ok)throw new Error("Reason berhasil dibuat tetapi gagal disimpan.");
  }catch(e){setError(e instanceof Error?e.message:"Gagal membuka Weekly Reason")}finally{setLoading(false)}
 },[weeks,hydrateConversion]);
 useEffect(()=>{void(async()=>{setLoading(true);try{const w=await fetch("/api/weekly",{cache:"no-store"}).then(r=>r.json()) as Weekly;if(w.error)throw new Error(w.error);const list=[...(w.availableWeeks||[])].sort((a,b)=>rank(a)-rank(b));setWeeks(list);const latest=w.labelB||list[list.length-1]||"";setSelected(latest);if(latest)await build(latest,false,list)}catch(e){setError(e instanceof Error?e.message:"Gagal membuka Weekly Reason");setLoading(false)}})()},[]);
 const changeWeek=(week:string)=>{setSelected(week);void build(week,false)};
 const data=snapshot?.data,trafficA=snapshot?.trafficA||0,trafficB=snapshot?.trafficB||0,salesA=total(data?.a?.scheme),salesB=total(data?.b?.scheme),salesGrowth=salesA.amount?(salesB.amount-salesA.amount)/salesA.amount*100:0,trafficGrowth=trafficA?(trafficB-trafficA)/trafficA*100:0,dailyA=snapshot?.dailyA||{qty:0,invoices:0},dailyB=snapshot?.dailyB||{qty:0,invoices:0},cvrA=trafficA?dailyA.invoices/trafficA*100:0,cvrB=trafficB?dailyB.invoices/trafficB*100:0,uptA=dailyA.invoices?dailyA.qty/dailyA.invoices:0,uptB=dailyB.invoices?dailyB.qty/dailyB.invoices:0;
 return <div className="space-y-5">
  <div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">M238 Reporting</p><h1 className="mt-1 text-3xl font-black">Weekly Reason</h1><p className="mt-1 text-sm text-slate-500">Reason mingguan berdasarkan Sales Summary Weekly Report, compare week-to-week, traffic, conversion, dan compile feedback team.</p></div>
  <section className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950"><div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><label><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">Pilih Week</span><select value={selected} onChange={e=>changeWeek(e.target.value)} className="h-11 w-full rounded-xl border bg-white px-3 dark:bg-slate-900">{weeks.map(x=><option key={x} value={x}>{x}</option>)}</select></label><div className="rounded-xl border bg-slate-50 px-4 py-2 dark:bg-slate-900"><span className="text-xs font-black uppercase tracking-wide text-slate-400">Compare</span><p className="mt-1 font-black">{selected?previousWeek(weeks,selected):"—"}</p></div><button onClick={()=>void build(selected,true)} disabled={loading||!selected} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{loading?"Memuat…":"Update Reason"}</button></div>{source&&<p className="mt-3 text-xs text-slate-500">{source==="saved"?"Menampilkan reason yang sudah tersimpan untuk week ini.":"Reason terbaru sudah dibuat dan disimpan untuk week ini."}</p>}</section>
  {error&&<div className="rounded-2xl bg-rose-50 p-4 font-bold text-rose-700">{error}</div>}
  {data&&<>
   <section className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-950"><h2 className="text-xl font-black">M238 DIGIMAP PIM 2</h2><h3 className="mt-1 text-lg font-black">{data.labelB}</h3><p className="mt-4 leading-7">Total sales {data.labelB} <b>{money.format(salesB.amount)}</b>, {salesGrowth>=0?"naik":"turun"} <b>{pct(Math.abs(salesGrowth))}</b> dibanding {data.labelA} sebesar <b>{money.format(salesA.amount)}</b>.</p><p className="mt-2 text-xs text-slate-500">Sumber total sales: Weekly Report → Sales Summary (Device + ACC + VAS).</p></section>
   <section className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-950"><h3 className="font-black">Traffic</h3><div className="mt-3 grid grid-cols-2 gap-4"><div><b>{data.labelA}</b><p>{num.format(trafficA)}</p></div><div><b>{data.labelB}</b><p>{num.format(trafficB)}</p></div></div><p className={`mt-2 font-black ${trafficGrowth>=0?"text-emerald-600":"text-rose-600"}`}>Growth {trafficGrowth>=0?"+":""}{pct(trafficGrowth)}</p></div><div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-950"><h3 className="font-black">Conversion</h3><div className="mt-3 grid grid-cols-2 gap-4"><div><b>{data.labelA}</b><p>Transaksi {num.format(dailyA.invoices)}</p><p>CVR {pct(cvrA)}</p><p>UPT {uptA.toFixed(1)}</p></div><div><b>{data.labelB}</b><p>Transaksi {num.format(dailyB.invoices)}</p><p>CVR {pct(cvrB)}</p><p>UPT {uptB.toFixed(1)}</p></div></div></div></section>
   <section className="rounded-2xl border bg-blue-50/60 p-5 dark:bg-blue-950/20"><h3 className="font-black">Compile Reason Staff</h3><p className="mt-2 leading-7">{data.feedbackSummary}</p></section>
   {lobOrder.map(([key,label])=>{const a=total(data.a?.lob?.[key]),b=total(data.b?.lob?.[key]),g=a.qty?(b.qty-a.qty)/a.qty*100:0,an=data.analysis?.[key],plan=humanPlan(key,an?.review||"",data.feedbackSummary||"");return <section key={key} className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-950"><h3 className="text-lg font-black">{label}</h3><p className="mt-3">{label} {data.labelB} {g>=0?"naik":"turun"} <b>{g>=0?"+":""}{pct(g)}</b> dengan total <b>{num.format(b.qty)} unit</b>, dibanding {data.labelA} <b>{num.format(a.qty)} unit</b>.</p><div className="mt-4"><b>Reason</b><p className="mt-1 leading-7">{an?.review||"Belum ada reason yang tersimpan untuk LOB ini."}</p></div><div className="mt-4"><b>Achievement vs Target</b><p className={an?.gap>=0?"text-emerald-600":"text-rose-600"}>{an?.target?`${an.gap>=0?"Plus":"Minus"} ${Math.abs(an.gap)} unit • Achievement ${pct(an.achievement)}`:"Target belum tersedia"}</p></div><div className="mt-4"><b>Action Plan</b><p className="mt-1 leading-7">{plan}</p></div></section>})}
  </>}
 </div>
}
