"use client";
import {useEffect} from "react";

type LiveRow={name:string;liveStatus?:string;statusTone?:string;shiftStart?:string;shiftEnd?:string;shiftProgress?:number;paceTarget?:number};
type VasMetric={qty:number;value:number};
type DailyStaff={id:string;name:string;position:string;status:string;amount:number;accessories:number;vas:number;qty:number;invoices:number;upt:number;atv:number;targets:{amount:number;accessories:number;vas:number};lob:{iphone:number;mac:number;ipad:number;watch:number;airpods:number};vasDetail:{qoala:VasMetric;telkomsel:VasMetric;xl:VasMetric;indosat:VasMetric}};
type DailyPayload={date:string;staff:DailyStaff[];total:{amount:number;target:number;accessories:number;accTarget:number;vas:number;vasTarget:number;qty:number;invoices:number;upt:number};error?:string};
const norm=(v:string)=>v.trim().toUpperCase().replace(/\s+/g," ");
const money=(v:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number.isFinite(v)?v:0);
const num=(v:number)=>new Intl.NumberFormat("id-ID").format(Number.isFinite(v)?v:0);
const pct=(v:number)=>`${new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(Number.isFinite(v)?v:0)}%`;
const ach=(v:number,t:number)=>t?v/t*100:0;
const today=()=>new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());
const shareTime=()=>new Intl.DateTimeFormat("id-ID",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Asia/Jakarta"}).format(new Date()).replace(":",".");
function rr(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function clip(ctx:CanvasRenderingContext2D,text:string,max:number){if(ctx.measureText(text).width<=max)return text;let s=text;while(s.length>2&&ctx.measureText(s+"…").width>max)s=s.slice(0,-1);return s+"…"}
async function fetchDaily():Promise<DailyPayload>{const d=today(),r=await fetch(`/api/daily?date=${d}&t=${Date.now()}`,{cache:"no-store"}),j=await r.json();if(!r.ok||j?.error)throw new Error(j?.error||"Gagal membaca Daily Sales");return j}
async function makeDailySalesPicture(data:DailyPayload){
 const rows=data.staff||[],t=data.total,W=1800,p=58,g=20,cw=(W-p*2-g*3)/4,rh=72,hy=516,hh=64,H=Math.max(1050,hy+hh+rh*(rows.length+1)+100),c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");if(!x)throw new Error("Canvas tidak tersedia");
 x.fillStyle="#f8fafc";x.fillRect(0,0,W,H);x.fillStyle="#fff";rr(x,28,28,W-56,H-56,28);x.fill();x.fillStyle="#2563eb";x.font="800 22px Arial";x.fillText("M238 • DAILY SALES",p,78);x.fillStyle="#0f172a";x.font="800 42px Arial";x.fillText("Digimap PIM 2",p,130);x.fillStyle="#64748b";x.font="600 24px Arial";x.fillText(new Intl.DateTimeFormat("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Jakarta"}).format(new Date()),p,170);x.textAlign="right";x.fillStyle="#94a3b8";x.font="500 18px Arial";x.fillText("Generated from M238 Dashboard",W-p,82);x.textAlign="left";
 const cards=[{a:"Target vs Achievement",b:`${money(t.amount)} / ${money(t.target)}`,c:pct(ach(t.amount,t.target)),d:"#2563eb"},{a:"VAS vs Achievement",b:`${money(t.vas)} / ${money(t.vasTarget)}`,c:pct(ach(t.vas,t.vasTarget)),d:"#059669"},{a:"ACC vs Achievement",b:`${money(t.accessories)} / ${money(t.accTarget)}`,c:pct(ach(t.accessories,t.accTarget)),d:"#7c3aed"},{a:"UPT",b:(t.upt||0).toFixed(1),c:`${num(t.qty)} unit / ${num(t.invoices)} transaksi`,d:"#d97706"}];
 cards.forEach((z,i)=>{const xx=p+i*(cw+g),y=215;x.fillStyle="#fff";x.strokeStyle="#e2e8f0";x.lineWidth=2;rr(x,xx,y,cw,160,20);x.fill();x.stroke();x.fillStyle=z.d;rr(x,xx+20,y+20,44,44,12);x.fill();x.fillStyle="#475569";x.font="700 20px Arial";x.fillText(z.a,xx+78,y+49);x.fillStyle="#0f172a";x.font="800 26px Arial";x.fillText(clip(x,z.b,cw-40),xx+20,y+102);x.fillStyle="#64748b";x.font="700 20px Arial";x.fillText(z.c,xx+20,y+137)});
 x.fillStyle="#0f172a";x.font="800 30px Arial";x.fillText("Daily Sales Staff",p,454);x.fillStyle="#64748b";x.font="500 19px Arial";x.fillText("Staff in-charge sesuai schedule hari berjalan",p,487);
 const cols=[{l:"Nama",w:360,a:"left"},{l:"Status",w:150,a:"left"},{l:"Target",w:205,a:"right"},{l:"ACC",w:170,a:"right"},{l:"VAS",w:170,a:"right"},{l:"Achievement",w:220,a:"right"},{l:"%",w:100,a:"right"},{l:"UPT",w:95,a:"right"},{l:"ATV",w:220,a:"right"}] as const;let xx=p;x.fillStyle="#f8fafc";x.fillRect(p,hy,W-p*2,hh);x.strokeStyle="#e2e8f0";x.strokeRect(p,hy,W-p*2,hh);x.font="800 18px Arial";x.fillStyle="#334155";for(const col of cols){x.textAlign=col.a==="right"?"right":"left";x.fillText(col.l,col.a==="right"?xx+col.w-14:xx+14,hy+39);xx+=col.w}x.textAlign="left";
 const row=(r:DailyStaff|undefined,i:number,total=false)=>{const y=hy+hh+i*rh;x.fillStyle=total?"#f1f5f9":i%2?"#fbfdff":"#fff";x.fillRect(p,y,W-p*2,rh);x.strokeStyle="#e2e8f0";x.beginPath();x.moveTo(p,y+rh);x.lineTo(W-p,y+rh);x.stroke();const v=total?["TOTAL","—",money(t.target),money(t.accessories),money(t.vas),money(t.amount),pct(ach(t.amount,t.target)),(t.upt||0).toFixed(1),money(t.invoices?t.amount/t.invoices:0)]:[r!.name,r!.status,money(r!.targets.amount),money(r!.accessories),money(r!.vas),money(r!.amount),pct(ach(r!.amount,r!.targets.amount)),r!.upt.toFixed(1),money(r!.atv)];let rx=p;cols.forEach((col,j)=>{x.textAlign=col.a==="right"?"right":"left";x.fillStyle="#0f172a";x.font=`${total?"800":"700"} ${j===0?19:18}px Arial`;const tx=col.a==="right"?rx+col.w-14:rx+14;x.fillText(clip(x,v[j],col.w-28),tx,y+(total?43:30));if(!total&&j===0){x.fillStyle="#94a3b8";x.font="500 15px Arial";x.fillText(clip(x,r!.position||"Sales Advisor",col.w-28),tx,y+54)}rx+=col.w});x.textAlign="left"};rows.forEach((r,i)=>row(r,i));row(undefined,rows.length,true);x.fillStyle="#94a3b8";x.font="500 17px Arial";x.fillText("Daily sales report • M238 PIM 2",p,H-45);return new Promise<Blob>((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("Gagal membuat PNG")),"image/png",1))
}

