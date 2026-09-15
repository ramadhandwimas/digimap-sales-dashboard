"use client";

import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import html2canvas from "html2canvas";
import {FileImage,LoaderCircle,Share2} from "lucide-react";

type FocusMode="LOB Target Fokus"|"Product Fokus 3PP"|"VAS Fokus";

function removeDarkClasses(root:HTMLElement){
 for(const el of [root,...Array.from(root.querySelectorAll<HTMLElement>("*"))]){
  const cls=el.getAttribute("class");
  if(cls)el.setAttribute("class",cls.split(/\s+/).filter(x=>!x.startsWith("dark:")).join(" "));
 }
}
function findSection(root:HTMLElement,marker:string){return Array.from(root.querySelectorAll<HTMLElement>("section")).find(el=>(el.textContent||"").includes(marker))||null}
function simplifyStaffTable(section:HTMLElement,mode:FocusMode){
 const table=section.querySelector("table") as HTMLTableElement|null;if(!table)return;
 table.style.minWidth="0";table.style.width="100%";
 for(const wrap of Array.from(section.querySelectorAll<HTMLElement>(".overflow-x-auto")))wrap.style.overflow="visible";
 if(mode!=="VAS Fokus")return;
 const keep=new Set([0,2,4,6,7]);
 for(const row of Array.from(table.querySelectorAll("tr"))){const cells=Array.from(row.children);for(let i=cells.length-1;i>=0;i--)if(!keep.has(i))cells[i].remove()}
}
async function renderPicture(node:HTMLElement){
 try{await document.fonts?.ready}catch{}
 const width=Math.max(node.scrollWidth,node.clientWidth),height=Math.max(node.scrollHeight,node.clientHeight);
 const canvas=await html2canvas(node,{backgroundColor:"#ffffff",scale:2,useCORS:true,logging:false,width,height,windowWidth:width,windowHeight:height});
 return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Gagal membuat picture PNG")),"image/png"));
}
function makeStage(root:HTMLElement,mode:FocusMode){
 const marker=mode==="LOB Target Fokus"?"Detail Product":mode==="Product Fokus 3PP"?"Supplier Dipilih":"Provider Dipilih";
 const selected=findSection(root,marker);if(!selected)throw new Error("Detail yang dipilih belum siap");
 const periodEl=Array.from(root.querySelectorAll<HTMLElement>("p")).find(el=>(el.textContent||"").trim().startsWith("Periode aktif:"));
 const period=(periodEl?.textContent||"").replace(/^Periode aktif:\s*/i,"").trim()||"Periode aktif";
 const item=selected.querySelector("h3")?.textContent?.trim()||"Detail";
 const stage=document.createElement("div");Object.assign(stage.style,{position:"fixed",left:"-10000px",top:"0",width:"760px",padding:"24px",background:"#ffffff",color:"#0f172a",fontFamily:"Arial, sans-serif",zIndex:"-1"});
 const head=document.createElement("div");Object.assign(head.style,{border:"1px solid #e2e8f0",borderRadius:"18px",padding:"18px",marginBottom:"16px"});
 const kicker=document.createElement("div");kicker.textContent="M238 • TARGET FOKUS";Object.assign(kicker.style,{fontSize:"12px",fontWeight:"900",letterSpacing:".14em",color:"#2563eb"});
 const title=document.createElement("div");title.textContent=mode;Object.assign(title.style,{fontSize:"26px",fontWeight:"900",marginTop:"5px"});
 const meta=document.createElement("div");meta.textContent=`${period} • ${item}`;Object.assign(meta.style,{fontSize:"13px",fontWeight:"700",color:"#64748b",marginTop:"4px"});
 head.append(kicker,title,meta);stage.appendChild(head);
 const selectedClone=selected.cloneNode(true) as HTMLElement;removeDarkClasses(selectedClone);selectedClone.style.marginBottom="16px";stage.appendChild(selectedClone);
 if(mode!=="LOB Target Fokus"){const staff=findSection(root,"Penjualan Staff •");if(staff){const clone=staff.cloneNode(true) as HTMLElement;removeDarkClasses(clone);simplifyStaffTable(clone,mode);stage.appendChild(clone)}}
 document.body.appendChild(stage);return{stage,period,item};
}

export default function TargetFocusPictureEnhancer(){
 const[host,setHost]=useState<HTMLElement|null>(null),[mode,setMode]=useState<FocusMode|null>(null),[root,setRoot]=useState<HTMLElement|null>(null),[busy,setBusy]=useState<"picture"|"share"|"">(""),[notice,setNotice]=useState("");
 useEffect(()=>{const scan=()=>{const native=document.querySelector(".m238-native-view") as HTMLElement|null;if(!native){setHost(null);setMode(null);setRoot(null);return}const heading=Array.from(native.querySelectorAll("h2")).find(h=>["LOB Target Fokus","Product Fokus 3PP","VAS Fokus"].includes((h.textContent||"").trim())) as HTMLElement|undefined;if(!heading){setHost(null);setMode(null);setRoot(null);return}const pageRoot=heading.closest("div.space-y-5") as HTMLElement|null;if(!pageRoot)return;let nextHost=pageRoot.querySelector("[data-target-picture-actions]") as HTMLElement|null;if(!nextHost){nextHost=document.createElement("div");nextHost.dataset.targetPictureActions="1";nextHost.className="m238-soft-card rounded-2xl border p-4";const filter=pageRoot.children.item(1);if(filter?.nextSibling)pageRoot.insertBefore(nextHost,filter.nextSibling);else pageRoot.appendChild(nextHost)}setHost(nextHost);setMode((heading.textContent||"").trim() as FocusMode);setRoot(pageRoot)};scan();const observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect()},[]);
 if(!host||!mode||!root)return null;
 const build=async()=>{const{stage,period,item}=makeStage(root,mode);try{const blob=await renderPicture(stage),clean=`M238-${mode}-${item}-${period}`.replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-");return{file:new File([blob],`${clean}.png`,{type:"image/png"}),period,item}}finally{stage.remove()}};
 const download=async()=>{setBusy("picture");setNotice("");try{const{file}=await build(),url=URL.createObjectURL(file),a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);setNotice("PNG siap dibagikan ke grup.")}catch(e){setNotice(e instanceof Error?e.message:"Gagal membuat picture")}finally{setBusy("")}};
 const share=async()=>{setBusy("share");setNotice("");try{const{file,period,item}=await build(),text=`M238 • ${mode} • ${item} • ${period}`;if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:text,text});setNotice("Pilih WhatsApp lalu grup tujuan.")}else{const url=URL.createObjectURL(file),a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);setNotice("Browser belum mendukung share foto. PNG sudah dibuat.")}}catch(e){if(!(e instanceof DOMException&&e.name==="AbortError"))setNotice(e instanceof Error?e.message:"Gagal share picture")}finally{setBusy("")}};
 return createPortal(<div><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black">Share Report</p><p className="mt-1 text-xs text-slate-500">Picture hanya berisi item yang sedang dipilih dan detail staff.</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={Boolean(busy)} onClick={()=>void download()} className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-black disabled:opacity-50">{busy==="picture"?<LoaderCircle className="size-4 animate-spin"/>:<FileImage className="size-4"/>}Picture Screenshot</button><button type="button" disabled={Boolean(busy)} onClick={()=>void share()} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{busy==="share"?<LoaderCircle className="size-4 animate-spin"/>:<Share2 className="size-4"/>}Share WhatsApp</button></div></div>{notice?<p className="mt-2 text-xs font-semibold text-slate-500">{notice}</p>:null}</div>,host);
}
