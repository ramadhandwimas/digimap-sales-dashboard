"use client";

import {useEffect,useState} from "react";
import {createPortal} from "react-dom";

const pct=new Intl.NumberFormat("id-ID",{maximumFractionDigits:1});
const today=()=>new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());
const displayDate=(date:string)=>new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short",year:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date(`${date}T00:00:00Z`));
type Traffic={date:string;traffic:number};

export default function CvrEnhancer(){
 const[period,setPeriod]=useState(today().slice(0,7)),[overviewHost,setOverviewHost]=useState<HTMLElement|null>(null),[overviewCvr,setOverviewCvr]=useState(0),[overviewTraffic,setOverviewTraffic]=useState(0);

 useEffect(()=>{
  const sync=()=>{
   const label=[...document.querySelectorAll("label")].find(x=>x.querySelector("span")?.textContent?.trim()==="Filter Bulan"),select=label?.querySelector("select") as HTMLSelectElement|null;
   if(select?.value&&select.value!==period)setPeriod(select.value);
   if(select&&!select.dataset.cvrBound){select.dataset.cvrBound="1";select.addEventListener("change",()=>setPeriod(select.value))}
   const h=[...document.querySelectorAll("h2")].find(x=>x.textContent?.trim()==="M238 Sales Overview"),hero=h?.closest("section") as HTMLElement|null,grid=hero?.querySelector(".grid.grid-cols-2.gap-2\\.5") as HTMLElement|null;
   if(grid){let host=grid.querySelector("[data-overview-cvr]") as HTMLElement|null;if(!host){host=document.createElement("div");host.dataset.overviewCvr="1";grid.appendChild(host)}if(host!==overviewHost)setOverviewHost(host)}
  };
  sync();const obs=new MutationObserver(sync);obs.observe(document.body,{childList:true,subtree:true});return()=>obs.disconnect();
 },[period,overviewHost]);

 useEffect(()=>{
  let alive=true;const from=`${period}-01`,to=period===today().slice(0,7)?today():`${period}-${String(new Date(Number(period.slice(0,4)),Number(period.slice(5,7)),0).getDate()).padStart(2,"0")}`;
  Promise.all([fetch(`/api/traffic?from=${from}&to=${to}`,{cache:"no-store"}).then(r=>r.json()),fetch(`/api/data?period=${period}`,{cache:"no-store"}).then(r=>r.json())]).then(([tr,d])=>{if(!alive)return;const traffic=Number(tr.total||0),inv=Number(d?.summary?.invoices||0);setOverviewTraffic(traffic);setOverviewCvr(traffic?inv/traffic*100:0)}).catch(()=>{});return()=>{alive=false}
 },[period]);

 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|null=null;
  const apply=async()=>{
   const heading=[...document.querySelectorAll("h3")].find(x=>x.textContent?.trim()==="Daily Sales Store"),section=heading?.closest("section") as HTMLElement|null;if(!section)return;
   const labels=[...document.querySelectorAll("label")],fromInput=labels.find(x=>x.querySelector("span")?.textContent?.trim()==="Dari Tanggal")?.querySelector("input") as HTMLInputElement|null,toInput=labels.find(x=>x.querySelector("span")?.textContent?.trim()==="Sampai Tanggal")?.querySelector("input") as HTMLInputElement|null;if(!fromInput||!toInput)return;
   const from=fromInput.value,to=toInput.value;if(!from||!to)return;
   try{const tr=await fetch(`/api/traffic?from=${from}&to=${to}&t=${Date.now()}`,{cache:"no-store"}).then(r=>r.json()),map=new Map<string,number>((tr.daily||[]).map((x:Traffic)=>[displayDate(x.date),Number(x.traffic||0)]));
    const table=section.querySelector("table");if(!table)return;const header=[...table.querySelectorAll("thead th")],uptIndex=header.findIndex(x=>x.textContent?.trim()==="UPT");if(uptIndex<0)return;
    let cvrTh=header.find(x=>x.getAttribute("data-cvr-col")==="1") as HTMLElement|undefined;if(!cvrTh){cvrTh=document.createElement("th");cvrTh.dataset.cvrCol="1";cvrTh.className="h-10 px-2 text-right align-middle font-medium text-muted-foreground";cvrTh.textContent="CVR";header[uptIndex].insertAdjacentElement("afterend",cvrTh)}
    for(const row of table.querySelectorAll("tbody tr")){if(row.querySelector("[data-cvr-cell]"))continue;const cells=[...row.querySelectorAll("td")] as HTMLElement[];if(cells.length<8)continue;const label=(cells[0].textContent||"").trim(),isTotal=label==="TOTAL",traffic=isTotal?Number(tr.total||0):Number(map.get(label)||0),invoice=Number((cells[6].textContent||"0").replace(/[^0-9-]/g,""))||0,cvr=traffic?invoice/traffic*100:0,cell=document.createElement("td");cell.dataset.cvrCell="1";cell.className="p-2 align-middle text-right font-bold";cell.textContent=`${pct.format(cvr)}%`;cells[8].insertAdjacentElement("beforebegin",cell)}
    let badge=section.parentElement?.querySelector("[data-daily-summary-cvr]") as HTMLElement|null;if(!badge){const hero=[...document.querySelectorAll("h2")].find(x=>x.textContent?.trim()==="Daily Sales Store")?.closest("section") as HTMLElement|null;if(hero){badge=document.createElement("div");badge.dataset.dailySummaryCvr="1";badge.className="mt-3 inline-flex rounded-xl bg-white/15 px-3 py-2 text-sm font-black text-white";hero.querySelector("h2")?.parentElement?.appendChild(badge)}}if(badge){const totalInv=[...table.querySelectorAll("tbody tr")].find(r=>r.querySelector("td")?.textContent?.trim()==="TOTAL")?.querySelectorAll("td")[6]?.textContent||"0",inv=Number(totalInv.replace(/[^0-9-]/g,""))||0;badge.textContent=`CVR ${Number(tr.total||0)?pct.format(inv/Number(tr.total)*100):"0"}% • Traffic ${new Intl.NumberFormat("id-ID").format(Number(tr.total||0))}`}
   }catch{}
  };
  const schedule=()=>{if(timer)clearTimeout(timer);timer=setTimeout(()=>void apply(),120)};schedule();const obs=new MutationObserver(schedule);obs.observe(document.body,{childList:true,subtree:true});document.addEventListener("change",schedule,true);return()=>{obs.disconnect();document.removeEventListener("change",schedule,true);if(timer)clearTimeout(timer)}
 },[]);

 return overviewHost?createPortal(<div className="min-w-0 rounded-2xl border border-white/20 bg-white/10 p-3"><p className="text-[11px] text-blue-100">CVR</p><p className="mt-1 text-lg font-black">{pct.format(overviewCvr)}%</p><p className="mt-2 border-t border-white/15 pt-2 text-[11px] text-blue-100">Traffic {new Intl.NumberFormat("id-ID").format(overviewTraffic)}</p></div>,overviewHost):null;
}
