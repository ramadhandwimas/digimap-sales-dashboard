"use client";
import dynamic from "next/dynamic";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";

const DailySummaryPage=dynamic(()=>import("@/components/daily-summary-page"),{ssr:false});
const BnplTrackingPage=dynamic(()=>import("@/components/bnpl-tracking-page"),{ssr:false});
const SohTabsPage=dynamic(()=>import("@/components/soh-tabs-page"),{ssr:false});
const OperationsPage=dynamic(()=>import("@/components/operations-page"),{ssr:false});
const WeeklyCopyEnhancer=dynamic(()=>import("@/components/weekly-copy-enhancer"),{ssr:false});
const CxPage=dynamic(()=>import("@/app/cx/page"),{ssr:false});

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

export default function InlineDashboardViews(){
 const[active,setActive]=useState<{key:ViewKey;label:string}|null>(null),[host,setHost]=useState<HTMLElement|null>(null);

 useEffect(()=>{
  const click=(event:MouseEvent)=>{
   const button=(event.target as Element|null)?.closest("button");
   if(!button)return;
   const label=(button.querySelector("span")?.textContent||button.textContent||"").trim();
   const key=routes[label];
   if(key){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();setActive({key,label});return}
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
  const apply=()=>{for(const child of Array.from(root.children)){if(child===h)continue;(child as HTMLElement).style.display=active?"none":""}h!.style.display=active?"block":"none"};
  apply();
  const obs=new MutationObserver(apply);obs.observe(root,{childList:true});
  return()=>{obs.disconnect();for(const child of Array.from(root.children)){if(child!==h)(child as HTMLElement).style.display=""}}
 },[active]);

 if(!host||!active)return null;
 return createPortal(<div data-inline-native className="space-y-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">M238</p><h1 className="mt-1 text-3xl font-black">{active.label}</h1></div><div className="m238-native-view"><NativeView view={active.key}/></div></div>,host);
}
