"use client";

import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {FileImage,LoaderCircle,Share2} from "lucide-react";

type FocusMode="LOB Target Fokus"|"Product Fokus 3PP"|"VAS Fokus";
type StaffRow={name:string;detail:string;active:boolean};
type ReportData={period:string;item:string;status:string;target:string;achievement:string;percent:string;gap:string;qty:string;staff:StaffRow[]};

function findSection(root:HTMLElement,marker:string){return Array.from(root.querySelectorAll<HTMLElement>("section")).find(el=>(el.textContent||"").includes(marker))||null}
function pickAfter(lines:string[],label:string){const i=lines.findIndex(x=>x.toLowerCase()===label.toLowerCase());return i>=0?(lines[i+1]||""):""}
function idNumber(v:string){const n=Number(String(v||"").replace(/[^0-9-]/g,""));return Number.isFinite(n)?n:0}
function pctId(v:number){return `${new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(Number.isFinite(v)?v:0)}%`}

function getLobStaff(selected:HTMLElement){
 const out:StaffRow[]=[];
 const title=Array.from(selected.querySelectorAll<HTMLElement>("p")).find(x=>(x.textContent||"").trim()==="Ranking Staff Contribution");
 const wrap=title?.nextElementSibling as HTMLElement|null;
 if(!wrap)return out;
 for(const row of Array.from(wrap.children) as HTMLElement[]){
  const left=row.querySelector("span")?.textContent?.replace(/^\s*\d+\.\s*/,"").trim()||"";
  const right=row.querySelector("b")?.textContent?.replace(/\s+/g," ").trim()||"";
  if(!left)continue;
  const qty=idNumber(right);
  out.push({name:left,detail:`${qty} unit`,active:qty>0});
 }
 return out;
}

function getTableStaff(root:HTMLElement,mode:FocusMode){
 const staffSection=findSection(root,"Penjualan Staff •");
 const out:StaffRow[]=[];
 if(!staffSection)return out;
 for(const row of Array.from(staffSection.querySelectorAll("tbody tr"))){
  const cells=Array.from(row.querySelectorAll("td")).map(td=>(td.textContent||"").replace(/\s+/g," ").trim());
  if(!cells[0])continue;
  if(mode==="VAS Fokus"){
   const target=idNumber(cells[1]),value=idNumber(cells[2]),qty=idNumber(cells[4]);
   const achPct=target>0?value/target*100:0;
   out.push({name:cells[0],detail:`Ach ${cells[2]||"Rp0"} • Qty ${qty} • ${pctId(achPct)}`,active:value>0||qty>0});
  }else{
   const detail=cells.slice(1).filter(Boolean).join("  •  ");
   const active=cells.slice(1).some(x=>idNumber(x)>0);
   out.push({name:cells[0],detail,active});
  }
 }
 return out;
}

function getReportData(root:HTMLElement,mode:FocusMode):ReportData{
 const marker=mode==="LOB Target Fokus"?"Detail Product":mode==="Product Fokus 3PP"?"Supplier Dipilih":"Provider Dipilih";
 const selected=findSection(root,marker);if(!selected)throw new Error("Detail yang dipilih belum siap");
 const periodEl=Array.from(root.querySelectorAll<HTMLElement>("p")).find(el=>(el.textContent||"").trim().startsWith("Periode aktif:"));
 const period=(periodEl?.textContent||"").replace(/^Periode aktif:\s*/i,"").trim()||"Periode aktif";
 const item=selected.querySelector("h3")?.textContent?.trim()||"Detail";
 const status=Array.from(selected.querySelectorAll<HTMLElement>("span")).map(x=>(x.textContent||"").trim()).find(x=>["Achieve","Need Push","Critical"].includes(x))||"";
 const lines=(selected.innerText||"").split("\n").map(x=>x.replace(/\s+/g," ").trim()).filter(Boolean);
 const target=pickAfter(lines,"Target Value")||pickAfter(lines,"Target")||"-";
 const achievement=pickAfter(lines,"Achievement")||"-";
 const ai=lines.findIndex(x=>x.toLowerCase()==="achievement");
 const percent=ai>=0&&/%/.test(lines[ai+2]||"")?lines[ai+2]:(pickAfter(lines,"Achievement %")||"");
 const gap=pickAfter(lines,"Gap Value")||pickAfter(lines,"Gap")||"-";
 const qty=pickAfter(lines,"Actual Qty")||"-";
 const staff=mode==="LOB Target Fokus"?getLobStaff(selected):getTableStaff(root,mode);
 return{period,item,status,target,achievement,percent,gap,qty,staff};
}

