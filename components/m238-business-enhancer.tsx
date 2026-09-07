"use client";

import {useEffect,useMemo,useState} from "react";
import {createPortal} from "react-dom";

const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const num=new Intl.NumberFormat("id-ID");
const pct=(v:number)=>`${new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(v)}%`;
const monthNames=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

type CorePayload={period:string;target:{amount:number;device:number;accessories:number;vas:number};summary:{amount:number;device:number;accessories:number;vas:number;estimate:number;invoices:number;qty:number};monthlyStaff:Array<{id:string;name:string;lob:{iphone:number;mac:number;ipad:number;watch:number;airpods:number};vasDetail:{qoala:{qty:number;value:number};telkomsel:{qty:number;value:number};xl:{qty:number;value:number};indosat:{qty:number;value:number}}}>};
type NpsPayload={nps:number;month?:string};
type YearRow={period:string;amount:number;device:number;accessories:number;vas:number;qty:number;invoices:number;upt:number};
type YearPayload={years:{"2025":YearRow[];"2026":YearRow[]};totals:Record<string,{amount:number;device:number;accessories:number;vas:number;qty:number;invoices:number}>};
type DailyLob={date:string;staff:Array<{id:string;name:string;amount:number;qty:number;lob:Record<string,{qty:number;value:number}>}>};

function selectedPeriod(){
  const labels=Array.from(document.querySelectorAll("label"));
  const lbl=labels.find(x=>(x.textContent||"").toLowerCase().includes("filter bulan"));
  const sel=lbl?.querySelector("select") as HTMLSelectElement|null;
  if(sel&&/^2026-\d{2}$/.test(sel.value))return sel.value;
  const any=Array.from(document.querySelectorAll("select")).find(x=>/^2026-\d{2}$/.test((x as HTMLSelectElement).value)) as HTMLSelectElement|undefined;
  return any?.value||"2026-09";
}
function headingExact(text:string){return Array.from(document.querySelectorAll("h1,h2,h3")).find(x=>(x.textContent||"").trim()===text) as HTMLElement|undefined}
function sectionForHeading(text:string){const h=headingExact(text);return (h?.closest("section")||h?.closest("div.space-y-5")||h?.parentElement) as HTMLElement|null}
function qv(x?:{qty:number;value:number}){return `${num.format(x?.qty||0)} / ${money.format(x?.value||0)}`}

function OverviewCards({period}:{period:string}){
 const[data,setData]=useState<CorePayload|null>(null),[nps,setNps]=useState<NpsPayload|null>(null);
 useEffect(()=>{let off=false;Promise.all([fetch(`/api/data?period=${period}`,{cache:"no-store"}).then(r=>r.json()),fetch(`/api/nps?period=${period}`,{cache:"no-store"}).then(r=>r.json())]).then(([a,b])=>{if(!off){setData(a);setNps(b)}});return()=>{off=true}},[period]);
 if(!data)return <div className="rounded-2xl border bg-white p-5 text-sm text-slate-400">Memuat Overview…</div>;
 const t=data.target.amount||0,a=data.summary.amount||0,ach=t?a/t*100:0,est=data.summary.estimate||0,gap=est-t;
 return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
  <article className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">Target MTD</p><p className="mt-2 text-xl font-black">{money.format(t)}</p><p className="mt-1 text-xs text-slate-500">Achievement {pct(ach)}</p></article>
  <article className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">Achievement</p><p className="mt-2 text-xl font-black">{money.format(a)}</p><p className={`mt-1 text-xs font-bold ${a>=t?"text-emerald-600":"text-rose-600"}`}>{a>=t?"+":""}{money.format(a-t)} vs target</p></article>
  <article className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">Estimasi End Month</p><p className="mt-2 text-xl font-black">{money.format(est)}</p><p className={`mt-1 text-xs font-bold ${gap>=0?"text-emerald-600":"text-rose-600"}`}>{gap>=0?"+":""}{money.format(gap)} vs target</p></article>
  <article className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">NPS</p><p className="mt-2 text-xl font-black">{nps?.nps?`${new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(nps.nps)}`:"Belum tersedia"}</p><p className="mt-1 text-xs text-slate-500">{nps?.month||period}</p></article>
 </div>
}

