"use client";

import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {FileImage,LoaderCircle,Share2} from "lucide-react";

type FocusMode="LOB Target Fokus"|"Product Fokus 3PP"|"VAS Fokus";
type ReportData={period:string;item:string;status:string;metrics:string[];staff:string[]};

function findSection(root:HTMLElement,marker:string){
 return Array.from(root.querySelectorAll<HTMLElement>("section")).find(el=>(el.textContent||"").includes(marker))||null;
}

function getReportData(root:HTMLElement,mode:FocusMode):ReportData{
 const marker=mode==="LOB Target Fokus"?"Detail Product":mode==="Product Fokus 3PP"?"Supplier Dipilih":"Provider Dipilih";
 const selected=findSection(root,marker);
 if(!selected)throw new Error("Detail yang dipilih belum siap");
 const periodEl=Array.from(root.querySelectorAll<HTMLElement>("p")).find(el=>(el.textContent||"").trim().startsWith("Periode aktif:"));
 const period=(periodEl?.textContent||"").replace(/^Periode aktif:\s*/i,"").trim()||"Periode aktif";
 const item=selected.querySelector("h3")?.textContent?.trim()||"Detail";
 const status=Array.from(selected.querySelectorAll<HTMLElement>("span")).map(x=>(x.textContent||"").trim()).find(x=>["Achieve","Need Push","Critical"].includes(x))||"";
 const metrics=(selected.innerText||"").split("\n").map(x=>x.trim()).filter(Boolean).filter(x=>x!==marker&&x!==item&&x!==status).slice(0,12);
 const staffSection=mode==="LOB Target Fokus"?null:findSection(root,"Penjualan Staff •");
 const staff:string[]=[];
 if(staffSection){
  const rows=Array.from(staffSection.querySelectorAll("tbody tr"));
  for(const row of rows.slice(0,18)){
   const cells=Array.from(row.querySelectorAll("td")).map(td=>(td.textContent||"").replace(/\s+/g," ").trim()).filter(Boolean);
   if(cells.length)staff.push(cells.join("  •  "));
  }
 }
 return{period,item,status,metrics,staff};
}

function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
 const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
}

function wrap(ctx:CanvasRenderingContext2D,text:string,max:number){
 const words=text.split(/\s+/),lines:string[]=[];let line="";
 for(const word of words){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>max&&line){lines.push(line);line=word}else line=test}
 if(line)lines.push(line);return lines;
}

function canvasBlob(canvas:HTMLCanvasElement){
 return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Gagal membuat PNG")),"image/png",1));
}

