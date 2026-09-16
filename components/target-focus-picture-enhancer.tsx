"use client";

import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {FileImage,LoaderCircle,Share2} from "lucide-react";

type FocusMode="LOB Target Fokus"|"Product Fokus 3PP"|"VAS Fokus";
type Row={name:string;qty?:number;achievement?:string;target?:string;gap?:string;ar?:string;achievementPct?:string;contribution?:string;status?:string;active:boolean};
type Report={period:string;item:string;status:string;target:string;achievement:string;percent:string;gap:string;qty:string;rows:Row[];zeroCount:number};

const nf=new Intl.NumberFormat("id-ID",{maximumFractionDigits:1});
const moneyFmt=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const pct=(n:number)=>`${nf.format(Number.isFinite(n)?n:0)}%`;
const money=(n:number)=>moneyFmt.format(n);
const toNum=(s:string)=>{const n=Number(String(s||"").replace(/[^0-9-]/g,""));return Number.isFinite(n)?n:0};
const lines=(el:HTMLElement)=>(el.innerText||"").split("\n").map(x=>x.replace(/\s+/g," ").trim()).filter(Boolean);
const after=(arr:string[],label:string)=>{const i=arr.findIndex(x=>x.toLowerCase()===label.toLowerCase());return i>=0?(arr[i+1]||""):""};
const findSection=(root:HTMLElement,marker:string)=>Array.from(root.querySelectorAll<HTMLElement>("section")).find(s=>(s.textContent||"").includes(marker))||null;

function lobRows(selected:HTMLElement,achievement:number){
 const title=Array.from(selected.querySelectorAll<HTMLElement>("p")).find(p=>(p.textContent||"").trim()==="Ranking Staff Contribution");
 const wrap=title?.nextElementSibling as HTMLElement|null;
 const all:Row[]=[];
 if(wrap){
  for(const el of Array.from(wrap.children) as HTMLElement[]){
   const name=(el.querySelector("span")?.textContent||"").replace(/^\s*\d+\.\s*/,"").trim();
   const bolds=Array.from(el.querySelectorAll("b"));
   const qty=toNum((bolds[bolds.length-1]?.textContent||"0").trim());
   if(!name)continue;
   all.push({name,qty,contribution:pct(achievement>0?qty/achievement*100:0),status:qty>0?"Terjual":"-",active:qty>0});
  }
 }
 return{rows:all.filter(r=>r.active),zeroCount:all.filter(r=>!r.active).length};
}

function tableRows(root:HTMLElement,mode:FocusMode){
 const section=findSection(root,"Penjualan Staff •");
 const all:Row[]=[];
 if(section){
  for(const tr of Array.from(section.querySelectorAll("tbody tr"))){
   const c=Array.from(tr.querySelectorAll("td")).map(td=>(td.textContent||"").replace(/\s+/g," ").trim());
   if(!c[0])continue;
   if(mode==="Product Fokus 3PP"){
    const qty=toNum(c[1]),value=toNum(c[2]);
    all.push({name:c[0],qty,achievement:c[2]||money(0),contribution:c[3]||"0%",active:qty>0||value>0});
   }else{
    const target=toNum(c[1]),ach=toNum(c[2]),qty=toNum(c[4]);
    all.push({name:c[0],target:c[1]||money(0),achievement:c[2]||money(0),gap:c[3]||money(0),qty,ar:c[6]||"0%",achievementPct:pct(target>0?ach/target*100:0),status:c[7]||"Critical",active:ach>0||qty>0});
   }
  }
 }
 return{rows:all.filter(r=>r.active),zeroCount:all.filter(r=>!r.active).length};
}

