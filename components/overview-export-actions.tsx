"use client";
import {useEffect,useRef,useState} from "react";

const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const num=new Intl.NumberFormat("id-ID");
const pct=(v:number|null|undefined)=>v==null?"—":`${new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(v)}%`;
const month=(i:number)=>new Intl.DateTimeFormat("id-ID",{month:"long"}).format(new Date(`2026-${String(i).padStart(2,"0")}-01T00:00:00`));

type Lob={lob:string;amount2025:number;amount2026:number;qty2025:number;qty2026:number;growth:number|null;qtyGrowth:number|null};
type Row={month:number;amount2025:number;amount2026:number|null;qty2025:number;qty2026:number|null;growth:number|null;qtyGrowth:number|null;started:boolean};
export type OverviewExportData={compare:Row[];ytd:{amount2025:number;amount2026:number;qty2025:number;qty2026:number;growth:number;qtyGrowth:number;lobs:Lob[];throughMonth:number}};

function G({v}:{v:number|null|undefined}){if(v==null)return <>—</>;return <span style={{color:v>=0?"#059669":"#ef4444",fontWeight:800}}>{v>=0?"▲":"▼"} {pct(v)}</span>}

export default function OverviewExportActions({data}:{data:OverviewExportData}){
 const ref=useRef<HTMLDivElement>(null);
 const[busy,setBusy]=useState<"wa"|"pic"|null>(null);
 const[blob,setBlob]=useState<Blob|null>(null);
 const[error,setError]=useState("");

 const makeBlob=async()=>{
  if(!ref.current)throw new Error("Screenshot belum siap");
  const{default:html2canvas}=await import("html2canvas");
  await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
  const c=await html2canvas(ref.current,{scale:1.5,backgroundColor:"#f8fafc",logging:false,useCORS:true,width:1200,windowWidth:1200,scrollX:0,scrollY:0});
  const result=await new Promise<Blob|null>(r=>c.toBlob(r,"image/png",0.96));
  if(!result)throw new Error("Screenshot gagal dibuat");
  return result;
 };

 useEffect(()=>{
  let active=true;
  setBlob(null);setError("");
  const t=setTimeout(()=>{makeBlob().then(b=>{if(active)setBlob(b)}).catch(()=>{})},350);
  return()=>{active=false;clearTimeout(t)};
 // data changes are reflected by key values below
 },[data.ytd.amount2026,data.ytd.qty2026,data.ytd.throughMonth]);

 const getBlob=async()=>blob||await makeBlob();
 const downloadBlob=(b:Blob)=>{const url=URL.createObjectURL(b),a=document.createElement("a");a.href=url;a.download="M238-YTD-2025-vs-2026.png";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)};

 const picture=async()=>{try{setBusy("pic");setError("");const b=await getBlob();setBlob(b);downloadBlob(b)}catch(e){setError(e instanceof Error?e.message:"Screenshot gagal dibuat")}finally{setBusy(null)}};

 const wa=async()=>{
  try{
   setBusy("wa");setError("");
   const b=await getBlob();setBlob(b);
   const file=new File([b],"M238-YTD-2025-vs-2026.png",{type:"image/png"});
   const nav=navigator as Navigator&{canShare?:(x:ShareData)=>boolean};
   if(nav.share&&(!nav.canShare||nav.canShare({files:[file]}))){
    await nav.share({title:"M238 YTD Overview",text:"M238 YTD 2025 vs 2026",files:[file]});
   }else{
    downloadBlob(b);
    window.location.href=`https://wa.me/?text=${encodeURIComponent("M238 YTD 2025 vs 2026 - gambar sudah tersimpan. Silakan lampirkan screenshot yang baru diunduh.")}`;
   }
  }catch(e){
   if(e instanceof DOMException&&e.name==="AbortError")return;
   setError("Share WA gagal dibuka. Coba Picture Screenshot lalu kirim gambarnya lewat WhatsApp.");
  }finally{setBusy(null)}
 };

 return <>
  <div className="flex flex-wrap items-center gap-2">
   <button type="button" onClick={wa} disabled={!!busy} className="min-w-[112px] rounded-xl border bg-white px-3 py-2 text-xs font-black shadow-sm disabled:opacity-50 sm:text-sm">{busy==="wa"?"Membuat...":"Share by WA"}</button>
   <button type="button" onClick={picture} disabled={!!busy} className="min-w-[132px] rounded-xl border bg-white px-3 py-2 text-xs font-black shadow-sm disabled:opacity-50 sm:text-sm">{busy==="pic"?"Membuat...":"Picture Screenshot"}</button>
   {error&&<span className="basis-full text-[11px] font-semibold text-rose-600">{error}</span>}
  </div>
  <div aria-hidden="true" style={{position:"fixed",left:0,top:0,width:1200,transform:"translateX(-1400px)",pointerEvents:"none",zIndex:-9999}}><div ref={ref}><Sheet data={data}/></div></div>
 </>;
}

