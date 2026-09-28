"use client";
import {useEffect,useMemo,useState,type ReactNode} from "react";
import {Copy,Download,Mail,RefreshCw} from "lucide-react";

type Item={lob:string;article:string;description:string;soh:number;soldQty:number;recentSoldQty:number;lostCount:number;requestQty:number;priority:"Critical"|"High"|"Medium";reason:string;historyDays:number;historyPeak:number;previousSoh:number|null;stockDrop:number;inferredZero?:boolean};
type SnapshotItem={article:string;description:string;lob:string;soh:number};
type Payload={week:string;period:{from:string;to:string};sohUpdated:string;history?:{snapshotDate:string;days:number};summary:{recommendations:number;outOfStock:number;weekSales:number;lostFeedback:number};recommendations:Item[];outOfStock:Item[];snapshot?:SnapshotItem[];email:{subject:string;body:string};error?:string};
type MdGroup="iphone-ipad"|"mac-watch";

const num=new Intl.NumberFormat("id-ID");
const CACHE_KEY="m238-stock-request-device-only-v5";
function Card({children}:{children:ReactNode}){return <section className="m238m-card">{children}</section>}

const accessoryPattern=/CASE|COVER|GLASS|TEMPERED|SCREEN|PROTECTOR|KEYBOARD|PENCIL|AIR\s*PODS?|EARPODS|CABLE|CHARGER|ADAPTER|ADAPTOR|MOUSE|TRACKPAD|BAND|STRAP|SLEEVE|HUB|DOCK|POWER|WALLET|MAGSAFE|UNI\s*Q|STM|UAG|IMPACT|MOVEMENT|CAM\s*CLICK|AC\s*PLUS|APPLECARE/i;
function deviceLob(article:string,description:string,currentLob=""){
 const text=`${article} ${description}`.toUpperCase();
 if(accessoryPattern.test(text))return"";
 if(!/^APP/i.test(article))return"";
 if(/\bIPHONE\b/.test(text))return"iPhone";
 if(/\bIPAD\b/.test(text))return"iPad";
 if(/MACBOOK|\bMBA\b|\bMBP\b|MAC\s*NEO|\bNEO\b/.test(text))return"MacBook";
 if(/APPLE\s*WATCH|\bWATCH\b|\bAW\s*(?:SE|S\d|ULTRA)/.test(text))return"Apple Watch";
 if(["iPhone","iPad","MacBook","Apple Watch"].includes(currentLob))return currentLob;
 return"";
}
function filterDeviceOnly(d:Payload):Payload{
 const normalize=<T extends Item|SnapshotItem>(x:T):T|null=>{const lob=deviceLob(x.article,x.description,x.lob);return lob?({...x,lob} as T):null};
 const recommendations=d.recommendations.map(normalize).filter((x):x is Item=>Boolean(x));
 const outOfStock=d.outOfStock.map(normalize).filter((x):x is Item=>Boolean(x));
 const snapshot=(d.snapshot||[]).map(normalize).filter((x):x is SnapshotItem=>Boolean(x));
 return {...d,recommendations,outOfStock,snapshot,summary:{...d.summary,recommendations:recommendations.length,outOfStock:outOfStock.length}};
}
function groupLabel(group:MdGroup){return group==="iphone-ipad"?"MD iPhone & iPad":"MD MacBook & Apple Watch"}
function groupLobs(group:MdGroup){return group==="iphone-ipad"?["iPhone","iPad"]:["MacBook","Apple Watch"]}
function safeWeek(week:string){return week.replace(/[^A-Za-z0-9_-]+/g,"-")}

