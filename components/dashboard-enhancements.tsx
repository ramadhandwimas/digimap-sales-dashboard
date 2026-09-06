"use client";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Clock3, TrendingDown, TrendingUp } from "lucide-react";

type AnnualRow = { period: string; label: string; amount: number };
type AnnualData = {lastYear: AnnualRow[];thisYear: AnnualRow[];lastYearTotal: number;thisYearTotal: number};
type SalesUpdate = { generatedAt: string; latestDate: string };
type OverviewData = {
 target:{amount:number;device:number;accessories:number;vas:number};
 summary:{amount:number;device:number;accessories:number;vas:number};
 annual:AnnualData;
 generatedAt:string;latestDate:string;
};
type CompareData={period:string;cutoffDay:number;current:number;mtm:number;lfl:number;mtmGrowth:number;lflGrowth:number;previousPeriod:string;lastYearPeriod:string};
const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const pct=new Intl.NumberFormat("id-ID",{maximumFractionDigits:1});
const achievement=(v:number,t:number)=>t?v/t*100:0;
const jakartaDateTime=(v:string)=>v?new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date(v)).replaceAll(".",":"):"—";
const currentPeriod=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit"}).format(new Date()).slice(0,7);

function Growth({value}:{value:number}){const good=value>=0;return <span className={`inline-flex items-center gap-1 font-black ${good?"text-emerald-600":"text-rose-600"}`}>{good?<TrendingUp className="size-4"/>:<TrendingDown className="size-4"/>}{good?"+":""}{pct.format(value)}%</span>}
function CompareCard({label,current,base,growth,sub}:{label:string;current:number;base:number;growth:number;sub:string}){const diff=current-base;return <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950"><p className="text-sm font-extrabold">{label}</p><div className="mt-3 grid grid-cols-2 gap-3"><div><p className="text-[11px] text-slate-400">This Month</p><b className="text-sm">{money.format(current)}</b></div><div><p className="text-[11px] text-slate-400">Compare</p><b className="text-sm">{money.format(base)}</b></div></div><div className="mt-3 flex items-center justify-between gap-3 border-t pt-3 text-xs"><span className={diff>=0?"text-emerald-600":"text-rose-600"}>{diff>=0?"+":""}{money.format(diff)}</span><Growth value={growth}/></div><p className="mt-2 text-[11px] text-slate-400">{sub}</p></div>}
function OverviewHeroCard({label,value,target}:{label:string;value:number;target:number}){const a=achievement(value,target);return <div className="min-w-0 rounded-2xl border border-white/20 bg-white/10 p-3"><p className="text-[11px] text-blue-100">{label}</p><p className="mt-1 break-words text-base font-black leading-tight sm:text-lg">{money.format(value)}</p><div className="mt-2 border-t border-white/15 pt-2 text-[11px] text-blue-100"><div className="flex items-center justify-between gap-2"><span>Target {money.format(target)}</span><b className="text-white">{pct.format(a)}%</b></div></div></div>}

export default function DashboardEnhancements(){
 const[period,setPeriod]=useState(currentPeriod()),[salesOverviewTarget,setSalesOverviewTarget]=useState<HTMLElement|null>(null),[revenueTarget,setRevenueTarget]=useState<HTMLElement|null>(null),[yearTarget,setYearTarget]=useState<HTMLElement|null>(null),[salesTarget,setSalesTarget]=useState<HTMLElement|null>(null),[overview,setOverview]=useState<OverviewData|null>(null),[compare,setCompare]=useState<CompareData|null>(null),[salesUpdate,setSalesUpdate]=useState<SalesUpdate|null>(null);
 useEffect(()=>{
  const sync=()=>{
   const labels=[...document.querySelectorAll("label")];
   const monthLabel=labels.find(x=>x.querySelector("span")?.textContent?.trim()==="Filter Bulan");
   const select=monthLabel?.querySelector("select") as HTMLSelectElement|null;
   if(select&&select.value&&select.value!==period)setPeriod(select.value);
   if(select&&!select.dataset.m238EnhanceBound){select.dataset.m238EnhanceBound="1";select.addEventListener("change",()=>setPeriod(select.value))}

   const salesOverviewH2=[...document.querySelectorAll("h2")].find(x=>x.textContent?.trim()==="M238 Sales Overview");
   if(salesOverviewH2){
    const hero=salesOverviewH2.closest("section") as HTMLElement|null;
    const grid=hero?.querySelector(".grid.grid-cols-2.gap-2\\.5") as HTMLElement|null;
    if(grid){
      [...grid.children].forEach(child=>{if(child instanceof HTMLElement && !child.dataset.salesOverviewPortal)child.style.display="none"});
      let host=grid.querySelector("[data-sales-overview-portal]") as HTMLElement|null;
      if(!host){host=document.createElement("div");host.dataset.salesOverviewPortal="1";host.className="contents";grid.appendChild(host)}
      if(host!==salesOverviewTarget)setSalesOverviewTarget(host);
    }
   }

   const heading=[...document.querySelectorAll("h2")].find(x=>x.textContent?.trim()==="Revenue Analytics");
   if(heading){const card=heading.closest(".rounded-2xl");const content=card?.querySelector(":scope > .space-y-6") as HTMLElement|null;if(content){const first=content.firstElementChild as HTMLElement|null;if(first?.className.includes("sm:grid-cols-3"))first.style.display="none";let rh=content.querySelector("[data-revenue-compare]") as HTMLElement|null;if(!rh){rh=document.createElement("div");rh.dataset.revenueCompare="1";content.prepend(rh)}if(rh!==revenueTarget)setRevenueTarget(rh);const old=[...content.querySelectorAll("h3")].filter(x=>x.textContent?.includes("2025")||x.textContent?.includes("2026"));old.forEach(x=>{if(x.parentElement)x.parentElement.style.display="none"});let yh=content.querySelector("[data-year-compare]") as HTMLElement|null;if(!yh){yh=document.createElement("div");yh.dataset.yearCompare="1";content.appendChild(yh)}if(yh!==yearTarget)setYearTarget(yh)}}
   const dailyH1=[...document.querySelectorAll("h1")].find(x=>x.textContent?.trim()==="Daily Sales");if(dailyH1){const parent=dailyH1.parentElement as HTMLElement|null;if(parent){let host=parent.querySelector("[data-sales-update]") as HTMLElement|null;if(!host){host=document.createElement("div");host.dataset.salesUpdate="1";host.className="mt-2";parent.appendChild(host)}if(host!==salesTarget)setSalesTarget(host)}}
  };
  sync();const obs=new MutationObserver(sync);obs.observe(document.body,{childList:true,subtree:true});return()=>obs.disconnect();
 },[salesOverviewTarget,revenueTarget,yearTarget,salesTarget,period]);
 useEffect(()=>{let alive=true;Promise.all([fetch(`/api/data?period=${period}`,{cache:"no-store"}).then(r=>r.json()),fetch(`/api/overview-compare?period=${period}`,{cache:"no-store"}).then(r=>r.json())]).then(([d,c])=>{if(!alive)return;setOverview(d);setCompare(c);if(d.generatedAt)setSalesUpdate({generatedAt:d.generatedAt,latestDate:d.latestDate||""})}).catch(()=>{});return()=>{alive=false}},[period]);
 useEffect(()=>{const load=()=>fetch(`/api/data?period=${currentPeriod()}`,{cache:"no-store"}).then(r=>r.json()).then(j=>{if(j.generatedAt)setSalesUpdate({generatedAt:j.generatedAt,latestDate:j.latestDate||""})}).catch(()=>{});const t=setInterval(load,60000);return()=>clearInterval(t)},[]);
 const annual=overview?.annual||null,pairs=useMemo(()=>{if(!annual)return[];const last=new Map(annual.lastYear.map(x=>[x.period.slice(5,7),x]));return annual.thisYear.map(y=>{const x=last.get(y.period.slice(5,7)),v25=x?.amount??0,v26=y.amount??0;return{label:y.label,v25,v26,diff:v26-v25,growth:v25?(v26-v25)/v25*100:0}})},[annual]);
 const totalGrowth=annual?.lastYearTotal?((annual.thisYearTotal-annual.lastYearTotal)/annual.lastYearTotal)*100:0,totalDiff=(annual?.thisYearTotal??0)-(annual?.lastYearTotal??0),s=overview?.summary,t=overview?.target;
 return <>
  {salesTarget&&createPortal(<div className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-950 dark:text-slate-300"><Clock3 className="size-4 text-blue-600"/><span>Update sales terakhir: <b>{jakartaDateTime(salesUpdate?.generatedAt||"")} WIB</b>{salesUpdate?.latestDate?` • Data ${salesUpdate.latestDate}`:""}</span></div>,salesTarget)}
  {salesOverviewTarget&&createPortal(<><OverviewHeroCard label="MTD Sales" value={s?.amount??0} target={t?.amount??0}/><OverviewHeroCard label="Device" value={s?.device??0} target={t?.device??0}/><OverviewHeroCard label="Accessories" value={s?.accessories??0} target={t?.accessories??0}/><OverviewHeroCard label="VAS" value={s?.vas??0} target={t?.vas??0}/></>,salesOverviewTarget)}
  {revenueTarget&&compare&&createPortal(<div><h3 className="font-extrabold">Revenue Analytics H-1</h3><p className="mt-1 text-sm text-slate-500">This Month dibanding MTM dan LFL sampai tanggal H-1 yang sama.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><CompareCard label="This Month vs MTM" current={compare.current} base={compare.mtm} growth={compare.mtmGrowth} sub={`s/d tanggal ${compare.cutoffDay} • ${compare.previousPeriod}`}/><CompareCard label="This Month vs Last Year" current={compare.current} base={compare.lfl} growth={compare.lflGrowth} sub={`s/d tanggal ${compare.cutoffDay} • ${compare.lastYearPeriod}`}/></div></div>,revenueTarget)}
  {yearTarget&&createPortal(<div className="space-y-4"><div><h3 className="font-extrabold">2025 vs 2026</h3><p className="mt-1 text-sm text-slate-500">Perbandingan revenue per bulan dan growth terhadap bulan yang sama tahun 2025.</p></div><div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[680px] text-sm"><thead className="bg-slate-50 dark:bg-slate-900"><tr><th className="px-3 py-3 text-left">Bulan</th><th className="px-3 py-3 text-right">2025</th><th className="px-3 py-3 text-right">2026</th><th className="px-3 py-3 text-right">Selisih</th><th className="px-3 py-3 text-right">Growth</th></tr></thead><tbody>{pairs.map(r=><tr key={r.label} className="border-t"><td className="px-3 py-3 font-bold">{r.label}</td><td className="px-3 py-3 text-right">{money.format(r.v25)}</td><td className="px-3 py-3 text-right font-bold">{money.format(r.v26)}</td><td className={`px-3 py-3 text-right font-semibold ${r.diff>=0?"text-emerald-600":"text-rose-600"}`}>{r.diff>=0?"+":""}{money.format(r.diff)}</td><td className="px-3 py-3 text-right"><Growth value={r.growth}/></td></tr>)}</tbody><tfoot><tr className="border-t-2 bg-slate-50 font-black dark:bg-slate-900"><td className="px-3 py-3">TOTAL</td><td className="px-3 py-3 text-right">{money.format(annual?.lastYearTotal??0)}</td><td className="px-3 py-3 text-right">{money.format(annual?.thisYearTotal??0)}</td><td className={`px-3 py-3 text-right ${totalDiff>=0?"text-emerald-600":"text-rose-600"}`}>{totalDiff>=0?"+":""}{money.format(totalDiff)}</td><td className="px-3 py-3 text-right"><Growth value={totalGrowth}/></td></tr></tfoot></table></div></div>,yearTarget)}
 </>;
}
