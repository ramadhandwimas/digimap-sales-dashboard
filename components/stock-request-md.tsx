"use client";
import {useEffect,useMemo,useState,type ReactNode} from "react";
import {Copy,Mail,RefreshCw} from "lucide-react";

type Item={lob:string;article:string;description:string;soh:number;soldQty:number;recentSoldQty:number;lostCount:number;requestQty:number;priority:"Critical"|"High"|"Medium";reason:string;historyDays:number;historyPeak:number;previousSoh:number|null;stockDrop:number;inferredZero?:boolean};
type SnapshotItem={article:string;description:string;lob:string;soh:number};
type Payload={week:string;period:{from:string;to:string};sohUpdated:string;history?:{snapshotDate:string;days:number};summary:{recommendations:number;outOfStock:number;weekSales:number;lostFeedback:number};recommendations:Item[];outOfStock:Item[];snapshot?:SnapshotItem[];email:{subject:string;body:string};error?:string};
const num=new Intl.NumberFormat("id-ID");
const CACHE_KEY="m238-stock-request-device-only-v6";
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
function esc(v:unknown){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}

export default function StockRequestMd(){
 const[data,setData]=useState<Payload|null>(null);
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState("");
 const[selected,setSelected]=useState<Record<string,boolean>>({});
 const[qty,setQty]=useState<Record<string,number>>({});
 const[copied,setCopied]=useState("");
 const[showRecommendations,setShowRecommendations]=useState(false);
 const[showEmail1,setShowEmail1]=useState(false);
 const[showEmail2,setShowEmail2]=useState(false);

 function apply(raw:Payload){
  const d=filterDeviceOnly(raw);
  setData(d);setSelected(Object.fromEntries(d.recommendations.map(x=>[x.article,true])));setQty(Object.fromEntries(d.recommendations.map(x=>[x.article,x.requestQty])));
  try{sessionStorage.setItem(CACHE_KEY,JSON.stringify({at:Date.now(),data:d}))}catch{}
  if(d.snapshot?.length){window.setTimeout(()=>{void fetch("/api/stock-request",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({date:d.history?.snapshotDate,items:d.snapshot}),keepalive:true}).catch(()=>{})},250)}
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
 const iphoneIpad=useMemo(()=>chosen.filter(x=>x.lob==="iPhone"||x.lob==="iPad").sort((a,b)=>a.lob.localeCompare(b.lob)||a.description.localeCompare(b.description)),[chosen]);
 const macWatch=useMemo(()=>chosen.filter(x=>x.lob==="MacBook"||x.lob==="Apple Watch").sort((a,b)=>a.lob.localeCompare(b.lob)||a.description.localeCompare(b.description)),[chosen]);

 function subject(label:string){return `Request Stock M238 Digimap PIM 2 - ${data?.week||"Week"} - ${label}`}
 function plainEmail(rows:Item[]){
  if(!data)return"";
  const lines=["Dear MD Team,","",`Mohon support stock untuk M238 Digimap PIM 2 berdasarkan evaluasi ${data.week}.`,"","Detail request:","","Artikel\tDescription\tRequest"];
  for(const x of rows)lines.push(`${x.article}\t${x.description}\t${x.requestQty} unit`);
  lines.push("","Mohon dibantu untuk support replenishment item di atas agar opportunity penjualan tidak lost karena ketersediaan stock.","","Terima kasih.","Regards,","M238 Digimap PIM 2");
  return lines.join("\n");
 }
 function htmlEmail(rows:Item[]){
  if(!data)return"";
  const groups:Array<[string,Item[]]>=[["iPhone",rows.filter(x=>x.lob==="iPhone")],["iPad",rows.filter(x=>x.lob==="iPad")],["MacBook",rows.filter(x=>x.lob==="MacBook")],["Apple Watch",rows.filter(x=>x.lob==="Apple Watch")]].filter((x):x is [string,Item[]]=>x[1].length>0);
  const body=groups.map(([lob,list])=>`<tr><td colspan="3" style="border:1px solid #d1d5db;padding:8px 10px;font-weight:700;background:#f3f4f6">${esc(lob)}</td></tr>${list.map(x=>`<tr><td style="border:1px solid #d1d5db;padding:8px 10px;vertical-align:top;white-space:nowrap">${esc(x.article)}</td><td style="border:1px solid #d1d5db;padding:8px 10px;vertical-align:top">${esc(x.description)}</td><td style="border:1px solid #d1d5db;padding:8px 10px;vertical-align:top;white-space:nowrap;text-align:center">${x.requestQty} unit</td></tr>`).join("")}`).join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111827"><p>Dear MD Team,</p><p>Mohon support stock untuk M238 Digimap PIM 2 berdasarkan evaluasi ${esc(data.week)}.</p><p><strong>Detail request:</strong></p><table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:760px"><thead><tr><th style="border:1px solid #d1d5db;padding:8px 10px;text-align:left;background:#ffffff">Artikel</th><th style="border:1px solid #d1d5db;padding:8px 10px;text-align:left;background:#ffffff">Description</th><th style="border:1px solid #d1d5db;padding:8px 10px;text-align:left;background:#ffffff">Request</th></tr></thead><tbody>${body}</tbody></table><p>Mohon dibantu untuk support replenishment item di atas agar opportunity penjualan tidak lost karena ketersediaan stock.</p><p>Terima kasih.<br>Regards,<br>M238 Digimap PIM 2</p></div>`;
 }
 async function copySubject(key:string,label:string){await navigator.clipboard.writeText(subject(label));setCopied(key);setTimeout(()=>setCopied(""),1400)}
 async function copyRichEmail(key:string,rows:Item[]){
  if(!rows.length)return;
  const html=htmlEmail(rows),plain=plainEmail(rows);
  try{
   if(navigator.clipboard?.write&&typeof ClipboardItem!=="undefined"){
    const item=new ClipboardItem({"text/html":new Blob([html],{type:"text/html"}),"text/plain":new Blob([plain],{type:"text/plain"})});
    await navigator.clipboard.write([item]);
   }else await navigator.clipboard.writeText(plain);
  }catch{await navigator.clipboard.writeText(plain)}
  setCopied(key);setTimeout(()=>setCopied(""),1400)
 }
 function openEmail(label:string,rows:Item[]){window.location.href=`mailto:?subject=${encodeURIComponent(subject(label))}&body=${encodeURIComponent(plainEmail(rows))}`}
 function TablePreview({rows}:{rows:Item[]}){
  const order=["iPhone","iPad","MacBook","Apple Watch"];
  return <div style={{overflowX:"hidden",marginTop:12,width:"100%"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:10.5,tableLayout:"fixed"}}><colgroup><col style={{width:"29%"}}/><col style={{width:"51%"}}/><col style={{width:"20%"}}/></colgroup><thead><tr><th style={th}>Artikel</th><th style={th}>Description</th><th style={th}>Request</th></tr></thead><tbody>{order.flatMap(lob=>{const list=rows.filter(x=>x.lob===lob);if(!list.length)return[];return [<tr key={`${lob}-head`}><td colSpan={3} style={groupCell}>{lob}</td></tr>,...list.map(x=><tr key={x.article}><td style={tdArticle}>{x.article}</td><td style={td}>{x.description}</td><td style={tdRequest}>{x.requestQty} unit</td></tr>)]})}</tbody></table></div>
 }
 const th={border:"1px solid #d8d8de",padding:"7px 5px",textAlign:"left" as const,fontWeight:700,background:"#f7f7f9",overflowWrap:"anywhere" as const};
 const td={border:"1px solid #d8d8de",padding:"7px 5px",verticalAlign:"top" as const,overflowWrap:"anywhere" as const,wordBreak:"break-word" as const};
 const tdArticle={...td,fontSize:10};
 const tdRequest={...td,textAlign:"center" as const,fontSize:10};
 const groupCell={...td,fontWeight:700,background:"#f0f1f4"};
 const toggleStyle={width:"100%",padding:"13px 16px",borderRadius:14,border:"1px solid #d8d8de",background:"#fff",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12} as const;

 if(loading&&!data)return <div className="m238m-stack"><Card><p>Memuat analisa stock device…</p></Card></div>;
 if(error&&!data)return <div className="m238m-stack"><Card><strong>Stock Request MD</strong><p>{error}</p><button onClick={()=>void load(true)}>Coba lagi</button></Card></div>;
 if(!data)return null;
 return <div className="m238m-stack">
  <Card><div className="m238m-copy-head"><div><strong>Stock Request MD</strong><p>{data.week} • SOH {data.sohUpdated}</p></div><button onClick={()=>void load(true)} aria-label="Refresh"><RefreshCw size={17}/></button></div><p>Request device only. Email dibagi dua MD dan detail request sekarang langsung berbentuk tabel di dalam body email.</p></Card>
  <div className="m238m-grid"><Card><small>Prioritas</small><h3>{num.format(data.summary.recommendations)}</h3></Card><Card><small>SOH 0</small><h3>{num.format(data.summary.outOfStock)}</h3></Card><Card><small>Dipilih</small><h3>{num.format(chosen.length)}</h3></Card><Card><small>History SOH</small><h3>{num.format(data.history?.days||1)} hari</h3></Card></div>
  <div className="m238m-section-head"><h2>Rekomendasi Request</h2><span>{chosen.length} dipilih</span></div>
  <button type="button" aria-expanded={showRecommendations} onClick={()=>setShowRecommendations(v=>!v)} style={toggleStyle}><span>{showRecommendations?"Sembunyikan Rekomendasi":"Tampilkan Rekomendasi"}</span><span>{showRecommendations?"▲":"▼"}</span></button>
  {showRecommendations&&<div className="m238m-stack">{data.recommendations.map(x=><Card key={x.article}><label style={{display:"flex",gap:8}}><input type="checkbox" checked={!!selected[x.article]} onChange={e=>setSelected(v=>({...v,[x.article]:e.target.checked}))}/><span><strong>{x.description||x.article}</strong><br/><small>{x.article} • {x.lob}</small></span></label><p>Week {x.soldQty} • 8W {x.recentSoldQty} • SOH {x.soh} • Lost {x.lostCount} • <b>{x.priority}</b></p><small>{x.reason}</small><div><label>Request Qty <input style={{width:64,marginLeft:8}} inputMode="numeric" value={qty[x.article]??x.requestQty} onChange={e=>setQty(v=>({...v,[x.article]:Math.max(0,Number(e.target.value)||0)}))}/></label></div></Card>)}</div>}

  <div className="m238m-section-head"><h2>Email 1 • MD iPhone & iPad</h2><span>{iphoneIpad.length} item</span></div>
  <button type="button" aria-expanded={showEmail1} onClick={()=>setShowEmail1(v=>!v)} style={toggleStyle}><span>{showEmail1?"Sembunyikan Detail Email 1":"Tampilkan Detail Email 1"}</span><span>{showEmail1?"▲":"▼"}</span></button>
  {showEmail1&&<Card><strong>Subject : {subject("iPhone & iPad")}</strong><p>Dear MD Team,</p><p>Mohon support stock untuk M238 Digimap PIM 2 berdasarkan evaluasi {data.week}.</p><p><strong>Detail request:</strong></p><TablePreview rows={iphoneIpad}/><p>Mohon dibantu untuk support replenishment item di atas agar opportunity penjualan tidak lost karena ketersediaan stock.</p><p>Terima kasih.<br/>Regards,<br/>M238 Digimap PIM 2</p></Card>}
  <div className="m238m-action-list"><button disabled={!iphoneIpad.length} onClick={()=>void copySubject("s1","iPhone & iPad")}><Copy size={16}/>{copied==="s1"?"Copied":"Copy Subject"}</button><button disabled={!iphoneIpad.length} onClick={()=>void copyRichEmail("e1",iphoneIpad)}><Copy size={16}/>{copied==="e1"?"Copied":"Copy Email + Table"}</button><button disabled={!iphoneIpad.length} onClick={()=>openEmail("iPhone & iPad",iphoneIpad)}><Mail size={16}/>Buka Email</button></div>

  <div className="m238m-section-head"><h2>Email 2 • MD MacBook & Apple Watch</h2><span>{macWatch.length} item</span></div>
  <button type="button" aria-expanded={showEmail2} onClick={()=>setShowEmail2(v=>!v)} style={toggleStyle}><span>{showEmail2?"Sembunyikan Detail Email 2":"Tampilkan Detail Email 2"}</span><span>{showEmail2?"▲":"▼"}</span></button>
  {showEmail2&&<Card><strong>Subject : {subject("MacBook & Apple Watch")}</strong><p>Dear MD Team,</p><p>Mohon support stock untuk M238 Digimap PIM 2 berdasarkan evaluasi {data.week}.</p><p><strong>Detail request:</strong></p><TablePreview rows={macWatch}/><p>Mohon dibantu untuk support replenishment item di atas agar opportunity penjualan tidak lost karena ketersediaan stock.</p><p>Terima kasih.<br/>Regards,<br/>M238 Digimap PIM 2</p></Card>}
  <div className="m238m-action-list"><button disabled={!macWatch.length} onClick={()=>void copySubject("s2","MacBook & Apple Watch")}><Copy size={16}/>{copied==="s2"?"Copied":"Copy Subject"}</button><button disabled={!macWatch.length} onClick={()=>void copyRichEmail("e2",macWatch)}><Copy size={16}/>{copied==="e2"?"Copied":"Copy Email + Table"}</button><button disabled={!macWatch.length} onClick={()=>openEmail("MacBook & Apple Watch",macWatch)}><Mail size={16}/>Buka Email</button></div>
  <Card><small>Untuk format tabel tetap rapi di Mail, Outlook, atau Gmail: gunakan <b>Copy Email + Table</b>, lalu paste ke body email. Tombol Buka Email memakai fallback teks karena format mailto tidak membawa HTML table.</small></Card>
 </div>;
}