function baseReportCanvas(title:string,sub:string,rows:number){
 const W=2048,p=28,headerY=112,theadY=170,theadH=54,rowH=48,H=Math.max(620,theadY+theadH+(rows+1)*rowH+38);
 const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas tidak tersedia");
 ctx.fillStyle="#f8fafc";ctx.fillRect(0,0,W,H);
 ctx.fillStyle="#ffffff";ctx.fillRect(8,8,W-16,H-16);
 ctx.fillStyle="#0f172a";ctx.font="800 30px Arial";ctx.fillText(title,p,58);
 ctx.fillStyle="#64748b";ctx.font="500 20px Arial";ctx.fillText(sub,p,91);
 return{canvas,ctx,W,H,p,theadY,theadH,rowH};
}
function drawTableHeader(ctx:CanvasRenderingContext2D,p:number,y:number,w:number,h:number,cols:{label:string;width:number;align:"left"|"right"}[]){
 ctx.fillStyle="#eef2f7";ctx.fillRect(p,y,w,h);
 let x=p;ctx.font="800 17px Arial";ctx.fillStyle="#61738c";
 for(const col of cols){ctx.textAlign=col.align;ctx.fillText(col.label,col.align==="right"?x+col.width-10:x+10,y+34);x+=col.width}
 ctx.textAlign="left";
}
function drawGridRow(ctx:CanvasRenderingContext2D,p:number,y:number,w:number,h:number,cols:{width:number;align:"left"|"right"}[],values:string[],index:number,total=false){
 ctx.fillStyle=total?"#f1f5f9":index%2?"#f8fafc":"#ffffff";ctx.fillRect(p,y,w,h);
 ctx.strokeStyle="#e5e7eb";ctx.beginPath();ctx.moveTo(p,y+h);ctx.lineTo(p+w,y+h);ctx.stroke();
 let x=p;ctx.font=`${total?"800":"700"} 18px Arial`;ctx.fillStyle="#111827";
 cols.forEach((col,i)=>{ctx.textAlign=col.align;ctx.fillText(clip(ctx,values[i]||"",col.width-20),col.align==="right"?x+col.width-10:x+10,y+31);x+=col.width});
 ctx.textAlign="left";
}
async function canvasBlob(canvas:HTMLCanvasElement){return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Gagal membuat PNG")),"image/png",1))}
async function makeLobPicture(data:DailyPayload,stamp:string){
 const rows=data.staff||[],base=baseReportCanvas("LOB Apple Daily",`M238 PIM 2 • Update sales jam ${stamp} WIB • iPhone, MacBook, iPad, dan Watch = device Apple • AirPods = accessories Apple`,rows.length);
 const cols=[{label:"NAMA",width:520,align:"left" as const},{label:"IPHONE (DEVICE)",width:300,align:"right" as const},{label:"MACBOOK (DEVICE)",width:300,align:"right" as const},{label:"IPAD (DEVICE)",width:260,align:"right" as const},{label:"APPLE WATCH (DEVICE)",width:330,align:"right" as const},{label:"AIRPODS (ACCESSORIES)",width:282,align:"right" as const}];
 drawTableHeader(base.ctx,base.p,base.theadY,base.W-base.p*2,base.theadH,cols);
 const totals={iphone:0,mac:0,ipad:0,watch:0,airpods:0};
 rows.forEach((r,i)=>{totals.iphone+=r.lob?.iphone||0;totals.mac+=r.lob?.mac||0;totals.ipad+=r.lob?.ipad||0;totals.watch+=r.lob?.watch||0;totals.airpods+=r.lob?.airpods||0;drawGridRow(base.ctx,base.p,base.theadY+base.theadH+i*base.rowH,base.W-base.p*2,base.rowH,cols,[r.name,String(r.lob?.iphone||0),String(r.lob?.mac||0),String(r.lob?.ipad||0),String(r.lob?.watch||0),String(r.lob?.airpods||0)],i)});
 drawGridRow(base.ctx,base.p,base.theadY+base.theadH+rows.length*base.rowH,base.W-base.p*2,base.rowH,cols,["TOTAL",String(totals.iphone),String(totals.mac),String(totals.ipad),String(totals.watch),String(totals.airpods)],rows.length,true);
 return canvasBlob(base.canvas)
}
async function makeVasPicture(data:DailyPayload,stamp:string){
 const rows=data.staff||[],base=baseReportCanvas("VAS Daily",`M238 PIM 2 • Update sales jam ${stamp} WIB • Sumber RAW SalesPerson AB–AR`,rows.length);
 const cols=[{label:"NAMA",width:560,align:"left" as const},{label:"QOALA QTY / VALUE",width:390,align:"right" as const},{label:"TELKOMSEL QTY / VALUE",width:390,align:"right" as const},{label:"XL QTY / VALUE",width:340,align:"right" as const},{label:"INDOSAT QTY / VALUE",width:310,align:"right" as const}];
 drawTableHeader(base.ctx,base.p,base.theadY,base.W-base.p*2,base.theadH,cols);
 const keys=["qoala","telkomsel","xl","indosat"] as const,totals={qoala:{qty:0,value:0},telkomsel:{qty:0,value:0},xl:{qty:0,value:0},indosat:{qty:0,value:0}};
 rows.forEach((r,i)=>{const vals=keys.map(k=>{const v=r.vasDetail?.[k]||{qty:0,value:0};totals[k].qty+=v.qty;totals[k].value+=v.value;return `${v.qty} / ${money(v.value)}`});drawGridRow(base.ctx,base.p,base.theadY+base.theadH+i*base.rowH,base.W-base.p*2,base.rowH,cols,[r.name,...vals],i)});
 const totalVals=keys.map(k=>`${totals[k].qty} / ${money(totals[k].value)}`);
 drawGridRow(base.ctx,base.p,base.theadY+base.theadH+rows.length*base.rowH,base.W-base.p*2,base.rowH,cols,["TOTAL",...totalVals],rows.length,true);
 return canvasBlob(base.canvas)
}
async function makeShareFiles(data:DailyPayload){
 const stamp=shareTime();
 const [daily,lob,vas]=await Promise.all([makeDailySalesPicture(data),makeLobPicture(data,stamp),makeVasPicture(data,stamp)]);
 return{
  stamp,
  files:[
   new File([daily],`01-M238-Daily-Sales-${data.date}-${stamp}.png`,{type:"image/png"}),
   new File([lob],`02-M238-LOB-Apple-Daily-${data.date}-${stamp}.png`,{type:"image/png"}),
   new File([vas],`03-M238-VAS-Daily-${data.date}-${stamp}.png`,{type:"image/png"})
  ]
 }
}
function downloadFiles(files:File[]){
 files.forEach((file,index)=>setTimeout(()=>{const u=URL.createObjectURL(file),a=document.createElement("a");a.href=u;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1600)},index*180))
}
export default function DailySalesAlerts(){
 useEffect(()=>{
  let stopped=false,lastFetch=0,data:{staff?:LiveRow[]}|null=null;
  const findTable=()=>{const section=Array.from(document.querySelectorAll("section")).find(x=>x.textContent?.includes("Daily Sales Staff"));return section?.querySelector("table")||null};
  const apply=()=>{const table=findTable();if(!table||!data?.staff)return;const head=Array.from(table.querySelectorAll("thead th")).map(x=>(x.textContent||"").trim().toLowerCase()),idx=head.findIndex(x=>x==="status");if(idx<0)return;const byName=new Map(data.staff.map(x=>[norm(x.name),x]));for(const tr of Array.from(table.querySelectorAll("tbody tr"))){const cells=Array.from(tr.querySelectorAll("td"));if(!cells.length||cells[0]?.textContent?.trim()==="TOTAL")continue;const meta=byName.get(norm(cells[0]?.querySelector("b")?.textContent||cells[0]?.textContent||""));if(meta&&cells[idx])cells[idx].textContent=meta.liveStatus||"—"}};
  const refresh=async()=>{if(!findTable())return;const now=Date.now();if(data&&now-lastFetch<55000){apply();return}lastFetch=now;try{const r=await fetch(`/api/daily?date=${today()}&t=${now}`,{cache:"no-store"}),j=await r.json();if(!stopped&&r.ok){data=j;apply()}}catch{}};
  const inject=()=>{const h=Array.from(document.querySelectorAll("h1")).find(x=>(x.textContent||"").trim()==="Daily Sales") as HTMLElement|undefined;if(!h)return;const root=h.closest("div.space-y-5") as HTMLElement|null;if(!root||root.querySelector("[data-daily-share]"))return;const box=document.createElement("div");box.dataset.dailyShare="1";box.className="export-hide rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950";box.innerHTML='<div class="flex flex-wrap items-center justify-between gap-3"><div><p class="font-black">Share Report</p><p class="mt-1 text-xs text-slate-500">Pilih report yang ingin dibagikan ke WhatsApp</p></div><div class="relative flex flex-wrap gap-2"><button data-pic class="rounded-xl border px-4 py-2 text-sm font-black">Buat 3 Foto</button><button data-share class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">Share WhatsApp ▾</button><div data-share-menu class="absolute right-0 top-full z-50 mt-2 hidden min-w-[220px] overflow-hidden rounded-2xl border bg-white p-1.5 shadow-xl dark:bg-slate-950"><button data-share-kind="daily" class="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm font-black hover:bg-slate-50 dark:hover:bg-slate-900">Daily Sales Staff</button><button data-share-kind="lob" class="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm font-black hover:bg-slate-50 dark:hover:bg-slate-900">LOB Daily</button><button data-share-kind="vas" class="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm font-black hover:bg-slate-50 dark:hover:bg-slate-900">VAS Daily</button></div></div></div><p data-note class="mt-2 text-xs font-semibold text-slate-500"></p>';const header=h.parentElement?.parentElement;if(header?.nextSibling)root.insertBefore(box,header.nextSibling);else root.prepend(box);const note=box.querySelector("[data-note]") as HTMLElement;const build=async()=>{const d=await fetchDaily();return{data:d,...await makeShareFiles(d)}};(box.querySelector("[data-pic]") as HTMLButtonElement).onclick=async()=>{try{note.textContent="Membuat 3 foto report…";const{files}=await build();downloadFiles(files);note.textContent="3 foto berhasil dibuat: Daily Sales Staff, LOB Apple, dan VAS Daily."}catch(e){note.textContent=e instanceof Error?e.message:"Gagal membuat picture"}};const shareMenu=box.querySelector("[data-share-menu]") as HTMLElement,shareButton=box.querySelector("[data-share]") as HTMLButtonElement;shareButton.onclick=()=>shareMenu.classList.toggle("hidden");const shareOne=async(kind:"daily"|"lob"|"vas")=>{try{shareMenu.classList.add("hidden");note.textContent="Menyiapkan foto untuk dibagikan…";const d=await fetchDaily(),stamp=shareTime();let blob:Blob,fileName="",title="",text="";if(kind==="daily"){blob=await makeDailySalesPicture(d);fileName=`M238-Daily-Sales-${d.date}-${stamp}.png`;title="M238 Daily Sales";text=`M238 PIM 2\nUpdate sales jam ${stamp} WIB`}else if(kind==="lob"){blob=await makeLobPicture(d,stamp);fileName=`M238-LOB-Daily-${d.date}-${stamp}.png`;title="M238 LOB Daily";text=`M238 PIM 2\nLOB Daily • Update sales jam ${stamp} WIB`}else{blob=await makeVasPicture(d,stamp);fileName=`M238-VAS-Daily-${d.date}-${stamp}.png`;title="M238 VAS Daily";text=`M238 PIM 2\nVAS Daily • Update sales jam ${stamp} WIB`}const file=new File([blob],fileName,{type:"image/png"});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({files:[file],title,text});note.textContent=`${title} siap dibagikan • update ${stamp} WIB`}else{downloadFiles([file]);note.textContent="Browser belum mendukung share file. PNG sudah dibuat untuk dikirim manual ke WhatsApp."}}catch(e){if(!(e instanceof DOMException&&e.name==="AbortError"))note.textContent=e instanceof Error?e.message:"Gagal share"}};box.querySelectorAll<HTMLButtonElement>("[data-share-kind]").forEach(btn=>btn.onclick=()=>void shareOne(btn.dataset.shareKind as "daily"|"lob"|"vas"));document.addEventListener("click",e=>{const target=e.target as Node;if(!box.contains(target))shareMenu.classList.add("hidden")},{once:false});
  };
  inject();void refresh();const timer=setInterval(()=>{inject();void refresh()},2000);return()=>{stopped=true;clearInterval(timer)};
 },[]);
 return null;
}
