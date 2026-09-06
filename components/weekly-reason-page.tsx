"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import {exportReportPdf} from "@/lib/dashboard-export";

const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const num=new Intl.NumberFormat("id-ID");
const pct=(v:number)=>`${new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(v)}%`;

type Agg={qty:number;amount:number};
type Analysis={review:string;actionPlan:string;target:number;achievement:number;gap:number};
type Weekly={
  labelA:string;labelB:string;periodA:{start:string;end:string};periodB:{start:string;end:string};availableWeeks:string[];
  a:{scheme:Record<string,Agg>;lob:Record<string,Record<string,Agg>>};
  b:{scheme:Record<string,Agg>;lob:Record<string,Record<string,Agg>>};
  analysis:Record<string,Analysis>;feedbackSummary:string;targets:{lob:Record<string,number>};error?:string;
};
type MetricsSide={label:string;period:{start:string;end:string};traffic:number;transactions:number;qty:number;upt:number;sales:number};
type ProductCompare={article:string;description:string;type:string;lob:string;prevQty:number;currQty:number;stockQty:number};
type Metrics={a:MetricsSide;b:MetricsSide;products:ProductCompare[];error?:string};
type SavedSnapshot={data?:Weekly;weekly?:Weekly};

const lobOrder:[string,string,string][]=[
  ["AIRPODS","AIRPODS","pcs"],
  ["APPLE WATCH","APPLE WATCH","unit"],
  ["IPAD","IPAD","unit"],
  ["IPHONE","IPHONE","unit"],
  ["MAC","MAC","unit"],
];

function total(values:Record<string,Agg>={}){
  return Object.values(values).reduce((a,r)=>({qty:a.qty+(r.qty||0),amount:a.amount+(r.amount||0)}),{qty:0,amount:0});
}
function rank(label:string){const m=label.match(/Week\s*(\d+)\s*Q(\d+)/i);return Number(m?.[2]||0)*100+Number(m?.[1]||0)}
function previousWeek(weeks:string[],week:string){const sorted=[...weeks].sort((a,b)=>rank(a)-rank(b)),i=sorted.indexOf(week);return i>0?sorted[i-1]:(sorted[0]||week)}
function growth(a:number,b:number){return a?((b-a)/a)*100:0}
function cleanReason(text:string){
  return String(text||"")
    .replace(/\bSOH\b/gi,"stok")
    .replace(/sumber\s+stok[^.]*\.?/gi,"")
    .replace(/dashboard[^.]*\.?/gi,"")
    .replace(/\s+/g," ")
    .trim();
}
function planItems(key:string,review:string,feedback:string){
  const text=`${review} ${feedback}`.toLowerCase();
  const out:string[]=[];
  if(key==="AIRPODS")out.push("Konsisten jalankan AirPods Try On dan voucher Rp250 ribu.","Tetap push AirPods di setiap pembelian iPhone dan device Apple.");
  else if(key==="MAC")out.push("Konsisten lakukan MacBook Try On dan voucher Rp600 ribu.","Demo MacBook sesuai kebutuhan customer dan follow up opportunity yang masih pending.");
  else if(key==="IPAD")out.push("Konsisten lakukan iPad Try On dan voucher Rp600 ribu.","Maksimalkan attachment Apple Pencil atau keyboard sesuai kebutuhan customer.");
  else if(key==="IPHONE")out.push("Maksimalkan setiap customer yang masuk untuk closing.","Push alternatif kapasitas atau warna yang ready dan follow up customer yang belum closing.");
  else out.push("Maksimalkan demo fitur Apple Watch sesuai kebutuhan customer.","Alihkan ke ukuran atau series lain jika sesuai kebutuhan customer.");
  if(/stok|stock|kosong|tidak tersedia|keterbatasan/.test(text))out.push("Konsolidasi antar store lebih awal untuk tipe atau varian yang banyak dicari.");
  if(/harga|budget|compare|kompetitor|promo|diskon/.test(text))out.push("Maksimalkan promo aktif dan opsi BNPL pada customer yang masih compare.");
  if(/follow|belum closing|menunggu/.test(text))out.push("Follow up kembali customer yang masih pending sampai ada keputusan.");
  if(/traffic|sepi|opportunity/.test(text))out.push("Perbaiki produktivitas per staff dan maksimalkan setiap opportunity yang masuk.");
  if(key==="IPHONE"&&/iphone\s*18/.test(text))out.push("Simpan list customer yang menunggu iPhone 18 dan lakukan follow up berkala.");
  return [...new Set(out)].slice(0,5);
}
function topDrops(products:ProductCompare[],lob:string){
  return products.filter(p=>p.lob===lob&&p.prevQty>p.currQty).sort((a,b)=>(b.prevQty-b.currQty)-(a.prevQty-a.currQty)).slice(0,3);
}
function potentialLost(products:ProductCompare[],lob:string){return topDrops(products,lob).filter(p=>p.stockQty<=0).slice(0,3)}

