"use client";
import {useEffect} from "react";

function normalizeMoney(v:string){return v.replace(/\s+/g," ").replace(/^Rp\s*/i,"Rp").trim()}
function apply(){
 const headings=Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3"));
 const wanted=new Set(["VAS Daily","Achievement VAS"]);
 for(const heading of headings){
  if(!wanted.has((heading.textContent||"").trim()))continue;
  const section=heading.closest("section")||heading.parentElement?.parentElement;
  if(!section)continue;
  for(const row of Array.from(section.querySelectorAll<HTMLTableRowElement>("tbody tr"))){
   const cells=Array.from(row.querySelectorAll<HTMLTableCellElement>("td")).slice(1);
   for(const cell of cells){
    const qty=cell.querySelector("b"),value=cell.querySelector("div");
    if(!qty||!value)continue;
    const q=(qty.textContent||"0").trim(),v=normalizeMoney(value.textContent||"Rp0");
    cell.textContent=`${q} / ${v}`;
    cell.classList.add("font-semibold","whitespace-nowrap");
   }
  }
 }
 for(const th of Array.from(document.querySelectorAll<HTMLTableCellElement>("th"))){
  const t=(th.textContent||"").trim();
  if(t==="Watch"||t==="Watch (Device)")th.textContent=t.replace("Watch","Apple Watch");
 }
}

export default function M238VasInlineFormat(){
 useEffect(()=>{let raf=0;const schedule=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;apply()})};schedule();const main=document.querySelector("main")||document.body;const observer=new MutationObserver(schedule);observer.observe(main,{childList:true,subtree:true});document.addEventListener("click",schedule,true);return()=>{observer.disconnect();document.removeEventListener("click",schedule,true);if(raf)cancelAnimationFrame(raf)}},[]);
 return null;
}
