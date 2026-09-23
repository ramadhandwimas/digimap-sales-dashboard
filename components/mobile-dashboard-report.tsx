"use client";
import {useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from "react";
import {ChevronRight,Copy,FileDown,FileSpreadsheet,RefreshCw,Share2,X} from "lucide-react";
import {exportReportPdf,exportReportPng,exportReportXlsx} from "@/lib/dashboard-export";

type ReportMode="weekly"|"feedback"|"cx";
type Staff=any;
type Weekly=any;
type DailySummary=any;
type FeedbackRow={date:string;staffId:string|number;name:string;category?:string;professional?:string;raw?:string};
type Feedback={rows:FeedbackRow[];summary?:string};
type CxRow={date:string;staffId:string|number;name:string;cx:number;member:number};
type Cx={rows:CxRow[]};
type Daily=any;

const localCache=new Map<string,{at:number,data:any}>();
async function cachedJson<T>(url:string,ttl=180000,force=false):Promise<T>{
 if(force)localCache.delete(url);const hit=localCache.get(url);if(hit&&Date.now()-hit.at<ttl)return hit.data as T;
 const r=await fetch(url,force?{cache:"no-store"}:undefined),j=await r.json();if(!r.ok||j?.error)throw new Error(j?.error||"Data gagal dimuat");localCache.set(url,{at:Date.now(),data:j});return j as T;
}
const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const num=new Intl.NumberFormat("id-ID");
const pct=(v:number|null|undefined)=>`${new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(Number(v||0))}%`;
const today=()=>new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());
const periodNow=()=>today().slice(0,7);
const monthLabel=(p:string)=>new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric",timeZone:"Asia/Jakarta"}).format(new Date(`${p}-01T00:00:00Z`));
function shortStaffName(name:string){const raw=name.trim(),parts=raw.split(/\s+/).filter(Boolean);if(parts.length<=1)return raw;const preferred=parts[0].length<=4&&parts.length>2?parts[1]:parts[0],rest=preferred===parts[0]?parts.slice(1):parts.filter(x=>x!==preferred),initial=rest.find(x=>x.length>1)?.[0]||rest[0]?.[0]||"";return initial?`${preferred} ${initial}.`:preferred}
function salesDateLabel(date:string){const d=new Date(`${date}T00:00:00+07:00`),day=new Intl.DateTimeFormat("id-ID",{day:"numeric",timeZone:"Asia/Jakarta"}).format(d),month=new Intl.DateTimeFormat("id-ID",{month:"short",timeZone:"Asia/Jakarta"}).format(d).replace(".",""),year=new Intl.DateTimeFormat("id-ID",{year:"numeric",timeZone:"Asia/Jakarta"}).format(d),weekday=new Intl.DateTimeFormat("id-ID",{weekday:"long",timeZone:"Asia/Jakarta"}).format(d);return `${day} ${month} ${year} • ${weekday}`}
function Card({children,className=""}:{children:ReactNode;className?:string}){return <section className={`m238m-card ${className}`}>{children}</section>}
function Progress({value}:{value:number}){return <div className="m238m-progress"><i style={{width:`${Math.max(0,Math.min(100,value))}%`}}/></div>}
function Metric({label,value,sub}:{label:string;value:string;sub?:string}){return <Card className="m238m-metric"><span>{label}</span><strong>{value}</strong>{sub?<small>{sub}</small>:null}</Card>}
function Segmented<T extends string>({value,onChange,items}:{value:T;onChange:(v:T)=>void;items:{value:T;label:string}[]}){return <div className="m238m-segment">{items.map(x=><button key={x.value} onClick={()=>onChange(x.value)} className={value===x.value?"active":""}>{x.label}</button>)}</div>}
function Sheet({open,onClose,title,children}:{open:boolean;onClose:()=>void;title:string;children:ReactNode}){
 useEffect(()=>{
  if(!open)return;
  const body=document.body,key="m238ReportSheetLocks",count=Number(body.dataset[key]||0)+1;
  body.dataset[key]=String(count);body.style.overflow="hidden";
  return()=>{const next=Math.max(0,Number(body.dataset[key]||1)-1);if(next)body.dataset[key]=String(next);else{delete body.dataset[key];body.style.overflow=""}};
 },[open]);
 if(!open)return null;
 return <div className="m238m-sheet-layer" onClick={onClose}>
  <div className="m238m-sheet" onClick={e=>e.stopPropagation()}>
   <button className="m238m-handle-button" aria-label="Tutup" onClick={onClose}><span className="m238m-handle"/></button>
   <div className="m238m-sheet-head"><h3>{title}</h3><button onClick={onClose}><X size={18}/></button></div>
   <div className="m238m-sheet-scroll">{children}</div>
  </div>
 </div>
}
function Skeleton(){return <div className="m238m-stack m238m-fade"><div className="m238m-skeleton hero"/><div className="m238m-grid">{Array.from({length:4},(_,i)=><div key={i} className="m238m-skeleton tile"/>)}</div></div>}

