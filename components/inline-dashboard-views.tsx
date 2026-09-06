"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import DailySummaryPage from "@/components/daily-summary-page";
import BnplTrackingPage from "@/components/bnpl-tracking-page";
import SohTabsPage from "@/components/soh-tabs-page";
import OperationsPage from "@/components/operations-page";
import WeeklyCopyEnhancer from "@/components/weekly-copy-enhancer";
import WeeklyReasonPage from "@/components/weekly-reason-page";
import CxPage from "@/app/cx/page";

type ViewKey="daily-summary"|"bnpl"|"soh"|"weekly"|"weekly-reason"|"cx";
const routes:Record<string,ViewKey>={
 "Daily Summary":"daily-summary",
 "BNPL & Trade-In":"bnpl",
 "SOH":"soh",
 "Weekly Report":"weekly",
 "Weekly Reason":"weekly-reason",
 "NPS/CX & Member":"cx",
};
const nativeDashboardItems=new Set(["Overview","Daily Sales","Staff Performance","Est. Incentive","Feedback","Settings","Data Upload"]);

function NativeView({view}:{view:ViewKey}){
 if(view==="daily-summary")return <DailySummaryPage/>;
 if(view==="bnpl")return <BnplTrackingPage/>;
 if(view==="soh")return <SohTabsPage/>;
 if(view==="cx")return <CxPage/>;
 if(view==="weekly-reason")return <WeeklyReasonPage/>;
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
  if(!label){
   button.style.removeProperty("background-color");
   button.style.removeProperty("box-shadow");
   button.style.removeProperty("color");
   button.removeAttribute("aria-current");
   continue;
  }
  const selected=current===label;
  button.style.backgroundColor=selected?"rgba(255,255,255,.20)":"transparent";
  button.style.boxShadow=selected?"0 1px 2px rgba(15,23,42,.12)":"none";
  button.style.color=selected?"rgb(255 255 255)":"rgba(255,255,255,.80)";
  if(selected)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current");
 }
}

export default function InlineDashboardViews(){
 const[active,setActive]=useState<{key:ViewKey;label:string}|null>(null),[host,setHost]=useState<HTMLElement|null>(null);

 useEffect(()=>{
  const inject=()=>{
   if(document.querySelector("[data-weekly-reason-menu]"))return;
   const reporting=Array.from(document.querySelectorAll<HTMLButtonElement>("aside nav button")).find(b=>buttonLabel(b)==="Reporting"),group=reporting?.parentElement,list=group?.querySelector(".mt-1") as HTMLElement|null;if(!list)return;
   const button=document.createElement("button");button.dataset.weeklyReasonMenu="1";button.dataset.menuLabel="Weekly Reason";button.className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-bold lg:pl-7 text-white/80 hover:bg-white/10";button.innerHTML='<span class="inline-block size-3.5 shrink-0" aria-hidden="true">↳</span><span>Weekly Reason</span>';list.appendChild(button);
  };
  inject();const obs=new MutationObserver(inject);obs.observe(document.body,{childList:true,subtree:true});return()=>obs.disconnect();
 },[]);

 useEffect(()=>{
  const click=(event:MouseEvent)=>{
   const button=(event.target as Element|null)?.closest("button") as HTMLButtonElement|null;
   if(!button)return;
   const inSidebar=Boolean(button.closest("aside nav"));
   if(!inSidebar)return;
   const label=buttonLabel(button),key=routes[label];
   if(key){
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    syncNavigation(label);setActive({key,label});return;
   }
   if(nativeDashboardItems.has(label)&&active){
    syncNavigation(null);setActive(null);
   }
  };
  document.addEventListener("click",click,true);return()=>document.removeEventListener("click",click,true);
 },[active]);

 useEffect(()=>{
  const root=document.querySelector("main.min-w-0 > div.px-4.pt-6") as HTMLElement|null;if(!root)return;
  let h=root.querySelector("[data-inline-view-host]") as HTMLElement|null;
  if(!h){h=document.createElement("div");h.dataset.inlineViewHost="1";h.className="min-w-0";root.appendChild(h)}
  setHost(h);
  const apply=()=>{for(const child of Array.from(root.children)){if(child===h)continue;(child as HTMLElement).style.display=active?"none":""}h!.style.display=active?"block":"none"};
  apply();const obs=new MutationObserver(apply);obs.observe(root,{childList:true});
  return()=>{obs.disconnect();for(const child of Array.from(root.children)){if(child!==h)(child as HTMLElement).style.display=""}}
 },[active]);

 useEffect(()=>{
  if(active)syncNavigation(active.label);
  return()=>{if(!active)syncNavigation(null)};
 },[active]);

 if(!host||!active)return null;
 return createPortal(<div data-inline-native className="space-y-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">M238</p><h1 className="mt-1 text-3xl font-black">{active.label}</h1></div><div className="m238-native-view"><NativeView view={active.key}/></div></div>,host);
}
