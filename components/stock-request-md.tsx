"use client";
import {useEffect,useMemo,useState,type ReactNode} from "react";
import {Copy,Mail,RefreshCw} from "lucide-react";

type Item={lob:string;article:string;description:string;soh:number;soldQty:number;lostCount:number;requestQty:number;priority:"Critical"|"High"|"Medium";reason:string};
type Payload={week:string;period:{from:string;to:string};sohUpdated:string;summary:{recommendations:number;outOfStock:number;weekSales:number;lostFeedback:number};recommendations:Item[];outOfStock:Item[];email:{subject:string;body:string};error?:string};
const num=new Intl.NumberFormat("id-ID");
function Card({children}:{children:ReactNode}){return <section className="m238m-card">{children}</section>}

export default function StockRequestMd(){
 const[data,setData]=useState<Payload|null>(null);
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState("");
 const[selected,setSelected]=useState<Record<string,boolean>>({});
 const[qty,setQty]=useState<Record<string,number>>({});
 const[copied,setCopied]=useState("");

 async function load(){
  setLoading(true);setError("");
  try{
   const r=await fetch(`/api/stock-request?t=${Date.now()}`,{cache:"no-store"});
   const d=await r.json() as Payload;
   if(!r.ok||d.error)throw new Error(d.error||"Gagal compile stock request");
   setData(d);
   setSelected(Object.fromEntries(d.recommendations.map(x=>[x.article,true])));
   setQty(Object.fromEntries(d.recommendations.map(x=>[x.article,x.requestQty])));
  }catch(e){setError(e instanceof Error?e.message:"Gagal compile stock request")}
  finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[]);

 const chosen=useMemo(()=>data?.recommendations.filter(x=>selected[x.article]).map(x=>({...x,requestQty:Math.max(0,Number(qty[x.article]??x.requestQty))}))||[],[data,selected,qty]);
 const emailBody=useMemo(()=>{
  if(!data)return"";
  const grouped=new Map<string,Item[]>();
  for(const x of chosen){const rows=grouped.get(x.lob)||[];rows.push(x);grouped.set(x.lob,rows)}
  const lost=chosen.reduce((a,x)=>a+x.lostCount,0);
  const sold=chosen.reduce((a,x)=>a+x.soldQty,0);
  const lines:string[]=[];
  lines.push("Dear MD Team,");
  lines.push("");
  lines.push(`Mohon support stock untuk M238 Digimap PIM 2 berdasarkan evaluasi ${data.week} (${data.period.from} s.d. ${data.period.to}).`);
  lines.push(`SOH update: ${data.sohUpdated}.`);
  lines.push(`Ringkasan: ${chosen.length} item prioritas • ${data.summary.outOfStock} item SOH 0 • ${sold} unit sold pada item prioritas • ${lost} indikasi lost/feedback terkait stock.`);
  lines.push("");
  lines.push("Detail request:");
  for(const[lob,rows]of grouped){
   lines.push("");lines.push(lob);
   for(const x of rows)lines.push(`- ${x.description||x.article} (${x.article}) | Sold ${x.soldQty} | SOH ${x.soh} | Lost ${x.lostCount} | Request ${x.requestQty} unit | ${x.priority}`);
  }
  lines.push("");
  lines.push("Mohon dibantu untuk support replenishment item di atas agar opportunity penjualan tidak lost karena ketersediaan stock.");
  lines.push("");
  lines.push("Terima kasih.");
  lines.push("Regards,");
  lines.push("M238 Digimap PIM 2");
  return lines.join("\n");
 },[data,chosen]);

 async function copy(kind:"subject"|"body"){
  if(!data)return;
  await navigator.clipboard.writeText(kind==="subject"?data.email.subject:emailBody);
  setCopied(kind);setTimeout(()=>setCopied(""),1200);
 }
 function openEmail(){if(data)window.location.href=`mailto:?subject=${encodeURIComponent(data.email.subject)}&body=${encodeURIComponent(emailBody)}`}

 if(loading&&!data)return <div className="m238m-stack"><Card><p>Memuat SOH, penjualan week berjalan, dan lost stock…</p></Card></div>;
 if(error&&!data)return <div className="m238m-stack"><Card><strong>Stock Request MD</strong><p>{error}</p><button onClick={()=>void load()}>Coba lagi</button></Card></div>;
 if(!data)return null;
 return <div className="m238m-stack">
  <Card><div className="m238m-copy-head"><div><strong>Stock Request MD</strong><p>{data.week} • SOH {data.sohUpdated}</p></div><button onClick={()=>void load()} aria-label="Refresh"><RefreshCw size={17}/></button></div><p>Compile otomatis dari SOH terbaru, penjualan week berjalan, dan lost/feedback stock.</p></Card>
  <div className="m238m-grid"><Card><small>Prioritas</small><h3>{num.format(data.summary.recommendations)}</h3></Card><Card><small>SOH 0</small><h3>{num.format(data.summary.outOfStock)}</h3></Card><Card><small>Week Sales</small><h3>{num.format(data.summary.weekSales)}</h3></Card><Card><small>Lost/Feedback</small><h3>{num.format(data.summary.lostFeedback)}</h3></Card></div>
  <div className="m238m-section-head"><h2>Rekomendasi Request</h2><span>{chosen.length} dipilih</span></div>
  <div className="m238m-stack">{data.recommendations.map(x=><Card key={x.article}><label style={{display:"flex",gap:8}}><input type="checkbox" checked={!!selected[x.article]} onChange={e=>setSelected(v=>({...v,[x.article]:e.target.checked}))}/><span><strong>{x.description||x.article}</strong><br/><small>{x.article} • {x.lob}</small></span></label><p>Sold {x.soldQty} • SOH {x.soh} • Lost {x.lostCount} • <b>{x.priority}</b></p><small>{x.reason}</small><div><label>Request Qty <input style={{width:64,marginLeft:8}} inputMode="numeric" value={qty[x.article]??x.requestQty} onChange={e=>setQty(v=>({...v,[x.article]:Math.max(0,Number(e.target.value)||0)}))}/></label></div></Card>)}{!data.recommendations.length?<Card><p>Belum ada item yang masuk prioritas request berdasarkan week berjalan.</p></Card>:null}</div>
  {data.outOfStock.length?<><div className="m238m-section-head"><h2>SOH 0</h2><span>{data.summary.outOfStock} item</span></div><Card><p>SOH 0 tanpa sales/lost tidak otomatis masuk email, tapi tetap ditampilkan sebagai referensi.</p></Card><div className="m238m-stack">{data.outOfStock.slice(0,15).map(x=><Card key={x.article}><strong>{x.description||x.article}</strong><p><small>{x.article} • Sold {x.soldQty} • Lost {x.lostCount}</small></p></Card>)}</div></>:null}
  <div className="m238m-section-head"><h2>Draft Email</h2><span>Review sebelum kirim</span></div>
  <Card><strong>{data.email.subject}</strong><pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",font:"inherit",fontSize:10,lineHeight:1.55}}>{emailBody}</pre></Card>
  <div className="m238m-action-list"><button onClick={()=>void copy("subject")}><Copy size={16}/>{copied==="subject"?"Copied":"Copy Subject"}</button><button onClick={()=>void copy("body")}><Copy size={16}/>{copied==="body"?"Copied":"Copy Email"}</button><button onClick={openEmail}><Mail size={16}/>Buka Email</button></div>
 </div>;
}
