"use client";
import {useEffect,useState} from "react";
import {X} from "lucide-react";

type Kind="UPT"|"Invoice"|"Qty";
type StaffRow={id:string;name:string;qty:number;invoices:number;upt:number;amount:number};
type InvoiceRow={invoice:string;staffId:string;staff:string;qty:number;value:number};
type Data={date:string;staff:StaffRow[];invoices:InvoiceRow[];total:{qty:number;invoices:number;upt:number}};
const num=new Intl.NumberFormat("id-ID");
const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const today=()=>new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());
const short=(name:string)=>{const p=name.trim().split(/\s+/);return p.length>1?`${p[0]} ${p[1]?.[0]||""}.`:name};

export default function MobileDailyKpiDrilldown(){
 const[kind,setKind]=useState<Kind|null>(null),[data,setData]=useState<Data|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
  const bind=()=>{
   const grid=document.querySelector(".m238m-sales-ops-grid");if(!grid)return()=>{};
   const cards=Array.from(grid.children).slice(0,3) as HTMLElement[];
   const clean:Array<()=>void>=[];
   cards.forEach(el=>{const label=el.textContent?.trim().split(/\s+/)[0] as Kind;if(!["UPT","Invoice","Qty"].includes(label))return;el.setAttribute("role","button");el.setAttribute("tabindex","0");el.style.cursor="pointer";el.classList.add("m238m-tappable-card");const open=()=>setKind(label);const key=(e:KeyboardEvent)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}};el.addEventListener("click",open);el.addEventListener("keydown",key);clean.push(()=>{el.removeEventListener("click",open);el.removeEventListener("keydown",key)})});
   return()=>clean.forEach(fn=>fn());
  };
  let cleanup=bind();const obs=new MutationObserver(()=>{cleanup();cleanup=bind()});obs.observe(document.body,{childList:true,subtree:true});return()=>{cleanup();obs.disconnect()};
 },[]);
 useEffect(()=>{
  if(!kind||data)return;let alive=true;setBusy(true);setError("");
  fetch(`/api/daily-kpi-detail?date=${today()}`,{cache:"no-store"}).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error||"Gagal memuat detail");if(alive)setData(j)}).catch(e=>alive&&setError(e instanceof Error?e.message:"Gagal memuat detail")).finally(()=>alive&&setBusy(false));return()=>{alive=false};
 },[kind,data]);
 useEffect(()=>{if(!kind)return;const old=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=old}},[kind]);
 if(!kind)return null;
 const close=()=>setKind(null),staff=(data?.staff||[]).filter(x=>x.qty>0||x.invoices>0);
 return <div className="m238m-sheet-layer" onClick={close}>
  <div className="m238m-sheet" onClick={e=>e.stopPropagation()}>
   <span className="m238m-handle"/>
   <div className="m238m-sheet-head"><h3>{kind} • Hari Ini</h3><button onClick={close} aria-label="Tutup"><X size={18}/></button></div>
   <div className="m238m-sheet-scroll"><div className="m238m-stack">
    {busy?<div className="m238m-card">Memuat detail…</div>:error?<div className="m238m-card m238m-error">{error}</div>:data?<>
     <section className="m238m-card m238m-detail-sales"><span>{kind}</span><strong>{kind==="UPT"?data.total.upt.toFixed(1):num.format(kind==="Invoice"?data.total.invoices:data.total.qty)}</strong><small>{data.date} • M238 PIM 2</small></section>
     {kind==="UPT"?<><div className="m238m-section-head"><h2>UPT per Staff</h2><span>{staff.length} staff</span></div><div className="m238m-list">{[...staff].sort((a,b)=>b.upt-a.upt).map((x,i)=><section key={x.id} className="m238m-card m238m-product-detail-row"><div><strong>#{i+1} {short(x.name)}</strong><span>{num.format(x.qty)} unit • {num.format(x.invoices)} invoice</span></div><b>UPT {x.upt.toFixed(1)}</b></section>)}</div></>:null}
     {kind==="Qty"?<><div className="m238m-section-head"><h2>Qty per Staff</h2><span>{data.total.qty} unit</span></div><div className="m238m-list">{[...staff].sort((a,b)=>b.qty-a.qty).map((x,i)=><section key={x.id} className="m238m-card m238m-product-detail-row"><div><strong>#{i+1} {short(x.name)}</strong><span>{num.format(x.invoices)} invoice • UPT {x.upt.toFixed(1)}</span></div><b>{num.format(x.qty)} unit</b></section>)}</div></>:null}
     {kind==="Invoice"?<><div className="m238m-section-head"><h2>Invoice Hari Ini</h2><span>{data.invoices.length} invoice</span></div><div className="m238m-list">{data.invoices.map((x,i)=><section key={`${x.invoice}-${i}`} className="m238m-card m238m-product-detail-row"><div><strong>{x.invoice}</strong><span>{short(x.staff)} • {num.format(x.qty)} qty</span></div><b>{money.format(x.value)}</b></section>)}</div></>:null}
    </>:null}
   </div></div>
  </div>
 </div>;
}
