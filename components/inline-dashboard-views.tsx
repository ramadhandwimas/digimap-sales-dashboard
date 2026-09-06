"use client";
import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";

type ViewKey="daily-summary"|"bnpl"|"soh"|"weekly"|"cx";
const routes:Record<string,{key:ViewKey;path:string}>={
 "Daily Summary":{key:"daily-summary",path:"/daily-summary"},
 "BNPL & Trade-In":{key:"bnpl",path:"/bnpl"},
 "SOH":{key:"soh",path:"/soh"},
 "Weekly Report":{key:"weekly",path:"/weekly"},
 "NPS/CX & Member":{key:"cx",path:"/cx"},
};

export default function InlineDashboardViews(){
 const[active,setActive]=useState<{key:ViewKey;path:string;label:string}|null>(null),[host,setHost]=useState<HTMLElement|null>(null),iframeRef=useRef<HTMLIFrameElement>(null);

 useEffect(()=>{
  const click=(event:MouseEvent)=>{
   const button=(event.target as Element|null)?.closest("button");
   if(!button)return;
   const label=(button.querySelector("span")?.textContent||button.textContent||"").trim();
   const route=routes[label];
   if(route){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();setActive({...route,label});return}
   if(active){setActive(null)}
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

 const tuneFrame=()=>{
  const frame=iframeRef.current;if(!frame)return;
  try{
   const doc=frame.contentDocument;if(!doc)return;
   const hide=doc.querySelectorAll('a[href="/"], a[href="/"][class*="Dashboard"], header');hide.forEach(el=>(el as HTMLElement).style.display="none");
   const main=doc.querySelector("main") as HTMLElement|null;if(main){main.style.padding="0";main.style.minHeight="0";main.style.background="transparent"}
   const root=doc.body.firstElementChild as HTMLElement|null;if(root){root.style.minHeight="0";root.style.background="transparent"}
   const firstContent=main?.firstElementChild as HTMLElement|null;if(firstContent&&firstContent.className.includes("mt-6"))firstContent.style.marginTop="0";
   doc.documentElement.style.background="transparent";doc.body.style.margin="0";doc.body.style.background="transparent";doc.body.style.overflow="hidden";
   const resize=()=>{const height=Math.max(doc.documentElement.scrollHeight,doc.body.scrollHeight,700);frame.style.height=`${height}px`};
   resize();setTimeout(resize,250);setTimeout(resize,900);
   const ro=new ResizeObserver(resize);ro.observe(doc.body);(frame as any).__m238ResizeObserver?.disconnect?.();(frame as any).__m238ResizeObserver=ro;
  }catch{}
 };

 if(!host||!active)return null;
 return createPortal(<div className="space-y-4"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">M238</p><h1 className="mt-1 text-3xl font-black">{active.label}</h1></div></div><iframe ref={iframeRef} key={active.key} src={active.path} onLoad={tuneFrame} className="w-full border-0 bg-transparent" style={{height:900}} title={active.label}/></div>,host);
}
