"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {ChevronRight,Pencil,Search,Shuffle,Trash2,Upload,X} from "lucide-react";

const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const num=new Intl.NumberFormat("id-ID");
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const pct=(v:number)=>new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(Number(v||0))+"%";

function Card({children,className=""}:{children:React.ReactNode;className?:string}){return <section className={"m238m-card "+className}>{children}</section>}
function Progress({value}:{value:number}){return <div className="m238m-progress"><i style={{width:Math.max(0,Math.min(100,value))+"%"}}/></div>}
function Metric({label,value,sub}:{label:string;value:string;sub?:string}){return <Card className="m238m-metric"><span>{label}</span><strong>{value}</strong>{sub?<small>{sub}</small>:null}</Card>}
function SectionHead({title,meta}:{title:string;meta?:string}){return <div className="m238m-section-head"><h2>{title}</h2>{meta?<span>{meta}</span>:null}</div>}
function ErrorBox({text}:{text:string}){return <Card className="m238m-error">{text}</Card>}

const operationCss=`
.m238m-soh-search-card{display:flex;flex-direction:column;gap:10px}
.m238m-soh-search-card>small{font-size:10px;color:var(--m-secondary)}
.m238m-modern-search{width:52px;height:52px;border-radius:18px;background:var(--m-surface2);display:flex;align-items:center;overflow:hidden;transition:width .42s cubic-bezier(.22,1,.36,1),border-radius .28s ease,box-shadow .28s ease}
.m238m-modern-search.open{width:100%;border-radius:18px;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--m-blue) 18%,transparent)}
.m238m-modern-search button{width:52px;height:52px;flex:none;border:0;background:transparent;color:var(--m-text);display:grid;place-items:center}
.m238m-modern-search input{min-width:0;width:0;opacity:0;border:0;outline:0;background:transparent;color:var(--m-text);font:inherit;font-size:14px;transition:width .34s cubic-bezier(.22,1,.36,1),opacity .18s ease;padding:0}
.m238m-modern-search.open input{width:100%;opacity:1;padding:0 4px}
.m238m-modern-search input::placeholder{color:var(--m-secondary)}
.m238m-search-close{color:var(--m-secondary)!important}
.m238m-compare-value-card>div{display:flex;flex-direction:column;gap:2px;margin-top:8px}.m238m-compare-value-card>div span{font-size:9px;color:var(--m-secondary)}.m238m-compare-value-card>div b{font-size:11px;line-height:1.3;overflow-wrap:anywhere}.m238m-compare-value-card>small{display:block;margin-top:3px}.m238m-bnpl-days{display:flex;flex-direction:column;gap:12px}
.m238m-bnpl-day-card{padding:0!important;overflow:hidden}
.m238m-bnpl-day-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 14px 12px;border-bottom:1px solid var(--m-line)}
.m238m-bnpl-day-head>div{display:flex;flex-direction:column;gap:3px}
.m238m-bnpl-day-head strong{font-size:14px}
.m238m-bnpl-day-head span{font-size:10px;color:var(--m-secondary)}
.m238m-bnpl-day-head>b{font-size:13px;text-align:right;overflow-wrap:anywhere}
.m238m-bnpl-provider-list{display:flex;flex-direction:column}
.m238m-bnpl-provider-list>button{border:0;border-bottom:1px solid var(--m-line);background:transparent;color:var(--m-text);display:grid;grid-template-columns:1fr auto 18px;gap:10px;align-items:center;padding:12px 14px;text-align:left}
.m238m-bnpl-provider-list>button:last-child{border-bottom:0}
.m238m-bnpl-provider-list>button>div{display:flex;flex-direction:column;gap:3px;min-width:0}
.m238m-bnpl-provider-list>button>div:nth-child(2){align-items:flex-end;text-align:right}
.m238m-bnpl-provider-list strong{font-size:13px}
.m238m-bnpl-provider-list b{font-size:12px}
.m238m-bnpl-provider-list span{font-size:9px;color:var(--m-secondary)}
.m238m-record-backdrop{position:fixed;inset:0;z-index:10020;background:rgba(15,23,42,.32);backdrop-filter:blur(8px);display:flex;align-items:flex-end}
.m238m-record-sheet{width:100%;max-height:82dvh;overflow:auto;background:var(--m-bg);border-radius:26px 26px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -16px 50px rgba(0,0,0,.18)}
.m238m-record-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.m238m-record-sheet-head>div{display:flex;flex-direction:column;gap:3px}
.m238m-record-sheet-head span{font-size:10px;color:var(--m-secondary);font-weight:800}
.m238m-record-sheet-head strong{font-size:19px}
.m238m-record-sheet-head button{width:38px;height:38px;border:0;border-radius:50%;background:var(--m-surface);color:var(--m-text);display:grid;place-items:center}
.m238m-record-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.m238m-record-detail-grid>div{background:var(--m-surface);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:5px}
.m238m-record-detail-grid span{font-size:9px;color:var(--m-secondary)}
.m238m-record-detail-grid b{font-size:12px;line-height:1.35;overflow-wrap:anywhere}
.m238m-record-safe-note{margin-top:10px;background:color-mix(in srgb,#f59e0b 10%,var(--m-surface));border-radius:12px;padding:10px;font-size:9px;line-height:1.45;color:var(--m-secondary)}
.m238m-record-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.m238m-record-actions button{border:0;border-radius:12px;padding:12px;font-weight:850;background:var(--m-surface);color:var(--m-text);display:flex;align-items:center;justify-content:center;gap:7px}
.m238m-record-actions button.danger{color:#ef4444;background:color-mix(in srgb,#ef4444 8%,var(--m-surface))}
.m238m-soh-tabs{display:flex;gap:6px;overflow-x:auto;padding:2px 0 4px;scrollbar-width:none}
.m238m-soh-tabs::-webkit-scrollbar{display:none}
.m238m-soh-tabs button{flex:none;border:0;background:var(--m-surface2);color:var(--m-secondary);border-radius:10px;padding:9px 11px;font-size:10px;font-weight:850;white-space:nowrap}
.m238m-soh-tabs button.active{background:var(--m-surface);color:var(--m-blue);box-shadow:0 1px 4px rgba(0,0,0,.08)}
`;

