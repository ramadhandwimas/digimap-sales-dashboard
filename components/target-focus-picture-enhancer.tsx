"use client";

import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {FileImage,LoaderCircle,Share2} from "lucide-react";

type FocusMode="LOB Target Fokus"|"Product Fokus 3PP"|"VAS Fokus";
type TableRow={name:string;qty?:number;achievement?:string;target?:string;gap?:string;ar?:string;achievementPct?:string;contribution?:string;status?:string;active:boolean};
type ReportData={period:string;item:string;status:string;target:string;achievement:string;percent:string;gap:string;qty:string;rows:TableRow[];zeroCount:number};

function findSection(root:HTMLElement,marker:string){return Array.from(root.querySelectorAll<HTMLElement>("section")).find(el=>(el.textContent||"").includes(marker))||null}
function pickAfter(lines:string[],label:string){const i=lines.findIndex(x=>x.toLowerCase()===label.toLowerCase());return i>=0?(lines[i+1]||""):""}
function idNumber(v:string){const n=Number(String(v||"").replace(/[^0-9-]/g,""));return Number.isFinite(n)?n:0}
function pctId(v:number){return `${new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(Number.isFinite(v)?v:0)}%`}
function money(v:number){return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v)}

function getLobRows(selected:HTMLElement,achievementTotal:number){
 const rows:TableRow[]=[];
 const title=Array.from(selected.querySelectorAll<HTMLElement>("p")).find(x=>(x.textContent||"").trim()==="Ranking Staff Contribution");
 const wrap=title?.nextElementSibling as HTMLElement|null;
 if(!wrap)return{rows,zeroCount:0};
 for(const row of Array.from(wrap.children) as HTMLElement[]){
  const name=row.querySelector("span")?.textContent?.replace(/^\s*\d+\.\s*/,"").trim()||"";
  const bolds=Array.from(row.querySelectorAll("b"));
  const qtyText=(bolds[bolds.length-1]?.textContent||"").trim();
  const qty=idNumber(qtyText);
  if(!name)continue;
  rows.push({name,qty,contribution:pctId(achievementTotal>0?qty/achievementTotal*100:0),status:qty>0?"Terjual":"-",active:qty>0});
 }
 return{rows:rows.filter(r=>r.active).slice(0,8),zeroCount:rows.filter(r=>!r.active).length};
}

function get3ppRows(root:HTMLElement){
 const section=findSection(root,"Penjualan Staff •");
 if(!section)return{rows:[] as TableRow[],zeroCount:0};
 const all:TableRow[]=[];
 for(const tr of Array.from(section.querySelectorAll("tbody tr"))){
  const c=Array.from(tr.querySelectorAll("td")).map(td=>(td.textContent||"").replace(/\s+/g," ").trim());
  if(!c[0])continue;
  const qty=idNumber(c[1]),value=idNumber(c[2]);
  all.push({name:c[0],qty,achievement:c[2]||money(0),contribution:c[3]||"0%",active:qty>0||value>0});
 }
 return{rows:all.filter(r=>r.active).slice(0,8),zeroCount:all.filter(r=>!r.active).length};
}

function getVasRows(root:HTMLElement){
 const section=findSection(root,"Penjualan Staff •");
 if(!section)return{rows:[] as TableRow[],zeroCount:0};
 const all:TableRow[]=[];
 for(const tr of Array.from(section.querySelectorAll("tbody tr"))){
  const c=Array.from(tr.querySelectorAll("td")).map(td=>(td.textContent||"").replace(/\s+/g," ").trim());
  if(!c[0])continue;
  const target=idNumber(c[1]),ach=idNumber(c[2]),qty=idNumber(c[4]);
  all.push({name:c[0],target:c[1]||money(0),achievement:c[2]||money(0),gap:c[3]||money(0),qty,ar:c[6]||"0%",achievementPct:pctId(target>0?ach/target*100:0),status:c[7]||"Critical",active:ach>0||qty>0});
 }
 return{rows:all.filter(r=>r.active).slice(0,8),zeroCount:all.filter(r=>!r.active).length};
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
 const gap=pickAfter(lines,"Gap Value")||pickAfter(lines,"Gap")||"-";
 const qty=pickAfter(lines,"Actual Qty")||"-";
 let percent="";
 if(mode==="LOB Target Fokus"){
  const t=idNumber(target),a=idNumber(achievement);percent=pctId(t>0?a/t*100:0);
 }else{
  const ai=lines.findIndex(x=>x.toLowerCase()==="achievement");
  percent=ai>=0&&/%/.test(lines[ai+2]||"")?lines[ai+2]:"";
 }
 let parsed:{rows:TableRow[];zeroCount:number};
 if(mode==="LOB Target Fokus")parsed=getLobRows(selected,idNumber(achievement));
 else if(mode==="Product Fokus 3PP")parsed=get3ppRows(root);
 else parsed=getVasRows(root);
 return{period,item,status,target,achievement,percent,gap,qty,rows:parsed.rows,zeroCount:parsed.zeroCount};
}

