"use client";

import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import StokanPage from "@/components/stokan-page-v2";

function label(button:HTMLButtonElement){return(button.dataset.menuLabel||button.querySelector("span:last-child")?.textContent||button.textContent||"").trim()}

export default function M238StokanMenu(){
 const[active,setActive]=useState(false),[host,setHost]=useState<HTMLElement|null>(null);
 useEffect(()=>{
  const inject=()=>{
   const nav=document.querySelector("aside nav");if(!nav||nav.querySelector("[data-m238-stokan-menu]"))return;
   const soh=Array.from(nav.querySelectorAll<HTMLButtonElement>("button")).find(b=>label(b)==="SOH");if(!soh||!soh.parentElement)return;
   const b=document.createElement("button");b.type="button";b.dataset.m238StokanMenu="1";b.dataset.menuLabel="Stokan";b.className=soh.className;b.innerHTML='<span aria-hidden="true">▦</span><span>Stokan</span>';
   soh.insertAdjacentElement("afterend",b);
  };
  inject();const nav=document.querySelector("aside nav");if(!nav)return;const mo=new MutationObserver(()=>requestAnimationFrame(inject));mo.observe(nav,{childList:true,subtree:true});return()=>mo.disconnect();
 },[]);
 useEffect(()=>{
  const click=(event:MouseEvent)=>{
   const b=(event.target as Element|null)?.closest("button") as HTMLButtonElement|null;if(!b||!b.closest("aside nav"))return;
   if(label(b)==="Stokan"){
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    for(const x of Array.from(document.querySelectorAll<HTMLButtonElement>("aside nav button")))if(x!==b)x.removeAttribute("aria-current");
    b.setAttribute("aria-current","page");const crumb=document.querySelector("main.min-w-0 header b");if(crumb)crumb.textContent="Stokan";setActive(true);return;
   }
   if(active){const own=document.querySelector<HTMLButtonElement>("[data-m238-stokan-menu]");own?.removeAttribute("aria-current");setActive(false)}
  };
  document.addEventListener("click",click,true);return()=>document.removeEventListener("click",click,true);
 },[active]);
 useEffect(()=>{
  const root=document.querySelector("main.min-w-0 > div.px-4.pt-6") as HTMLElement|null;if(!root)return;
  let h=root.querySelector("[data-stokan-view-host]") as HTMLElement|null;if(!h){h=document.createElement("div");h.dataset.stokanViewHost="1";h.className="min-w-0 w-full";root.appendChild(h)}setHost(h);
 },[]);
 useEffect(()=>{document.body.classList.toggle("m238-stokan-active",active);return()=>document.body.classList.remove("m238-stokan-active")},[active]);
 return <>{host&&createPortal(<div style={{display:active?"block":"none"}} className="w-full min-w-0 space-y-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600 dark:text-blue-400">M238</p><h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-slate-100">Stokan</h1></div><div className="m238-native-view"><StokanPage/></div></div>,host)}<style jsx global>{`body.m238-stokan-active main.min-w-0>div.px-4.pt-6>*:not([data-stokan-view-host]){display:none!important}body.m238-stokan-active [data-stokan-view-host]{display:block!important}`}</style></>;
}