export default function ReportScreen({mode,setMode,weekly,weeklySummary,feedback,cx,staff,period,periodMode,activeRange}:{mode:ReportMode;setMode:(v:ReportMode)=>void;weekly:Weekly|null;weeklySummary:DailySummary|null;feedback:Feedback|null;cx:Cx|null;staff:Staff[];period:string;periodMode:"month"|"week";activeRange:{from:string;to:string}|null}){
 return <div className="m238m-stack m238m-enter"><Segmented value={mode} onChange={setMode} items={[{value:"weekly",label:"Weekly"},{value:"feedback",label:"Feedback"},{value:"cx",label:"CX"}]}/>{mode==="weekly"?(weekly?<WeeklyView weekly={weekly} summary={weeklySummary}/>:<Skeleton/>):mode==="feedback"?(feedback?<FeedbackView data={feedback} staff={staff} period={period} activeRange={activeRange}/>:<Skeleton/>):(cx?<CxView data={cx} staff={staff} period={period} activeRange={activeRange}/>:<Skeleton/>)}</div>
}
function WeeklyView({weekly,summary}:{weekly:Weekly;summary:DailySummary|null}){
 const[showDetail,setShowDetail]=useState(false),[showExport,setShowExport]=useState(false),[exportBusy,setExportBusy]=useState(false),[detailTab,setDetailTab]=useState<"summary"|"lob"|"vas"|"reason">("summary"),[selectedLob,setSelectedLob]=useState<{name:string;key:string}|null>(null),[copyMsg,setCopyMsg]=useState("");
 const reportRef=useRef<HTMLDivElement>(null);
 const sum=(obj:Record<string,{qty:number;amount:number}>={})=>Object.values(obj).reduce((a,x)=>({qty:a.qty+x.qty,amount:a.amount+x.amount}),{qty:0,amount:0});
 const total=(side:Weekly["b"])=>sum(side.scheme),cur=total(weekly.b),prev=total(weekly.a),growth=prev.amount?(cur.amount-prev.amount)/prev.amount*100:0;
 const lobs=[["iPhone","IPHONE"],["iPad","IPAD"],["MacBook","MAC"],["Apple Watch","APPLE WATCH"],["AirPods","AIRPODS"]] as const;
 const schemes=[...new Set([...Object.keys(weekly.a.scheme||{}),...Object.keys(weekly.b.scheme||{})])];
 const vasKeys=[...new Set([...Object.keys(weekly.a.vas||{}),...Object.keys(weekly.b.vas||{})])];
 const delta=(a:number,b:number)=>a?((b-a)/a)*100:(b?100:0);
 const lobSummary=lobs.map(([name,key])=>{const a=sum(weekly.a.lob?.[key]||{}),b=sum(weekly.b.lob?.[key]||{});return{name,key,a,b,qtyDelta:b.qty-a.qty,amountDelta:b.amount-a.amount,growth:delta(a.amount,b.amount)}}).sort((x,y)=>x.growth-y.growth);
 const analysisRows=Object.entries((weekly.analysis||{}) as Record<string,{review?:string;actionPlan?:string;target?:number;achievement?:number;gap?:number}>).map(([key,v])=>({key,...v})).filter(x=>String(x.review||"").trim()||String(x.actionPlan||"").trim());
 const reasonText=analysisRows.find(x=>String(x.review||"").trim())?.review||"";
 const actionText=analysisRows.find(x=>String(x.actionPlan||"").trim())?.actionPlan||"";
 const lobDetailRows=selectedLob?[...new Set([...Object.keys(weekly.a.lob?.[selectedLob.key]||{}),...Object.keys(weekly.b.lob?.[selectedLob.key]||{})])].map(type=>{
   const a=weekly.a.lob?.[selectedLob.key]?.[type]||{qty:0,amount:0},b=weekly.b.lob?.[selectedLob.key]?.[type]||{qty:0,amount:0};
   return{type,a,b,qtyDelta:b.qty-a.qty,qtyPct:delta(a.qty,b.qty),amountDelta:b.amount-a.amount,amountPct:delta(a.amount,b.amount)};
 }).sort((x,y)=>x.qtyDelta-y.qtyDelta||x.amountDelta-y.amountDelta):[];
 const weeklyShareText=()=>[
  `*M238 DIGIMAP PIM 2*`,
  `*${weekly.labelB}*`,
  `Sales ${money.format(cur.amount)}`,
  `${growth>=0?"+":""}${pct(growth)} vs ${weekly.labelA}`,
  `Qty ${num.format(cur.qty)}`,
  summary?`Traffic ${num.format(summary.summary.traffic)} • CVR ${pct(summary.summary.cvr)} • UPT ${summary.summary.upt.toFixed(1)}`:"",
  reasonText?`\nReason:\n${reasonText}`:"",
  actionText?`\nAction Plan:\n${actionText}`:""
 ].filter(Boolean).join("\n");
 const doWeeklyExport=async(kind:"share"|"copy"|"png"|"pdf"|"xlsx")=>{
  setExportBusy(true);
  try{
   const text=weeklyShareText();
   if(kind==="share"){
    if(navigator.share)await navigator.share({title:`M238 ${weekly.labelB}`,text});
    else await navigator.clipboard.writeText(text);
   }else if(kind==="copy")await navigator.clipboard.writeText(text);
   else if(kind==="png"&&reportRef.current)await exportReportPng(reportRef.current,`M238-${weekly.labelB}`);
   else if(kind==="pdf"&&reportRef.current)await exportReportPdf(reportRef.current,`M238-${weekly.labelB}`);
   else if(kind==="xlsx")await exportReportXlsx([{name:"Weekly",rows:[
    ["Metric",weekly.labelA,weekly.labelB],
    ["Sales",prev.amount,cur.amount],["Qty",prev.qty,cur.qty],["Growth %",growth],
    ...(summary?[["Traffic","",summary.summary.traffic],["Transaction","",summary.summary.transaction],["CVR %","",summary.summary.cvr],["UPT","",summary.summary.upt],["ATV","",summary.summary.atv]]:[]),
    [],["LOB","Prev Qty","Current Qty","Prev Amount","Current Amount","Growth %"],
    ...lobSummary.map(r=>[r.name,r.a.qty,r.b.qty,r.a.amount,r.b.amount,r.growth]),
    [],["Reason",reasonText],["Action Plan",actionText]
   ]}],`M238-${weekly.labelB}`);
   setShowExport(false);
  }finally{setExportBusy(false)}
 };
 const copyLobCompare=async()=>{
  if(!selectedLob)return;
  const lines=[`*${selectedLob.name} • ${weekly.labelA} vs ${weekly.labelB}*`,...lobDetailRows.map(r=>`${r.type}: ${r.a.qty} → ${r.b.qty} unit (${r.qtyDelta>=0?"+":""}${r.qtyDelta}; ${r.qtyPct>=0?"+":""}${pct(r.qtyPct)}) | ${money.format(r.a.amount)} → ${money.format(r.b.amount)} (${r.amountPct>=0?"+":""}${pct(r.amountPct)})`)];
  try{await navigator.clipboard.writeText(lines.join("\n"));setCopyMsg("Compare berhasil disalin.");setTimeout(()=>setCopyMsg(""),1800)}catch{setCopyMsg("Gagal menyalin.")}
 };
 return <><div ref={reportRef} className="m238m-stack">
  <button className="m238m-click-card" onClick={()=>{setDetailTab("summary");setShowDetail(true)}}><Card className="m238m-hero compact m238m-weekly-hero"><div className="m238m-weekly-hero-title"><span>Weekly Sales • {weekly.labelB}</span><ChevronRight size={18}/></div><strong>{money.format(cur.amount)}</strong><p>{growth>=0?"+":""}{pct(growth)} vs {weekly.labelA} • Qty {num.format(cur.qty)}</p>{summary?.dailyRows?.length?<TouchLineChart rows={summary.dailyRows}/>:null}<small className="m238m-tap-hint">Tap untuk detail compare {weekly.labelA} vs {weekly.labelB}</small></Card></button>

  {summary?<><div className="m238m-section-head"><h2>Key Metrics</h2><span>{weekly.labelB}</span></div><div className="m238m-weekly-kpi-grid"><Metric label="Traffic" value={num.format(summary.summary.traffic)}/><Metric label="CVR" value={pct(summary.summary.cvr)}/><Metric label="UPT" value={summary.summary.upt.toFixed(1)}/><Metric label="Transaction" value={num.format(summary.summary.transaction)}/></div></>:null}

  <div className="m238m-section-head"><h2>LOB Performance</h2><button className="m238m-link-button" onClick={()=>{setDetailTab("lob");setShowDetail(true)}}>Lihat Detail</button></div>
  <div className="m238m-weekly-lob-list">{lobSummary.map(r=><button key={r.key} className="m238m-click-card" onClick={()=>{setSelectedLob({name:r.name,key:r.key});setDetailTab("lob");setShowDetail(true)}}><Card className="m238m-weekly-lob-row"><div><strong>{r.name}</strong><span>{num.format(r.a.qty)} → {num.format(r.b.qty)} unit</span></div><div><b className={r.growth>=0?"positive":"negative"}>{r.growth>=0?"+":""}{pct(r.growth)}</b><small>{money.format(r.b.amount)}</small></div></Card></button>)}</div>

  {(reasonText||actionText)?<div className="m238m-weekly-insight-grid">
    {reasonText?<Card className="m238m-weekly-note reason"><span>Reason</span><p>{reasonText}</p></Card>:null}
    {actionText?<Card className="m238m-weekly-note action"><span>Action Plan</span><p>{actionText}</p></Card>:null}
  </div>:null}

  <div className="m238m-weekly-actions">
    <button onClick={()=>{setDetailTab("reason");setShowDetail(true)}}><FileDown size={17}/><span>Open Full Report</span></button>
    <button onClick={()=>setShowExport(true)}><Share2 size={17}/><span>Share / Export</span></button>
  </div>
  </div>

  <Sheet open={showExport} onClose={()=>setShowExport(false)} title="Share / Export Weekly">
   <div className="m238m-action-list">
    <button disabled={exportBusy} onClick={()=>void doWeeklyExport("share")}><Share2/>Share</button>
    <button disabled={exportBusy} onClick={()=>void doWeeklyExport("copy")}><Copy/>Copy Text</button>
    <button disabled={exportBusy} onClick={()=>void doWeeklyExport("png")}><FileDown/>PNG</button>
    <button disabled={exportBusy} onClick={()=>void doWeeklyExport("pdf")}><FileDown/>PDF</button>
    <button disabled={exportBusy} onClick={()=>void doWeeklyExport("xlsx")}><FileSpreadsheet/>XLSX</button>
   </div>
  </Sheet>

  <Sheet open={showDetail} onClose={()=>setShowDetail(false)} title={`Weekly Compare • ${weekly.labelA} vs ${weekly.labelB}`}>
   <div className="m238m-stack">
    <Segmented value={detailTab} onChange={setDetailTab} items={[{value:"summary",label:"Summary"},{value:"lob",label:"LOB"},{value:"vas",label:"VAS"},{value:"reason",label:"Reason"}]}/>
    {detailTab==="summary"?<>
    <Card className="m238m-weekly-compare-total">
      <div className="m238m-section-head compact"><h2>Total Sales</h2><span>Week to Week</span></div>
      <div className="m238m-compare-pair"><div><span>{weekly.labelA}</span><strong>{money.format(prev.amount)}</strong><small>{num.format(prev.qty)} qty</small></div><div><span>{weekly.labelB}</span><strong>{money.format(cur.amount)}</strong><small>{num.format(cur.qty)} qty</small></div></div>
      <div className={"m238m-growth-pill "+(growth>=0?"positive":"negative")}>{growth>=0?"+":""}{pct(growth)} Sales Growth</div>
    </Card>

    {summary?<><div className="m238m-section-head"><h2>Performance {weekly.labelB}</h2></div><div className="m238m-grid"><Metric label="Traffic" value={num.format(summary.summary.traffic)}/><Metric label="Transaction" value={num.format(summary.summary.transaction)}/><Metric label="CVR" value={pct(summary.summary.cvr)}/><Metric label="UPT" value={summary.summary.upt.toFixed(1)}/><Metric label="ATV" value={money.format(summary.summary.atv)}/><Metric label="Qty" value={num.format(summary.summary.qty)}/></div></>:null}

    <div className="m238m-section-head"><h2>Sales Summary</h2><span>{weekly.labelA} → {weekly.labelB}</span></div>
    <div className="m238m-list">{schemes.map(k=>{const a=weekly.a.scheme[k]||{qty:0,amount:0},b=weekly.b.scheme[k]||{qty:0,amount:0},d=delta(a.amount,b.amount);return <Card key={k} className="m238m-week-compare-row"><div className="m238m-week-compare-head"><strong>{k}</strong><b className={d>=0?"positive":"negative"}>{d>=0?"+":""}{pct(d)}</b></div><div className="m238m-week-compare-values"><div><span>{weekly.labelA}</span><b>{money.format(a.amount)}</b><small>{num.format(a.qty)} qty</small></div><div><span>{weekly.labelB}</span><b>{money.format(b.amount)}</b><small>{num.format(b.qty)} qty</small></div></div></Card>})}</div>

    </>:null}

    {detailTab==="vas"?<>
    <div className="m238m-section-head"><h2>VAS</h2><span>Week to Week</span></div>
    <div className="m238m-list">{vasKeys.map(k=>{const a=weekly.a.vas[k]||{qty:0,amount:0},b=weekly.b.vas[k]||{qty:0,amount:0},d=delta(a.amount,b.amount);return <Card key={k} className="m238m-week-compare-row"><div className="m238m-week-compare-head"><strong>{k}</strong><b className={d>=0?"positive":"negative"}>{d>=0?"+":""}{pct(d)}</b></div><div className="m238m-week-compare-values"><div><span>{weekly.labelA}</span><b>{money.format(a.amount)}</b><small>{num.format(a.qty)} qty</small></div><div><span>{weekly.labelB}</span><b>{money.format(b.amount)}</b><small>{num.format(b.qty)} qty</small></div></div></Card>})}</div>

    </>:null}

    {detailTab==="lob"?<>
    <div className="m238m-section-head"><h2>LOB Performance</h2><span>Target vs Actual</span></div>
    <div className="m238m-list">{lobs.map(([name,key])=>{const a=sum(weekly.a.lob?.[key]||{}),b=sum(weekly.b.lob?.[key]||{}),target=weekly.targets?.lob?.[key]||0,ach=target?b.qty/target*100:0,d=delta(a.qty,b.qty);return <button key={key} className="m238m-click-card" onClick={()=>setSelectedLob({name,key})}><Card className="m238m-week-compare-row"><div className="m238m-week-compare-head"><strong>{name}</strong><div className="m238m-row-chevron"><b className={d>=0?"positive":"negative"}>{d>=0?"+":""}{pct(d)} Qty</b><ChevronRight size={16}/></div></div><div className="m238m-week-compare-values"><div><span>{weekly.labelA}</span><b>{num.format(a.qty)} unit</b><small>{money.format(a.amount)}</small></div><div><span>{weekly.labelB}</span><b>{num.format(b.qty)} unit</b><small>{money.format(b.amount)}</small></div></div>{target?<div className="m238m-week-target"><div><span>Target {num.format(target)}</span><b>{pct(ach)}</b></div><Progress value={ach}/><small>Gap {b.qty-target>=0?"+":""}{num.format(b.qty-target)} unit</small></div>:null}<small className="m238m-tap-hint">Tap untuk lihat detail type/model</small></Card></button>})}</div>

    {weekly.targets?.types?<><div className="m238m-section-head"><h2>Target LOB Focus</h2><span>{weekly.targets.sourceWeek||weekly.labelB}</span></div><div className="m238m-list">{Object.entries(weekly.targets.types as Record<string,Record<string,{focus?:boolean;target:number}>>).flatMap(([lob,types])=>Object.entries(types).filter(([,v])=>Boolean(v.focus)||Number(v.target)>0).map(([type,v])=>{const actual=Number(weekly.b.lob?.[lob]?.[type]?.qty||0),target=Number(v.target||0),ach=target?actual/target*100:0;return <Card key={lob+"-"+type+"-detail"} className="m238m-copy-card"><div className="m238m-copy-head"><strong>{type}</strong><b>{num.format(actual)} / {num.format(target)}</b></div><Progress value={ach}/><p>{pct(ach)} • Gap {actual-target>=0?"+":""}{num.format(actual-target)}{v.focus?" • Fokus":""}</p></Card>}))}</div></>:null}

    </>:null}

    {detailTab==="reason"?<>
    <div className="m238m-section-head"><h2>Reason & Action Plan</h2><span>{weekly.feedbackCount?weekly.feedbackCount+" feedback":""}</span></div>
    {weekly.feedbackSummary?<Card className="m238m-copy-card"><strong>Reason Store</strong><p>{weekly.feedbackSummary}</p></Card>:null}
    {Object.entries((weekly.analysis||{}) as Record<string,{review?:string;actionPlan?:string}>).map(([k,v])=><Card key={k+"-detail"} className="m238m-week-analysis"><strong>{k==="APPLE WATCH"?"Apple Watch":k.charAt(0)+k.slice(1).toLowerCase()}</strong><span>Weekly Review</span><p>{v.review||""}</p><span>Action Plan</span><p>{v.actionPlan||""}</p></Card>)}
    </>:null}
   </div>
  </Sheet>

  <Sheet open={!!selectedLob} onClose={()=>setSelectedLob(null)} title={selectedLob?`${selectedLob.name} • Detail Compare`:"LOB Detail"}>
   {selectedLob?<div className="m238m-stack">
    <Card className="m238m-copy-card"><div className="m238m-copy-head"><strong>{weekly.labelA} vs {weekly.labelB}</strong><button className="m238m-mini-action" onClick={()=>void copyLobCompare()}><Copy size={14}/> Salin Compare</button></div><p>Urut dari penurunan qty terbesar supaya mudah melihat type/model yang turun.</p>{copyMsg?<small className="m238m-notice">{copyMsg}</small>:null}</Card>
    <div className="m238m-list">{lobDetailRows.map(r=><Card key={r.type} className="m238m-lob-type-compare"><div className="m238m-week-compare-head"><strong>{r.type}</strong><div className="m238m-lob-deltas"><b className={r.qtyDelta>=0?"positive":"negative"}>{r.qtyDelta>=0?"+":""}{num.format(r.qtyDelta)} unit</b><small className={r.amountDelta>=0?"positive":"negative"}>{r.amountPct>=0?"+":""}{pct(r.amountPct)} amount</small></div></div><div className="m238m-week-compare-values"><div><span>{weekly.labelA}</span><b>{num.format(r.a.qty)} unit</b><small>{money.format(r.a.amount)}</small></div><div><span>{weekly.labelB}</span><b>{num.format(r.b.qty)} unit</b><small>{money.format(r.b.amount)}</small></div></div><div className="m238m-type-delta-line"><span>Qty</span><b className={r.qtyDelta>=0?"positive":"negative"}>{r.qtyPct>=0?"+":""}{pct(r.qtyPct)}</b><span>Amount</span><b className={r.amountDelta>=0?"positive":"negative"}>{r.amountPct>=0?"+":""}{pct(r.amountPct)}</b></div></Card>)}</div>
   </div>:null}
  </Sheet>
 </>
}