function readReport(root:HTMLElement,mode:FocusMode):Report{
 const marker=mode==="LOB Target Fokus"?"Detail Product":mode==="Product Fokus 3PP"?"Supplier Dipilih":"Provider Dipilih";
 const selected=findSection(root,marker);
 if(!selected)throw new Error("Detail yang dipilih belum siap");
 const periodEl=Array.from(root.querySelectorAll<HTMLElement>("p")).find(p=>(p.textContent||"").trim().startsWith("Periode aktif:"));
 const period=(periodEl?.textContent||"").replace(/^Periode aktif:\s*/i,"").trim()||"Periode aktif";
 const item=selected.querySelector("h3")?.textContent?.trim()||"Detail";
 const status=Array.from(selected.querySelectorAll<HTMLElement>("span")).map(x=>(x.textContent||"").trim()).find(x=>["Achieve","Need Push","Critical"].includes(x))||"";
 const l=lines(selected);
 const target=after(l,"Target Value")||after(l,"Target")||"-";
 const achievement=after(l,"Achievement")||"-";
 const gap=after(l,"Gap Value")||after(l,"Gap")||"-";
 const qty=after(l,"Actual Qty")||"-";
 let percent="";
 if(mode==="LOB Target Fokus") percent=pct(toNum(target)>0?toNum(achievement)/toNum(target)*100:0);
 else {const i=l.findIndex(x=>x.toLowerCase()==="achievement");percent=i>=0&&/%/.test(l[i+2]||"")?l[i+2]:""}
 const parsed=mode==="LOB Target Fokus"?lobRows(selected,toNum(achievement)):tableRows(root,mode);
 return{period,item,status,target,achievement,percent,gap,qty,rows:parsed.rows,zeroCount:parsed.zeroCount};
}