async function renderNative(data:ReportData,mode:FocusMode){
 const width=1080,pad=64,staffRows=data.staff.length;
 const height=Math.max(820,620+data.metrics.length*54+(staffRows?130+staffRows*48:0));
 const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas tidak tersedia");
 ctx.fillStyle="#f8fafc";ctx.fillRect(0,0,width,height);
 ctx.fillStyle="#ffffff";roundRect(ctx,32,32,width-64,height-64,32);ctx.fill();
 ctx.fillStyle="#2563eb";ctx.font="700 24px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText("M238 • TARGET FOKUS",pad,92);
 ctx.fillStyle="#0f172a";ctx.font="800 46px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText(mode,pad,150);
 ctx.fillStyle="#64748b";ctx.font="600 26px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText(`${data.period} • ${data.item}`,pad,194);
 if(data.status){ctx.font="800 24px -apple-system,BlinkMacSystemFont,Arial,sans-serif";const sw=ctx.measureText(data.status).width+42;ctx.fillStyle=data.status==="Achieve"?"#dcfce7":data.status==="Need Push"?"#fef3c7":"#fee2e2";roundRect(ctx,width-pad-sw,80,sw,46,23);ctx.fill();ctx.fillStyle=data.status==="Achieve"?"#166534":data.status==="Need Push"?"#92400e":"#b91c1c";ctx.fillText(data.status,width-pad-sw+21,111)}
 let y=250;
 ctx.fillStyle="#ffffff";ctx.strokeStyle="#e2e8f0";ctx.lineWidth=2;roundRect(ctx,pad-20,y-28,width-pad*2+40,Math.max(230,data.metrics.length*54+50),24);ctx.fill();ctx.stroke();
 ctx.fillStyle="#0f172a";ctx.font="700 28px -apple-system,BlinkMacSystemFont,Arial,sans-serif";
 for(const m of data.metrics){for(const line of wrap(ctx,m,width-pad*2-30)){ctx.fillText(line,pad,y);y+=44}y+=10}
 if(staffRows){y+=34;ctx.fillStyle="#0f172a";ctx.font="800 30px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText(`Penjualan Staff • ${data.item}`,pad,y);y+=48;ctx.font="600 22px -apple-system,BlinkMacSystemFont,Arial,sans-serif";for(const row of data.staff){ctx.fillStyle="#f8fafc";roundRect(ctx,pad-8,y-30,width-pad*2+16,42,10);ctx.fill();ctx.fillStyle="#0f172a";ctx.fillText(row.slice(0,92),pad,y);y+=48}}
 ctx.fillStyle="#94a3b8";ctx.font="500 20px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText("Generated from M238 Dashboard",pad,height-56);
 return canvasBlob(canvas);
}

export default function TargetFocusPictureEnhancer(){
 const[host,setHost]=useState<HTMLElement|null>(null),[mode,setMode]=useState<FocusMode|null>(null),[root,setRoot]=useState<HTMLElement|null>(null),[busy,setBusy]=useState<"picture"|"share"|"">(""),[notice,setNotice]=useState("");
 useEffect(()=>{const scan=()=>{const native=document.querySelector(".m238-native-view") as HTMLElement|null;if(!native){setHost(null);setMode(null);setRoot(null);return}const heading=Array.from(native.querySelectorAll("h2")).find(h=>["LOB Target Fokus","Product Fokus 3PP","VAS Fokus"].includes((h.textContent||"").trim())) as HTMLElement|undefined;if(!heading){setHost(null);setMode(null);setRoot(null);return}const pageRoot=heading.closest("div.space-y-5") as HTMLElement|null;if(!pageRoot)return;let nextHost=pageRoot.querySelector("[data-target-picture-actions]") as HTMLElement|null;if(!nextHost){nextHost=document.createElement("div");nextHost.dataset.targetPictureActions="1";nextHost.className="m238-soft-card rounded-2xl border p-4";const filter=pageRoot.children.item(1);if(filter?.nextSibling)pageRoot.insertBefore(nextHost,filter.nextSibling);else pageRoot.appendChild(nextHost)}setHost(nextHost);setMode((heading.textContent||"").trim() as FocusMode);setRoot(pageRoot)};scan();const observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect()},[]);
 if(!host||!mode||!root)return null;
 const build=async()=>{const data=getReportData(root,mode);const blob=await renderNative(data,mode);const clean=`M238-${mode}-${data.item}-${data.period}`.replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-");return{file:new File([blob],`${clean}.png`,{type:"image/png"}),period:data.period,item:data.item}};
 const download=async()=>{setBusy("picture");setNotice("");try{const{file}=await build(),url=URL.createObjectURL(file),a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);setNotice("PNG berhasil dibuat.")}catch(e){setNotice(e instanceof Error?e.message:"Gagal membuat picture")}finally{setBusy("")}};
 const share=async()=>{setBusy("share");setNotice("");try{const{file,period,item}=await build(),text=`M238 • ${mode} • ${item} • ${period}`;if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:text,text});setNotice("Pilih WhatsApp lalu grup tujuan.")}else{const url=URL.createObjectURL(file),a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);setNotice("Share file belum didukung browser ini. PNG berhasil dibuat.")}}catch(e){if(!(e instanceof DOMException&&e.name==="AbortError"))setNotice(e instanceof Error?e.message:"Gagal share picture")}finally{setBusy("")}};
 return createPortal(<div><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black">Share Report</p><p className="mt-1 text-xs text-slate-500">Canvas Native v2 • tanpa html2canvas</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={Boolean(busy)} onClick={()=>void download()} className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-black disabled:opacity-50">{busy==="picture"?<LoaderCircle className="size-4 animate-spin"/>:<FileImage className="size-4"/>}Picture Screenshot</button><button type="button" disabled={Boolean(busy)} onClick={()=>void share()} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{busy==="share"?<LoaderCircle className="size-4 animate-spin"/>:<Share2 className="size-4"/>}Share WhatsApp</button></div></div>{notice?<p className="mt-2 text-xs font-semibold text-slate-500">{notice}</p>:null}</div>,host);
}
