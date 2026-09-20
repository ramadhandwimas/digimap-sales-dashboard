"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {ChevronRight,Pencil,Search,Shuffle,Trash2,Upload} from "lucide-react";

const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const num=new Intl.NumberFormat("id-ID");
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const compact=(v:number)=>Math.abs(v)>=1e9?"Rp "+(v/1e9).toLocaleString("id-ID",{maximumFractionDigits:2})+" M":Math.abs(v)>=1e6?"Rp "+(v/1e6).toLocaleString("id-ID",{maximumFractionDigits:0})+" jt":money.format(v);
const pct=(v:number)=>new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(Number(v||0))+"%";

function Card({children,className=""}:{children:React.ReactNode;className?:string}){return <section className={"m238m-card "+className}>{children}</section>}
function Progress({value}:{value:number}){return <div className="m238m-progress"><i style={{width:Math.max(0,Math.min(100,value))+"%"}}/></div>}
function Metric({label,value,sub}:{label:string;value:string;sub?:string}){return <Card className="m238m-metric"><span>{label}</span><strong>{value}</strong>{sub?<small>{sub}</small>:null}</Card>}
function SectionHead({title,meta}:{title:string;meta?:string}){return <div className="m238m-section-head"><h2>{title}</h2>{meta?<span>{meta}</span>:null}</div>}
function ErrorBox({text}:{text:string}){return <Card className="m238m-error">{text}</Card>}

export default function MobileOperations({kind,period}:{kind:string;period:string}){
 if(kind==="soh")return <SohMobile/>;
 if(kind==="stokan")return <StokanMobile/>;
 if(kind==="mading")return <MadingMobile period={period}/>;
 if(kind==="bnpl")return <BnplMobile period={period}/>;
 if(kind==="target")return <TargetFocusMobile period={period}/>;
 return null;
}

function SohMobile(){
 const[q,setQ]=useState(""),[data,setData]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let alive=true;const t=setTimeout(async()=>{setLoading(true);try{const r=await fetch("/api/soh?q="+encodeURIComponent(q)),j=await r.json();if(!r.ok)throw new Error(j.error||"Gagal membaca SOH");if(alive){setData(j);setError("")}}catch(e){if(alive)setError(e instanceof Error?e.message:"Gagal membaca SOH")}finally{if(alive)setLoading(false)}},180);return()=>{alive=false;clearTimeout(t)}},[q]);
 const groups=[["IPHONE","iPhone"],["IPAD","iPad"],["MACBOOK","MacBook"],["APPLE WATCH","Apple Watch"],["AIRPODS, PENCIL & KEYBOARD","AirPods, Pencil & Keyboard"]] as const;
 return <div className="m238m-stack">
  <Card className="m238m-form-card"><label className="m238m-input-icon"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari article atau description…"/></label>{data?.updated?<small>SOH updated {data.updated}{data.soldDate?" • Sales terakhir "+data.soldDate:""}</small>:null}</Card>
  {error?<ErrorBox text={error}/>:null}
  {loading&&!data?<Card>Memuat SOH…</Card>:groups.map(([key,label])=>{const rows=(data?.rows||[]).filter((x:any)=>x.category===key),total=rows.reduce((a:number,x:any)=>a+Number(x.qty||0),0);if(q&&rows.length===0)return null;return <div key={key} className="m238m-stack"><SectionHead title={label} meta={num.format(total)+" unit"}/><div className="m238m-list">{rows.map((r:any)=><Card key={r.article+"-"+r.description} className="m238m-stock-row"><div><strong>{r.description||r.article}</strong><span>{r.article}</span></div><div><b>{num.format(r.qty)}</b><small>{r.soldQty?"Sold "+num.format(r.soldQty):"SOH"}</small></div></Card>)}{!rows.length?<Card className="m238m-empty">Tidak ada stok pada kategori ini.</Card>:null}</div></div>})}
 </div>
}