function rr(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){const q=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+q,y);ctx.arcTo(x+w,y,x+w,y+h,q);ctx.arcTo(x+w,y+h,x,y+h,q);ctx.arcTo(x,y+h,x,y,q);ctx.arcTo(x,y,x+w,y,q);ctx.closePath()}
function blob(canvas:HTMLCanvasElement){return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Gagal membuat PNG")),"image/png",1))}
function fit(ctx:CanvasRenderingContext2D,text:string,max:number,size:number,min=12,weight=700){let s=size;while(s>min){ctx.font=`${weight} ${s}px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;if(ctx.measureText(text).width<=max)break;s--}return s}
function text(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,max:number,size=18,weight=600,color="#0f172a"){const s=fit(ctx,value,max,size,12,weight);ctx.font=`${weight} ${s}px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;ctx.fillStyle=color;ctx.fillText(value,x,y)}
function statusBadge(ctx:CanvasRenderingContext2D,value:string,x:number,y:number){const c=value==="Achieve"?["#dcfce7","#166534"]:value==="Need Push"?["#fef3c7","#92400e"]:["#fee2e2","#b91c1c"];ctx.font="800 17px -apple-system,BlinkMacSystemFont,Arial,sans-serif";const w=ctx.measureText(value).width+30;ctx.fillStyle=c[0];rr(ctx,x-w,y-26,w,36,18);ctx.fill();ctx.fillStyle=c[1];ctx.fillText(value,x-w+15,y-2)}

function summary(ctx:CanvasRenderingContext2D,d:Report,mode:FocusMode,width:number,pad:number,y:number){
 const inner=width-pad*2;ctx.fillStyle="#f8fafc";rr(ctx,pad,y,inner,340,24);ctx.fill();
 text(ctx,mode==="Product Fokus 3PP"?"SUPPLIER DIPILIH":mode==="VAS Fokus"?"PROVIDER DIPILIH":"PRODUCT DIPILIH",pad+26,y+38,400,18,800,"#2563eb");
 text(ctx,d.item,pad+26,y+82,inner-52,34,800);
 const cards=mode==="LOB Target Fokus"?[{l:"Target Qty",v:d.target},{l:"Achievement Qty",v:d.achievement},{l:"Gap Qty",v:d.gap},{l:"Achievement %",v:d.percent||"-"}]:[{l:"Target Value",v:d.target},{l:"Achievement",v:d.achievement},{l:"Gap Value",v:d.gap},{l:"Actual Qty",v:d.qty}];
 const cw=(inner-76)/2,ch=88;
 cards.forEach((c,i)=>{const col=i%2,row=Math.floor(i/2),x=pad+26+col*(cw+24),cy=y+106+row*(ch+18);ctx.fillStyle="#fff";rr(ctx,x,cy,cw,ch,18);ctx.fill();text(ctx,c.l,x+18,cy+27,cw-36,17,600,"#94a3b8");text(ctx,c.v||"-",x+18,cy+60,cw-36,26,800)});
 return y+372;
}

function table(ctx:CanvasRenderingContext2D,d:Report,mode:FocusMode,width:number,pad:number,y:number){
 const inner=width-pad*2;text(ctx,`Penjualan Staff • ${d.item}`,pad,y,inner,28,800);y+=36;text(ctx,"Data staff sesuai ranking pada dashboard",pad,y,inner,17,500,"#64748b");y+=30;
 if(!d.rows.length){ctx.fillStyle="#f8fafc";rr(ctx,pad,y,inner,58,12);ctx.fill();text(ctx,"Belum ada staff dengan transaksi pada pilihan ini",pad+18,y+36,inner-36,18,700,"#64748b");return y+74}
 let cols:number[],headers:string[];
 if(mode==="LOB Target Fokus"){cols=[50,430,120,180,150];headers=["No","Nama Staff","Qty","Contribution %","Status"]}
 else if(mode==="Product Fokus 3PP"){cols=[50,390,110,210,196];headers=["No","Nama Staff","Qty","Achievement","Contribution %"]}
 else{cols=[50,360,200,210,190,100,140,150];headers=["No","Nama Staff","Target","Achievement","Gap","AR","Ach %","Status"]}
 ctx.fillStyle="#eaf1fb";rr(ctx,pad,y,inner,46,12);ctx.fill();let x=pad;headers.forEach((h,i)=>{text(ctx,h,x+10,y+29,cols[i]-20,16,800,"#334155");x+=cols[i]});y+=46;
 d.rows.forEach((r,i)=>{const h=mode==="VAS Fokus"?58:54;ctx.fillStyle=i%2?"#fff":"#f8fafc";ctx.fillRect(pad,y,inner,h);x=pad;let vals:string[];
  if(mode==="LOB Target Fokus") vals=[String(i+1),r.name,`${r.qty||0} unit`,r.contribution||"0%",r.status||"-"];
  else if(mode==="Product Fokus 3PP") vals=[String(i+1),r.name,String(r.qty||0),r.achievement||money(0),r.contribution||"0%"];
  else vals=[String(i+1),r.name,r.target||money(0),r.achievement||money(0),r.gap||money(0),r.ar||"0%",r.achievementPct||"0%",r.status||"-"];
  vals.forEach((v,j)=>{const color=mode==="LOB Target Fokus"&&j===4?"#1d4ed8":mode==="VAS Fokus"&&j===7?(v==="Achieve"?"#166534":v==="Need Push"?"#92400e":"#b91c1c"):"#0f172a";text(ctx,v,x+10,y+(h===58?36:34),cols[j]-20,j===1?17:16,j===1?700:600,color);x+=cols[j]});y+=h;
 });
 if(d.zeroCount){ctx.fillStyle="#eef2ff";rr(ctx,pad,y+10,inner,48,12);ctx.fill();text(ctx,`${d.zeroCount} staff lainnya belum ada penjualan`,pad+16,y+40,inner-32,17,700,"#475569");y+=66}
 return y;
}

async function render(d:Report,mode:FocusMode){
 const width=mode==="VAS Fokus"?1500:1080,pad=mode==="VAS Fokus"?70:62,rowH=mode==="VAS Fokus"?58:54;
 const height=Math.max(860,218+372+100+46+d.rows.length*rowH+(d.zeroCount?66:0)+100);
 const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas tidak tersedia");
 ctx.fillStyle="#f1f5f9";ctx.fillRect(0,0,width,height);ctx.fillStyle="#fff";rr(ctx,28,28,width-56,height-56,32);ctx.fill();
 text(ctx,"M238 • TARGET FOKUS",pad,84,500,23,800,"#2563eb");text(ctx,mode,pad,138,width-pad*2-300,44,800);text(ctx,`${d.period} • ${d.item}`,pad,180,width-pad*2-300,24,600,"#64748b");if(d.status)statusBadge(ctx,d.status,width-pad,94);
 let y=218;y=summary(ctx,d,mode,width,pad,y);y+=34;y=table(ctx,d,mode,width,pad,y);text(ctx,"Generated from M238 Dashboard",pad,height-44,width-pad*2,17,500,"#94a3b8");
 return blob(canvas);
}

export default function TargetFocusPictureEnhancer(){
 const[host,setHost]=useState<HTMLElement|null>(null),[mode,setMode]=useState<FocusMode|null>(null),[root,setRoot]=useState<HTMLElement|null>(null),[busy,setBusy]=useState<"picture"|"share"|"">(""),[notice,setNotice]=useState("");
 useEffect(()=>{const scan=()=>{const native=document.querySelector(".m238-native-view") as HTMLElement|null;if(!native){setHost(null);setMode(null);setRoot(null);return}const heading=Array.from(native.querySelectorAll("h2")).find(h=>["LOB Target Fokus","Product Fokus 3PP","VAS Fokus"].includes((h.textContent||"").trim())) as HTMLElement|undefined;if(!heading){setHost(null);setMode(null);setRoot(null);return}const pageRoot=heading.closest("div.space-y-5") as HTMLElement|null;if(!pageRoot)return;let nextHost=pageRoot.querySelector("[data-target-picture-actions]") as HTMLElement|null;if(!nextHost){nextHost=document.createElement("div");nextHost.dataset.targetPictureActions="1";nextHost.className="m238-soft-card rounded-2xl border p-4";const filter=pageRoot.children.item(1);if(filter?.nextSibling)pageRoot.insertBefore(nextHost,filter.nextSibling);else pageRoot.appendChild(nextHost)}setHost(nextHost);setMode((heading.textContent||"").trim() as FocusMode);setRoot(pageRoot)};scan();const o=new MutationObserver(scan);o.observe(document.body,{childList:true,subtree:true});return()=>o.disconnect()},[]);
 if(!host||!mode||!root)return null;
 const build=async()=>{const d=readReport(root,mode);const b=await render(d,mode);const clean=`M238-${mode}-${d.item}-${d.period}`.replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-");return{file:new File([b],`${clean}.png`,{type:"image/png"}),period:d.period,item:d.item}};
 const download=async()=>{setBusy("picture");setNotice("");try{const{file}=await build(),url=URL.createObjectURL(file),a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);setNotice("PNG berhasil dibuat.")}catch(e){setNotice(e instanceof Error?e.message:"Gagal membuat picture")}finally{setBusy("")}};
 const share=async()=>{setBusy("share");setNotice("");try{const{file,period,item}=await build(),title=`M238 • ${mode} • ${item} • ${period}`;if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({files:[file],title,text:title});setNotice("Pilih WhatsApp lalu grup tujuan.")}else{const url=URL.createObjectURL(file),a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);setNotice("Share file belum didukung browser ini. PNG berhasil dibuat.")}}catch(e){if(!(e instanceof DOMException&&e.name==="AbortError"))setNotice(e instanceof Error?e.message:"Gagal share picture")}finally{setBusy("")}};
 return createPortal(<div><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black">Share Report</p><p className="mt-1 text-xs text-slate-500">WA Table v6 • seluruh staff sesuai dashboard</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={Boolean(busy)} onClick={()=>void download()} className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-black disabled:opacity-50">{busy==="picture"?<LoaderCircle className="size-4 animate-spin"/>:<FileImage className="size-4"/>}Picture Screenshot</button><button type="button" disabled={Boolean(busy)} onClick={()=>void share()} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{busy==="share"?<LoaderCircle className="size-4 animate-spin"/>:<Share2 className="size-4"/>}Share WhatsApp</button></div></div>{notice?<p className="mt-2 text-xs font-semibold text-slate-500">{notice}</p>:null}</div>,host);
}