export default function MobileOperations({kind,period,periodMode,selectedWeek,activeRange}:{kind:string;period:string;periodMode:"month"|"week";selectedWeek:string;activeRange:{from:string;to:string}|null}){
 let view:React.ReactNode=null;
 if(kind==="soh")view=<SohMobile/>;
 else if(kind==="stokan")view=<StokanMobile/>;
 else if(kind==="mading")view=<MadingMobile period={period} periodMode={periodMode} selectedWeek={selectedWeek} activeRange={activeRange}/>;
 else if(kind==="bnpl")view=<BnplMobile period={period} periodMode={periodMode} selectedWeek={selectedWeek} activeRange={activeRange}/>;
 return <>{view}<style jsx global>{operationCss}</style></>;
}

function SohMobile(){
 const[q,setQ]=useState(""),[searchOpen,setSearchOpen]=useState(false),[data,setData]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[active,setActive]=useState("IPHONE");
 const searchRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(searchOpen)setTimeout(()=>searchRef.current?.focus(),120)},[searchOpen]);
 useEffect(()=>{let alive=true;const t=setTimeout(async()=>{setLoading(true);try{const r=await fetch("/api/soh?q="+encodeURIComponent(q)),j=await r.json();if(!r.ok)throw new Error(j.error||"Gagal membaca SOH");if(alive){setData(j);setError("")}}catch(e){if(alive)setError(e instanceof Error?e.message:"Gagal membaca SOH")}finally{if(alive)setLoading(false)}},180);return()=>{alive=false;clearTimeout(t)}},[q]);
 const groups=[["IPHONE","iPhone"],["IPAD","iPad"],["MACBOOK","MacBook"],["APPLE WATCH","Apple Watch"],["AIRPODS, PENCIL & KEYBOARD","AirPods, Pencil & Keyboard"]] as const;
 const label=groups.find(([k])=>k===active)?.[1]||active,rows=(data?.rows||[]).filter((x:any)=>x.category===active),total=rows.reduce((a:number,x:any)=>a+Number(x.qty||0),0),sold=rows.reduce((a:number,x:any)=>a+Number(x.soldQty||0),0);
 return <div className="m238m-stack">
  <Card className="m238m-soh-search-card">
   <div className={"m238m-modern-search "+(searchOpen?"open":"")}>
    <button className="m238m-search-trigger" onClick={()=>setSearchOpen(true)} aria-label="Buka pencarian"><Search size={19}/></button>
    <input ref={searchRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari article atau description…" onFocus={()=>setSearchOpen(true)}/>
    {searchOpen?<button className="m238m-search-close" onClick={()=>{setQ("");setSearchOpen(false);searchRef.current?.blur()}} aria-label="Tutup pencarian"><X size={17}/></button>:null}
   </div>
   {data?.updated?<small>SOH updated {data.updated}{data.soldDate?" • Sales terakhir "+data.soldDate:""}</small>:null}
  </Card>
  <div className="m238m-soh-tabs">{groups.map(([key,name])=><button key={key} className={active===key?"active":""} onClick={()=>setActive(key)}>{name}</button>)}</div>
  {error?<ErrorBox text={error}/>:null}
  {loading&&!data?<Card>Memuat SOH…</Card>:<>
    <SectionHead title={label} meta={num.format(total)+" unit"}/>
    <div className="m238m-grid"><Metric label="SOH" value={num.format(total)}/><Metric label="Sold" value={num.format(sold)}/></div>
    <div className="m238m-list">{rows.map((r:any)=><Card key={r.article+"-"+r.description} className="m238m-stock-row"><div><strong>{r.description||r.article}</strong><span>{r.article}</span></div><div><b>{num.format(r.qty)}</b><small>{r.soldQty?"Sold "+num.format(r.soldQty):"SOH"}</small></div></Card>)}{!rows.length?<Card className="m238m-empty">Tidak ada stok pada kategori ini.</Card>:null}</div>
  </>}
 </div>
}
function MadingMobile({period,periodMode,selectedWeek,activeRange}:{period:string;periodMode:"month"|"week";selectedWeek:string;activeRange:{from:string;to:string}|null}){
 const[data,setData]=useState<any>(null),[overview,setOverview]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let alive=true;setLoading(true);const weekly=periodMode==="week"&&activeRange,mUrl=weekly?`/api/mading?from=${activeRange!.from}&to=${activeRange!.to}`:`/api/mading?period=${period}`,oUrl=weekly?`/api/overview?period=${activeRange!.from.slice(0,7)}&from=${activeRange!.from}&to=${activeRange!.to}&label=${encodeURIComponent(selectedWeek)}`:`/api/overview?period=${period}`;Promise.all([fetch(mUrl).then(r=>r.json()),fetch(oUrl).then(r=>r.json())]).then(([m,o])=>{if(!alive)return;if(m.error)throw new Error(m.error);setData(m);setOverview(o);setError("")}).catch(e=>alive&&setError(e instanceof Error?e.message:"Gagal membaca Mading")).finally(()=>alive&&setLoading(false));return()=>{alive=false}},[period,periodMode,selectedWeek,activeRange]);
 if(loading&&!data)return <Card>Memuat Mading…</Card>;
 if(error)return <ErrorBox text={error}/>;
 const t=overview?.target||{amount:0,device:0,accessories:0,vas:0},s=data?.summary||{},e=data?.estimate||{},isWeek=periodMode==="week"&&!!activeRange;
 const points={device:Math.min(t.device?s.device/t.device*60:0,60),acc:Math.min(t.accessories?s.accessories/t.accessories*30:0,30),vas:Math.min(t.vas?s.vas/t.vas*10:0,10)};
 const kpi=(label:string,actual:number,target:number,estimate:number,point:number,max:number)=><Card className="m238m-kpi-detail"><span>{label}</span><strong>{money.format(actual)}</strong>{isWeek?<><p>{selectedWeek||"Week aktif"} • Actual range</p><small>Target value kategori weekly tidak tersedia pada source weekly existing.</small></>:<><p>Target {money.format(target)} • {pct(target?actual/target*100:0)}</p><Progress value={target?actual/target*100:0}/><small>Estimate {money.format(estimate)} • Point {point.toFixed(1)}/{max} • Variance {money.format(target-actual)}</small></>}</Card>;
 const growth=(a:number,b:number)=>b?(a-b)/b*100:0;
 return <div className="m238m-stack">
  <div className="m238m-grid">{kpi("Amount",s.amount||0,t.amount||0,e.amount||0,points.device+points.acc+points.vas,100)}{kpi("Device",s.device||0,t.device||0,e.device||0,points.device,60)}{kpi("ACC",s.accessories||0,t.accessories||0,e.accessories||0,points.acc,30)}{kpi("VAS",s.vas||0,t.vas||0,e.vas||0,points.vas,10)}</div>
  {!isWeek?<><SectionHead title="Compare Performance" meta={"Cutoff day "+(data?.compare?.cutoffDay||"-")}/>
  <div className="m238m-grid">
   <Card className="m238m-metric m238m-compare-value-card">
    <span>MTM</span>
    <strong>{(growth(data?.compare?.current?.total||0,data?.compare?.mtm?.total||0)>=0?"+":"")+pct(growth(data?.compare?.current?.total||0,data?.compare?.mtm?.total||0))}</strong>
    <small>{data?.compare?.mtm?.period||"-"}</small>
    <div><span>Current</span><b>{money.format(data?.compare?.current?.total||0)}</b></div>
    <div><span>Previous</span><b>{money.format(data?.compare?.mtm?.total||0)}</b></div>
   </Card>
   <Card className="m238m-metric m238m-compare-value-card">
    <span>LFL</span>
    <strong>{(growth(data?.compare?.current?.total||0,data?.compare?.lfl?.total||0)>=0?"+":"")+pct(growth(data?.compare?.current?.total||0,data?.compare?.lfl?.total||0))}</strong>
    <small>{data?.compare?.lfl?.period||"-"}</small>
    <div><span>Current</span><b>{money.format(data?.compare?.current?.total||0)}</b></div>
    <div><span>LFL</span><b>{money.format(data?.compare?.lfl?.total||0)}</b></div>
   </Card>
   <Metric label="Qty" value={num.format(s.qty||0)}/>
   <Metric label="UPT" value={Number(s.upt||0).toFixed(1)}/>
  </div></>:<><SectionHead title="Performance Week" meta={selectedWeek||"Week aktif"}/><div className="m238m-grid"><Metric label="Qty" value={num.format(s.qty||0)}/><Metric label="UPT" value={Number(s.upt||0).toFixed(1)}/></div></>}
  <SectionHead title="Pencapaian Staff" meta="Value"/>
  <div className="m238m-list">{(s.staff||[]).map((r:any,i:number)=><Card key={r.name} className="m238m-rank-row"><b>#{i+1}</b><div><strong>{r.name}</strong><span>{money.format(r.value)}</span></div></Card>)}</div>
  <SectionHead title="LOB" meta="Qty & Value"/>
  <div className="m238m-list">{(s.lob||[]).map((r:any)=><Card key={r.name} className="m238m-copy-card"><div className="m238m-copy-head"><strong>{r.name}</strong><b>{num.format(r.qty)} unit</b></div><p>{money.format(r.value)}</p></Card>)}</div>
  <SectionHead title="VAS Provider" meta="Qty & Value"/>
  <div className="m238m-grid">{(s.vasProviders||[]).map((r:any)=><Metric key={r.name} label={r.name} value={money.format(r.value)} sub={num.format(r.qty)+" qty"}/>)}</div>
 </div>
}

function BnplMobile({period,periodMode,selectedWeek,activeRange}:{period:string;periodMode:"month"|"week";selectedWeek:string;activeRange:{from:string;to:string}|null}){
 const[data,setData]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[editing,setEditing]=useState<any>(null),[selected,setSelected]=useState<any>(null),[categoryDetail,setCategoryDetail]=useState<"BNPL"|"Trade-In"|null>(null),[providerDetail,setProviderDetail]=useState<string|null>(null);
 const[date,setDate]=useState(today()),[category,setCategory]=useState<"BNPL"|"Trade-In">("BNPL"),[provider,setProvider]=useState("HCI"),[qty,setQty]=useState(1),[amount,setAmount]=useState(0),[notes,setNotes]=useState(""),[busy,setBusy]=useState(false);
 const load=async()=>{setLoading(true);try{const periods=periodMode==="week"&&activeRange?[...new Set([activeRange.from.slice(0,7),activeRange.to.slice(0,7)])]:[period],responses=await Promise.all(periods.map(async p=>{const r=await fetch("/api/bnpl?period="+p),j=await r.json();if(!r.ok)throw new Error(j.error||"Gagal membaca BNPL");return j})),base=responses[0]||{},rows=responses.flatMap(x=>x.rows||[]);setData({...base,rows});setError("")}catch(e){setError(e instanceof Error?e.message:"Gagal membaca BNPL")}finally{setLoading(false)}};
 useEffect(()=>{void load()},[period,periodMode,activeRange]);
 const providers=(data?.providers?.[category]||(category==="BNPL"?["HCI","Indodana","Kredivo","Akulaku","SPayLater","KreditPlus"]:["Laku6 Master Device","OnePulse"])) as string[];
 useEffect(()=>{if(!providers.includes(provider))setProvider(providers[0]||"")},[category,data]);
 const reset=()=>{setEditing(null);setSelected(null);setDate(today());setCategory("BNPL");setProvider("HCI");setQty(1);setAmount(0);setNotes("")};
 const save=async()=>{setBusy(true);try{const body={id:editing?.id,date,category,provider,qty,amount,notes},r=await fetch("/api/bnpl",{method:editing?"PUT":"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}),j=await r.json();if(!r.ok)throw new Error(j.error||"Gagal menyimpan");reset();await load()}catch(e){setError(e instanceof Error?e.message:"Gagal menyimpan")}finally{setBusy(false)}};
 const edit=(r:any)=>{setSelected(null);setEditing(r);setDate(r.date);setCategory(r.category);setProvider(r.provider);setQty(r.qty);setAmount(r.amount);setNotes(r.notes||"")};
 const remove=async(id:string)=>{if(!confirm("Hapus data BNPL / Trade-In ini?"))return;setBusy(true);try{const r=await fetch("/api/bnpl",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({id})}),j=await r.json();if(!r.ok)throw new Error(j.error||"Gagal menghapus");setSelected(null);await load()}catch(e){setError(e instanceof Error?e.message:"Gagal menghapus")}finally{setBusy(false)}};
 const displayProvider=(v:string)=>v==="HCI"?"Home Credit":v;
 const monthEnd=`${period}-${String(new Date(Number(period.slice(0,4)),Number(period.slice(5,7)),0).getDate()).padStart(2,"0")}`;
 const rangeFrom=periodMode==="week"&&activeRange?activeRange.from:`${period}-01`,cutoff=periodMode==="week"&&activeRange?activeRange.to:(period===today().slice(0,7)?today():monthEnd);
 const visibleRows=(data?.rows||[]).filter((r:any)=>r.date>=rangeFrom&&r.date<=cutoff);
 const visibleBnpl=visibleRows.filter((r:any)=>r.category==="BNPL").reduce((a:any,r:any)=>({qty:a.qty+Number(r.qty||0),amount:a.amount+Number(r.amount||0)}),{qty:0,amount:0});
 const visibleTrade=visibleRows.filter((r:any)=>r.category==="Trade-In").reduce((a:any,r:any)=>({qty:a.qty+Number(r.qty||0),amount:a.amount+Number(r.amount||0)}),{qty:0,amount:0});
 const summaryFor=(cat:"BNPL"|"Trade-In")=>{
   const names=(data?.providers?.[cat]||(cat==="BNPL"?["HCI","Indodana","Kredivo","Akulaku","SPayLater","KreditPlus"]:["Laku6 Master Device","OnePulse"])) as string[];
   return names.map(name=>{const rows=visibleRows.filter((r:any)=>r.category===cat&&r.provider===name);return{provider:name,qty:rows.reduce((a:number,r:any)=>a+Number(r.qty||0),0),amount:rows.reduce((a:number,r:any)=>a+Number(r.amount||0),0)}})
 };
 const providerRows=providerDetail?visibleRows.filter((r:any)=>r.provider===providerDetail).sort((a:any,b:any)=>a.date.localeCompare(b.date)||String(a.id).localeCompare(String(b.id))):[];
 const groups=useMemo(()=>{
  const map=new Map<string,any[]>();
  for(const r of visibleRows){const arr=map.get(r.date)||[];arr.push(r);map.set(r.date,arr)}
  return [...map.entries()].sort((a,b)=>b[0].localeCompare(a[0]));
 },[data?.rows,period,cutoff]);
 const dayLabel=(v:string)=>new Intl.DateTimeFormat("id-ID",{weekday:"long",day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Jakarta"}).format(new Date(v+"T00:00:00Z"));
 return <div className="m238m-stack">
  <div className="m238m-grid">
   <button className="m238m-metric-button" onClick={()=>setCategoryDetail("BNPL")}><Card className="m238m-metric m238m-drill-card"><span>BNPL</span><strong>{money.format(visibleBnpl.amount)}</strong><small>{num.format(visibleBnpl.qty)} trx • Tap detail</small><ChevronRight size={15}/></Card></button>
   <button className="m238m-metric-button" onClick={()=>setCategoryDetail("Trade-In")}><Card className="m238m-metric m238m-drill-card"><span>Trade-In</span><strong>{money.format(visibleTrade.amount)}</strong><small>{num.format(visibleTrade.qty)} trx • Tap detail</small><ChevronRight size={15}/></Card></button>
  </div>

  <Card className="m238m-form-card"><strong>{editing?"Edit BNPL / Trade-In":"Input BNPL / Trade-In"}</strong><input type="date" value={date} onChange={e=>setDate(e.target.value)}/><div className="m238m-form-grid"><select value={category} onChange={e=>setCategory(e.target.value as "BNPL"|"Trade-In")}><option value="BNPL">BNPL</option><option value="Trade-In">Trade-In</option></select><select value={provider} onChange={e=>setProvider(e.target.value)}>{providers.map(x=><option key={x} value={x}>{displayProvider(x)}</option>)}</select></div><div className="m238m-form-grid"><input inputMode="numeric" type="number" min={0} value={qty} onChange={e=>setQty(Number(e.target.value))} placeholder="Qty"/><input inputMode="numeric" type="number" min={0} value={amount} onChange={e=>setAmount(Number(e.target.value))} placeholder="Amount"/></div><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes (opsional)"/><div className="m238m-form-actions"><button className="m238m-primary" disabled={busy||!provider} onClick={()=>void save()}>{busy?"Menyimpan…":editing?"Simpan Perubahan":"Simpan"}</button>{editing?<button className="m238m-cancel" onClick={reset}>Batal</button>:null}</div></Card>

  {error?<ErrorBox text={error}/>:null}
  <SectionHead title="Daily Tracking" meta={periodMode==="week"?(selectedWeek||`${rangeFrom} – ${cutoff}`):period}/>
  {loading&&!data?<Card>Memuat data…</Card>:groups.length?<div className="m238m-bnpl-days">{groups.map(([d,rows])=>{
    const totalQty=rows.reduce((a:number,r:any)=>a+Number(r.qty||0),0),totalAmount=rows.reduce((a:number,r:any)=>a+Number(r.amount||0),0);
    return <Card key={d} className="m238m-bnpl-day-card">
      <div className="m238m-bnpl-day-head"><div><strong>{dayLabel(d)}</strong><span>{num.format(totalQty)} qty total</span></div><b>{money.format(totalAmount)}</b></div>
      <div className="m238m-bnpl-provider-list">{rows.map((r:any)=><button key={r.id} onClick={()=>setSelected(r)}><div><strong>{displayProvider(r.provider)}</strong><span>{r.category}{r.notes?" • "+r.notes:""}</span></div><div><b>{num.format(r.qty)} qty</b><span>{money.format(r.amount)}</span></div><ChevronRight size={16}/></button>)}</div>
    </Card>
  })}</div>:<Card className="m238m-empty">Belum ada data BNPL / Trade-In pada periode ini.</Card>}

  {categoryDetail?<div className="m238m-record-backdrop" onClick={()=>setCategoryDetail(null)}><div className="m238m-record-sheet" onClick={e=>e.stopPropagation()}>
    <div className="m238m-record-sheet-head"><div><span>{periodMode==="week"?(selectedWeek||`${rangeFrom} – ${cutoff}`):`Periode ${period}`}</span><strong>{categoryDetail==="BNPL"?"BNPL":"Trade-In"}</strong></div><button onClick={()=>setCategoryDetail(null)}><X size={18}/></button></div>
    <Card className="m238m-copy-card"><strong>{periodMode==="week"?`${rangeFrom} – ${cutoff}`:`1 – ${cutoff.slice(8,10)} ${new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric",timeZone:"Asia/Jakarta"}).format(new Date(cutoff+"T00:00:00Z"))}`}</strong><p>Pilih provider untuk melihat transaksi pada periode aktif.</p></Card>
    <div className="m238m-list">{summaryFor(categoryDetail).map(r=><button key={r.provider} className="m238m-click-card" onClick={()=>{setProviderDetail(r.provider);setCategoryDetail(null)}}><Card className="m238m-product-detail-row"><div><strong>{displayProvider(r.provider)}</strong><span>{num.format(r.qty)} qty</span></div><div><b>{money.format(r.amount)}</b><ChevronRight size={15}/></div></Card></button>)}</div>
  </div></div>:null}

  {providerDetail?<div className="m238m-record-backdrop" onClick={()=>setProviderDetail(null)}><div className="m238m-record-sheet" onClick={e=>e.stopPropagation()}>
    <div className="m238m-record-sheet-head"><div><span>Penjualan 1 – {cutoff.slice(8,10)}</span><strong>{displayProvider(providerDetail)}</strong></div><button onClick={()=>setProviderDetail(null)}><X size={18}/></button></div>
    <Card className="m238m-detail-sales"><span>Total Penjualan</span><strong>{money.format(providerRows.reduce((a:number,r:any)=>a+Number(r.amount||0),0))}</strong><small>{num.format(providerRows.reduce((a:number,r:any)=>a+Number(r.qty||0),0))} qty</small></Card>
    <div className="m238m-section-head"><h2>Riwayat Penjualan</h2><span>{providerRows.length} record</span></div>
    <div className="m238m-list">{providerRows.length?providerRows.map((r:any)=><button key={r.id} className="m238m-click-card" onClick={()=>{setProviderDetail(null);setSelected(r)}}><Card className="m238m-product-detail-row"><div><strong>{dayLabel(r.date)}</strong><span>{num.format(r.qty)} qty{r.notes?" • "+r.notes:""}</span></div><div><b>{money.format(r.amount)}</b><ChevronRight size={15}/></div></Card></button>):<Card className="m238m-empty">Belum ada penjualan {displayProvider(providerDetail)} pada periode ini.</Card>}</div>
  </div></div>:null}

  {selected?<div className="m238m-record-backdrop" onClick={()=>setSelected(null)}><div className="m238m-record-sheet" onClick={e=>e.stopPropagation()}>
    <div className="m238m-record-sheet-head"><div><span>{selected.category}</span><strong>{displayProvider(selected.provider)}</strong></div><button onClick={()=>setSelected(null)}><X size={18}/></button></div>
    <div className="m238m-record-detail-grid"><div><span>Tanggal</span><b>{dayLabel(selected.date)}</b></div><div><span>Qty</span><b>{num.format(selected.qty)}</b></div><div><span>Amount</span><b>{money.format(selected.amount)}</b></div><div><span>Notes</span><b>{selected.notes||"—"}</b></div></div>
    <div className="m238m-record-safe-note">Edit dan Hapus hanya tersedia di detail ini agar tidak mudah tertekan dari list utama.</div>
    <div className="m238m-record-actions"><button onClick={()=>edit(selected)}><Pencil size={16}/> Edit</button><button className="danger" disabled={busy} onClick={()=>void remove(selected.id)}><Trash2 size={16}/> Hapus</button></div>
  </div></div>:null}
 </div>
}
type StokanStaff={id:string;name:string;position:string};
type PreviewRow={brand:string;article:string;description:string;serial:string;totalStock:number|null;sourceNo:string};
type AssignedRow=PreviewRow&{stocker:string};
function StokanMobile(){
 const fileRef=useRef<HTMLInputElement>(null);
 const[data,setData]=useState<any>(null),[preview,setPreview]=useState<any>(null),[assigned,setAssigned]=useState<AssignedRow[]|null>(null),[loading,setLoading]=useState(true),[working,setWorking]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[period,setPeriod]=useState(""),[stockDate,setStockDate]=useState(today()),[mode,setMode]=useState<"ordered"|"random">("ordered"),[detail,setDetail]=useState("");
 const load=async(uploadID="")=>{setLoading(true);try{const r=await fetch("/api/stokan"+(uploadID?"?uploadID="+encodeURIComponent(uploadID):""),{cache:"no-store"}),j=await r.json();if(!r.ok)throw new Error(j.error||"Gagal membaca Stokan");setData(j);if(j.selected){setPeriod(j.selected.period||"");setStockDate(j.selected.stockDate||today())}setError("");return j}catch(e){setError(e instanceof Error?e.message:"Gagal membaca Stokan");return null}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 const previewFile=async(file:File)=>{setWorking(true);setError("");setMessage("");try{const form=new FormData();form.append("file",file);const r=await fetch("/api/stokan",{method:"POST",body:form}),j=await r.json();if(!r.ok)throw new Error(j.error||"Upload gagal");setPreview(j);setAssigned(null);setMode("ordered")}catch(e){setError(e instanceof Error?e.message:"Upload gagal")}finally{setWorking(false)}};
 const shuffled=(names:string[])=>{const out=[...names];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out};
 const assign=()=>{if(!preview?.valid||!preview.staff?.length)return;const names=mode==="random"?shuffled(preview.staff.map((s:StokanStaff)=>s.name)):preview.staff.map((s:StokanStaff)=>s.name),base=Math.floor(preview.rows.length/names.length),extra=preview.rows.length%names.length;let cursor=0;const out:AssignedRow[]=[];names.forEach((name:string,i:number)=>{const take=base+(i<extra?1:0);preview.rows.slice(cursor,cursor+take).forEach((r:PreviewRow)=>out.push({...r,stocker:name}));cursor+=take});setAssigned(out)};
 const sourceRows=assigned||data?.rows||[];
 const summary=useMemo(()=>{const m=new Map<string,number>();for(const r of sourceRows)if(r.stocker)m.set(r.stocker,(m.get(r.stocker)||0)+1);return [...m.entries()]},[assigned,data]);
 const save=async()=>{if(!assigned?.length||!period||!stockDate)return;setWorking(true);try{const r=await fetch("/api/stokan",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"commit",period,stockDate,rows:assigned})}),j=await r.json();if(!r.ok||!j.verified)throw new Error(j.error||"Gagal menyimpan Stokan");setMessage(j.message||"Stokan tersimpan.");setPreview(null);setAssigned(null);await load(j.uploadID)}catch(e){setError(e instanceof Error?e.message:"Gagal menyimpan Stokan")}finally{setWorking(false)}};
 const clear=async()=>{if(!confirm("Yakin ingin menghapus data stokan aktif?"))return;setWorking(true);try{const r=await fetch("/api/stokan",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"clear",uploadID:data?.selected?.uploadID||""})}),j=await r.json();if(!r.ok)throw new Error(j.error||"Gagal clear Stokan");setPreview(null);setAssigned(null);setMessage(j.message);await load()}catch(e){setError(e instanceof Error?e.message:"Gagal clear Stokan")}finally{setWorking(false)}};
 const rowsFor=(name:string)=>sourceRows.filter((r:any)=>r.stocker===name);
 return <div className="m238m-stack">
  <Card className="m238m-form-card"><strong>Stokan Accessories</strong><input value={period} onChange={e=>setPeriod(e.target.value)} placeholder="Contoh: Week 11 Q4"/><input type="date" value={stockDate} onChange={e=>setStockDate(e.target.value)}/><input ref={fileRef} type="file" accept=".xls,.xlsx" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void previewFile(file)}}/><div className="m238m-form-actions"><button className="m238m-primary" disabled={working||!!assigned} onClick={()=>fileRef.current?.click()}><Upload size={16}/> Upload File</button><button className="m238m-cancel danger" disabled={working||(!data?.rows?.length&&!preview)} onClick={()=>void clear()}><Trash2 size={16}/> Clear</button></div></Card>
  {error?<ErrorBox text={error}/>:null}{message?<Card className="m238m-success-card">{message}</Card>:null}
  {preview&&!assigned?<><div className="m238m-grid"><Metric label="Artikel" value={num.format(preview.totalArticles||0)}/><Metric label="Total Qty" value={num.format(preview.totalStock||0)}/><Metric label="Sales Assistant" value={num.format(preview.staff?.length||0)}/><Metric label="Pembagian" value={preview.distribution?.min===preview.distribution?.max?num.format(preview.distribution?.min||0):(preview.distribution?.min||0)+"–"+(preview.distribution?.max||0)} sub="artikel / staff"/></div><div className="m238m-segment"><button className={mode==="ordered"?"active":""} onClick={()=>setMode("ordered")}>Urut</button><button className={mode==="random"?"active":""} onClick={()=>setMode("random")}><Shuffle size={14}/> Acak Nama</button></div><button className="m238m-primary" onClick={assign}>Proses & Bagi Otomatis</button></>:null}
  {assigned?<><SectionHead title="Preview Pembagian" meta={assigned.length+" artikel"}/><StockerCards summary={summary} rowsFor={rowsFor} detail={detail} setDetail={setDetail}/><div className="m238m-form-actions"><button className="m238m-cancel" onClick={()=>setAssigned(null)}>Kembali</button><button className="m238m-primary" disabled={working} onClick={()=>void save()}>{working?"Menyimpan…":"Simpan Pembagian"}</button></div></>:null}
  {!preview&&!assigned&&loading?<Card>Memuat Stokan…</Card>:null}
  {!preview&&!assigned&&!loading&&data?.rows?.length?<><SectionHead title="Stokan Aktif" meta={data.selected?.period}/><div className="m238m-grid"><Metric label="Artikel" value={num.format(data.selected?.totalArticles||data.rows.length)}/><Metric label="Total Qty" value={num.format(data.selected?.totalStock||0)}/><Metric label="Stocker" value={num.format(data.selected?.totalStockers||summary.length)}/><Metric label="Tanggal" value={data.selected?.stockDate||"-"}/></div><StockerCards summary={summary} rowsFor={rowsFor} detail={detail} setDetail={setDetail}/>{data.history?.length?<Card className="m238m-form-card"><strong>Histori Stokan</strong><select value={data.selected?.uploadID||""} onChange={e=>void load(e.target.value)}>{data.history.map((h:any)=><option key={h.uploadID} value={h.uploadID}>{h.period} • {h.stockDate} • {h.totalArticles} artikel</option>)}</select></Card>:null}</>:null}
  {!preview&&!assigned&&!loading&&!data?.rows?.length?<Card className="m238m-empty">Belum ada data stokan aktif. Upload file .xls/.xlsx untuk mulai.</Card>:null}
 </div>
}
function StockerCards({summary,rowsFor,detail,setDetail}:{summary:[string,number][];rowsFor:(name:string)=>any[];detail:string;setDetail:(x:string)=>void}){
 return <div className="m238m-list">{summary.map(([name,count],i)=><Card key={name} className="m238m-op-row"><div className="m238m-copy-head"><strong>{i+1}. {name}</strong><b>{count} artikel</b></div><button className="m238m-inline-link" onClick={()=>setDetail(detail===name?"":name)}>Lihat Detail <ChevronRight size={15}/></button>{detail===name?<div className="m238m-mini-list">{rowsFor(name).map((r:any,j:number)=><div key={(r.sourceNo||r.rowNumber||r.article)+"-"+j}><span>{r.article}</span><b>{num.format(Number(r.totalStock||0))}</b><small>{r.description}</small></div>)}</div>:null}</Card>)}</div>
}