function MadingMobile({period}:{period:string}){
 const[data,setData]=useState<any>(null),[overview,setOverview]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let alive=true;setLoading(true);Promise.all([fetch("/api/mading?period="+period).then(r=>r.json()),fetch("/api/overview?period="+period).then(r=>r.json())]).then(([m,o])=>{if(!alive)return;if(m.error)throw new Error(m.error);setData(m);setOverview(o);setError("")}).catch(e=>alive&&setError(e instanceof Error?e.message:"Gagal membaca Mading")).finally(()=>alive&&setLoading(false));return()=>{alive=false}},[period]);
 if(loading&&!data)return <Card>Memuat Mading…</Card>;
 if(error)return <ErrorBox text={error}/>;
 const t=overview?.target||{amount:0,device:0,accessories:0,vas:0},s=data?.summary||{},e=data?.estimate||{};
 const points={device:Math.min(t.device?s.device/t.device*60:0,60),acc:Math.min(t.accessories?s.accessories/t.accessories*30:0,30),vas:Math.min(t.vas?s.vas/t.vas*10:0,10)};
 const kpi=(label:string,actual:number,target:number,estimate:number,point:number,max:number)=><Card className="m238m-kpi-detail"><span>{label}</span><strong>{compact(actual)}</strong><p>Target {compact(target)} • {pct(target?actual/target*100:0)}</p><Progress value={target?actual/target*100:0}/><small>Estimate {compact(estimate)} • Point {point.toFixed(1)}/{max} • Variance {compact(target-actual)}</small></Card>;
 const growth=(a:number,b:number)=>b?(a-b)/b*100:0;
 return <div className="m238m-stack">
  <div className="m238m-grid">{kpi("Amount",s.amount||0,t.amount||0,e.amount||0,points.device+points.acc+points.vas,100)}{kpi("Device",s.device||0,t.device||0,e.device||0,points.device,60)}{kpi("ACC",s.accessories||0,t.accessories||0,e.accessories||0,points.acc,30)}{kpi("VAS",s.vas||0,t.vas||0,e.vas||0,points.vas,10)}</div>
  <SectionHead title="Compare Performance" meta={"Cutoff day "+(data?.compare?.cutoffDay||"-")}/>
  <div className="m238m-grid"><Metric label="MTM" value={(growth(data?.compare?.current?.total||0,data?.compare?.mtm?.total||0)>=0?"+":"")+pct(growth(data?.compare?.current?.total||0,data?.compare?.mtm?.total||0))} sub={data?.compare?.mtm?.period}/><Metric label="LFL" value={(growth(data?.compare?.current?.total||0,data?.compare?.lfl?.total||0)>=0?"+":"")+pct(growth(data?.compare?.current?.total||0,data?.compare?.lfl?.total||0))} sub={data?.compare?.lfl?.period}/><Metric label="Qty" value={num.format(s.qty||0)}/><Metric label="UPT" value={Number(s.upt||0).toFixed(1)}/></div>
  <SectionHead title="Pencapaian Staff" meta="Value"/>
  <div className="m238m-list">{(s.staff||[]).map((r:any,i:number)=><Card key={r.name} className="m238m-rank-row"><b>#{i+1}</b><div><strong>{r.name}</strong><span>{compact(r.value)}</span></div></Card>)}</div>
  <SectionHead title="LOB" meta="Qty & Value"/>
  <div className="m238m-list">{(s.lob||[]).map((r:any)=><Card key={r.name} className="m238m-copy-card"><div className="m238m-copy-head"><strong>{r.name}</strong><b>{num.format(r.qty)} unit</b></div><p>{compact(r.value)}</p></Card>)}</div>
  <SectionHead title="VAS Provider" meta="Qty & Value"/>
  <div className="m238m-grid">{(s.vasProviders||[]).map((r:any)=><Metric key={r.name} label={r.name} value={compact(r.value)} sub={num.format(r.qty)+" qty"}/>)}</div>
 </div>
}

function BnplMobile({period}:{period:string}){
 const[data,setData]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[editing,setEditing]=useState<any>(null);
 const[date,setDate]=useState(today()),[category,setCategory]=useState<"BNPL"|"Trade-In">("BNPL"),[provider,setProvider]=useState("HCI"),[qty,setQty]=useState(1),[amount,setAmount]=useState(0),[notes,setNotes]=useState(""),[busy,setBusy]=useState(false);
 const load=async()=>{setLoading(true);try{const r=await fetch("/api/bnpl?period="+period),j=await r.json();if(!r.ok)throw new Error(j.error||"Gagal membaca BNPL");setData(j);setError("")}catch(e){setError(e instanceof Error?e.message:"Gagal membaca BNPL")}finally{setLoading(false)}};
 useEffect(()=>{void load()},[period]);
 const providers=(data?.providers?.[category]||(category==="BNPL"?["HCI","Indodana","Kredivo","Akulaku","SPayLater"]:["Laku6 Master Device","OnePulse"])) as string[];
 useEffect(()=>{if(!providers.includes(provider))setProvider(providers[0]||"")},[category,data]);
 const reset=()=>{setEditing(null);setDate(today());setCategory("BNPL");setProvider("HCI");setQty(1);setAmount(0);setNotes("")};
 const save=async()=>{setBusy(true);try{const body={id:editing?.id,date,category,provider,qty,amount,notes},r=await fetch("/api/bnpl",{method:editing?"PUT":"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}),j=await r.json();if(!r.ok)throw new Error(j.error||"Gagal menyimpan");reset();await load()}catch(e){setError(e instanceof Error?e.message:"Gagal menyimpan")}finally{setBusy(false)}};
 const edit=(r:any)=>{setEditing(r);setDate(r.date);setCategory(r.category);setProvider(r.provider);setQty(r.qty);setAmount(r.amount);setNotes(r.notes||"")};
 const remove=async(id:string)=>{if(!confirm("Hapus data BNPL / Trade-In ini?"))return;setBusy(true);try{const r=await fetch("/api/bnpl",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({id})}),j=await r.json();if(!r.ok)throw new Error(j.error||"Gagal menghapus");await load()}catch(e){setError(e instanceof Error?e.message:"Gagal menghapus")}finally{setBusy(false)}};
 return <div className="m238m-stack">
  <div className="m238m-grid"><Metric label="BNPL" value={compact(data?.bnpl?.amount||0)} sub={num.format(data?.bnpl?.qty||0)+" trx"}/><Metric label="Trade-In" value={compact(data?.tradeIn?.amount||0)} sub={num.format(data?.tradeIn?.qty||0)+" trx"}/></div>
  <Card className="m238m-form-card"><strong>{editing?"Edit BNPL / Trade-In":"Input BNPL / Trade-In"}</strong><input type="date" value={date} onChange={e=>setDate(e.target.value)}/><div className="m238m-form-grid"><select value={category} onChange={e=>setCategory(e.target.value as "BNPL"|"Trade-In")}><option value="BNPL">BNPL</option><option value="Trade-In">Trade-In</option></select><select value={provider} onChange={e=>setProvider(e.target.value)}>{providers.map(x=><option key={x}>{x}</option>)}</select></div><div className="m238m-form-grid"><input inputMode="numeric" type="number" min={0} value={qty} onChange={e=>setQty(Number(e.target.value))} placeholder="Qty"/><input inputMode="numeric" type="number" min={0} value={amount} onChange={e=>setAmount(Number(e.target.value))} placeholder="Amount"/></div><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes (opsional)"/><div className="m238m-form-actions"><button className="m238m-primary" disabled={busy||!provider} onClick={()=>void save()}>{busy?"Menyimpan…":editing?"Simpan Perubahan":"Simpan"}</button>{editing?<button className="m238m-cancel" onClick={reset}>Batal</button>:null}</div></Card>
  {error?<ErrorBox text={error}/>:null}
  <SectionHead title="Daily Tracking" meta={period}/>
  {loading&&!data?<Card>Memuat data…</Card>:<div className="m238m-list">{(data?.rows||[]).slice().reverse().map((r:any)=><Card key={r.id} className="m238m-op-row"><div className="m238m-copy-head"><div><strong>{r.provider}</strong><span>{r.date} • {r.category}</span></div><b>{compact(r.amount)}</b></div><p>{num.format(r.qty)} qty{r.notes?" • "+r.notes:""}</p><div className="m238m-row-actions"><button onClick={()=>edit(r)}><Pencil size={15}/> Edit</button><button className="danger" onClick={()=>void remove(r.id)}><Trash2 size={15}/> Hapus</button></div></Card>)}</div>}
 </div>
}

const PRODUCT_KEYS=["HASTAG","DINO","IGA","IBACKS","HANDAL","OMEGA","TORRAS"];
const VAS_KEYS=["Qoala","Telkomsel","XL","Indosat"];
function TargetFocusMobile({period}:{period:string}){
 const[tab,setTab]=useState<"lob"|"product"|"vas">("lob"),[lob,setLob]=useState<any>(null),[targets,setTargets]=useState<Record<string,number>>({}),[active,setActive]=useState<Record<string,number>>({}),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[msg,setMsg]=useState("");
 const group=tab==="lob"?"lob-focus":tab==="product"?"product-focus":"vas-focus",activeGroup=tab==="lob"?"lob-focus-active":tab==="product"?"product-focus-value":"vas-focus-value";
 const keys=tab==="lob"?(Object.values(lob?.productCatalog||{}).flat() as string[]):tab==="product"?PRODUCT_KEYS:VAS_KEYS;
 const load=async()=>{setLoading(true);try{const [l,t,a]=await Promise.all([fetch("/api/lob-target-focus?mode=month&month="+period).then(r=>r.json()),fetch("/api/manual-target?scope=monthly&period="+encodeURIComponent(period)+"&group="+group).then(r=>r.json()),fetch("/api/manual-target?scope=monthly&period="+encodeURIComponent(period)+"&group="+activeGroup).then(r=>r.json())]);setLob(l);setTargets(Object.fromEntries(Object.entries(t.targets||{}).map(([k,v]:any)=>[k,Number(v.target||0)])));setActive(Object.fromEntries(Object.entries(a.targets||{}).map(([k,v]:any)=>[k,Number(v.target||0)])));setMsg("")}finally{setLoading(false)}};
 useEffect(()=>{void load()},[period,tab]);
 const save=async()=>{setSaving(true);setMsg("");try{const r=await fetch("/api/manual-target",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scope:"monthly",period,group,targets})}),j=await r.json();if(!r.ok)throw new Error(j.error||"Gagal menyimpan target");if(tab==="lob"){await fetch("/api/manual-target",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scope:"monthly",period,group:activeGroup,targets:active})})}setMsg(j.message||"Target tersimpan.")}catch(e){setMsg(e instanceof Error?e.message:"Gagal menyimpan target")}finally{setSaving(false)}};
 const actualByName=new Map((lob?.lob?.products||[]).map((x:any)=>[x.name,x.qty]));
 return <div className="m238m-stack">
  <div className="m238m-segment">{[["lob","LOB"],["product","3PP"],["vas","VAS"]].map(([k,l])=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k as "lob"|"product"|"vas")}>{l}</button>)}</div>
  {tab==="lob"&&lob?<Card className="m238m-copy-card"><strong>Product Fokus Aktif</strong><p>{(lob.productFocus||[]).join(", ")||"Belum ada produk fokus aktif."}</p></Card>:null}
  {loading?<Card>Memuat target…</Card>:<div className="m238m-list">{keys.map(k=><Card key={k} className="m238m-target-row"><div><strong>{k}</strong>{tab==="lob"?<span>Actual {num.format(Number(actualByName.get(k)||0))} unit</span>:null}</div><label><span>Target</span><input inputMode="numeric" type="number" min={0} value={targets[k]||0} onChange={e=>setTargets(v=>({...v,[k]:Number(e.target.value)}))}/></label>{tab==="lob"?<label className="m238m-toggle-row"><span>Aktif</span><input type="checkbox" checked={Number(active[k]||0)>0} onChange={e=>setActive(v=>({...v,[k]:e.target.checked?1:0}))}/></label>:null}</Card>)}</div>}
  <button className="m238m-primary" disabled={saving} onClick={()=>void save()}>{saving?"Menyimpan…":"Simpan Target Fokus"}</button>{msg?<small className="m238m-notice">{msg}</small>:null}
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
