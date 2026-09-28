"use client";
import {useEffect,useMemo,useState,type ReactNode} from "react";
import {Copy,Mail,RefreshCw} from "lucide-react";

type Item={lob:string;article:string;description:string;soh:number;soldQty:number;recentSoldQty:number;lostCount:number;requestQty:number;priority:"Critical"|"High"|"Medium";reason:string;historyDays:number;historyPeak:number;previousSoh:number|null;stockDrop:number;inferredZero?:boolean};
type SnapshotItem={article:string;description:string;lob:string;soh:number};
type Payload={week:string;period:{from:string;to:string};sohUpdated:string;history?:{snapshotDate:string;days:number};summary:{recommendations:number;outOfStock:number;weekSales:number;lostFeedback:number};recommendations:Item[];outOfStock:Item[];snapshot?:SnapshotItem[];email:{subject:string;body:string};error?:string};
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
 const normalize=<T extends Item|SnapshotItem>(x:T):T|null=>{
  const lob=deviceLob(x.article,x.description,x.lob);if(!lob)return null;
  return {...x,lob} as T;
 };
 const recommendations=d.recommendations.map(normalize).filter((x):x is Item=>Boolean(x));
 const outOfStock=d.outOfStock.map(normalize).filter((x):x is Item=>Boolean(x));
 const snapshot=(d.snapshot||[]).map(normalize).filter((x):x is SnapshotItem=>Boolean(x));
 return {...d,recommendations,outOfStock,snapshot,summary:{...d.summary,recommendations:recommendations.length,outOfStock:outOfStock.length}};
}
function csvEscape(value:unknown){const text=String(value??"").replace(/\r?\n/g," ");return `"${text.replace(/"/g,'""')}"`}

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

 const chosen=useMemo(()=>data?.recommendations.filter(x=>selected[x.article]).map(x=>({...x,requestQty:Math.max(0,Number(qty[x.article]??x.requestQty))})).filter(x=>x.requestQty>0)||[],[data,selected,qty]);
 const mdIphoneIpad=useMemo(()=>chosen.filter(x=>x.lob==="iPhone"||x.lob==="iPad"),[chosen]);
 const mdMacWatch=useMemo(()=>chosen.filter(x=>x.lob==="MacBook"||x.lob==="Apple Watch"),[chosen]);

 function subject(label:string){return `Request Stock M238 Digimap PIM 2 - ${data?.week||"Week"} - ${label}`}
 function emailBody(label:string,count:number){
  if(!data)return"";
  return ["Dear MD Team,","",`Mohon support stock untuk M238 Digimap PIM 2 berdasarkan evaluasi ${data.week}.`,`Detail request ${label} terlampir pada file spreadsheet.`,`Total item request: ${count}.`,`","Mohon dibantu untuk support replenishment agar opportunity penjualan tidak lost karena ketersediaan stock.","","Terima kasih.","Regards,","M238 Digimap PIM 2"].join("\n")
 }
 async function copyEmail(key:string,label:string,count:number){
  const text=`Subject : ${subject(label)}\n\n${emailBody(label,count)}`;await navigator.clipboard.writeText(text);setCopied(key);setTimeout(()=>setCopied(""),1200)
 }
 function openEmail(label:string,count:number){window.location.href=`mailto:?subject=${encodeURIComponent(subject(label))}&body=${encodeURIComponent(emailBody(label,count))}`}
 function downloadSheet(rows:Item[],label:string){
  if(!data||!rows.length)return;
  const headers=["LOB","Article","Description","Week Sales","8W Sales","SOH","Lost","Request Qty","Priority","Reason"];
  const lines=[headers.map(csvEscape).join(","),...rows.map(x=>[x.lob,x.article,x.description,x.soldQty,x.recentSoldQty,x.soh,x.lostCount,x.requestQty,x.priority,x.reason].map(csvEscape).join(","))];
  const blob=new Blob(["\ufeff",lines.join("\r\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`Request Stock M238 - ${label.replace(/[^A-Za-z0-9]+/g,"-")} - ${data.week.replace(/[^A-Za-z0-9]+/g,"-")}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)
 }

 if(loading&&!data)return <div className="m238m-stack"><Card><p>Memuat analisa stock device…</p></Card></div>;
 if(error&&!data)return <div className="m238m-stack"><Card><strong>Stock Request MD</strong><p>{error}</p><button onClick={()=>void load(true)}>Coba lagi</button></Card></div>;
 if(!data)return null;
 return <div className="m238m-stack">
  <Card><div className="m238m-copy-head"><div><strong>Stock Request MD</strong><p>{data.week} • SOH {data.sohUpdated}</p></div><button onClick={()=>void load(true)} aria-label="Refresh"><RefreshCw size={17}/></button></div><p>Request device only. Dibagi 2 MD: iPhone + iPad dan MacBook + Apple Watch. Detail request dibuat dalam format spreadsheet agar email lebih rapi.</p></Card>
  <div className="m238m-grid"><Card><small>Prioritas</small><h3>{num.format(data.summary.recommendations)}</h3></Card><Card><small>SOH 0</small><h3>{num.format(data.summary.outOfStock)}</h3></Card><Card><small>Dipilih</small><h3>{num.format(chosen.length)}</h3></Card><Card><small>History SOH</small><h3>{num.format(data.history?.days||1)} hari</h3></Card></div>
  <div className="m238m-section-head"><h2>Rekomendasi Request</h2><span>{chosen.length} dipilih</span></div>
  <div className="m238m-stack">{data.recommendations.map(x=><Card key={x.article}><label style={{display:"flex",gap:8}}><input type="checkbox" checked={!!selected[x.article]} onChange={e=>setSelected(v=>({...v,[x.article]:e.target.checked}))}/><span><strong>{x.description||x.article}</strong><br/><small>{x.article} • {x.lob}</small></span></label><p>Week {x.soldQty} • 8W {x.recentSoldQty} • SOH {x.soh} • Lost {x.lostCount} • <b>{x.priority}</b></p><small>{x.reason}</small><div><label>Request Qty <input style={{width:64,marginLeft:8}} inputMode="numeric" value={qty[x.article]??x.requestQty} onChange={e=>setQty(v=>({...v,[x.article]:Math.max(0,Number(e.target.value)||0)}))}/></label></div></Card>)}</div>

  <div className="m238m-section-head"><h2>MD iPhone & iPad</h2><span>{mdIphoneIpad.length} item</span></div>
  <Card><strong>iPhone + iPad</strong><p>Spreadsheet terpisah khusus MD iPhone & iPad.</p>{mdIphoneIpad.slice(0,5).map(x=><p key={x.article}><small>{x.lob}</small><br/><b>{x.description}</b><br/><small>{x.article} • SOH {x.soh} • Req {x.requestQty}</small></p>)}{mdIphoneIpad.length>5?<p><small>+ {mdIphoneIpad.length-5} item lainnya di file</small></p>:null}</Card>
  <div className="m238m-action-list"><button disabled={!mdIphoneIpad.length} onClick={()=>downloadSheet(mdIphoneIpad,"iPhone-iPad")}>Download Spreadsheet</button><button disabled={!mdIphoneIpad.length} onClick={()=>void copyEmail("md1","iPhone & iPad",mdIphoneIpad.length)}><Copy size={16}/>{copied==="md1"?"Copied":"Copy Email"}</button><button disabled={!mdIphoneIpad.length} onClick={()=>openEmail("iPhone & iPad",mdIphoneIpad.length)}><Mail size={16}/>Buka Email</button></div>

  <div className="m238m-section-head"><h2>MD MacBook & Apple Watch</h2><span>{mdMacWatch.length} item</span></div>
  <Card><strong>MacBook + Apple Watch</strong><p>Spreadsheet terpisah khusus MD MacBook & Apple Watch.</p>{mdMacWatch.slice(0,5).map(x=><p key={x.article}><small>{x.lob}</small><br/><b>{x.description}</b><br/><small>{x.article} • SOH {x.soh} • Req {x.requestQty}</small></p>)}{mdMacWatch.length>5?<p><small>+ {mdMacWatch.length-5} item lainnya di file</small></p>:null}</Card>
  <div className="m238m-action-list"><button disabled={!mdMacWatch.length} onClick={()=>downloadSheet(mdMacWatch,"MacBook-Watch")}>Download Spreadsheet</button><button disabled={!mdMacWatch.length} onClick={()=>void copyEmail("md2","MacBook & Apple Watch",mdMacWatch.length)}><Copy size={16}/>{copied==="md2"?"Copied":"Copy Email"}</button><button disabled={!mdMacWatch.length} onClick={()=>openEmail("MacBook & Apple Watch",mdMacWatch.length)}><Mail size={16}/>Buka Email</button></div>
 </div>;
}
