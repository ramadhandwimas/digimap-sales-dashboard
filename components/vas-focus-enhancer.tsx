"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import VasFocusPage from "@/components/vas-focus-page";

export default function VasFocusEnhancer(){
 const[host,setHost]=useState<HTMLElement|null>(null);
 useEffect(()=>{
  let currentRoot:HTMLElement|null=null;
  const sync=()=>{
   const root=document.querySelector("[data-inline-native]") as HTMLElement|null;
   const title=root?.querySelector("h1")?.textContent?.trim();
   if(!root||title!=="VAS Fokus"){
    if(currentRoot){for(const el of Array.from(currentRoot.children)){const e=el as HTMLElement;if(!e.dataset.vasFocusHost)e.style.display=""}}
    currentRoot=null;setHost(null);return;
   }
   const native=root.querySelector(".m238-native-view") as HTMLElement|null;if(!native)return;
   let h=native.querySelector("[data-vas-focus-host]") as HTMLElement|null;
   if(!h){h=document.createElement("div");h.dataset.vasFocusHost="1";h.className="w-full min-w-0";native.appendChild(h)}
   for(const el of Array.from(native.children)){const e=el as HTMLElement;if(e!==h)e.style.display="none"}
   currentRoot=native;if(h!==host)setHost(h);
  };
  sync();const obs=new MutationObserver(()=>requestAnimationFrame(sync));obs.observe(document.body,{childList:true,subtree:true});return()=>{obs.disconnect();if(currentRoot){for(const el of Array.from(currentRoot.children))(el as HTMLElement).style.display=""}}
 },[host]);
 return host?createPortal(<VasFocusPage/>,host):null;
}
