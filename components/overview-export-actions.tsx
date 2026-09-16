"use client";
import {useState} from "react";

const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const num=new Intl.NumberFormat("id-ID");
const pct=(v:number|null|undefined)=>v==null?"—":`${new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(v)}%`;
const month=(i:number)=>new Intl.DateTimeFormat("id-ID",{month:"long"}).format(new Date(`2026-${String(i).padStart(2,"0")}-01T00:00:00`));

type Lob={lob:string;amount2025:number;amount2026:number;qty2025:number;qty2026:number;growth:number|null;qtyGrowth:number|null};
type Row={month:number;amount2025:number;amount2026:number|null;qty2025:number;qty2026:number|null;growth:number|null;qtyGrowth:number|null;started:boolean};
export type OverviewExportData={compare:Row[];ytd:{amount2025:number;amount2026:number;qty2025:number;qty2026:number;growth:number;qtyGrowth:number;lobs:Lob[];throughMonth:number}};

function rr(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,fill:string,stroke="#e2e8f0"){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}
function t(ctx:CanvasRenderingContext2D,s:string,x:number,y:number,size=18,weight=500,color="#0f172a",align:CanvasTextAlign="left"){ctx.font=`${weight} ${size}px Arial`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline="middle";ctx.fillText(s,x,y)}
function g(v:number|null|undefined){if(v==null)return{t:"—",c:"#64748b"};return{t:`${v>=0?"▲":"▼"} ${pct(Math.abs(v))}`,c:v>=0?"#059669":"#ef4444"}}
function blobFromDataUrl(url:string){const [meta,b64]=url.split(","),mime=meta.match(/data:(.*?);/)?.[1]||"image/png",bin=atob(b64),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new Blob([bytes],{type:mime})}

function buildCanvas(data:OverviewExportData){
 const W=1200,H=1560,c=document.createElement("canvas");c.width=W;c.height=H;const ctx=c.getContext("2d");if(!ctx)throw new Error("Canvas tidak tersedia");
 ctx.fillStyle="#f8fafc";ctx.fillRect(0,0,W,H);
 t(ctx,"M238 Overview",36,52,32,900);t(ctx,"Ringkasan performa store dan team M238.",36,88,16,500,"#64748b");
 rr(ctx,930,28,234,54,12,"#ffffff");t(ctx,`Januari – ${month(data.ytd.throughMonth)} 2026`,1047,55,14,700,"#334155","center");
 rr(ctx,24,116,1152,530,18,"#ffffff");t(ctx,"YTD 2025 vs 2026",46,154,24,900);
 const cardY=190,cardW=548,cardH=426;
 ([2025,2026] as const).forEach((yr,idx)=>{
  const x=46+idx*(cardW+16),is26=yr===2026;
  rr(ctx,x,cardY,cardW,cardH,14,"#ffffff",is26?"#bbf7d0":"#bfdbfe");ctx.fillStyle=is26?"#ecfdf5":"#eff6ff";ctx.fillRect(x,cardY,cardW,52);t(ctx,String(yr),x+18,cardY+26,22,900,is26?"#047857":"#2563eb");
  t(ctx,"All Sales",x+18,cardY+82,15,800);t(ctx,"Qty",x+18,cardY+112,12,600,"#94a3b8");t(ctx,"Value",x+210,cardY+112,12,600,"#94a3b8");
  const q=is26?data.ytd.qty2026:data.ytd.qty2025,v=is26?data.ytd.amount2026:data.ytd.amount2025;t(ctx,num.format(q),x+18,cardY+140,22,900);t(ctx,money.format(v),x+210,cardY+140,20,900);
  if(is26){const gq=g(data.ytd.qtyGrowth),gv=g(data.ytd.growth);t(ctx,gq.t,x+350,cardY+130,14,800,gq.c);t(ctx,"Qty",x+350,cardY+152,11,500,"#94a3b8");t(ctx,gv.t,x+450,cardY+130,14,800,gv.c);t(ctx,"Value",x+450,cardY+152,11,500,"#94a3b8")}
  const ty=cardY+180,rowH=43;ctx.fillStyle="#f8fafc";ctx.fillRect(x+14,ty,cardW-28,rowH);t(ctx,"LOB",x+28,ty+rowH/2,12,800,"#64748b");t(ctx,"Qty",x+350,ty+rowH/2,12,800,"#64748b","right");t(ctx,"Value",x+510,ty+rowH/2,12,800,"#64748b","right");
  data.ytd.lobs.forEach((lob,i)=>{const y=ty+rowH*(i+1);ctx.strokeStyle="#e2e8f0";ctx.beginPath();ctx.moveTo(x+14,y);ctx.lineTo(x+cardW-14,y);ctx.stroke();t(ctx,lob.lob,x+28,y+rowH/2,13,800);t(ctx,num.format(is26?lob.qty2026:lob.qty2025),x+350,y+rowH/2,13,600,"#334155","right");t(ctx,money.format(is26?lob.amount2026:lob.amount2025),x+510,y+rowH/2,12,700,"#334155","right")});
 });
 rr(ctx,24,670,1152,860,18,"#ffffff");t(ctx,"Detail Per Bulan",46,708,24,900);
 const tabs=["All Sales","iPhone","iPad","Mac","Apple Watch","AirPods"];let tx=46;tabs.forEach((s,i)=>{const w=i===0?110:100;rr(ctx,tx,738,w,38,9,i===0?"#2563eb":"#ffffff");t(ctx,s,tx+w/2,757,11,800,i===0?"#ffffff":"#475569","center");tx+=w+6});
 const x0=46,y0=800,rowH=47,widths=[150,95,210,95,210,115,115],heads=["Bulan","2025 Qty","2025 Value","2026 Qty","2026 Value","Growth Qty","Growth Value"];
 let xp=x0;heads.forEach((h,i)=>{ctx.fillStyle="#f1f5f9";ctx.fillRect(xp,y0,widths[i],rowH);t(ctx,h,xp+widths[i]/2,y0+rowH/2,11,800,"#475569","center");xp+=widths[i]});
 data.compare.forEach((r,ri)=>{const y=y0+rowH*(ri+1);ctx.strokeStyle="#e2e8f0";ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x0+widths.reduce((a,b)=>a+b,0),y);ctx.stroke();const vals=[month(r.month),num.format(r.qty2025),money.format(r.amount2025),r.started?num.format(r.qty2026||0):"—",r.started?money.format(r.amount2026||0):"—"];let x=x0;vals.forEach((v,i)=>{t(ctx,v,x+(i===0?12:widths[i]-10),y+rowH/2,i===0?12:11,i===0?700:500,"#334155",i===0?"left":"right");x+=widths[i]});const gq=g(r.started?r.qtyGrowth:null),gv=g(r.started?r.growth:null);t(ctx,gq.t,x+widths[5]/2,y+rowH/2,11,800,gq.c,"center");x+=widths[5];t(ctx,gv.t,x+widths[6]/2,y+rowH/2,11,800,gv.c,"center")});
 const fy=y0+rowH*13;ctx.fillStyle="#f8fafc";ctx.fillRect(x0,fy,widths.reduce((a,b)=>a+b,0),rowH);const vals=["YTD",num.format(data.ytd.qty2025),money.format(data.ytd.amount2025),num.format(data.ytd.qty2026),money.format(data.ytd.amount2026)];let fx=x0;vals.forEach((v,i)=>{t(ctx,v,fx+(i===0?12:widths[i]-10),fy+rowH/2,i===0?12:11,900,"#0f172a",i===0?"left":"right");fx+=widths[i]});const ygq=g(data.ytd.qtyGrowth),ygv=g(data.ytd.growth);t(ctx,ygq.t,fx+widths[5]/2,fy+rowH/2,11,900,ygq.c,"center");fx+=widths[5];t(ctx,ygv.t,fx+widths[6]/2,fy+rowH/2,11,900,ygv.c,"center");return c;
}