function YearDetail(){
 const[data,setData]=useState<YearPayload|null>(null),[tab,setTab]=useState<"2025"|"2026"|"compare">("compare");
 useEffect(()=>{fetch("/api/year-detail",{cache:"no-store"}).then(r=>r.json()).then(setData)},[]);
 const rows=tab==="compare"?[]:(data?.years?.[tab]||[]);
 return <section className="rounded-2xl border bg-white p-4 shadow-sm">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-lg font-black">Detail Revenue & Achievement</h3><p className="mt-1 text-sm text-slate-500">Lihat detail penjualan per tahun atau compare 2025 vs 2026.</p></div><div className="flex gap-2">{(["2025","2026","compare"] as const).map(x=><button key={x} onClick={()=>setTab(x)} className={`rounded-xl px-3 py-2 text-xs font-black ${tab===x?"bg-blue-600 text-white":"bg-slate-100 text-slate-600"}`}>{x==="compare"?"2025 vs 2026":x}</button>)}</div></div>
  {!data?<div className="py-8 text-center text-sm text-slate-400">Memuat detail tahunan…</div>:tab==="compare"?<div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr>{["Bulan","2025","2026","Selisih","Growth"].map(x=><th key={x} className="px-3 py-3 text-left text-xs font-bold text-slate-500">{x}</th>)}</tr></thead><tbody>{data.years["2026"].map((r,i)=>{const p=data.years["2025"][i],diff=r.amount-p.amount,g=p.amount?diff/p.amount*100:0;return <tr key={r.period} className="border-t"><td className="px-3 py-3 font-bold">{monthNames[i]}</td><td className="px-3 py-3">{money.format(p.amount)}</td><td className="px-3 py-3">{money.format(r.amount)}</td><td className={`px-3 py-3 font-bold ${diff>=0?"text-emerald-600":"text-rose-600"}`}>{money.format(diff)}</td><td className={`px-3 py-3 font-black ${g>=0?"text-emerald-600":"text-rose-600"}`}>{g>=0?"↑ ":"↓ "}{pct(Math.abs(g))}</td></tr>})}</tbody></table></div>:<div className="mt-4 overflow-x-auto"><table className="min-w-[900px] text-sm"><thead><tr>{["Bulan","Sales","Device","ACC","VAS","Qty","Transaksi","UPT"].map(x=><th key={x} className="px-3 py-3 text-left text-xs font-bold text-slate-500">{x}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.period} className="border-t"><td className="px-3 py-3 font-bold">{monthNames[i]}</td><td className="px-3 py-3 font-bold">{money.format(r.amount)}</td><td className="px-3 py-3">{money.format(r.device)}</td><td className="px-3 py-3">{money.format(r.accessories)}</td><td className="px-3 py-3">{money.format(r.vas)}</td><td className="px-3 py-3">{num.format(r.qty)}</td><td className="px-3 py-3">{num.format(r.invoices)}</td><td className="px-3 py-3">{r.upt.toFixed(1)}</td></tr>)}</tbody></table></div>}
 </section>
}

