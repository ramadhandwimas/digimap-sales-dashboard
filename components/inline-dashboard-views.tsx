"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import DailySummaryPage from "@/components/daily-summary-page";
import BnplTrackingPage from "@/components/bnpl-tracking-page";
import SohTabsPage from "@/components/soh-tabs-page";
import OperationsPage from "@/components/operations-page";
import WeeklyCopyEnhancer from "@/components/weekly-copy-enhancer";
import WeeklyReasonPage from "@/components/weekly-reason-live-page";
import TargetFocusPage from "@/components/target-focus-page";
import CxPage from "@/app/cx/page";

type ViewKey="daily-summary"|"bnpl"|"soh"|"weekly"|"weekly-reason"|"cx"|"lob-focus"|"product-focus"|"vas-focus";
const routes:Record<string,ViewKey>={
 "Daily Summary":"daily-summary",
 "BNPL & Trade-In":"bnpl",
 "SOH":"soh",
 "Weekly Report":"weekly",
 "Weekly Reason":"weekly-reason",
 "NPS/CX & Member":"cx",
 "LOB Target Fokus":"lob-focus",
 "Product Fokus 3PP":"product-focus",
 "VAS Fokus":"vas-focus",
};
const nativeDashboardItems=new Set(["Overview","Daily Sales","Staff Performance","Est. Incentive","Feedback","Settings","Data Upload"]);

function NativeView({view}:{view:ViewKey}){
 if(view==="daily-summary")return <DailySummaryPage/>;
 if(view==="bnpl")return <BnplTrackingPage/>;
 if(view==="soh")return <SohTabsPage/>;
 if(view==="cx")return <CxPage/>;
 if(view==="weekly-reason")return <WeeklyReasonPage/>;
 if(view==="lob-focus"||view==="product-focus"||view==="vas-focus")return <TargetFocusPage mode={view}/>;
 return <><OperationsPage mode="weekly"/><WeeklyCopyEnhancer/></>;
}

function buttonLabel(button:HTMLButtonElement){return(button.dataset.menuLabel||button.querySelector("span:last-child")?.textContent||button.textContent||"").trim()}

function syncNavigation(label:string|null){
 const main=document.querySelector("main.min-w-0"),breadcrumb=main?.querySelector("header b") as HTMLElement|null;
 if(breadcrumb&&label)breadcrumb.textContent=label;
 const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>("aside nav button"));
 for(const button of buttons){
  const current=buttonLabel(button),isItem=Object.prototype.hasOwnProperty.call(routes,current)||nativeDashboardItems.has(current);
  if(!isItem)continue;
  if(!label){button.style.removeProperty("background-color");button.style.removeProperty("box-shadow");button.style.removeProperty("color");button.removeAttribute("aria-current");continue}
  const selected=current===label;
  button.style.backgroundColor=selected?"rgba(0,113,227,.10)":"transparent";
  button.style.boxShadow=selected?"inset 0 0 0 1px rgba(0,113,227,.08)":"none";
  button.style.color=selected?"#0071e3":"#424245";
  if(selected)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current");
 }
}

export default function InlineDashboardViews(){
 const[active,setActive]=useState<{key:ViewKey;label:string}|null>(null),[host,setHost]=useState<HTMLElement|null>(null);

 useEffect(()=>{
  const inject=()=>{
   const nav=document.querySelector("aside nav");if(!nav)return;
   if(!document.querySelector("[data-weekly-reason-menu]")){
    const reporting=Array.from(document.querySelectorAll<HTMLButtonElement>("aside nav button")).find(b=>buttonLabel(b)==="Reporting"),group=reporting?.parentElement,list=group?.querySelector(".mt-1") as HTMLElement|null;
    if(list){const button=document.createElement("button");button.dataset.weeklyReasonMenu="1";button.dataset.menuLabel="Weekly Reason";button.className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-bold lg:pl-7 text-white/80 hover:bg-white/10";button.innerHTML='<span class="inline-block size-3.5 shrink-0" aria-hidden="true">↳</span><span>Weekly Reason</span>';list.appendChild(button)}
   }
   if(!nav.querySelector("[data-target-focus-group]")){
    const group=document.createElement("div");group.dataset.targetFocusGroup="1";group.className="rounded-xl bg-white/5 p-1";
    group.innerHTML='<button type="button" data-target-focus-head class="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-sm font-black hover:bg-white/10"><span class="inline-grid size-4 place-items-center" aria-hidden="true">◎</span><span class="flex-1 text-left">Target Fokus</span><span aria-hidden="true">⌄</span></button><div data-target-focus-list class="mt-1 hidden lg:space-y-1"><button data-menu-label="LOB Target Fokus" class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-bold lg:pl-7"><span>◉</span><span>LOB Target Fokus</span></button><button data-menu-label="Product Fokus 3PP" class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-bold lg:pl-7"><span>◫</span><span>Product Fokus 3PP</span></button><button data-menu-label="VAS Fokus" class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-bold lg:pl-7"><span>◇</span><span>VAS Fokus</span></button></div>';
    const head=group.querySelector("[data-target-focus-head]") as HTMLButtonElement,list=group.querySelector("[data-target-focus-list]") as HTMLElement;
    head.onclick=()=>list.classList.toggle("hidden");
    const reporting=Array.from(nav.children).find(el=>el.textContent?.includes("Reporting"));
    if(reporting)nav.insertBefore(group,reporting);else nav.appendChild(group);
   }
  };
  inject();const obs=new MutationObserver(inject);obs.observe(document.body,{childList:true,subtree:true});return()=>obs.disconnect();
 },[]);

 useEffect(()=>{
  const click=(event:MouseEvent)=>{
   const button=(event.target as Element|null)?.closest("button") as HTMLButtonElement|null;if(!button)return;
   if(!button.closest("aside nav"))return;
   const label=buttonLabel(button),key=routes[label];
   if(key){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();syncNavigation(label);setActive({key,label});return}
   if(nativeDashboardItems.has(label)&&active){syncNavigation(null);setActive(null)}
  };
  document.addEventListener("click",click,true);return()=>document.removeEventListener("click",click,true);
 },[active]);

 useEffect(()=>{
  const root=document.querySelector("main.min-w-0 > div.px-4.pt-6") as HTMLElement|null;if(!root)return;
  let h=root.querySelector("[data-inline-view-host]") as HTMLElement|null;
  if(!h){h=document.createElement("div");h.dataset.inlineViewHost="1";h.className="min-w-0 w-full";root.appendChild(h)}
  setHost(h);
  const apply=()=>{for(const child of Array.from(root.children)){if(child===h)continue;(child as HTMLElement).style.display=active?"none":""}h!.style.display=active?"block":"none"};
  apply();const obs=new MutationObserver(apply);obs.observe(root,{childList:true});
  return()=>{obs.disconnect();for(const child of Array.from(root.children)){if(child!==h)(child as HTMLElement).style.display=""}}
 },[active]);

 useEffect(()=>{if(active)syncNavigation(active.label);return()=>{if(!active)syncNavigation(null)}},[active]);

 if(!host||!active)return null;
 return createPortal(<div data-inline-native className="w-full min-w-0 space-y-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">M238</p><h1 className="mt-1 text-3xl font-black">{active.label}</h1></div><div className="m238-native-view w-full min-w-0"><NativeView view={active.key}/></div></div>,host);
}
