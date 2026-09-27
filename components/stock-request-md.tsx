"use client";
import {useEffect,useMemo,useState,type ReactNode} from "react";
import {Copy,Mail,RefreshCw} from "lucide-react";

type Item={lob:string;article:string;description:string;soh:number;soldQty:number;recentSoldQty:number;lostCount:number;requestQty:number;priority:"Critical"|"High"|"Medium";reason:string;historyDays:number;historyPeak:number;previousSoh:number|null;stockDrop:number;inferredZero?:boolean};
type SnapshotItem={article:string;description:string;lob:string;soh:number};
type Payload={week:string;period:{from:string;to:string};sohUpdated:string;history?:{snapshotDate:string;days:number};summary:{recommendations:number;outOfStock:number;weekSales:number;lostFeedback:number};recommendations:Item[];outOfStock:Item[];snapshot?:SnapshotItem[];email:{subject:string;body:string};error?:string};
const num=new Intl.NumberFormat("id-ID");
const CACHE_KEY="m238-stock-request-v2";
function Card({children}:{children:ReactNode}){return <section className="m238m-card">{children}</section>}
const lobOrder=["iPad","MacBook","Apple Watch","iPhone","AirPods"];

export default function StockRequestMd(){
 const[data,setData]=useState<Payload|null>(null);
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState("");
 const[selected,setSelected]=useState<Record<string,boolean>>({});
 const[qty,setQty]=useState<Record<string,number>>({});
 const[copied,setCopied]=useState("");

 function apply(d:Payload){
  setData(d);setSelected(Object.fromEntries(d.recommendations.map(x=>[x.article,true])));setQty(Object.fromEntries(d.recommendations.map(x=>[x.article,x.requestQty])));
  try{sessionStorage.setItem(CACHE_KEY,JSON.stringify({at:Date.now(),data:d}))}catch{}
  if(d.snapshot?.length){
   window.setTimeout(()=>{void fetch("/api/stock-request",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({date:d.history?.snapshotDate,items:d.snapshot}),keepalive:true}).catch(()=>{})},250);
  }
 }
 async function load(force=false){
  let hadWarm=false;
  if(!force&&!data){
   try{const raw=sessionStorage.getItem(CACHE_KEY);if(raw){const cached=JSON.parse(raw) as{at:number;data:Payload};if(Date.now()-cached.at<5*60*1000){apply(cached.data);setLoading(false);hadWarm=true}}}catch{}
  }
  if(!hadWarm)setLoading(true);setError("");
  try{
   const url=force?`/api/stock-request?refresh=${Date.now()}`:"/api/stock-request";
   const r=await fetch(url,{cache:force?"no-store":"default"});
   const d=await r.json() as Payload;
   if(!r.ok||d.error)throw new Error(d.error||"Gagal compile stock request");
   apply(d);
  }catch(e){if(!hadWarm)setError(e instanceof Error?e.message:"Gagal compile stock request")}
  finally{setLoading(false)}
 }
 useEffect(()=>{void load(false)},[]);

 const chosen=useMemo(()=>data?.recommendations.filter(x=>selected[x.article]).map(x=>({...x,requestQty:Math.max(0,Number(qty[x.article]??x.requestQty))}))||[],[data,selected,qty]);
 const emailBody=useMemo(()=>{
  if(!data)return"";const grouped=new Map<string,Item[]>();for(const x of chosen){const rows=grouped.get(x.lob)||[];rows.push(x);grouped.set(x.lob,rows)}
  const lines:string[]=["Dear MD Team,","",`Mohon support stock untuk M238 Digimap PIM 2 berdasarkan evaluasi ${data.week}`,"Detail request:"];
  for(const lob of lobOrder){lines.push("",lob);for(const x of grouped.get(lob)||[])lines.push(`- (${x.article}) ${x.description||x.article} request ${x.requestQty}`)}
  for(const[lob,rows]of grouped){if(lobOrder.includes(lob))continue;lines.push("",lob);for(const x of rows)lines.push(`- (${x.article}) ${x.description||x.article} request ${x.requestQty}`)}
  lines.push("","Mohon dibantu untuk support replenishment item di atas agar opportunity penjualan tidak lost karena ketersediaan stock.","","Terima kasih.","Regards,","M238 Digimap PIM 2");return lines.join("\n");
 },[data,chosen]);

 async function copy(kind:"subject"|"body"|"all"){
  if(!data)return;const text=kind==="subject"?data.email.subject:kind==="body"?emailBody:`Subject : ${data.email.subject}\n\n${emailBody}`;await navigator.clipboard.writeText(text);setCopied(kind);setTimeout(()=>setCopied(""),1200)
 }
 function openEmail(){if(data)window.location.href=`mailto:?subject=${encodeURIComponent(data.email.subject)}&body=${encodeURIComponent(emailBody)}`}

 if(loading&&!data)return <div className="m238m-stack"><Card><p>Memuat analisa stock…</p></Card></div>;
 if(error&&!data)return <div className="m238m-stack"><Card><strong>Stock Request MD</strong><p>{error}</p><button onClick={()=>void load(true)}>Coba lagi</button></Card></div>;
 if(!data)return null;
 return <div className="m238m-stack">
  <Card><div className="m238m-copy-head"><div><strong>Stock Request MD</strong><p>{data.week} • SOH {data.sohUpdated}</p></div><button onClick={()=>void load(true)} aria-label="Refresh"><RefreshCw size={17}/></button></div><p>Analisa gabungan SOH saat ini, stok yang hilang dari SOH, Data Copas 8 minggu terakhir, lost/feedback staff, dan history SOH harian.</p></Card>
  <div className="m238m-grid"><Card><small>Prioritas</small><h3>{num.format(data.summary.recommendations)}</h3></Card><Card><small>SOH 0</small><h3>{num.format(data.summary.outOfStock)}</h3></Card><Card><small>Week Sales</small><h3>{num.format(data.summary.weekSales)}</h3></Card><Card><small>History SOH</small><h3>{num.format(data.history?.days||1)} hari</h3></Card></div>
  <div className="m238m-section-head"><h2>Rekomendasi Request</h2><span>{chosen.length} dipilih</span></div>
  <div className="m238m-stack">{data.recommendations.map(x=><Card key={x.article}><label style={{display:"flex",gap:8}}><input type="checkbox" checked={!!selected[x.article]} onChange={e=>setSelected(v=>({...v,[x.article]:e.target.checked}))}/><span><strong>{x.description||x.article}</strong><br/><small>{x.article} • {x.lob}</small></span></label><p>Week {x.soldQty} • 8W {x.recentSoldQty} • SOH {x.soh} • Lost {x.lostCount} • <b>{x.priority}</b></p><small>{x.reason}{x.previousSoh!=null?` • SOH sebelumnya ${x.previousSoh}`:""}{x.historyPeak>x.soh?` • Peak ${x.historyPeak}`:""}</small><div><label>Request Qty <input style={{width:64,marginLeft:8}} inputMode="numeric" value={qty[x.article]??x.requestQty} onChange={e=>setQty(v=>({...v,[x.article]:Math.max(0,Number(e.target.value)||0)}))}/></label></div></Card>)}{!data.recommendations.length?<Card><p>Belum ada item yang masuk prioritas request.</p></Card>:null}</div>
  {data.outOfStock.length?<><div className="m238m-section-head"><h2>SOH 0</h2><span>{data.summary.outOfStock} item</span></div><Card><p>Termasuk artikel yang sudah tidak muncul di SOH tetapi masih terdeteksi dari Data Copas/history stock. Jadi item kosong seperti warna/kapasitas tertentu tetap bisa ikut request.</p></Card></>:null}
  <div className="m238m-section-head"><h2>Draft Email</h2><span>Format simple</span></div>
  <Card><strong>Subject : {data.email.subject}</strong><pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",font:"inherit",fontSize:11,lineHeight:1.55}}>{emailBody}</pre></Card>
  <div className="m238m-action-list"><button onClick={()=>void copy("subject")}><Copy size={16}/>{copied==="subject"?"Copied":"Copy Subject"}</button><button onClick={()=>void copy("body")}><Copy size={16}/>{copied==="body"?"Copied":"Copy Body"}</button><button onClick={()=>void copy("all")}><Copy size={16}/>{copied==="all"?"Copied":"Copy Full Email"}</button><button onClick={openEmail}><Mail size={16}/>Buka Email</button></div>
 </div>;
}