function BusinessEnhancerBody(){
 const[period,setPeriod]=useState(selectedPeriod()),[overviewHost,setOverviewHost]=useState<HTMLElement|null>(null),[yearHost,setYearHost]=useState<HTMLElement|null>(null),[daily,setDaily]=useState<DailyLob|null>(null);
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|null=null;
  const sync=()=>{
   if(timer)clearTimeout(timer);timer=setTimeout(()=>{
    const p=selectedPeriod();setPeriod(p);
    const salesOverview=Array.from(document.querySelectorAll("h2,h3")).find(h=>(h.textContent||"").includes("Sales Overview")) as HTMLElement|undefined;if(salesOverview)salesOverview.textContent="M238 Sales Overview";
    if(salesOverview){const sec=salesOverview.closest("section")||salesOverview.parentElement?.parentElement; if(sec){let host=sec.querySelector("[data-m238-overview-business]") as HTMLElement|null;if(!host){host=document.createElement("div");host.dataset.m238OverviewBusiness="1";host.className="mt-4";sec.appendChild(host)}setOverviewHost(host)}}
    const revenue=headingExact("Revenue Analytics");if(revenue){const sec=(revenue.closest("section")||revenue.parentElement?.parentElement) as HTMLElement|null;if(sec){let host=sec.parentElement?.querySelector(":scope > [data-m238-year-detail]") as HTMLElement|null;if(!host){host=document.createElement("div");host.dataset.m238YearDetail="1";host.className="mt-5";sec.insertAdjacentElement("afterend",host)}setYearHost(host)}}
    const pf=Array.from(document.querySelectorAll("h2,h3")).find(h=>(h.textContent||"").trim()==="Product Focus Achievement • All Staff") as HTMLElement|undefined;if(pf){const sec=pf.closest("section")||pf.parentElement?.parentElement;if(sec)(sec as HTMLElement).style.display="none"}
    void enhanceDaily();void enhanceStaff();
   },80)
  };
  const enhanceDaily=async()=>{
   const h=headingExact("Daily Sales");if(!h)return;const root=h.closest("div.space-y-5")||h.parentElement?.parentElement;if(!root)return;
   const dateText=(root.textContent||"").match(/20\d{2}-\d{2}-\d{2}/)?.[0];if(!dateText)return;
   const j=await fetch(`/api/daily-lob-detail?date=${dateText}`,{cache:"no-store"}).then(r=>r.json()).catch(()=>null) as DailyLob|null;if(!j?.staff)return;setDaily(j);const byName=new Map(j.staff.map(x=>[x.name.trim().toUpperCase(),x]));
   for(const table of Array.from(root.querySelectorAll("table"))){const heads=Array.from(table.querySelectorAll("thead th")).map(x=>(x.textContent||"").trim());
    if(heads.includes("Achievement")){const idx=heads.indexOf("Achievement");for(const tr of Array.from(table.querySelectorAll("tbody tr"))){const c=Array.from(tr.querySelectorAll("td"));const r=byName.get((c[0]?.textContent||"").trim().toUpperCase());if(r&&c[idx])c[idx].textContent=`${num.format(r.qty)} / ${money.format(r.amount)}`}}
    if(heads.some(x=>x.includes("iPhone"))&&heads.some(x=>x.includes("AirPods"))){const mapKeys:[string,string][]=[["iPhone","iphone"],["MacBook","mac"],["iPad","ipad"],["Watch","watch"],["AirPods","airpods"]];for(const [label,key] of mapKeys){const ix=heads.findIndex(x=>x.includes(label));if(ix>0){const th=table.querySelectorAll("thead th")[ix];th.textContent=`${label} Qty / Value`;for(const tr of Array.from(table.querySelectorAll("tbody tr"))){const c=Array.from(tr.querySelectorAll("td"));const r=byName.get((c[0]?.textContent||"").trim().toUpperCase());if(r&&c[ix])c[ix].textContent=qv(r.lob[key])}}}}
   }
  };
  const enhanceStaff=async()=>{
   const h=headingExact("Staff Performance");if(!h)return;const root=h.closest("div.space-y-5")||h.parentElement?.parentElement;if(!root)return;const j=await fetch(`/api/data?period=${selectedPeriod()}`,{cache:"no-store"}).then(r=>r.json()).catch(()=>null) as CorePayload|null;if(!j?.monthlyStaff)return;const map=new Map(j.monthlyStaff.map(x=>[x.name.trim().toUpperCase(),x]));
   for(const table of Array.from(root.querySelectorAll("table"))){const heads=Array.from(table.querySelectorAll("thead th")).map(x=>(x.textContent||"").trim());
    if(heads.some(x=>x.includes("iPhone"))&&heads.some(x=>x.includes("Watch"))){const ks:[string,"iphone"|"mac"|"ipad"|"watch"|"airpods"][]=[["iPhone","iphone"],["Mac","mac"],["iPad","ipad"],["Watch","watch"],["AirPods","airpods"]];for(const [label,key] of ks){const ix=heads.findIndex(x=>x.includes(label));if(ix<1)continue;for(const tr of Array.from(table.querySelectorAll("tbody tr"))){const c=Array.from(tr.querySelectorAll("td"));const r=map.get((c[0]?.textContent||"").trim().toUpperCase());if(r&&c[ix])c[ix].textContent=num.format(r.lob[key]||0)}}}
    if(heads.some(x=>x.toLowerCase().includes("qoala"))&&heads.some(x=>x.toLowerCase().includes("telkomsel"))){for(const [label,key] of [["Qoala","qoala"],["Telkomsel","telkomsel"],["XL","xl"],["Indosat","indosat"]] as const){const ix=heads.findIndex(x=>x.toLowerCase().includes(label.toLowerCase()));if(ix<1)continue;const th=table.querySelectorAll("thead th")[ix];th.textContent=`${label} Qty / Value`;for(const tr of Array.from(table.querySelectorAll("tbody tr"))){const c=Array.from(tr.querySelectorAll("td"));const r=map.get((c[0]?.textContent||"").trim().toUpperCase());if(r&&c[ix])c[ix].textContent=qv(r.vasDetail[key])}}}
   }
  };
  sync();const mo=new MutationObserver(sync);mo.observe(document.body,{childList:true,subtree:true});document.addEventListener("change",sync,true);return()=>{mo.disconnect();document.removeEventListener("change",sync,true);if(timer)clearTimeout(timer)}
 },[]);
 return <>{overviewHost&&createPortal(<OverviewCards period={period}/>,overviewHost)}{yearHost&&createPortal(<YearDetail/>,yearHost)}</>
}

export default function M238BusinessEnhancer(){return <BusinessEnhancerBody/>}