type DailyTrendRow={date:string;day?:string;totalSales:number};
function TouchLineChart({rows}:{rows:DailyTrendRow[]}){
 const[selected,setSelected]=useState(Math.max(0,rows.length-1)),w=320,h=94,pad=10,max=Math.max(...rows.map((r:DailyTrendRow)=>r.totalSales),1),min=Math.min(...rows.map((r:DailyTrendRow)=>r.totalSales),0),span=Math.max(1,max-min);
 const pts=rows.map((r,i)=>({x:pad+(rows.length===1?0:(i/(rows.length-1))*(w-pad*2)),y:h-pad-((r.totalSales-min)/span)*(h-pad*2),row:r}));
 const path=pts.map((p,i)=>`${i?"L":"M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
 const active=pts[selected]||pts[0];
 return <div className="m238m-touch-chart">
   {active?<div className="m238m-chart-tip"><b>{active.row.day||active.row.date.slice(8,10)}</b><span>{money.format(active.row.totalSales)}</span></div>:null}
   <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Sales harian week terpilih">
     <path d={path} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
     {pts.map((p,i)=><circle key={p.row.date} cx={p.x} cy={p.y} r={i===selected?5:3.2} className={i===selected?"active":""} onClick={()=>setSelected(i)}/>)}
   </svg>
   <div className="m238m-chart-days">{rows.map((r,i)=><button key={r.date} onClick={()=>setSelected(i)} className={i===selected?"active":""}>{r.day||r.date.slice(8,10)}</button>)}</div>
 </div>
}

function FeedbackView({data,period,activeRange}:{data:Feedback;staff:Staff[];period:string;activeRange:{from:string;to:string}|null}){
 const initialDate=activeRange?(today()>=activeRange.from&&today()<=activeRange.to?today():activeRange.to):(period===periodNow()?today():([...data.rows].sort((a,b)=>b.date.localeCompare(a.date))[0]?.date||`${period}-01`));
 const[selectedDate,setSelectedDate]=useState(initialDate),[rows,setRows]=useState(data.rows.filter(r=>r.date===initialDate)),[compiled,setCompiled]=useState(""),[dailyStaff,setDailyStaff]=useState<Staff[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const load=useCallback(async(date:string)=>{
  setRows(data.rows.filter(r=>r.date===date));setCompiled("");setBusy(true);setError("");
  try{
   const dd=await cachedJson<Daily>(`/api/daily-fast?date=${date}`,30000);
   setDailyStaff(dd.staff||[]);
   void cachedJson<Feedback>(`/api/feedback?date=${date}`,60000).then(fd=>{setRows(fd.rows||[]);setCompiled(fd.summary||"")}).catch(()=>{});
  }catch(e){setError(e instanceof Error?e.message:"Gagal memuat feedback")}finally{setBusy(false)}
 },[data.rows]);
 useEffect(()=>{void load(selectedDate)},[selectedDate,load]);
 const submitted=new Set(rows.map(r=>String(r.staffId)));
 const required=dailyStaff.filter(s=>{const target=Number(s.targets?.amount||s.target||0);return target>0&&Number(s.amount||0)<target});
 const missing=required.filter(s=>!submitted.has(String(s.id)));
 const achieved=dailyStaff.filter(s=>{const target=Number(s.targets?.amount||s.target||0);return target>0&&Number(s.amount||0)>=target});
 return <div className="m238m-stack">
  <Card className="m238m-feedback-date-card"><div><strong>Feedback Per Tanggal</strong><span>Pilih tanggal yang ingin direview</span></div><input type="date" value={selectedDate} max={today()} min={activeRange?.from} onChange={e=>setSelectedDate(e.target.value)}/></Card>
  {busy?<div className="m238m-refreshing"><RefreshCw size={14} className="spin"/> Memuat roster harian…</div>:null}
  <Card className={missing.length?"m238m-warning-card":"m238m-success-card"}><div className="m238m-copy-head"><strong>Reminder Feedback</strong><b>{busy?"…":missing.length?missing.length+" belum isi":"Lengkap"}</b></div><p>{busy?"Memuat status staff…":missing.length?`Staff belum achieve yang masih wajib feedback: ${missing.map(x=>shortStaffName(x.name)).join(", ")}`:"Semua staff yang belum achieve pada tanggal ini sudah mengisi feedback."}</p></Card>
  <div className="m238m-grid"><Metric label="Wajib Feedback" value={num.format(required.length)} sub="Staff belum achieve"/><Metric label="Sudah Isi" value={num.format(required.filter(s=>submitted.has(String(s.id))).length)}/><Metric label="Belum Isi" value={num.format(missing.length)}/><Metric label="Achieve" value={num.format(achieved.length)} sub="Tidak wajib feedback"/></div>
  {error?<Card className="m238m-error">{error}</Card>:null}
  {compiled?<Card className="m238m-compiled-feedback"><div className="m238m-copy-head"><strong>Compile Feedback Store</strong><span>{rows.length} feedback</span></div><p>{compiled}</p></Card>:null}
  <div className="m238m-section-head"><h2>Feedback Staff</h2><span>{salesDateLabel(selectedDate)}</span></div>
  <div className="m238m-list">{rows.length?rows.map((r,i)=><Card key={`${r.date}-${r.staffId}-${i}`} className="m238m-copy-card"><div className="m238m-copy-head"><strong>{shortStaffName(r.name)}</strong><span>{r.category}</span></div><p>{r.professional||r.raw}</p></Card>):<Card className="m238m-empty">Belum ada feedback pada tanggal ini.</Card>}</div>
 </div>
}
function CxView({data,staff,period,activeRange}:{data:Cx;staff:Staff[];period:string;activeRange:{from:string;to:string}|null}){
 const initialDate=activeRange?(today()>=activeRange.from&&today()<=activeRange.to?today():activeRange.to):(period===periodNow()?today():([...data.rows].sort((a,b)=>b.date.localeCompare(a.date))[0]?.date||`${period}-01`));
 const[selectedDate,setSelectedDate]=useState(initialDate),[activeStaff,setActiveStaff]=useState<Staff[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[detail,setDetail]=useState<"cx"|"member"|null>(null);
 const rows=data.rows,displayPeriod=selectedDate.slice(0,7);
 const load=useCallback(async(date:string)=>{
  setBusy(true);setError("");
  try{const daily=await cachedJson<Daily>(`/api/daily-fast?date=${date}`,30000);setActiveStaff(daily.staff||[])}
  catch(e){setError(e instanceof Error?e.message:"Gagal memuat roster harian")}finally{setBusy(false)}
 },[]);
 useEffect(()=>{void load(selectedDate)},[selectedDate,load]);
 const dayRows=rows.filter(r=>r.date===selectedDate),submitted=new Set(dayRows.map(r=>String(r.staffId))),missing=activeStaff.filter(r=>!submitted.has(String(r.id)));
 const cx=rows.reduce((a,r)=>a+Number(r.cx||0),0),member=rows.reduce((a,r)=>a+Number(r.member||0),0);
 const allStaff=useMemo(()=>{
   const map=new Map<string,{id:string;name:string}>();
   for(const s of staff)map.set(String(s.id),{id:String(s.id),name:s.name});
   for(const s of activeStaff)map.set(String(s.id),{id:String(s.id),name:s.name});
   for(const r of rows)map.set(String(r.staffId),{id:String(r.staffId),name:r.name});
   return [...map.values()];
 },[staff,activeStaff,rows]);
 const staffRecap=useMemo(()=>allStaff.map(person=>{const list=rows.filter(r=>String(r.staffId)===person.id),cxv=list.reduce((a,r)=>a+Number(r.cx||0),0),mem=list.reduce((a,r)=>a+Number(r.member||0),0),days=new Set(list.map(r=>r.date)).size;return{...person,cx:cxv,member:mem,daysCount:days,total:cxv+mem}}).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name)),[allStaff,rows]);
 const metricRows=staffRecap.slice().sort((a,b)=>detail==="member"?b.member-a.member:b.cx-a.cx||a.name.localeCompare(b.name));
 return <div className="m238m-stack">
  <Card className="m238m-feedback-date-card"><div><strong>CX & Member Per Tanggal</strong><span>Pilih tanggal untuk reminder dan detail harian</span></div><input type="date" value={selectedDate} max={today()} min={activeRange?.from} onChange={e=>setSelectedDate(e.target.value)}/></Card>
  {busy?<div className="m238m-refreshing"><RefreshCw size={14} className="spin"/> Memuat roster harian…</div>:null}
  <Card className={missing.length?"m238m-warning-card":"m238m-success-card"}><div className="m238m-copy-head"><strong>Reminder Staff</strong><b>{busy?"…":missing.length?missing.length+" belum isi":"Lengkap"}</b></div><p>{busy?"Memuat status staff…":missing.length?missing.map(x=>shortStaffName(x.name)).join(", "):"Semua staff yang masuk pada tanggal ini sudah mengisi CX / New Member."}</p></Card>
  {error?<Card className="m238m-error">{error}</Card>:null}
  <div className="m238m-grid">
   <button className="m238m-metric-button" onClick={()=>setDetail("cx")}><Card className="m238m-metric m238m-drill-card"><span>CX Periode</span><strong>{num.format(cx)}</strong><small>Tap detail staff</small><ChevronRight size={15}/></Card></button>
   <button className="m238m-metric-button" onClick={()=>setDetail("member")}><Card className="m238m-metric m238m-drill-card"><span>New Member Periode</span><strong>{num.format(member)}</strong><small>Tap detail staff</small><ChevronRight size={15}/></Card></button>
   <Metric label="Input Tanggal Ini" value={num.format(dayRows.length)} sub={salesDateLabel(selectedDate)}/>
   <Metric label="Belum Isi" value={num.format(missing.length)}/>
  </div>
  <div className="m238m-section-head"><h2>Rekap Per Staff</h2><span>{staffRecap.length} staff</span></div>
  <div className="m238m-list">{staffRecap.map((r,i)=><Card key={r.id} className="m238m-copy-card"><div className="m238m-copy-head"><strong>#{i+1} {shortStaffName(r.name)}</strong><b>{r.total}</b></div><p>{r.daysCount} hari input • CX {r.cx} • New Member {r.member}</p></Card>)}</div>
  <div className="m238m-section-head"><h2>Detail Tanggal</h2><span>{salesDateLabel(selectedDate)}</span></div>
  <div className="m238m-list">{dayRows.length?dayRows.map((r,i)=><Card key={r.staffId+"-"+i} className="m238m-copy-card"><div className="m238m-copy-head"><strong>{shortStaffName(r.name)}</strong><span>{r.date}</span></div><p>CX {num.format(r.cx)} • New Member {num.format(r.member)}</p></Card>):<Card className="m238m-empty">Belum ada input CX / Member pada tanggal ini.</Card>}</div>
  <Sheet open={!!detail} onClose={()=>setDetail(null)} title={detail==="member"?`New Member • ${activeRange?"Week aktif":monthLabel(displayPeriod)}`:`CX • ${activeRange?"Week aktif":monthLabel(displayPeriod)}`}>
   <div className="m238m-stack"><Card className="m238m-detail-sales"><span>{detail==="member"?"New Member Periode":"CX Periode"}</span><strong>{num.format(detail==="member"?member:cx)}</strong><small>Detail seluruh staff, termasuk nilai 0</small></Card><div className="m238m-list">{metricRows.map((r,i)=><Card key={r.id} className="m238m-staff-breakdown-row"><span>#{i+1}</span><strong>{shortStaffName(r.name)}</strong><b>{num.format(detail==="member"?r.member:r.cx)}</b></Card>)}</div></div>
  </Sheet>
 </div>
}