export default function StockRequestMd(){
 const[data,setData]=useState<Payload|null>(null);
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState("");
 const[selected,setSelected]=useState<Record<string,boolean>>({});
 const[qty,setQty]=useState<Record<string,number>>({});
 const[copied,setCopied]=useState("");

 function apply(raw:Payload){
  const d=filterDeviceOnly(raw);
  setData(d);setSelected(Object.fromEntries(d.recommendations.map(x=>[x.article,true])));setQty(Object.fromEntries(d.recommendations.map(x=>[x.article,x.requestQty])));
  try{sessionStorage.setItem(CACHE_KEY,JSON.stringify({at:Date.now(),data:d}))}catch{}
  if(d.snapshot?.length)window.setTimeout(()=>{void fetch("/api/stock-request",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({date:d.history?.snapshotDate,items:d.snapshot}),keepalive:true}).catch(()=>{})},250)
 }
 async function load(force=false){
  let hadWarm=false;
  if(!force&&!data){try{const raw=sessionStorage.getItem(CACHE_KEY);if(raw){const cached=JSON.parse(raw) as{at:number;data:Payload};if(Date.now()-cached.at<5*60*1000){apply(cached.data);setLoading(false);hadWarm=true}}}catch{}}
  if(!hadWarm)setLoading(true);setError("");
  try{
   const url=force?`/api/stock-request?refresh=${Date.now()}`:"/api/stock-request";
   const r=await fetch(url,{cache:force?"no-store":"default"});const d=await r.json() as Payload;
   if(!r.ok||d.error)throw new Error(d.error||"Gagal compile stock request");apply(d)
  }catch(e){if(!hadWarm)setError(e instanceof Error?e.message:"Gagal compile stock request")}finally{setLoading(false)}
 }
 useEffect(()=>{void load(false)},[]);

 const chosen=useMemo(()=>data?.recommendations.filter(x=>selected[x.article]).map(x=>({...x,requestQty:Math.max(0,Number(qty[x.article]??x.requestQty))})).filter(x=>x.requestQty>0)||[],[data,selected,qty]);
 const grouped=useMemo(()=>({
  "iphone-ipad":chosen.filter(x=>groupLobs("iphone-ipad").includes(x.lob)),
  "mac-watch":chosen.filter(x=>groupLobs("mac-watch").includes(x.lob)),
 }),[chosen]);

 function subject(group:MdGroup){return `Request Stock M238 Digimap PIM 2 - ${data?.week||"Week"} - ${group==="iphone-ipad"?"iPhone & iPad":"MacBook & Apple Watch"}`}
 function emailBody(group:MdGroup){
  if(!data)return"";const rows=grouped[group];const lobs=groupLobs(group);
  const lines=["Dear MD Team,","",`Mohon support stock untuk M238 Digimap PIM 2 berdasarkan evaluasi ${data.week}.`,`Detail request ${lobs.join(" & ")} terlampir pada file Excel.`,`Total item request: ${rows.length}.`,`","Mohon dibantu untuk support replenishment agar opportunity penjualan tidak lost karena ketersediaan stock.","","Terima kasih.","Regards,","M238 Digimap PIM 2"];
  return lines.join("\n")
 }
 async function copy(group:MdGroup,kind:"subject"|"body"|"all"){
  const key=`${group}-${kind}`;const text=kind==="subject"?subject(group):kind==="body"?emailBody(group):`Subject : ${subject(group)}\n\n${emailBody(group)}`;
  await navigator.clipboard.writeText(text);setCopied(key);setTimeout(()=>setCopied(""),1200)
 }
 function openEmail(group:MdGroup){window.location.href=`mailto:?subject=${encodeURIComponent(subject(group))}&body=${encodeURIComponent(emailBody(group))}`}
 async function downloadExcel(group:MdGroup){
  if(!data)return;const rows=grouped[group];if(!rows.length)return;
  const XLSX=await import("xlsx");
  const workbook=XLSX.utils.book_new();
  for(const lob of groupLobs(group)){
   const lobRows=rows.filter(x=>x.lob===lob).map((x,i)=>({
    No:i+1,Article:x.article,Description:x.description,"Week Sales":x.soldQty,"8W Sales":x.recentSoldQty,SOH:x.soh,Lost:x.lostCount,"Request Qty":x.requestQty,Priority:x.priority,Reason:x.reason
   }));
   if(!lobRows.length)continue;
   const ws=XLSX.utils.json_to_sheet(lobRows);
   ws["!cols"]=[{wch:5},{wch:18},{wch:46},{wch:11},{wch:10},{wch:8},{wch:8},{wch:12},{wch:11},{wch:42}];
   ws["!autofilter"]={ref:`A1:J${lobRows.length+1}`};
   XLSX.utils.book_append_sheet(workbook,ws,lob.slice(0,31));
  }
  const fileName=`Request Stock M238 - ${group==="iphone-ipad"?"iPhone-iPad":"MacBook-Watch"} - ${safeWeek(data.week)}.xlsx`;
  XLSX.writeFile(workbook,fileName,{compression:true})
 }

 if(loading&&!data)return <div className="m238m-stack"><Card><p>Memuat analisa stock device…</p></Card></div>;
 if(error&&!data)return <div className="m238m-stack"><Card><strong>Stock Request MD</strong><p>{error}</p><button onClick={()=>void load(true)}>Coba lagi</button></Card></div>;
 if(!data)return null;
 return <div className="m238m-stack">
  <Card><div className="m238m-copy-head"><div><strong>Stock Request MD</strong><p>{data.week} • SOH {data.sohUpdated}</p></div><button onClick={()=>void load(true)} aria-label="Refresh"><RefreshCw size={17}/></button></div><p>Request device only. Dibagi menjadi 2 MD dan detail request dibuat dalam file Excel agar email lebih ringkas dan rapi.</p></Card>
  <div className="m238m-grid"><Card><small>Prioritas</small><h3>{num.format(data.summary.recommendations)}</h3></Card><Card><small>SOH 0</small><h3>{num.format(data.summary.outOfStock)}</h3></Card><Card><small>Dipilih</small><h3>{num.format(chosen.length)}</h3></Card><Card><small>History SOH</small><h3>{num.format(data.history?.days||1)} hari</h3></Card></div>

  <div className="m238m-section-head"><h2>Rekomendasi Request</h2><span>{chosen.length} dipilih</span></div>
  <div className="m238m-stack">{data.recommendations.map(x=><Card key={x.article}><label style={{display:"flex",gap:8}}><input type="checkbox" checked={!!selected[x.article]} onChange={e=>setSelected(v=>({...v,[x.article]:e.target.checked}))}/><span><strong>{x.description||x.article}</strong><br/><small>{x.article} • {x.lob}</small></span></label><p>Week {x.soldQty} • 8W {x.recentSoldQty} • SOH {x.soh} • Lost {x.lostCount} • <b>{x.priority}</b></p><small>{x.reason}</small><div><label>Request Qty <input style={{width:64,marginLeft:8}} inputMode="numeric" value={qty[x.article]??x.requestQty} onChange={e=>setQty(v=>({...v,[x.article]:Math.max(0,Number(e.target.value)||0)}))}/></label></div></Card>)}</div>

  {(["iphone-ipad","mac-watch"] as MdGroup[]).map(group=>{
   const rows=grouped[group];return <div key={group} className="m238m-stack">
    <div className="m238m-section-head"><h2>{groupLabel(group)}</h2><span>{rows.length} item</span></div>
    <Card>
     <strong>{group==="iphone-ipad"?"iPhone + iPad":"MacBook + Apple Watch"}</strong>
     <p>Excel berisi Article, Description, Week Sales, 8W Sales, SOH, Lost, Request Qty, Priority, dan Reason.</p>
     {rows.slice(0,5).map(x=><div key={x.article} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,padding:"8px 0",borderBottom:"1px solid rgba(127,127,127,.15)"}}><span><small>{x.lob}</small><br/><b>{x.description}</b><br/><small>{x.article} • SOH {x.soh} • Week {x.soldQty}</small></span><strong>Req {x.requestQty}</strong></div>)}
     {rows.length>5?<p><small>+ {rows.length-5} item lainnya di Excel</small></p>:null}
    </Card>
    <div className="m238m-action-list">
     <button disabled={!rows.length} onClick={()=>void downloadExcel(group)}><Download size={16}/>Download Excel</button>
     <button disabled={!rows.length} onClick={()=>void copy(group,"all")}><Copy size={16}/>{copied===`${group}-all`?"Copied":"Copy Email"}</button>
     <button disabled={!rows.length} onClick={()=>openEmail(group)}><Mail size={16}/>Buka Email</button>
    </div>
   </div>
  })}
 </div>;
}
