"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import StoreAchievementPage from "@/components/store-achievement-page";

function labelOf(button:HTMLButtonElement){return(button.dataset.menuLabel||button.querySelector("span:last-child")?.textContent||button.textContent||"").trim()}
const viewItems=new Set(["Daily Sales","Daily Summary","Staff Performance","Est. Incentive","BNPL & Trade-In","SOH","Feedback","NPS/CX & Member","Weekly Report","Weekly Reason","Mading","LOB Target Fokus","Product Fokus 3PP","VAS Fokus","Data Upload","Settings","Checklist Store - SPV","Checklist Store - Staff","Ceklis SPV","Ceklis Staff"]);

export default function StoreAchievementShell(){
 const[host,setHost]=useState<HTMLElement|null>(null),[active,setActive]=useState(true);
 useEffect(()=>{
  let raf=0,home=true;
  const apply=()=>{
   raf=0;
   const root=document.querySelector("main.min-w-0 > div.px-4.pt-6") as HTMLElement|null;
   const breadcrumb=document.querySelector("main.min-w-0 header b") as HTMLElement|null;
   const nav=document.querySelector("aside nav");
   if(!root||!nav)return;
   const homeButton=Array.from(nav.querySelectorAll<HTMLButtonElement>("button")).find(b=>labelOf(b)==="Overview"||labelOf(b)==="Pencapaian Store");
   if(homeButton){const span=homeButton.querySelector("span:last-child") as HTMLElement|null;if(span)span.textContent="Pencapaian Store";homeButton.dataset.menuLabel="Pencapaian Store";}
   let h=root.querySelector("[data-store-achievement-host]") as HTMLElement|null;
   if(!h){h=document.createElement("div");h.dataset.storeAchievementHost="1";h.className="min-w-0 w-full";root.appendChild(h)}
   for(const child of Array.from(root.children)){
    if(child===h)continue;
    const el=child as HTMLElement;
    if(home){if(!el.dataset.storeAchievementPrevDisplay)el.dataset.storeAchievementPrevDisplay=el.style.display||"__empty__";el.style.display="none"}
    else if(el.dataset.storeAchievementPrevDisplay){el.style.display=el.dataset.storeAchievementPrevDisplay==="__empty__"?"":el.dataset.storeAchievementPrevDisplay;delete el.dataset.storeAchievementPrevDisplay}
   }
   h.style.display=home?"block":"none";
   if(home&&breadcrumb)breadcrumb.textContent="Pencapaian Store";
   setHost(v=>v===h?v:h);setActive(home);
  };
  const queue=()=>{if(!raf)raf=requestAnimationFrame(apply)};
  const click=(event:MouseEvent)=>{
   const button=(event.target as Element|null)?.closest("aside nav button") as HTMLButtonElement|null;
   if(!button)return;
   const label=labelOf(button);
   if(label==="Overview"||label==="Pencapaian Store")home=true;
   else if(viewItems.has(label))home=false;
   queue();
  };
  apply();
  const mo=new MutationObserver(queue);mo.observe(document.body,{childList:true,subtree:true});
  document.addEventListener("click",click,true);
  return()=>{if(raf)cancelAnimationFrame(raf);mo.disconnect();document.removeEventListener("click",click,true)};
 },[]);
 return host&&active?createPortal(<StoreAchievementPage/>,host):null;
}