function Sheet({data}:{data:OverviewExportData}){return <div style={{width:1200,background:"#f8fafc",color:"#0f172a",fontFamily:"Arial,sans-serif",padding:24}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:30,fontWeight:900}}>M238 Overview</div><div style={{color:"#64748b"}}>Ringkasan performa store dan team M238.</div></div><div style={{border:"1px solid #e2e8f0",background:"#fff",borderRadius:10,padding:"10px 14px",fontWeight:700}}>Januari – {month(data.ytd.throughMonth)} 2026</div></div><div style={{marginTop:18,background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:18}}><div style={{fontSize:22,fontWeight:900}}>YTD 2025 vs 2026</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:14}}>{([2025,2026] as const).map(y=><div key={y} style={{border:"1px solid #dbeafe",borderRadius:14,overflow:"hidden"}}><div style={{background:y===2025?"#eff6ff":"#ecfdf5",padding:"12px 14px",fontSize:20,fontWeight:900,color:y===2025?"#2563eb":"#047857"}}>{y}</div><div style={{padding:14}}><b>All Sales</b><div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:12,marginTop:8}}><div><small style={{color:"#64748b"}}>Qty</small><div style={{fontSize:20,fontWeight:900}}>{num.format(y===2025?data.ytd.qty2025:data.ytd.qty2026)}</div></div><div><small style={{color:"#64748b"}}>Value</small><div style={{fontSize:20,fontWeight:900}}>{money.format(y===2025?data.ytd.amount2025:data.ytd.amount2026)}</div></div></div><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginTop:12}}><thead><tr style={{background:"#f8fafc",color:"#64748b"}}><th style={{padding:7,textAlign:"left"}}>LOB</th><th style={{padding:7,textAlign:"right"}}>Qty</th><th style={{padding:7,textAlign:"right"}}>Value</th>{y===2026&&<th style={{padding:7,textAlign:"right"}}>Growth</th>}</tr></thead><tbody>{data.ytd.lobs.map(x=><tr key={x.lob} style={{borderTop:"1px solid #e2e8f0"}}><td style={{padding:7,fontWeight:800}}>{x.lob}</td><td style={{padding:7,textAlign:"right"}}>{num.format(y===2025?x.qty2025:x.qty2026)}</td><td style={{padding:7,textAlign:"right"}}>{money.format(y===2025?x.amount2025:x.amount2026)}</td>{y===2026&&<td style={{padding:7,textAlign:"right"}}><G v={x.growth}/></td>}</tr>)}</tbody></table></div></div>)}</div></div><div style={{marginTop:16,background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:18}}><div style={{fontSize:22,fontWeight:900,marginBottom:12}}>Detail Per Bulan</div><div style={{display:"inline-flex",border:"1px solid #e2e8f0",borderRadius:9,overflow:"hidden",marginBottom:12}}>{["All Sales","iPhone","iPad","Mac","Apple Watch","AirPods"].map((x,i)=><div key={x} style={{padding:"8px 18px",fontSize:12,fontWeight:800,background:i===0?"#2563eb":"#fff",color:i===0?"#fff":"#475569",borderLeft:i?"1px solid #e2e8f0":"none"}}>{x}</div>)}</div><table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}><thead><tr style={{background:"#f1f5f9"}}><th rowSpan={2} style={{padding:8,textAlign:"left"}}>Bulan</th><th colSpan={2}>2025</th><th colSpan={2}>2026</th><th colSpan={2}>Growth</th></tr><tr style={{background:"#f8fafc",color:"#64748b"}}><th>Qty</th><th>Value</th><th>Qty</th><th>Value</th><th>Qty</th><th>Value</th></tr></thead><tbody>{data.compare.map(r=><tr key={r.month} style={{borderTop:"1px solid #e2e8f0"}}><td style={{padding:7}}>{month(r.month)}</td><td style={{padding:7,textAlign:"right"}}>{num.format(r.qty2025)}</td><td style={{padding:7,textAlign:"right"}}>{money.format(r.amount2025)}</td><td style={{padding:7,textAlign:"right"}}>{r.started?num.format(r.qty2026||0):"—"}</td><td style={{padding:7,textAlign:"right"}}>{r.started?money.format(r.amount2026||0):"—"}</td><td style={{padding:7,textAlign:"right"}}><G v={r.started?r.qtyGrowth:null}/></td><td style={{padding:7,textAlign:"right"}}><G v={r.started?r.growth:null}/></td></tr>)}</tbody><tfoot><tr style={{borderTop:"2px solid #cbd5e1",fontWeight:900,background:"#f8fafc"}}><td style={{padding:8}}>YTD</td><td style={{textAlign:"right"}}>{num.format(data.ytd.qty2025)}</td><td style={{textAlign:"right"}}>{money.format(data.ytd.amount2025)}</td><td style={{textAlign:"right"}}>{num.format(data.ytd.qty2026)}</td><td style={{textAlign:"right"}}>{money.format(data.ytd.amount2026)}</td><td style={{textAlign:"right"}}><G v={data.ytd.qtyGrowth}/></td><td style={{textAlign:"right"}}><G v={data.ytd.growth}/></td></tr></tfoot></table></div></div>}
