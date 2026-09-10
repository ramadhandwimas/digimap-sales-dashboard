"use client";
import {useEffect} from "react";

type LiveRow={name:string;liveStatus?:string;statusTone?:string;shiftStart?:string;shiftEnd?:string;shiftProgress?:number;paceTarget?:number};
type DailyPayload={staff?:LiveRow[]};
const norm=(v:string)=>v.trim().toUpperCase().replace(/\s+/g," ");

export default function DailySalesAlerts(){
 useEffect(()=>{
  let stopped=false,lastFetch=0,data:DailyPayload|null=null;
  const findTable=()=>{const section=Array.from(document.querySelectorAll("section")).find(x=>x.textContent?.includes("Daily Sales Staff"));return section?.querySelector("table")||null};
  const apply=()=>{const table=findTable();if(!table||!data?.staff)return;const head=Array.from(table.querySelectorAll("thead th")).map(x=>(x.textContent||"").trim().toLowerCase()),idxStatus=head.findIndex(x=>x==="status");if(idxStatus<0)return;const byName=new Map(data.staff.map(x=>[norm(x.name),x]));for(const tr of Array.from(table.querySelectorAll("tbody tr"))){const cells=Array.from(tr.querySelectorAll("td"));if(!cells.length||cells[0]?.textContent?.trim()==="TOTAL")continue;const name=norm(cells[0]?.querySelector("b")?.textContent||cells[0]?.textContent||""),meta=byName.get(name);if(!meta)continue;tr.classList.remove("bg-rose-50","bg-amber-50","bg-emerald-50","dark:bg-rose-950/20","dark:bg-amber-950/20","dark:bg-emerald-950/20");const tone=meta.statusTone||"neutral";if(tone==="green")tr.classList.add("bg-emerald-50","dark:bg-emerald-950/20");if(tone==="yellow")tr.classList.add("bg-amber-50","dark:bg-amber-950/20");if(tone==="red")tr.classList.add("bg-rose-50","dark:bg-rose-950/20");const cell=cells[idxStatus];if(cell){cell.textContent=meta.liveStatus||"—";cell.classList.remove("text-emerald-600","text-amber-600","text-rose-600","text-slate-500");cell.classList.add("font-bold",tone==="green"?"text-emerald-600":tone==="yellow"?"text-amber-600":tone==="red"?"text-rose-600":"text-slate-500");const progress=Math.round((meta.shiftProgress||0)*100),pace=Math.round(meta.paceTarget||0);cell.title=meta.shiftStart&&meta.shiftEnd?`${meta.shiftStart}–${meta.shiftEnd} • progress ${progress}% • pace Rp${pace.toLocaleString("id-ID")}`:""}}
  };
  const refresh=async()=>{if(!findTable())return;const now=Date.now();if(data&&now-lastFetch<55000){apply();return}lastFetch=now;try{const date=new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date()),r=await fetch(`/api/daily?date=${date}&t=${now}`,{cache:"no-store"}),j=await r.json();if(!stopped&&r.ok){data=j;apply()}}catch{/* Daily Sales tetap memakai tampilan native bila refresh metadata gagal. */}};
  void refresh();const timer=setInterval(()=>void refresh(),2000);return()=>{stopped=true;clearInterval(timer)};
 },[]);
 return null;
}
