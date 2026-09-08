"use client";
import {useEffect,useMemo,useState} from "react";
import {createPortal} from "react-dom";

const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const num=new Intl.NumberFormat("id-ID");
const pct=(v:number)=>`${new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(v)}%`;
const today=()=>new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());
type Lob={iphone:number;mac:number;ipad:number;watch:number;airpods:number};
type Data={target:{amount:number;device:number;accessories:number;vas:number};summary:{amount:number;device:number;accessories:number;vas:number;estimate:number;upt:number;invoices:number};daily:Array<{date:string;amount:number;device:number;accessories:number;vas:number}>;monthlyStaff:Array<{lob:Lob}>};
function estimate(actual:number,lastDay:number,dim:number){return lastDay?actual/lastDay*dim:0}
function readOverviewPeriod(){
 const labels=Array.from(document.querySelectorAll<HTMLLabelElement>("label"));
 for(const label of labels){
  const text=(label.textContent||"").toLowerCase();
  const select=label.querySelector("select") as HTMLSelectElement|null;
  if(text.includes("filter bulan")&&select&&/^20\d{2}-\d{2}$/.test(select.value)&&select.offsetParent!==null)return select.value;
 }
 const heading=Array.from(document.querySelectorAll("h1,h2,h3")).find(x=>(x.textContent||"").trim()==="Dashboard");
 const root=(heading?.closest("main")||document.querySelector("main")) as HTMLElement|null;
 const select=Array.from(root?.querySelectorAll<HTMLSelectElement>("select")||[]).find(x=>/^20\d{2}-\d{2}$/.test(x.value)&&x.offsetParent!==null);
 return select?.value||today().slice(0,7)
}
function Overview({period}:{period:string}){
 const[data,setData]=useState<Data|null>(null),[traffic,setTraffic]=useState(0),[nps,setNps]=useState<number|null>(null);
 useEffect(()=>{let alive=true;const[y,m]=period.split("-").map(Number),end=`${period}-${String(new Date(y,m,0).getDate()).padStart(2,"0")}`;Promise.all([
  fetch(`/api/data?period=${period}`,{cache:"no-store"}).then(r=>r.json()),
  fetch(`/api/traffic?from=${period}-01&to=${end}`,{cache:"no-store"}).then(r=>r.json()).catch(()=>({total:0})),
  fetch(`/api/nps?period=${period}`,{cache:"no-store"}).then(r=>r.json()).catch(()=>({nps:null}))
 ]).then(([d,t,n])=>{if(alive){setData(d);setTraffic(Number(t?.total||0));setNps(Number.isFinite(Number(n?.nps))?Number(n.nps):null)}}).catch(()=>{});return()=>{alive=false}},[period]);
 const lob=useMemo(()=>{const out={iphone:0,mac:0,ipad:0,watch:0,airpods:0};for(const r of data?.monthlyStaff||[]){out.iphone+=Number(r.lob?.iphone||0);out.mac+=Number(r.lob?.mac||0);out.ipad+=Number(r.lob?.ipad||0);out.watch+=Number(r.lob?.watch||0);out.airpods+=Number(r.lob?.airpods||0)}return out},[data]);
 if(!data)return <div className="m238-soft-card p-5 text-sm text-slate-500 dark:text-slate-400">Memuat overview {period}…</div>;
 const days=data.daily||[],last=Math.max(1,...days.map(x=>Number(x.date.slice(8,10))||1)),[y,m]=period.split("-").map(Number),dim=new Date(y,m,0).getDate(),cvr=traffic?data.summary.invoices/traffic*100:0;
 const ratio=(a:number,t:number)=>t?a/t*100:0,point=(a:number,t:number,max:number)=>Math.min(t?a/t*max:0,max);
 const cards=[
  ["Target vs Achievement",`${money.format(data.summary.amount)} / ${money.format(data.target.amount)}`,pct(ratio(data.summary.amount,data.target.amount))],
  ["Device vs Achievement",`${money.format(data.summary.device)} / ${money.format(data.target.device)}`,`${pct(ratio(data.summary.device,data.target.device))} • Point ${point(data.summary.device,data.target.device,60).toFixed(1)}/60`],
  ["VAS vs Achievement",`${money.format(data.summary.vas)} / ${money.format(data.target.vas)}`,`${pct(ratio(data.summary.vas,data.target.vas))} • Point ${point(data.summary.vas,data.target.vas,10).toFixed(1)}/10`],
  ["ACC vs Achievement",`${money.format(data.summary.accessories)} / ${money.format(data.target.accessories)}`,`${pct(ratio(data.summary.accessories,data.target.accessories))} • Point ${point(data.summary.accessories,data.target.accessories,30).toFixed(1)}/30`],
  ["Estimasi End Month",money.format(data.summary.estimate||estimate(data.summary.amount,last,dim)),`Proyeksi ${period}`],
  ["Estimasi Device",money.format(estimate(data.summary.device,last,dim)),`Berdasarkan data sampai hari ${last}`],
  ["Estimasi VAS",money.format(estimate(data.summary.vas,last,dim)),`Berdasarkan data sampai hari ${last}`],
  ["Estimasi ACC",money.format(estimate(data.summary.accessories,last,dim)),`Berdasarkan data sampai hari ${last}`],
  ["UPT / CVR",`${Number(data.summary.upt||0).toFixed(1)} / ${pct(cvr)}`,`Traffic ${num.format(traffic)}`],
  ["NPS",nps===null?"Belum tersedia":new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(nps),"Customer experience"],
 ];
 const lobs=[{name:"iPhone",qty:lob.iphone,cat:"Device"},{name:"MacBook",qty:lob.mac,cat:"Device"},{name:"iPad",qty:lob.ipad,cat:"Device"},{name:"Apple Watch",qty:lob.watch,cat:"Device"},{name:"AirPods",qty:lob.airpods,cat:"Accessories Apple"}];
 return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([a,b,c])=><article key={a} className="m238-soft-card p-4"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-500 dark:text-slate-400">{a}</p><p className="mt-2 text-lg font-black text-slate-900 dark:text-slate-100">{b}</p><p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{c}</p></article>)}</div><section className="m238-soft-card p-4"><div className="mb-3"><h3 className="font-black">Detail LOB</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">iPhone, MacBook, iPad, Apple Watch = Device • AirPods = Accessories Apple</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{lobs.map(x=><div key={x.name} className="m238-subcard p-3"><p className="text-xs font-bold text-slate-500 dark:text-slate-400">{x.name}</p><p className="mt-1 text-xl font-black">{num.format(x.qty)} unit</p><p className="mt-1 text-[11px] font-semibold text-slate-400">{x.cat}</p></div>)}</div></section></div>
}
export default function M238RevisionSep8(){const[period,setPeriod]=useState(today().slice(0,7)),[host,setHost]=useState<HTMLElement|null>(null);
 useEffect(()=>{document.body.classList.add("m238-revision-stable");let raf=0;const sync=()=>{raf=0;const p=readOverviewPeriod();setPeriod(v=>v===p?v:p);const h=Array.from(document.querySelectorAll("h2,h3")).find(x=>(x.textContent||"").includes("M238 Sales Overview")) as HTMLElement|undefined;if(!h)return;const sec=(h.closest("section")||h.parentElement?.parentElement) as HTMLElement|null;if(!sec)return;for(const child of Array.from(sec.children)){const el=child as HTMLElement;if(el.dataset.m238OverviewV2)continue;if(el.classList.contains("grid"))el.style.display="none"}let x=sec.querySelector("[data-m238-overview-v2]") as HTMLElement|null;if(!x){x=document.createElement("div");x.dataset.m238OverviewV2="1";x.className="mt-4";sec.appendChild(x)}setHost(v=>v===x?v:x)};const schedule=()=>{if(!raf)raf=requestAnimationFrame(sync)};sync();const mo=new MutationObserver(schedule);mo.observe(document.body,{childList:true,subtree:true});const onChange=(e:Event)=>{const target=e.target as HTMLSelectElement|null;if(target?.tagName==="SELECT"&&/^20\d{2}-\d{2}$/.test(target.value))schedule()};document.addEventListener("change",onChange,true);return()=>{if(raf)cancelAnimationFrame(raf);mo.disconnect();document.removeEventListener("change",onChange,true);document.body.classList.remove("m238-revision-stable")}},[]);
 return <>{host&&createPortal(<Overview period={period}/>,host)}</>}