function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()}
function canvasBlob(canvas:HTMLCanvasElement){return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Gagal membuat PNG")),"image/png",1))}
function fitText(ctx:CanvasRenderingContext2D,text:string,maxWidth:number,start:number,min=14,weight=700){let size=start;while(size>min){ctx.font=`${weight} ${size}px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;if(ctx.measureText(text).width<=maxWidth)break;size-=1}return size}
function drawText(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,maxWidth:number,size=18,weight=600,color="#0f172a",align:CanvasTextAlign="left"){
 const s=fitText(ctx,text,maxWidth,size,12,weight);ctx.font=`${weight} ${s}px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(text,x,y);ctx.textAlign="left";
}
function badge(ctx:CanvasRenderingContext2D,text:string,x:number,y:number){const colors=text==="Achieve"?["#dcfce7","#166534"]:text==="Need Push"?["#fef3c7","#92400e"]:text==="Terjual"?["#dbeafe","#1d4ed8"]:["#fee2e2","#b91c1c"];ctx.font="800 17px -apple-system,BlinkMacSystemFont,Arial,sans-serif";const w=ctx.measureText(text).width+28;ctx.fillStyle=colors[0];roundRect(ctx,x-w,y-25,w,34,17);ctx.fill();ctx.fillStyle=colors[1];ctx.fillText(text,x-w+14,y-2)}

function drawSummary(ctx:CanvasRenderingContext2D,data:ReportData,mode:FocusMode,width:number,pad:number,y:number){
 const inner=width-pad*2;ctx.fillStyle="#f8fafc";roundRect(ctx,pad,y,inner,340,24);ctx.fill();
 drawText(ctx,mode==="Product Fokus 3PP"?"SUPPLIER DIPILIH":mode==="VAS Fokus"?"PROVIDER DIPILIH":"PRODUCT DIPILIH",pad+26,y+38,400,18,800,"#2563eb");
 drawText(ctx,data.item,pad+26,y+82,inner-52,34,800);
 const cards=mode==="LOB Target Fokus"?
  [{label:"Target Qty",value:data.target},{label:"Achievement Qty",value:data.achievement},{label:"Gap Qty",value:data.gap},{label:"Achievement %",value:data.percent||"-"}]:
  [{label:"Target Value",value:data.target},{label:"Achievement",value:data.achievement,sub:data.percent},{label:"Gap Value",value:data.gap},{label:"Actual Qty",value:data.qty}];
 const cw=(inner-76)/2,ch=88;
 cards.forEach((c,i)=>{const col=i%2,row=Math.floor(i/2),x=pad+26+col*(cw+24),cy=y+106+row*(ch+18);ctx.fillStyle="#ffffff";roundRect(ctx,x,cy,cw,ch,18);ctx.fill();drawText(ctx,c.label,x+18,cy+27,cw-36,17,600,"#94a3b8");drawText(ctx,c.value||"-",x+18,cy+60,cw-36,26,800);if("sub" in c&&c.sub)drawText(ctx,c.sub,x+18,cy+82,cw-36,16,700,"#64748b")});
 return y+372;
}

function drawTable(ctx:CanvasRenderingContext2D,data:ReportData,mode:FocusMode,width:number,pad:number,startY:number){
 let y=startY;const inner=width-pad*2;
 drawText(ctx,`Penjualan Staff • ${data.item}`,pad,y,inner,28,800);y+=36;
 drawText(ctx,"Staff dengan transaksi ditampilkan lebih dulu",pad,y,inner,17,500,"#64748b");y+=30;
 if(!data.rows.length){ctx.fillStyle="#f8fafc";roundRect(ctx,pad,y,inner,58,12);ctx.fill();drawText(ctx,"Belum ada staff dengan transaksi pada pilihan ini",pad+18,y+36,inner-36,18,700,"#64748b");return y+74}

 if(mode==="LOB Target Fokus"){
  const cols=[50,430,120,180,150];const headers=["No","Nama Staff","Qty","Contribution %","Status"];
  ctx.fillStyle="#eaf1fb";roundRect(ctx,pad,y,inner,46,12);ctx.fill();let x=pad;headers.forEach((h,i)=>{drawText(ctx,h,x+10,y+29,cols[i]-20,16,800,"#334155");x+=cols[i]});y+=46;
  data.rows.forEach((r,i)=>{ctx.fillStyle=i%2?"#ffffff":"#f8fafc";ctx.fillRect(pad,y,inner,54);x=pad;const vals=[String(i+1),r.name,`${r.qty||0} unit`,r.contribution||"0%",r.status||"-"];vals.forEach((v,j)=>{drawText(ctx,v,x+10,y+34,cols[j]-20,j===1?17:16,j===1?700:600,j===4?"#1d4ed8":"#0f172a");x+=cols[j]});y+=54});
 }else if(mode==="Product Fokus 3PP"){
  const cols=[50,390,110,210,196];const headers=["No","Nama Staff","Qty","Achievement","Contribution %"];
  ctx.fillStyle="#eaf1fb";roundRect(ctx,pad,y,inner,46,12);ctx.fill();let x=pad;headers.forEach((h,i)=>{drawText(ctx,h,x+10,y+29,cols[i]-20,16,800,"#334155");x+=cols[i]});y+=46;
  data.rows.forEach((r,i)=>{ctx.fillStyle=i%2?"#ffffff":"#f8fafc";ctx.fillRect(pad,y,inner,54);x=pad;const vals=[String(i+1),r.name,`${r.qty||0}`,r.achievement||money(0),r.contribution||"0% "];vals.forEach((v,j)=>{drawText(ctx,v,x+10,y+34,cols[j]-20,j===1?17:16,j===1?700:600);x+=cols[j]});y+=54});
 }else{
  const cols=[50,360,200,210,190,100,140,150];const headers=["No","Nama Staff","Target","Achievement","Gap","AR","Ach %","Status"];
  ctx.fillStyle="#eaf1fb";roundRect(ctx,pad,y,inner,48,12);ctx.fill();let x=pad;headers.forEach((h,i)=>{drawText(ctx,h,x+8,y+30,cols[i]-16,15,800,"#334155");x+=cols[i]});y+=48;
  data.rows.forEach((r,i)=>{ctx.fillStyle=i%2?"#ffffff":"#f8fafc";ctx.fillRect(pad,y,inner,58);x=pad;const vals=[String(i+1),r.name,r.target||money(0),r.achievement||money(0),r.gap||money(0),r.ar||"0%",r.achievementPct||"0%",r.status||"-"];vals.forEach((v,j)=>{drawText(ctx,v,x+8,y+36,cols[j]-16,j===1?16:14,j===1?700:600,j===7?(v==="Achieve"?"#166534":v==="Need Push"?"#92400e":"#b91c1c"):"#0f172a");x+=cols[j]});y+=58});
 }
 if(data.zeroCount){ctx.fillStyle="#eef2ff";roundRect(ctx,pad,y+10,inner,48,12);ctx.fill();drawText(ctx,`${data.zeroCount} staff lainnya belum ada penjualan`,pad+16,y+40,inner-32,17,700,"#475569");y+=66}
 return y;
}

async function renderNative(data:ReportData,mode:FocusMode){
 const width=mode==="VAS Fokus"?1500:1080,pad=mode==="VAS Fokus"?70:62;
 const tableRows=data.rows.length;const rowHeight=mode==="VAS Fokus"?58:54;
 const approxHeight=218+372+92+48+tableRows*rowHeight+(data.zeroCount?66:0)+90;
 const height=Math.max(860,approxHeight);
 const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas tidak tersedia");
 ctx.fillStyle="#f1f5f9";ctx.fillRect(0,0,width,height);ctx.fillStyle="#ffffff";roundRect(ctx,28,28,width-56,height-56,32);ctx.fill();
 drawText(ctx,"M238 • TARGET FOKUS",pad,84,500,23,800,"#2563eb");
 drawText(ctx,mode,pad,138,width-pad*2-300,44,800);
 drawText(ctx,`${data.period} • ${data.item}`,pad,180,width-pad*2-300,24,600,"#64748b");
 if(data.status)badge(ctx,data.status,width-pad,94);
 let y=218;y=drawSummary(ctx,data,mode,width,pad,y);y+=34;y=drawTable(ctx,data,mode,width,pad,y);
 drawText(ctx,"Generated from M238 Dashboard",pad,height-44,width-pad*2,17,500,"#94a3b8");
 return canvasBlob(canvas);
}

export default function TargetFocusPictureEnhancer(){
 const[host,setHost]=useState<HTMLElement|null>(null),[mode,setMode]=useState<FocusMode|null>(null),[root,setRoot]=useState<HTMLElement|null>(null),[busy,setBusy]=useState<"picture"|"share"|"">(""),[notice,setNotice]=useState("");
 useEffect(()=>{const scan=()=>{const native=document.querySelector(".m238-native-view") as HTMLElement|null;if(!native){setHost(null);setMode(null);setRoot(null);return}const heading=Array.from(native.querySelectorAll("h2")).find(h=>["LOB Target Fokus","Product Fokus 3PP","VAS Fokus"].includes((h.textContent||"").trim())) as HTMLElement|undefined;if(!heading){setHost(null);setMode(null);setRoot(null);return}const pageRoot=heading.closest("div.space-y-5") as HTMLElement|null;if(!pageRoot)return;let nextHost=pageRoot.querySelector("[data-target-picture-actions]") as HTMLElement|null;if(!nextHost){nextHost=document.createElement("div");nextHost.dataset.targetPictureActions="1";nextHost.className="m238-soft-card rounded-2xl border p-4";const filter=pageRoot.children.item(1);if(filter?.nextSibling)pageRoot.insertBefore(nextHost,filter.nextSibling);else pageRoot.appendChild(nextHost)}setHost(nextHost);setMode((heading.textContent||"").trim() as FocusMode);setRoot(pageRoot)};scan();const observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect()},[]);
 if(!host||!mode||!root)return null;
 const build=async()=>{const data=getReportData(root,mode);const blob=await renderNative(data,mode);const clean=`M238-${mode}-${data.item}-${data.period}`.replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-");return{file:new File([blob],`${clean}.png`,{type:"image/png"}),period:data.period,item:data.item}};
 const download=async()=>{setBusy("picture");setNotice("");try{const{file}=await build(),url=URL.createObjectURL(file),a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);setNotice("PNG berhasil dibuat.")}catch(e){setNotice(e instanceof Error?e.message:"Gagal membuat picture")}finally{setBusy("")}};
 const share=async()=>{setBusy("share");setNotice("");try{const{file,period,item}=await build(),text=`M238 • ${mode} • ${item} • ${period}`;if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:text,text});setNotice("Pilih WhatsApp lalu grup tujuan.")}else{const url=URL.createObjectURL(file),a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);setNotice("Share file belum didukung browser ini. PNG berhasil dibuat.")}}catch(e){if(!(e instanceof DOMException&&e.name==="AbortError"))setNotice(e instanceof Error?e.message:"Gagal share picture")}finally{setBusy("")}};
 return createPortal(<div><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black">Share Report</p><p className="mt-1 text-xs text-slate-500">WA Table v5 • summary + tabel staff</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={Boolean(busy)} onClick={()=>void download()} className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-black disabled:opacity-50">{busy==="picture"?<LoaderCircle className="size-4 animate-spin"/>:<FileImage className="size-4"/>}Picture Screenshot</button><button type="button" disabled={Boolean(busy)} onClick={()=>void share()} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{busy==="share"?<LoaderCircle className="size-4 animate-spin"/>:<Share2 className="size-4"/>}Share WhatsApp</button></div></div>{notice?<p className="mt-2 text-xs font-semibold text-slate-500">{notice}</p>:null}</div>,host);
}
