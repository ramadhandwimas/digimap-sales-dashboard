"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";

type FontKey="system"|"calibri"|"arial"|"roboto"|"inter"|"georgia"|"comic";
const fonts:{key:FontKey;label:string;family:string}[]=[
 {key:"system",label:"System / Default",family:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
 {key:"calibri",label:"Calibri",family:'Calibri,"Segoe UI",sans-serif'},
 {key:"arial",label:"Arial",family:'Arial,sans-serif'},
 {key:"roboto",label:"Roboto",family:'Roboto,Arial,sans-serif'},
 {key:"inter",label:"Inter",family:'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
 {key:"georgia",label:"Georgia",family:'Georgia,serif'},
 {key:"comic",label:"Comic Sans",family:'"Comic Sans MS","Comic Sans",cursive'},
];
function applyFont(key:FontKey){const item=fonts.find(x=>x.key===key)||fonts[0];document.documentElement.style.fontFamily=item.family;document.body.style.fontFamily=item.family;localStorage.setItem("m238-font-family",key)}
export default function M238SettingsEnhancer(){
 const[font,setFont]=useState<FontKey>("system"),[host,setHost]=useState<HTMLElement|null>(null);
 useEffect(()=>{
  const saved=(localStorage.getItem("m238-font-family")||"system") as FontKey;
  if(fonts.some(x=>x.key===saved)){setFont(saved);applyFont(saved)}
  let raf=0;
  const sync=()=>{raf=0;const title=Array.from(document.querySelectorAll("main h1")).find(x=>(x.textContent||"").trim()==="Settings") as HTMLElement|undefined;if(!title){setHost(null);return}const page=title.closest("div.space-y-5") as HTMLElement|null;if(!page)return;let node=page.querySelector("[data-m238-font-settings]") as HTMLElement|null;if(!node){node=document.createElement("div");node.dataset.m238FontSettings="1";const firstGrid=page.querySelector("section.grid");if(firstGrid?.nextSibling)page.insertBefore(node,firstGrid.nextSibling);else page.appendChild(node)}setHost(v=>v===node?v:node)};
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(sync)};
  schedule();
  const main=document.querySelector("main")||document.body;
  const obs=new MutationObserver(schedule);obs.observe(main,{childList:true,subtree:true});
  document.addEventListener("click",schedule,true);
  return()=>{obs.disconnect();document.removeEventListener("click",schedule,true);if(raf)cancelAnimationFrame(raf)};
 },[]);
 const choose=(key:FontKey)=>{setFont(key);applyFont(key)};
 if(!host)return null;
 return createPortal(<section className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-950"><h3 className="font-extrabold">Jenis Font</h3><p className="mt-1 text-sm text-slate-500">Pilih font dashboard. Perubahan langsung diterapkan dan tersimpan di perangkat ini.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fonts.map(x=><button key={x.key} onClick={()=>choose(x.key)} className={`rounded-xl border px-4 py-3 text-left ${font===x.key?"border-blue-500 bg-blue-50 ring-2 ring-blue-100 dark:bg-blue-950/30":"bg-white dark:bg-slate-900"}`} style={{fontFamily:x.family}}><b>{x.label}</b><div className="mt-1 text-xs text-slate-500">Aa Bb Cc 123</div></button>)}</div></section>,host)
}
