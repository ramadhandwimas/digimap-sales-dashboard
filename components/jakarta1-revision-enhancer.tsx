"use client";

import {useEffect} from "react";

type AuditRow={id:string;name:string;store:string;airpods:number;incentive:{iphone:number;macbook:number;ipad:number;watch:number;accessories:number;qoala:number;total:number}};

const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const number=new Intl.NumberFormat("id-ID");
const cache=new Map<string,AuditRow[]>();
const pending=new Map<string,Promise<AuditRow[]>>();

function text(el:Element|null){return (el?.textContent||"").trim()}
function sectionByHeading(label:string){return [...document.querySelectorAll("h2,h3")].find(el=>text(el).toLowerCase()===label.toLowerCase())?.closest("div.space-y-5,section,div") as HTMLElement|null}
function currentPeriod(root:HTMLElement){const selects=[...root.querySelectorAll("select")];const year=selects.find(s=>/^(2025|2026)$/.test((s as HTMLSelectElement).value)) as HTMLSelectElement|undefined;const month=selects.find(s=>/^(0[1-9]|1[0-2])$/.test((s as HTMLSelectElement).value)) as HTMLSelectElement|undefined;return `${year?.value||"2026"}-${month?.value||"09"}`}
async function audit(period:string){if(cache.has(period))return cache.get(period)!;if(pending.has(period))return pending.get(period)!;const p=fetch(`/api/jakarta1-staff-audit?period=${encodeURIComponent(period)}`,{cache:"no-store"}).then(r=>r.json()).then(j=>{const rows=(j.rows||[]) as AuditRow[];cache.set(period,rows);pending.delete(period);return rows}).catch(()=>{pending.delete(period);return[]});pending.set(period,p);return p}
function rowMap(rows:AuditRow[]){return new Map(rows.map(r=>[`${r.store}|${r.name.trim().toUpperCase()}`,r]))}

function enhanceGrowth(){const heading=[...document.querySelectorAll("h3")].find(h=>text(h).startsWith("2025 vs 2026"));const table=heading?.parentElement?.parentElement?.querySelector("table")||heading?.closest("section")?.querySelector("table");if(!table)return;for(const tr of table.querySelectorAll("tbody tr")){const cells=tr.querySelectorAll("td");if(cells.length<4)continue;const cell=cells[3] as HTMLElement;if(cell.dataset.j1Growth==="1")continue;const raw=text(cell);const value=Number(raw.replace("%","").replace(",",".").replace(/[^0-9.-]/g,""));if(!Number.isFinite(value)||raw==="—")continue;cell.dataset.j1Growth="1";cell.classList.add("font-black");if(value>0){cell.classList.add("text-emerald-600");cell.textContent=`↑ ${raw}`}else if(value<0){cell.classList.add("text-rose-600");cell.textContent=`↓ ${raw}`}else{cell.classList.add("text-slate-500");cell.textContent=`→ ${raw}`}}
}

function splitProductFocusFilters(){const heading=[...document.querySelectorAll("h3")].find(h=>text(h)==="Product Fokus Achievement");const section=heading?.closest("section");if(!section||section.dataset.j1FilterSplit==="1")return;const grid=[...section.querySelectorAll("div")].find(d=>d.querySelectorAll(":scope > label").length===4) as HTMLElement|undefined;if(!grid)return;const labels=[...grid.querySelectorAll(":scope > label")] as HTMLElement[];const year=labels.find(l=>text(l).startsWith("Tahun")),from=labels.find(l=>text(l).startsWith("Dari")),to=labels.find(l=>text(l).startsWith("Sampai")),week=labels.find(l=>text(l).startsWith("Week"));if(!year||!from||!to||!week)return;
 const weekTitle=document.createElement("div");weekTitle.dataset.j1Enhancer="1";weekTitle.className="rounded-xl border bg-blue-50 px-4 py-3 text-sm font-black text-blue-700";weekTitle.textContent="FILTER WEEK";weekTitle.style.gridColumn="1 / -1";weekTitle.style.order="0";
 const customTitle=document.createElement("div");customTitle.dataset.j1Enhancer="1";customTitle.className="rounded-xl border bg-slate-50 px-4 py-3 text-sm font-black text-slate-700";customTitle.textContent="CUSTOM RANGE";customTitle.style.gridColumn="1 / -1";customTitle.style.order="3";
 year.style.order="1";week.style.order="2";from.style.order="4";to.style.order="5";grid.append(weekTitle,customTitle);section.dataset.j1FilterSplit="1";
 const desc=heading.nextElementSibling as HTMLElement|null;if(desc)desc.textContent="Pilih Week untuk periode mingguan, atau gunakan Custom Range untuk tanggal bebas. Keduanya dibuat terpisah agar tidak rancu.";
}

async function enhanceStaff(){const root=sectionByHeading("Staff Performance");if(!root)return;const table=root.querySelector("table");if(!table)return;const period=currentPeriod(root),rows=await audit(period),map=rowMap(rows);const headers=[...table.querySelectorAll("thead th")];if(!headers.some(h=>text(h)==="AirPods")){const watchIndex=headers.findIndex(h=>text(h)==="Apple Watch");if(watchIndex>=0){const th=document.createElement("th");th.className=headers[watchIndex].className;th.textContent="AirPods";headers[watchIndex].after(th)}}
 for(const tr of table.querySelectorAll("tbody tr")){const cells=[...tr.querySelectorAll("td")];if(cells.length<8)continue;const key=`${text(cells[1])}|${text(cells[0]).toUpperCase()}`,r=map.get(key);let air=[...tr.querySelectorAll("td")].find(c=>(c as HTMLElement).dataset.j1Airpods==="1") as HTMLElement|undefined;if(!air){air=document.createElement("td");air.className=cells[7].className;air.dataset.j1Airpods="1";cells[7].after(air)}air.textContent=number.format(r?.airpods||0)}
}

async function enhanceIncentive(){const root=sectionByHeading("Est Incentive");if(!root)return;for(const d of [...root.querySelectorAll("div")]){const t=text(d);if(t.includes("Accessories Rule")&&t.includes("Qoala Rule")){d.remove();break}}
 const table=root.querySelector("table");if(!table)return;const period=currentPeriod(root),rows=await audit(period),map=rowMap(rows);for(const tr of table.querySelectorAll("tbody tr")){const cells=[...tr.querySelectorAll("td")] as HTMLElement[];if(cells.length<9)continue;const r=map.get(`${text(cells[1])}|${text(cells[0]).toUpperCase()}`);if(!r)continue;const vals=[r.incentive.iphone,r.incentive.macbook,r.incentive.ipad,r.incentive.watch,r.incentive.accessories,r.incentive.qoala,r.incentive.total];for(let i=0;i<vals.length;i++){cells[i+2].textContent=money.format(vals[i]);cells[i+2].dataset.j1Audit="1"}}
}

export default function Jakarta1RevisionEnhancer(){useEffect(()=>{let raf=0;const run=()=>{raf=0;enhanceGrowth();splitProductFocusFilters();void enhanceStaff();void enhanceIncentive()};const schedule=()=>{if(!raf)raf=requestAnimationFrame(run)};run();const mo=new MutationObserver(schedule);mo.observe(document.body,{childList:true,subtree:true});document.addEventListener("change",schedule,true);return()=>{mo.disconnect();document.removeEventListener("change",schedule,true);if(raf)cancelAnimationFrame(raf)}},[]);return null}