export default function OverviewExportActions({data}:{data:OverviewExportData}){
 const[busy,setBusy]=useState<"wa"|"pic"|null>(null),[error,setError]=useState("");
 const make=()=>buildCanvas(data).toDataURL("image/png",1);
 const picture=()=>{try{setError("");setBusy("pic");const url=make(),a=document.createElement("a");a.download="M238-YTD-2025-vs-2026.png";a.href=url;document.body.appendChild(a);a.click();a.remove()}catch(e){setError(e instanceof Error?e.message:"Picture Screenshot gagal dibuat")}finally{setBusy(null)}};
 const wa=async()=>{try{setError("");setBusy("wa");const url=make(),blob=blobFromDataUrl(url),file=new File([blob],"M238-YTD-2025-vs-2026.png",{type:"image/png"});const nav=navigator as Navigator&{canShare?:(x:ShareData)=>boolean};if(nav.share&&(!nav.canShare||nav.canShare({files:[file]}))){await nav.share({title:"M238 YTD Overview",text:"M238 YTD 2025 vs 2026",files:[file]})}else{setError("Share file tidak didukung browser ini. Gunakan Picture Screenshot lalu kirim ke WhatsApp.")}}catch(e){if(e instanceof DOMException&&e.name==="AbortError")return;setError(e instanceof Error?e.message:"Share WA gagal dibuka")}finally{setBusy(null)}};
 return <div><div className="flex flex-wrap gap-2"><button type="button" onClick={wa} disabled={!!busy} className="rounded-xl border bg-white px-3 py-2 text-sm font-black shadow-sm disabled:opacity-50">{busy==="wa"?"Membuat...":"Share by WA"}</button><button type="button" onClick={picture} disabled={!!busy} className="rounded-xl border bg-white px-3 py-2 text-sm font-black shadow-sm disabled:opacity-50">{busy==="pic"?"Membuat...":"Picture Screenshot"}</button></div>{error&&<p className="mt-2 max-w-xl text-sm font-bold text-rose-600">{error}</p>}</div>;
}
