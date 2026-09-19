"use client";

import {useEffect} from "react";

type Lob={lob:string;qty2025:number;qty2026:number;qtyGrowth:number|null};
type OverviewPayload={ytd?:{lobs?:Lob[]}};

const fmt=(v:number|null)=>v==null?"—":`${v>=0?"▲":"▼"} ${Math.abs(v).toLocaleString("id-ID",{maximumFractionDigits:1})}%`;

export default function YtdLobGrowthEnhancer(){
 useEffect(()=>{
  let disposed=false;
  let lobs:Lob[]=[];

  const apply=()=>{
   if(disposed||!lobs.length)return;
   const heading=Array.from(document.querySelectorAll("h2")).find(x=>x.textContent?.trim()==="YTD 2025 vs 2026");
   const section=heading?.closest("section");
   if(!section)return;

   const yearHeaders=Array.from(section.querySelectorAll("div")).filter(x=>x.textContent?.trim()==="2026");
   const yearHeader=yearHeaders.find(x=>x.className.includes("font-black")) as HTMLElement|undefined;
   const card=yearHeader?.parentElement;
   if(!card)return;

   for(const row of Array.from(card.querySelectorAll<HTMLElement>("div.border-t"))){
    const label=row.querySelector("b")?.textContent?.trim();
    if(!label)continue;
    const lob=lobs.find(x=>x.lob===label);
    if(!lob)continue;
    const cells=Array.from(row.querySelectorAll<HTMLElement>(":scope > span"));
    const qtyCell=cells[0];
    if(!qtyCell||qtyCell.querySelector("[data-ytd-qty-growth]"))continue;

    const growth=document.createElement("small");
    growth.dataset.ytdQtyGrowth="1";
    growth.className=`mt-0.5 block whitespace-nowrap text-[8px] font-black sm:text-[10px] ${lob.qtyGrowth==null?"text-slate-400":lob.qtyGrowth>=0?"text-emerald-600":"text-rose-500"}`;
    growth.textContent=lob.qty2025===0?"— Qty":`${fmt(lob.qtyGrowth)} Qty`;
    qtyCell.appendChild(growth);
   }
  };

  const onOverviewData=(event:Event)=>{
   if(disposed)return;
   const detail=(event as CustomEvent<OverviewPayload>).detail;
   lobs=detail?.ytd?.lobs||[];
   apply();
  };
  window.addEventListener("m238:overview-data",onOverviewData);

  const onClick=()=>{window.setTimeout(apply,50);window.setTimeout(apply,250)};
  document.addEventListener("click",onClick,true);
  const timers=[300,800,1500,2500].map(ms=>window.setTimeout(apply,ms));
  return()=>{disposed=true;window.removeEventListener("m238:overview-data",onOverviewData);document.removeEventListener("click",onClick,true);timers.forEach(clearTimeout)};
 },[]);
 return null;
}
