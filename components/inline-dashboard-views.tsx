"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import DailySummaryPage from "@/components/daily-summary-page";
import BnplTrackingPage from "@/components/bnpl-tracking-page";
import SohTabsPage from "@/components/soh-tabs-page";
import OperationsPage from "@/components/operations-page";
import WeeklyCopyEnhancer from "@/components/weekly-copy-enhancer";
import CxPage from "@/app/cx/page";

type ViewKey="daily-summary"|"bnpl"|"soh"|"weekly"|"cx";
const routes:Record<string,ViewKey>={
 "Daily Summary":"daily-summary",
 "BNPL & Trade-In":"bnpl",
 "SOH":"soh",
 "Weekly Report":"weekly",
 "NPS/CX & Member":"cx",
};

function NativeView({view}:{view:ViewKey}){
 if(view==="daily-summary")return <DailySummaryPage/>;
 if(view==="bnpl")return <BnplTrackingPage/>;
 if(view==="soh")return <SohTabsPage/>;
 if(view==="cx")return <CxPage/>;
 return <><OperationsPage mode="weekly"/><WeeklyCopyEnhancer/></>;
}

function buttonLabel(button:HTMLButtonElement){
 return (button.querySelector("span")?.textContent||button.textContent||"").trim();
}

function syncNavigation(label:string|null){
 const main=document.querySelector("main.min-w-0");
 const breadcrumb=main?.querySelector("header b") as HTMLElement|null;
 if(breadcrumb&&label)breadcrumb.textContent=label;

 // Native views are rendered inside the main dashboard without changing DashboardV3's tab state.
 // Keep the visible sidebar selection in sync so the previous menu (e.g. Daily Sales)
 // does not stay highlighted while Daily Summary/BNPL/SOH/CX/Weekly is open.
 const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>("aside nav button"));
 for(const button of buttons){
  const current=buttonLabel(button);
  const isItem=Object.prototype.hasOwnProperty.call(routes,current)||[
   "Overview","Daily Sales","Staff Performance","Est. Incentive","Feedback","Settings","Data Upload"
  ].includes(current);
  if(!isItem)continue;
  if(label&&current===label){
   button.classList.add("bg-white/20","shadow-sm");
   button.classList.remove("text-white/80");
   button.setAttribute("aria-current","page");
  }else{
   button.classList.remove("bg-white/20","shadow-sm");
   button.classList.add("text-white/80");
   button.removeAttribute("aria-current");
  }
 }
}

export default function InlineDashboardViews(){
 const[active,setActive]=useState<{key:ViewKey;label:string}|null>(null),[host,setHost]=useState<HTMLElement|null>(null);

 useEffect(()=>{
  const click=(event:MouseEvent)=>{
   const button=(event.target as Element|null)?.closest("button") as HTMLButtonElement|null;
   if(!button)return;
   const label=buttonLabel(button);
   const key=routes[label];
   if(key){
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    syncNavigation(label);
    setActive({key,label});
    return;
   }
   if(active)setActive(null);
  };
  document.addEventListener("click",click,true);
  return()=>document.removeEventListener("click",click,true);
 },[active]);

 useEffect(()=>{
  const root=document.querySelector("main.min-w-0 > div.px-4.pt-6") as HTMLElement|null;
  if(!root)return;
  let h=root.querySelector("[data-inline-view-host]") as HTMLElement|null;
  if(!h){h=document.createElement("div");h.dataset.inlineViewHost="1";h.className="min-w-0";root.appendChild(h)}
  setHost(h);
  const apply=()=>{
   for(const child of Array.from(root.children)){
    if(child===h)continue;
    (child as HTMLElement).style.display=active?"none":"";
   }
   h!.style.display=active?"block":"none";
  };
  apply();
  const obs=new MutationObserver(apply);obs.observe(root,{childList:true});
  return()=>{obs.disconnect();for(const child of Array.from(root.children)){if(child!==h)(child as HTMLElement).style.display=""}}
 },[active]);

 useEffect(()=>{if(active)syncNavigation(active.label)},[active]);

 if(!host||!active)return null;
 return createPortal(
  <div data-inline-native className="space-y-4">
   <div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">M238</p><h1 className="mt-1 text-3xl font-black">{active.label}</h1></div>
   <div className="m238-native-view"><NativeView view={active.key}/></div>
  </div>,
  host,
 );
}