export default function WeeklyReasonPage(){
  const reportRef=useRef<HTMLDivElement>(null);
  const[weeks,setWeeks]=useState<string[]>([]),[selected,setSelected]=useState("");
  const[data,setData]=useState<Weekly|null>(null),[metrics,setMetrics]=useState<Metrics|null>(null);
  const[loading,setLoading]=useState(true),[error,setError]=useState(""),[shareBusy,setShareBusy]=useState(""),[source,setSource]=useState<"saved"|"generated"|"">("");

  const load=useCallback(async(week:string,force=false,knownWeeks?:string[])=>{
    if(!week)return;
    setLoading(true);setError("");
    try{
      const list=knownWeeks||weeks,compare=previousWeek(list,week);
      let weekly:Weekly|null=null;
      if(!force){
        const saved=await fetch(`/api/weekly-reason-snapshot?week=${encodeURIComponent(week)}`,{cache:"no-store"}).then(r=>r.json());
        const snap=saved?.snapshot as SavedSnapshot|undefined;
        weekly=snap?.data||snap?.weekly||null;
        if(weekly)setSource("saved");
      }
      if(!weekly){
        weekly=await fetch(`/api/weekly?from=${encodeURIComponent(compare)}&to=${encodeURIComponent(week)}`,{cache:"no-store"}).then(r=>r.json()) as Weekly;
        if(weekly.error)throw new Error(weekly.error);
        setSource("generated");
        const save=await fetch("/api/weekly-reason-snapshot",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({week:weekly.labelB,compareWeek:weekly.labelA,snapshot:{data:weekly}})});
        if(!save.ok)throw new Error("Reason berhasil dibuat tetapi gagal disimpan.");
      }
      const live=await fetch(`/api/weekly-reason-metrics?from=${encodeURIComponent(compare)}&to=${encodeURIComponent(week)}`,{cache:"no-store"}).then(r=>r.json()) as Metrics;
      if(live.error)throw new Error(live.error);
      setData(weekly);setMetrics(live);
    }catch(e){setError(e instanceof Error?e.message:"Gagal membuka Weekly Reason")}
    finally{setLoading(false)}
  },[weeks]);

  useEffect(()=>{void(async()=>{try{const w=await fetch("/api/weekly",{cache:"no-store"}).then(r=>r.json()) as Weekly;if(w.error)throw new Error(w.error);const list=[...(w.availableWeeks||[])].sort((a,b)=>rank(a)-rank(b));setWeeks(list);const latest=w.labelB||list[list.length-1]||"";setSelected(latest);if(latest)await load(latest,false,list)}catch(e){setError(e instanceof Error?e.message:"Gagal membuka Weekly Reason");setLoading(false)}})()},[]);

  const changeWeek=(week:string)=>{setSelected(week);void load(week,false)};
  const salesA=total(data?.a?.scheme),salesB=total(data?.b?.scheme),salesGrowth=growth(salesA.amount,salesB.amount);
  const cvrA=metrics?.a?.traffic?metrics.a.transactions/metrics.a.traffic*100:0,cvrB=metrics?.b?.traffic?metrics.b.transactions/metrics.b.traffic*100:0;
  const trafficGrowth=growth(metrics?.a?.traffic||0,metrics?.b?.traffic||0);

  const reportText=()=>{
    if(!data||!metrics)return"";
    const lines:string[]=[
      `*M238 DIGIMAP PIM 2*`,`*${data.labelB.toUpperCase()}*`,"",
      `Penjualan ${data.labelB} sebesar *${money.format(salesB.amount)}*, ${salesGrowth>=0?"naik":"turun"} *${salesGrowth>=0?"+":"-"}${pct(Math.abs(salesGrowth))}* dibanding ${data.labelA} sebesar *${money.format(salesA.amount)}*.`,"",
      `*Traffic & Conversion*`,`*${data.labelA}*`,`• Traffic ${num.format(metrics.a.traffic)}`,`• ${num.format(metrics.a.transactions)} transaksi`,`• CVR ${pct(cvrA)}`,`• UPT ${metrics.a.upt.toFixed(1).replace(".",",")}`,"",
      `*${data.labelB}*`,`• Traffic ${num.format(metrics.b.traffic)}`,`• ${num.format(metrics.b.transactions)} transaksi`,`• CVR ${pct(cvrB)}`,`• UPT ${metrics.b.upt.toFixed(1).replace(".",",")}`,"",
      `*Feedback*`,data.feedbackSummary||"Belum ada feedback team untuk week ini.",
    ];
    for(const [key,label,unit] of lobOrder){
      const a=total(data.a?.lob?.[key]),b=total(data.b?.lob?.[key]),g=growth(a.qty,b.qty),an=data.analysis?.[key],review=cleanReason(an?.review||""),plans=planItems(key,review,data.feedbackSummary||""),lost=potentialLost(metrics.products||[],key);
      lines.push("",`*LOB ${label}*`,`${label==="MAC"?"Mac":label[0]+label.slice(1).toLowerCase()} week ini ${g>=0?"mengalami kenaikan":"mengalami penurunan"} *${g>=0?"+":"-"}${pct(Math.abs(g))}* dengan total penjualan *${num.format(b.qty)} ${unit}*.`,"",`*${data.labelA}*`,`• ${num.format(a.qty)} ${unit}`,`• ${money.format(a.amount)}`,"",`*${data.labelB}*`,`• ${num.format(b.qty)} ${unit}`,`• ${money.format(b.amount)}`,"",`*Feedback*`,review||"Pergerakan penjualan mengikuti mix product dan opportunity customer week ini.","",`*Achievement*`,an?.target?`• ${num.format(b.qty)} ${unit} vs target ${num.format(an.target)} ${unit} (${an.gap>=0?"plus":"minus"} ${num.format(Math.abs(an.gap))} ${unit})`:`• Target belum tersedia`);
      if(lost.length)lines.push("",`*Lost Sales*`,...lost.map(x=>`• ${x.description||x.type||x.article}`));
      lines.push("",`*Action Plan*`,...plans.map(x=>`• ${x}`));
    }
    lines.push("",`_Traffic growth ${trafficGrowth>=0?"+":""}${pct(trafficGrowth)}._`);
    return lines.join("\n");
  };

  const downloadPdf=async()=>{if(!data||!reportRef.current)return;setShareBusy("PDF");try{await exportReportPdf(reportRef.current,`M238-Weekly-Reason-${data.labelB}`)}finally{setShareBusy("")}};
  const shareText=async()=>{const text=reportText();if(!text)return;setShareBusy("TEXT");try{if(navigator.share)await navigator.share({title:`M238 Weekly Reason ${data?.labelB||""}`,text});else{await navigator.clipboard.writeText(text);window.alert("Weekly Reason sudah disalin.")}}catch(e){if((e as Error)?.name!=="AbortError")throw e}finally{setShareBusy("")}};
  const shareWhatsapp=()=>{const text=reportText();if(!text)return;window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank","noopener,noreferrer")};

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">M238 Reporting</p><h1 className="mt-1 text-3xl font-black">Weekly Reason</h1><p className="mt-1 text-sm text-slate-500">Format reason dibuat seperti weekly report store dan tersimpan per week.</p></div>{data&&<div className="export-hide flex flex-wrap gap-2"><button onClick={()=>void downloadPdf()} disabled={Boolean(shareBusy)} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white">{shareBusy==="PDF"?"Membuat PDF...":"Unduh PDF"}</button><button onClick={()=>void shareText()} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-black text-slate-800 shadow-sm">Share Text</button><button onClick={shareWhatsapp} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white">Share WhatsApp</button></div>}</div>

    <section className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950"><div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><label><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">Pilih Week</span><select value={selected} onChange={e=>changeWeek(e.target.value)} className="h-11 w-full rounded-xl border bg-white px-3 dark:bg-slate-900">{weeks.map(x=><option key={x}>{x}</option>)}</select></label><div className="rounded-xl border bg-slate-50 px-4 py-2 dark:bg-slate-900"><span className="text-xs font-black uppercase tracking-wide text-slate-400">Compare</span><p className="mt-1 font-black">{selected?previousWeek(weeks,selected):"—"}</p></div><button onClick={()=>void load(selected,true)} disabled={loading||!selected} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{loading?"Memuat…":"Update Reason"}</button></div>{source&&<p className="mt-3 text-xs text-slate-500">{source==="saved"?"Reason week ini tersimpan. Angka performa tetap mengikuti data terbaru.":"Reason terbaru sudah dibuat dan disimpan."}</p>}</section>

    {error&&<div className="rounded-2xl bg-rose-50 p-4 font-bold text-rose-700">{error}</div>}
    {loading&&!data&&<div className="rounded-2xl border bg-white p-8 text-center text-slate-500">Memuat Weekly Reason…</div>}

    {data&&metrics&&<div ref={reportRef} className="space-y-5 bg-slate-50 p-1 dark:bg-slate-900">
      <section className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-950"><h2 className="text-xl font-black">M238 DIGIMAP PIM 2</h2><h3 className="mt-1 text-lg font-black">{data.labelB}</h3><p className="mt-4 leading-7">Penjualan {data.labelB} sebesar <b>{money.format(salesB.amount)}</b>, {salesGrowth>=0?"naik":"turun"} <b>{salesGrowth>=0?"+":"-"}{pct(Math.abs(salesGrowth))}</b> dibanding {data.labelA} sebesar <b>{money.format(salesA.amount)}</b>.</p></section>
      <section className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-950"><h3 className="text-lg font-black">Traffic & Conversion</h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><b>{data.labelA}</b><p>Traffic {num.format(metrics.a.traffic)}</p><p>{num.format(metrics.a.transactions)} transaksi</p><p>CVR {pct(cvrA)}</p><p>UPT {metrics.a.upt.toFixed(1)}</p></div><div><b>{data.labelB}</b><p>Traffic {num.format(metrics.b.traffic)}</p><p>{num.format(metrics.b.transactions)} transaksi</p><p>CVR {pct(cvrB)}</p><p>UPT {metrics.b.upt.toFixed(1)}</p></div></div></section>
      <section className="rounded-2xl border bg-blue-50/60 p-5 dark:bg-blue-950/20"><h3 className="font-black">Feedback</h3><p className="mt-2 leading-7">{data.feedbackSummary||"Belum ada feedback team untuk week ini."}</p></section>
      {lobOrder.map(([key,label,unit])=>{const a=total(data.a?.lob?.[key]),b=total(data.b?.lob?.[key]),g=growth(a.qty,b.qty),an=data.analysis?.[key],review=cleanReason(an?.review||""),plans=planItems(key,review,data.feedbackSummary||""),lost=potentialLost(metrics.products||[],key);return <section key={key} className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-950"><h3 className="text-lg font-black">LOB {label}</h3><p className="mt-3 leading-7">{label==="MAC"?"Mac":label[0]+label.slice(1).toLowerCase()} week ini {g>=0?"mengalami kenaikan":"mengalami penurunan"} <b>{g>=0?"+":"-"}{pct(Math.abs(g))}</b> dengan total penjualan <b>{num.format(b.qty)} {unit}</b>.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><div><b>{data.labelA}</b><p>{num.format(a.qty)} {unit}</p><p>{money.format(a.amount)}</p></div><div><b>{data.labelB}</b><p>{num.format(b.qty)} {unit}</p><p>{money.format(b.amount)}</p></div></div><div className="mt-4"><b>Feedback</b><p className="mt-1 leading-7">{review||"Pergerakan penjualan mengikuti mix product dan opportunity customer week ini."}</p></div><div className="mt-4"><b>Achievement</b><p className={an?.target&&an.gap<0?"text-rose-600":"text-emerald-600"}>{an?.target?`${num.format(b.qty)} ${unit} vs target ${num.format(an.target)} ${unit} • ${an.gap>=0?"Plus":"Minus"} ${num.format(Math.abs(an.gap))} ${unit}`:"Target belum tersedia"}</p></div>{lost.length>0&&<div className="mt-4"><b>Lost Sales</b><ul className="mt-1 list-disc space-y-1 pl-5">{lost.map(x=><li key={`${key}-${x.article}`}>{x.description||x.type||x.article}</li>)}</ul></div>}<div className="mt-4"><b>Action Plan</b><ul className="mt-1 list-disc space-y-1 pl-5">{plans.map((p,i)=><li key={i}>{p}</li>)}</ul></div></section>})}
    </div>}
  </div>
}