function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()}
function canvasBlob(canvas:HTMLCanvasElement){return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Gagal membuat PNG")),"image/png",1))}
function fitText(ctx:CanvasRenderingContext2D,text:string,maxWidth:number,start:number,min=20){let size=start;while(size>min){ctx.font=`800 ${size}px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;if(ctx.measureText(text).width<=maxWidth)break;size-=2}return size}

async function renderNative(data:ReportData,mode:FocusMode){
 const width=1080,pad=62,inner=width-pad*2;
 const active=data.staff.filter(x=>x.active).slice(0,8),zeroCount=data.staff.filter(x=>!x.active).length;
 const hasStaff=data.staff.length>0,staffHeight=hasStaff?(94+active.length*74+(zeroCount?62:0)):0;
 const height=hasStaff?Math.max(900,700+staffHeight):760;
 const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas tidak tersedia");
 ctx.fillStyle="#f1f5f9";ctx.fillRect(0,0,width,height);ctx.fillStyle="#ffffff";roundRect(ctx,28,28,width-56,height-56,32);ctx.fill();
 ctx.fillStyle="#2563eb";ctx.font="800 23px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText("M238 • TARGET FOKUS",pad,84);
 ctx.fillStyle="#0f172a";const titleSize=fitText(ctx,mode,650,44,30);ctx.font=`800 ${titleSize}px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;ctx.fillText(mode,pad,138);
 ctx.fillStyle="#64748b";ctx.font="600 24px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText(`${data.period} • ${data.item}`,pad,180);
 if(data.status){const colors=data.status==="Achieve"?["#dcfce7","#166534"]:data.status==="Need Push"?["#fef3c7","#92400e"]:["#fee2e2","#b91c1c"];ctx.font="800 22px -apple-system,BlinkMacSystemFont,Arial,sans-serif";const sw=ctx.measureText(data.status).width+42;ctx.fillStyle=colors[0];roundRect(ctx,width-pad-sw,64,sw,44,22);ctx.fill();ctx.fillStyle=colors[1];ctx.fillText(data.status,width-pad-sw+21,94)}

 let y=218;ctx.fillStyle="#f8fafc";roundRect(ctx,pad,y,inner,356,24);ctx.fill();
 ctx.fillStyle="#2563eb";ctx.font="800 18px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText(mode==="Product Fokus 3PP"?"SUPPLIER DIPILIH":mode==="VAS Fokus"?"PROVIDER DIPILIH":"PRODUCT DIPILIH",pad+26,y+38);
 ctx.fillStyle="#0f172a";ctx.font="800 34px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText(data.item,pad+26,y+82);
 const cards=mode==="LOB Target Fokus"?
  [{label:"Target Qty",value:data.target},{label:"Achievement Qty",value:data.achievement},{label:"Gap Qty",value:data.gap},{label:"Achievement %",value:data.percent||"-"}]:
  [{label:"Target Value",value:data.target},{label:"Achievement",value:data.achievement,sub:data.percent},{label:"Gap Value",value:data.gap},{label:"Actual Qty",value:data.qty}];
 const cw=(inner-76)/2,ch=92;
 cards.forEach((c,i)=>{const col=i%2,row=Math.floor(i/2),x=pad+26+col*(cw+24),cy=y+108+row*(ch+18);ctx.fillStyle="#ffffff";roundRect(ctx,x,cy,cw,ch,18);ctx.fill();ctx.fillStyle="#94a3b8";ctx.font="600 18px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText(c.label,x+18,cy+28);ctx.fillStyle="#0f172a";ctx.font="800 27px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText(c.value||"-",x+18,cy+62);if("sub" in c&&c.sub){ctx.fillStyle="#64748b";ctx.font="700 18px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText(c.sub,x+18,cy+84)}});

 y+=392;
 if(hasStaff){ctx.fillStyle="#0f172a";ctx.font="800 28px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText(`Penjualan Staff • ${data.item}`,pad,y);y+=38;ctx.fillStyle="#64748b";ctx.font="500 18px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText("Staff dengan transaksi ditampilkan lebih dulu",pad,y);y+=30;
  if(active.length===0){ctx.fillStyle="#f8fafc";roundRect(ctx,pad,y,inner,58,14);ctx.fill();ctx.fillStyle="#64748b";ctx.font="700 20px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText("Belum ada staff dengan transaksi pada pilihan ini",pad+18,y+37);y+=70}else{
   for(const row of active){ctx.fillStyle="#f8fafc";roundRect(ctx,pad,y,inner,62,14);ctx.fill();ctx.fillStyle="#0f172a";ctx.font="800 21px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText(row.name.slice(0,34),pad+18,y+26);ctx.fillStyle="#475569";ctx.font="600 18px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText(row.detail.slice(0,78),pad+18,y+49);y+=72}
  }
  if(zeroCount){ctx.fillStyle="#eef2ff";roundRect(ctx,pad,y,inner,52,14);ctx.fill();ctx.fillStyle="#475569";ctx.font="700 19px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText(`${zeroCount} staff lainnya belum ada penjualan`,pad+18,y+33);y+=62}
 }
 ctx.fillStyle="#94a3b8";ctx.font="500 18px -apple-system,BlinkMacSystemFont,Arial,sans-serif";ctx.fillText("Generated from M238 Dashboard",pad,height-48);
 return canvasBlob(canvas);
}

export default function TargetFocusPictureEnhancer(){
 const[host,setHost]=useState<HTMLElement|null>(null),[mode,setMode]=useState<FocusMode|null>(null),[root,setRoot]=useState<HTMLElement|null>(null),[busy,setBusy]=useState<"picture"|"share"|"">(""),[notice,setNotice]=useState("");
 useEffect(()=>{const scan=()=>{const native=document.querySelector(".m238-native-view") as HTMLElement|null;if(!native){setHost(null);setMode(null);setRoot(null);return}const heading=Array.from(native.querySelectorAll("h2")).find(h=>["LOB Target Fokus","Product Fokus 3PP","VAS Fokus"].includes((h.textContent||"").trim())) as HTMLElement|undefined;if(!heading){setHost(null);setMode(null);setRoot(null);return}const pageRoot=heading.closest("div.space-y-5") as HTMLElement|null;if(!pageRoot)return;let nextHost=pageRoot.querySelector("[data-target-picture-actions]") as HTMLElement|null;if(!nextHost){nextHost=document.createElement("div");nextHost.dataset.targetPictureActions="1";nextHost.className="m238-soft-card rounded-2xl border p-4";const filter=pageRoot.children.item(1);if(filter?.nextSibling)pageRoot.insertBefore(nextHost,filter.nextSibling);else pageRoot.appendChild(nextHost)}setHost(nextHost);setMode((heading.textContent||"").trim() as FocusMode);setRoot(pageRoot)};scan();const observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect()},[]);
 if(!host||!mode||!root)return null;
 const build=async()=>{const data=getReportData(root,mode);const blob=await renderNative(data,mode);const clean=`M238-${mode}-${data.item}-${data.period}`.replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-");return{file:new File([blob],`${clean}.png`,{type:"image/png"}),period:data.period,item:data.item}};
 const download=async()=>{setBusy("picture");setNotice("");try{const{file}=await build(),url=URL.createObjectURL(file),a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);setNotice("PNG berhasil dibuat.")}catch(e){setNotice(e instanceof Error?e.message:"Gagal membuat picture")}finally{setBusy("")}};
 const share=async()=>{setBusy("share");setNotice("");try{const{file,period,item}=await build(),text=`M238 • ${mode} • ${item} • ${period}`;if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:text,text});setNotice("Pilih WhatsApp lalu grup tujuan.")}else{const url=URL.createObjectURL(file),a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);setNotice("Share file belum didukung browser ini. PNG berhasil dibuat.")}}catch(e){if(!(e instanceof DOMException&&e.name==="AbortError"))setNotice(e instanceof Error?e.message:"Gagal share picture")}finally{setBusy("")}};
 return createPortal(<div><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black">Share Report</p><p className="mt-1 text-xs text-slate-500">WA Card v4 • LOB staff + VAS ringkas</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={Boolean(busy)} onClick={()=>void download()} className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-black disabled:opacity-50">{busy==="picture"?<LoaderCircle className="size-4 animate-spin"/>:<FileImage className="size-4"/>}Picture Screenshot</button><button type="button" disabled={Boolean(busy)} onClick={()=>void share()} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{busy==="share"?<LoaderCircle className="size-4 animate-spin"/>:<Share2 className="size-4"/>}Share WhatsApp</button></div></div>{notice?<p className="mt-2 text-xs font-semibold text-slate-500">{notice}</p>:null}</div>,host);
}
