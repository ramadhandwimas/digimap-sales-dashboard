"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {DailySalesDataActions} from "@/components/m238-data-actions";

export default function M238DataManagementOverlay(){
 const[host,setHost]=useState<HTMLElement|null>(null);
 useEffect(()=>{
  const sync=()=>{
   for(const button of Array.from(document.querySelectorAll("aside nav button"))){
    const label=button.textContent?.trim();
    if(label!=="Data Upload")continue;
    const el=button as HTMLButtonElement;
    el.hidden=true;
    el.disabled=true;
    el.tabIndex=-1;
    el.setAttribute("aria-hidden","true");
    el.style.display="none";
   }
   const heading=Array.from(document.querySelectorAll("h1")).find(x=>x.textContent?.trim()==="Daily Sales");
   if(!heading){setHost(null);return}
   const header=heading.parentElement?.parentElement;
   const actions=header?.querySelector(".export-hide") as HTMLElement|null;
   if(!actions){setHost(null);return}
   let slot=actions.querySelector("[data-m238-data-actions]") as HTMLElement|null;
   if(!slot){
    slot=document.createElement("div");
    slot.dataset.m238DataActions="1";
    slot.className="shrink-0";
    actions.prepend(slot)
   }
   setHost(slot);
  };
  sync();
  const observer=new MutationObserver(sync);
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect()
 },[]);
 const refresh=()=>{
  const heading=Array.from(document.querySelectorAll("h1")).find(x=>x.textContent?.trim()==="Daily Sales");
  const header=heading?.parentElement?.parentElement;
  const btn=header?.querySelector('button[title="Perbarui data"]') as HTMLButtonElement|null;
  btn?.click()
 };
 return host?createPortal(<DailySalesDataActions onChanged={refresh}/>,host):null
}
