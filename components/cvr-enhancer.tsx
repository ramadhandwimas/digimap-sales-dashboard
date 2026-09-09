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
  let running=false;
  let lastKey="";
  const apply=async()=>{
   if(running)return;
   const heading=[...document.querySelectorAll("h3")].find(x=>x.textContent?.trim()==="Daily Sales Store"),section=heading?.closest("section") as HTMLElement|null;if(!section)return;
   const labels=[...document.querySelectorAll("label")],fromInput=labels.find(x=>x.querySelector("span")?.textContent?.trim()==="Dari Tanggal")?.querySelector("input") as HTMLInputElement|null,toInput=labels.find(x=>x.querySelector("span")?.textContent?.trim()==="Sampai Tanggal")?.querySelector("input") as HTMLInputElement|null;if(!fromInput||!toInput)return;
   const from=fromInput.value,to=toInput.value;if(!from||!to)return;
   const table=section.querySelector("table");if(!table)return;
   const rawHeaders=[...table.querySelectorAll("thead th")] as HTMLElement[];
   const invoiceIndex=rawHeaders.findIndex(x=>x.textContent?.trim()==="Invoice"),uptIndex=rawHeaders.findIndex(x=>x.textContent?.trim()==="UPT");
   if(invoiceIndex<0||uptIndex<0)return;
   const renderKey=`${from}|${to}|${table.querySelectorAll("tbody tr").length}|${invoiceIndex}|${uptIndex}`;
   if(lastKey===renderKey&&table.querySelector('[data-cvr-col="1"]'))return;
   running=true;
   try{
    const tr=await fetch(`/api/traffic?from=${from}&to=${to}&t=${Date.now()}`,{cache:"no-store"}).then(r=>r.json());
    const map=new Map<string,number>((tr.daily||[]).map((x:Traffic)=>[displayDate(x.date),Number(x.traffic||0)]));
    let headers=[...table.querySelectorAll("thead th")] as HTMLElement[];
    let cvrIndex=headers.findIndex(x=>x.getAttribute("data-cvr-col")==="1");
    if(cvrIndex<0){const cvrTh=document.createElement("th");cvrTh.dataset.cvrCol="1";cvrTh.className="h-10 px-2 text-right align-middle font-medium text-muted-foreground";cvrTh.textContent="CVR";headers[uptIndex].insertAdjacentElement("afterend",cvrTh);headers=[...table.querySelectorAll("thead th")] as HTMLElement[];cvrIndex=headers.findIndex(x=>x.getAttribute("data-cvr-col")==="1")}
    const invIdx=headers.findIndex(x=>x.textContent?.trim()==="Invoice");
    for(const row of table.querySelectorAll("tbody tr")){
      let cells=[...row.querySelectorAll("td")] as HTMLElement[];if(!cells.length)continue;
      const first=(cells[0].textContent||"").replace(/★ Best|↓ Lowest/g,"").trim(),isTotal=first==="TOTAL";
      const invoice=Number((cells[invIdx]?.textContent||"0").replace(/[^0-9-]/g,""))||0;
      const traffic=isTotal?Number(tr.total||0):Number(map.get(first)||0);
      const text=`${pct.format(traffic?invoice/traffic*100:0)}%`;
      let cell=row.querySelector('[data-cvr-cell="1"]') as HTMLElement|null;
      if(!cell){cells=[...row.querySelectorAll("td")] as HTMLElement[];cell=document.createElement("td");cell.dataset.cvrCell="1";cell.className="p-2 align-middle text-right font-bold";const before=cells[cvrIndex];if(before)before.insertAdjacentElement("beforebegin",cell);else row.appendChild(cell)}
      if(cell.textContent!==text)cell.textContent=text;
    }
    let badge=section.parentElement?.querySelector('[data-daily-summary-cvr="1"]') as HTMLElement|null;
    if(!badge){const hero=[...document.querySelectorAll("h2")].find(x=>x.textContent?.trim()==="Daily Sales Store")?.closest("section") as HTMLElement|null;if(hero){badge=document.createElement("div");badge.dataset.dailySummaryCvr="1";badge.className="mt-3 inline-flex rounded-xl bg-white/15 px-3 py-2 text-sm font-black text-white";hero.querySelector("h2")?.parentElement?.appendChild(badge)}}
    if(badge){const totalRow=[...table.querySelectorAll("tbody tr")].find(r=>r.querySelector("td")?.textContent?.trim()==="TOTAL"),cells=totalRow?[...totalRow.querySelectorAll("td")]:[],inv=Number((cells[invIdx]?.textContent||"0").replace(/[^0-9-]/g,""))||0,text=`CVR ${Number(tr.total||0)?pct.format(inv/Number(tr.total)*100):"0"}% • Traffic ${new Intl.NumberFormat("id-ID").format(Number(tr.total||0))}`;if(badge.textContent!==text)badge.textContent=text}
    lastKey=renderKey;
   }catch{}finally{running=false}
  };
  const schedule=()=>{if(timer)clearTimeout(timer);timer=setTimeout(()=>void apply(),180)};
  schedule();const obs=new MutationObserver(mutations=>{if(running)return;if(mutations.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>n instanceof HTMLElement&&!n.matches?.('[data-cvr-cell],[data-cvr-col],[data-daily-summary-cvr]'))))schedule()});obs.observe(document.body,{childList:true,subtree:true});document.addEventListener("change",schedule,true);return()=>{obs.disconnect();document.removeEventListener("change",schedule,true);if(timer)clearTimeout(timer)}
 },[]);

 return overviewHost?createPortal(<div className="min-w-0 rounded-2xl border border-white/20 bg-white/10 p-3"><p className="text-[11px] text-blue-100">CVR</p><p className="mt-1 text-lg font-black">{pct.format(overviewCvr)}%</p><p className="mt-2 border-t border-white/15 pt-2 text-[11px] text-blue-100">Traffic {new Intl.NumberFormat("id-ID").format(overviewTraffic)}</p></div>,overviewHost):null;
}
