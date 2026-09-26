"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {ArrowLeft,CheckCircle2,ChevronRight,Search,Upload,X,XCircle} from "lucide-react";
import type {PromoParseResult,PromoProduct,PromoStatus} from "@/lib/promo-board-parser";
import {comparePromoPriceLists,type PromoComparison} from "@/lib/promo-board-insights";
import {buildPromoCatalog,type PromoCatalogItem,type SohRow,type StockStatus} from "@/lib/promo-board-catalog";

type Snapshot=PromoParseResult&{id?:string;uploadedAt?:string};
type PromoResponse={ok?:boolean;active?:Snapshot|null;history?:Snapshot[];error?:string};
type PreviewResponse={ok?:boolean;preview?:PromoParseResult;comparison?:PromoComparison;planId?:string;duplicate?:boolean;error?:string};
type SohResponse={rows?:SohRow[];updated?:string;error?:string};
type ViewMode="promo"|"changes"|"history";
type PromoScope="ACTIVE"|"UPCOMING"|"ENDING"|"ALL";

const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const num=new Intl.NumberFormat("id-ID");
const dateFmt=new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short",year:"numeric"});
const LOB_ORDER=["iPhone","iPad","Mac","Watch","AirPods"];
const CAPACITY_ORDER=["64GB","128GB","256GB","512GB","1TB","2TB","4TB"];

function formatDate(value:string|null|undefined){if(!value)return"-";const d=new Date(`${value}T00:00:00`);return Number.isNaN(d.getTime())?value:dateFmt.format(d)}
function periodText(status:PromoStatus,days:number|null,end:string|null){
 if(status==="UPCOMING")return days===0?"Mulai hari ini":days===1?"Mulai besok":`Mulai ${days} hari lagi`;
 if(status==="FURTHER_NOTICE")return"Further Notice";
 if(status==="ENDING_SOON")return days===0?"Berakhir hari ini":days===1?"Berakhir besok":`Berakhir ${days} hari lagi`;
 if(status==="EXPIRED")return end?`Berakhir ${formatDate(end)}`:"Expired";
 if(status==="ACTIVE")return end?`s.d. ${formatDate(end)}`:"Aktif";
 return"Perlu diperiksa";
}
function promoBadge(status:PromoStatus,days:number|null){
 if(status==="UPCOMING")return{label:"Akan Datang",cls:"bg-violet-50 text-violet-700 border-violet-200"};
 if(status==="FURTHER_NOTICE")return{label:"Further Notice",cls:"bg-blue-50 text-blue-700 border-blue-200"};
 if(status==="ENDING_SOON")return{label:days===0?"Hari ini":days===1?"Besok":`${days} hari lagi`,cls:"bg-amber-50 text-amber-700 border-amber-200"};
 if(status==="EXPIRED")return{label:"Expired",cls:"bg-rose-50 text-rose-700 border-rose-200"};
 if(status==="ACTIVE")return{label:"Aktif",cls:"bg-emerald-50 text-emerald-700 border-emerald-200"};
 return{label:"Perlu diperiksa",cls:"bg-slate-50 text-slate-600 border-slate-200"};
}
function stockBadge(status:StockStatus){
 if(status==="READY")return{label:"Ready",cls:"bg-emerald-50 text-emerald-700 border-emerald-200"};
 if(status==="LOW_STOCK")return{label:"Low Stock",cls:"bg-amber-50 text-amber-700 border-amber-200"};
 if(status==="OUT_OF_STOCK")return{label:"Out of Stock",cls:"bg-rose-50 text-rose-700 border-rose-200"};
 return{label:"SOH Tidak Ditemukan",cls:"bg-slate-50 text-slate-500 border-slate-200"};
}
function variantLabel(value:string){
 const u=value.toUpperCase();
 const map:[RegExp,string][]=[[/\bSPG\b/,"Space Grey"],[/\bSLV\b/,"Silver"],[/\bSTL\b/,"Starlight"],[/\bMDN\b/,"Midnight"],[/\bBLK\b|BLACK/,"Black"],[/\bWHT\b|WHITE/,"White"],[/\bBLU\b|BLUE/,"Blue"],[/PINK/,"Pink"],[/PUR|PURPLE/,"Purple"],[/NAT|NATURAL/,"Natural"],[/GLD|GOLD/,"Gold"],[/GRN|GREEN/,"Green"],[/RED/,"Red"]];
 return map.find(([r])=>r.test(u))?.[1]||"Variant";
}
function searchText(item:PromoCatalogItem){return `${item.lob} ${item.model} ${item.capacity} ${item.connectivity} ${item.friendlyName} ${item.group.variants.map(v=>`${v.sapArticle} ${v.sapDescription}`).join(" ")}`.toLowerCase()}
function changeLabel(type:string){return({PROMO_PRICE_DOWN:"Harga Turun",PROMO_PRICE_UP:"Harga Naik",NEW_PROMO:"Promo Baru",PROMO_ENDED:"Promo Berakhir",PROMO_PERIOD_CHANGED:"Periode Berubah",NEW_PRODUCT:"Produk Baru",REMOVED_PRODUCT:"Produk Hilang",UNCHANGED:"Tidak Berubah"} as Record<string,string>)[type]||type}
function firstVariant(item:PromoCatalogItem):PromoProduct|undefined{return item.group.variants[0]}
function promoPriceText(item:PromoCatalogItem){
 if(!item.promoPriceMin)return"-";
 return item.promoPriceMax>item.promoPriceMin?`${money.format(item.promoPriceMin)} – ${money.format(item.promoPriceMax)}`:money.format(item.promoPriceMin);
}

function PromoDetail({item,onClose}:{item:PromoCatalogItem;onClose:()=>void}){
 const p=item.group,first=firstVariant(item),pb=promoBadge(p.promoStatus,p.daysRemaining),sb=stockBadge(item.stockStatus);
 return <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/40 backdrop-blur-sm sm:items-center" onClick={onClose}>
  <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl dark:bg-slate-950 sm:max-w-3xl sm:rounded-[28px]" onClick={e=>e.stopPropagation()}>
   <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden"/>
   <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.15em] text-blue-600">{item.lob}</p><h2 className="mt-1 text-2xl font-black">{item.friendlyName}</h2></div><button onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-slate-900" aria-label="Tutup"><X className="size-4"/></button></div>
   <div className="mt-4 flex flex-wrap gap-2"><span className={`rounded-full border px-3 py-1.5 text-xs font-black ${pb.cls}`}>{pb.label}</span><span className={`rounded-full border px-3 py-1.5 text-xs font-black ${sb.cls}`}>{sb.label}</span></div>
   <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-xs text-slate-400">Promo Price</p><p className="mt-1 text-2xl font-black text-blue-600">{promoPriceText(item)}</p><p className="mt-1 text-xs text-slate-500">{item.promoPriceMax>item.promoPriceMin?"Harga berbeda sesuai varian":"Harga promo seluruh varian"}</p></div><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-xs text-slate-400">SOH Total M238</p><p className="mt-1 text-2xl font-black">{item.totalSoh==null?"-":`${num.format(item.totalSoh)} unit`}</p><p className="mt-1 text-xs text-slate-500">{periodText(p.promoStatus,p.daysRemaining,p.promoEndDate)}</p></div></div>
   <div className="mt-5"><p className="text-sm font-black">Variant / Harga / SAP / SOH</p><div className="mt-2 overflow-hidden rounded-2xl border dark:border-slate-800">{item.stockVariants.map(v=>{const st=stockBadge(v.status);return <div key={v.product.sapArticle} className="grid gap-1 border-t p-3 text-sm first:border-t-0 dark:border-slate-800 sm:grid-cols-[1fr_1fr_1.2fr_.4fr_.8fr] sm:items-center"><b>{variantLabel(v.product.sapDescription)}</b><span className="text-xs font-black text-blue-600">{v.product.promotionPrice?money.format(v.product.promotionPrice):"-"}</span><span className="text-xs text-slate-500 sm:text-sm">{v.product.sapArticle}</span><span className="font-black">{v.soh==null?"-":v.soh}</span><span className={`w-fit rounded-full border px-2 py-1 text-[10px] font-black ${st.cls}`}>{st.label}</span></div>})}</div></div>
   <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border p-4 text-sm dark:border-slate-800"><p><b>Periode:</b> {p.promoStartDate?formatDate(p.promoStartDate):"Tidak terdeteksi"} → {p.promoPeriodType==="FURTHER_NOTICE"?"Further Notice":p.promoEndDate?formatDate(p.promoEndDate):"Perlu diperiksa"}</p><p className="mt-2"><b>Remarks:</b> {p.remarks||"-"}</p></div><div className="rounded-2xl border p-4 text-sm dark:border-slate-800"><p><b>BR/ZOUT:</b> {first?.brZout||"-"}</p><p className="mt-2"><b>EOL:</b> {first?.eolStatus||"-"}</p><p className="mt-2"><b>Cicilan Bundling:</b> {first?.promotionInstallmentBundling?money.format(first.promotionInstallmentBundling):"-"}</p><p className="mt-2"><b>Cash Bundling:</b> {first?.promotionCashBundling?money.format(first.promotionCashBundling):"-"}</p></div></div>
  </div>
 </div>
}

export default function PromoBoardV5(){
 const fileRef=useRef<HTMLInputElement>(null);
 const[active,setActive]=useState<Snapshot|null>(null),[history,setHistory]=useState<Snapshot[]>([]),[soh,setSoh]=useState<SohResponse>({rows:[]});
 const[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[sohWarning,setSohWarning]=useState("");
 const[preview,setPreview]=useState<PromoParseResult|null>(null),[previewComparison,setPreviewComparison]=useState<PromoComparison|null>(null),[previewPlanId,setPreviewPlanId]=useState(""),[previewDuplicate,setPreviewDuplicate]=useState(false),[selectedFile,setSelectedFile]=useState<File|null>(null);
 const[lob,setLob]=useState("iPhone"),[model,setModel]=useState(""),[capacity,setCapacity]=useState(""),[query,setQuery]=useState(""),[searchAll,setSearchAll]=useState(false);
 const[stockFilter,setStockFilter]=useState<"ALL"|StockStatus>("ALL"),[readyOnly,setReadyOnly]=useState(false),[scope,setScope]=useState<PromoScope>("ACTIVE"),[endingWindow,setEndingWindow]=useState(7);
 const[view,setView]=useState<ViewMode>("promo"),[detail,setDetail]=useState<PromoCatalogItem|null>(null);

 const load=useCallback(async()=>{setLoading(true);setError("");setSohWarning("");try{
  const[p,s]=await Promise.all([fetch("/api/promo-board",{cache:"no-store"}),fetch("/api/promo-board-soh",{cache:"no-store"})]);
  const pj=await p.json() as PromoResponse,sj=await s.json() as SohResponse;
  if(!p.ok)throw new Error(pj.error||"Promo Board gagal dibaca");
  setActive(pj.active||null);setHistory(pj.history||[]);
  if(s.ok)setSoh(sj);else{setSoh({rows:[]});setSohWarning(sj.error||"SOH belum dapat dibaca.")}
 }catch(e){setError(e instanceof Error?e.message:"Gagal membaca Promo Board")}finally{setLoading(false)}},[]);
 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[load]);

 const catalog=useMemo(()=>buildPromoCatalog(active?.products||[],soh.rows||[]),[active,soh.rows]);
 const lobs=useMemo(()=>LOB_ORDER.filter(x=>catalog.some(i=>i.lob===x)),[catalog]);
 const selectedLob=lobs.includes(lob)?lob:(lobs[0]||"");
 const lobItems=useMemo(()=>catalog.filter(i=>i.lob===selectedLob),[catalog,selectedLob]);
 const models=useMemo(()=>Array.from(new Set(lobItems.map(i=>i.model))).sort((a,b)=>a.localeCompare(b)),[lobItems]);
 const selectedModel=models.includes(model)?model:(models[0]||"");
 const modelItems=useMemo(()=>lobItems.filter(i=>!selectedModel||i.model===selectedModel),[lobItems,selectedModel]);
 const capacities=useMemo(()=>Array.from(new Set(modelItems.map(i=>i.capacity).filter(Boolean))).sort((a,b)=>{const ai=CAPACITY_ORDER.indexOf(a),bi=CAPACITY_ORDER.indexOf(b);return(ai<0?999:ai)-(bi<0?999:bi)||a.localeCompare(b)}),[modelItems]);
 const selectedCapacity=capacities.includes(capacity)?capacity:(capacities[0]||"");

 const displayed=useMemo(()=>{
  const q=query.trim().toLowerCase();
  let rows=q?(searchAll?catalog:lobItems):modelItems.filter(i=>!selectedCapacity||i.capacity===selectedCapacity);
  if(q)rows=rows.filter(i=>searchText(i).includes(q));
  rows=rows.filter(i=>{
   if(scope==="ACTIVE"&&!(["ACTIVE","ENDING_SOON","FURTHER_NOTICE"] as PromoStatus[]).includes(i.group.promoStatus))return false;
   if(scope==="UPCOMING"&&i.group.promoStatus!=="UPCOMING")return false;
   if(scope==="ENDING"){const d=i.group.daysRemaining;return i.group.promoStatus==="ENDING_SOON"&&d!=null&&d>=0&&d<=endingWindow}
   return true;
  });
  if(stockFilter!=="ALL")rows=rows.filter(i=>i.stockStatus===stockFilter);
  if(readyOnly)rows=rows.filter(i=>i.stockStatus==="READY");
  return rows;
 },[query,searchAll,catalog,lobItems,modelItems,selectedCapacity,scope,endingWindow,stockFilter,readyOnly]);

 const lastComparison=useMemo(()=>comparePromoPriceLists(history[0]||null,active),[history,active]);
 const metrics=useMemo(()=>({active:catalog.filter(i=>(["ACTIVE","ENDING_SOON","FURTHER_NOTICE"] as PromoStatus[]).includes(i.group.promoStatus)).length,upcoming:catalog.filter(i=>i.group.promoStatus==="UPCOMING").length,further:catalog.filter(i=>i.group.promoStatus==="FURTHER_NOTICE").length,ending:catalog.filter(i=>i.group.promoStatus==="ENDING_SOON").length,ready:catalog.filter(i=>i.stockStatus==="READY").length,low:catalog.filter(i=>i.stockStatus==="LOW_STOCK").length,out:catalog.filter(i=>i.stockStatus==="OUT_OF_STOCK").length}),[catalog]);

 const previewFile=async(file:File)=>{setBusy(true);setError("");setSelectedFile(file);setPreviewPlanId("");setPreviewDuplicate(false);try{const form=new FormData();form.append("file",file);form.append("mode","preview");const r=await fetch("/api/promo-board",{method:"POST",body:form}),j=await r.json() as PreviewResponse;if(!r.ok||!j.preview||!j.planId)throw new Error(j.error||"Pricelist gagal dianalisa");setPreview(j.preview);setPreviewComparison(j.comparison||null);setPreviewPlanId(j.planId);setPreviewDuplicate(Boolean(j.duplicate))}catch(e){setPreview(null);setSelectedFile(null);setError(e instanceof Error?e.message:"Pricelist gagal dianalisa")}finally{setBusy(false)}};
 const activate=async()=>{if(!selectedFile||!previewPlanId)return;setBusy(true);setError("");try{const form=new FormData();form.append("file",selectedFile);form.append("mode","activate");form.append("planId",previewPlanId);const r=await fetch("/api/promo-board",{method:"POST",body:form}),j=await r.json();if(!r.ok)throw new Error(j.error||"Gagal mengaktifkan Pricelist");setPreview(null);setPreviewComparison(null);setPreviewPlanId("");setPreviewDuplicate(false);setSelectedFile(null);if(fileRef.current)fileRef.current.value="";await load()}catch(e){setError(e instanceof Error?e.message:"Gagal mengaktifkan Pricelist")}finally{setBusy(false)}};

 return <main className="min-h-[100dvh] bg-slate-50 pb-[calc(24px+env(safe-area-inset-bottom))] text-slate-950 dark:bg-slate-900 dark:text-white">
  <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
   <header className="flex items-start justify-between gap-3"><div><Link href="/" className="inline-flex min-h-10 items-center gap-1 text-xs font-black text-slate-500"><ArrowLeft className="size-4"/> Dashboard M238</Link><h1 className="mt-2 text-2xl font-black sm:text-3xl">Promo Board</h1><p className="mt-1 text-xs text-slate-500 sm:text-sm">Pricelist {formatDate(active?.priceListDate)}{soh.updated?` • SOH terakhir diperbarui ${soh.updated}`:""}</p></div><button onClick={()=>fileRef.current?.click()} disabled={busy} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl bg-blue-600 px-3 text-xs font-black text-white disabled:opacity-60 sm:px-4 sm:text-sm"><Upload className="size-4"/>{busy?"Proses...":"Update Pricelist"}</button><input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)void previewFile(f)}}/></header>

   {error?<div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700"><XCircle className="size-5"/>{error}</div>:null}
   {sohWarning?<div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">Promo tetap bisa dilihat, tetapi SOH belum terbaca: {sohWarning}</div>:null}

   {preview?<section className="mt-4 rounded-3xl border border-blue-200 bg-white p-4 shadow-sm dark:border-blue-900 dark:bg-slate-950"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.14em] text-blue-600">Preview Pricelist</p><h2 className="mt-1 font-black">{preview.fileName}</h2><p className="mt-1 text-xs text-slate-500">{preview.totalSku} SKU • {formatDate(preview.priceListDate)} • {preview.warnings.length} warning</p></div><div className="flex gap-2"><button onClick={()=>{setPreview(null);setSelectedFile(null);setPreviewPlanId("");setPreviewDuplicate(false)}} className="min-h-11 rounded-xl border px-3 text-sm font-black">Batal</button><button onClick={()=>void activate()} disabled={busy||!previewPlanId} className="min-h-11 rounded-xl bg-emerald-600 px-3 text-sm font-black text-white disabled:opacity-60">{previewDuplicate?"Tutup Tanpa Duplikat":"Gunakan Sebagai Aktif"}</button></div></div>{previewComparison?<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Harga Turun",previewComparison.counts.PROMO_PRICE_DOWN],["Harga Naik",previewComparison.counts.PROMO_PRICE_UP],["Promo Baru",previewComparison.counts.NEW_PROMO+previewComparison.counts.NEW_PRODUCT],["Promo Berakhir",previewComparison.counts.PROMO_ENDED+previewComparison.counts.REMOVED_PRODUCT]].map(([label,value])=><div key={String(label)} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-[10px] font-black uppercase text-slate-400">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>)}</div>:null}<div className={`mt-3 flex items-center gap-2 text-xs font-bold ${previewDuplicate?"text-amber-700":"text-emerald-700"}`}><CheckCircle2 className="size-4"/> {previewDuplicate?"File sama dengan Pricelist aktif dan tidak akan membuat riwayat ganda.":"File dianalisa dulu dan belum mengubah Pricelist aktif."}</div></section>:null}

   <div className="mt-4 flex rounded-2xl bg-slate-200/70 p-1 dark:bg-slate-800">{(["promo","changes","history"] as ViewMode[]).map(v=><button key={v} onClick={()=>setView(v)} className={`min-h-10 flex-1 rounded-xl text-xs font-black ${view===v?"bg-white shadow-sm dark:bg-slate-950":"text-slate-500"}`}>{v==="promo"?"Promo":v==="changes"?"Perubahan":"Riwayat"}</button>)}</div>

   {view==="promo"?<>
    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{lobs.map(x=><button key={x} onClick={()=>{setLob(x);setModel("");setCapacity("");setQuery("")}} className={`min-h-11 shrink-0 rounded-2xl px-4 text-sm font-black ${selectedLob===x?"bg-slate-950 text-white dark:bg-white dark:text-slate-950":"bg-white text-slate-600 shadow-sm dark:bg-slate-950 dark:text-slate-300"}`}>{x}</button>)}</div>

    <section className="mt-4 rounded-3xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari model, storage, warna, atau SAP..." className="h-12 w-full rounded-2xl border bg-transparent pl-10 pr-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-200"/></div><div className="mt-3 flex flex-wrap gap-2"><select value={scope} onChange={e=>setScope(e.target.value as PromoScope)} className="min-h-11 rounded-xl border bg-transparent px-3 text-xs font-black"><option value="ACTIVE">Promo Aktif</option><option value="UPCOMING">Akan Datang</option><option value="ENDING">Akan Berakhir</option><option value="ALL">Semua Promo</option></select>{scope==="ENDING"?<select value={endingWindow} onChange={e=>setEndingWindow(Number(e.target.value))} className="min-h-11 rounded-xl border bg-transparent px-3 text-xs font-black"><option value={3}>3 hari</option><option value={7}>7 hari</option><option value={14}>14 hari</option></select>:null}<select value={stockFilter} onChange={e=>setStockFilter(e.target.value as "ALL"|StockStatus)} className="min-h-11 rounded-xl border bg-transparent px-3 text-xs font-black"><option value="ALL">Semua Stock</option><option value="READY">Ready</option><option value="LOW_STOCK">Low Stock</option><option value="OUT_OF_STOCK">Out of Stock</option><option value="UNKNOWN">SOH Tidak Ditemukan</option></select><label className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-black"><input type="checkbox" checked={readyOnly} onChange={e=>setReadyOnly(e.target.checked)}/> Hanya Ready</label>{query?<label className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-black"><input type="checkbox" checked={searchAll} onChange={e=>setSearchAll(e.target.checked)}/> Semua LOB</label>:null}</div></section>

    {!query?<><section className="mt-4"><p className="mb-2 text-xs font-black uppercase tracking-[.14em] text-slate-400">Pilih Model</p><div className="flex gap-2 overflow-x-auto pb-1">{models.map(x=><button key={x} onClick={()=>{setModel(x);setCapacity("")}} className={`min-h-11 shrink-0 rounded-2xl px-4 text-sm font-black ${selectedModel===x?"bg-blue-600 text-white":"bg-white text-slate-600 shadow-sm dark:bg-slate-950 dark:text-slate-300"}`}>{x}</button>)}</div></section>{capacities.length?<section className="mt-4"><p className="mb-2 text-xs font-black uppercase tracking-[.14em] text-slate-400">Pilih Capacity</p><div className="flex gap-2 overflow-x-auto pb-1">{capacities.map(x=><button key={x} onClick={()=>setCapacity(x)} className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-black ${selectedCapacity===x?"bg-slate-950 text-white dark:bg-white dark:text-slate-950":"bg-white text-slate-600 shadow-sm dark:bg-slate-950 dark:text-slate-300"}`}>{x}</button>)}</div></section>:null}</>:<p className="mt-4 text-xs font-semibold text-slate-500">Hasil pencarian {searchAll?"semua LOB":selectedLob} • model/capacity tidak dikunci saat search.</p>}

    <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{loading?<div className="col-span-full rounded-3xl border bg-white p-8 text-center text-sm text-slate-400 dark:bg-slate-950">Memuat Promo & SOH...</div>:displayed.length?displayed.map(item=>{const p=item.group,pb=promoBadge(p.promoStatus,p.daysRemaining),sb=stockBadge(item.stockStatus);return <article key={item.key} className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[.12em] text-blue-600">{item.lob}</p><h2 className="mt-1 break-words text-lg font-black">{item.friendlyName}</h2><p className="mt-1 text-xs text-slate-400">{item.group.variants.length} SKU / variant</p></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${pb.cls}`}>{pb.label}</span></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-[10px] font-bold text-slate-400">{item.promoPriceMax>item.promoPriceMin?"Promo Price Range":"Promo Price"}</p><p className="mt-1 break-words text-lg font-black text-blue-600">{promoPriceText(item)}</p>{item.promoPriceMax>item.promoPriceMin?<p className="mt-2 text-[10px] font-black text-emerald-600">Cek harga per varian di detail</p>:p.savingAmount>0?<p className="mt-2 text-[10px] font-black text-emerald-600">Hemat {money.format(p.savingAmount)} • {p.discountPercentage.toFixed(1)}%</p>:null}</div><div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-[10px] font-bold text-slate-400">SOH M238</p><p className="mt-1 text-lg font-black">{item.totalSoh==null?"-":`${num.format(item.totalSoh)} unit`}</p><span className={`mt-1 inline-block rounded-full border px-2 py-1 text-[9px] font-black ${sb.cls}`}>{sb.label}</span></div></div><p className="mt-3 text-xs font-semibold text-slate-500">{periodText(p.promoStatus,p.daysRemaining,p.promoEndDate)}</p><div className="mt-3 flex flex-wrap gap-2">{item.stockVariants.slice(0,6).map(v=><span key={v.product.sapArticle} className="rounded-full bg-slate-100 px-2.5 py-1.5 text-[10px] font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">{variantLabel(v.product.sapDescription)}{v.soh==null?"":` • ${v.soh}`}</span>)}</div><button onClick={()=>setDetail(item)} className="mt-4 flex min-h-11 w-full items-center justify-center gap-1 rounded-2xl bg-slate-950 text-sm font-black text-white dark:bg-white dark:text-slate-950">Lihat Detail Promo <ChevronRight className="size-4"/></button></article>}):<div className="col-span-full rounded-3xl border border-dashed p-8 text-center text-sm text-slate-400">Tidak ada produk yang cocok dengan filter ini.</div>}</div>
   </>:view==="changes"?<section className="mt-4 space-y-3"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">{[["Harga Turun",lastComparison.counts.PROMO_PRICE_DOWN],["Harga Naik",lastComparison.counts.PROMO_PRICE_UP],["Promo Baru",lastComparison.counts.NEW_PROMO],["Promo Berakhir",lastComparison.counts.PROMO_ENDED],["Periode Berubah",lastComparison.counts.PROMO_PERIOD_CHANGED],["Produk Baru",lastComparison.counts.NEW_PRODUCT],["Produk Hilang",lastComparison.counts.REMOVED_PRODUCT]].map(([label,value])=><div key={String(label)} className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}</div><div className="space-y-2">{lastComparison.changes.filter(x=>x.type!=="UNCHANGED").slice(0,100).map(x=><div key={`${x.type}-${x.sapArticle}`} className="rounded-2xl border bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><b className="break-words">{x.description}</b><p className="mt-1 text-xs text-slate-400">{x.sapArticle}</p>{x.previous?.promotionPrice&&x.current?.promotionPrice&&x.previous.promotionPrice!==x.current.promotionPrice?<p className="mt-2 text-xs font-bold">{money.format(x.previous.promotionPrice)} → <span className="text-blue-600">{money.format(x.current.promotionPrice)}</span></p>:null}</div><span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black dark:bg-slate-900">{changeLabel(x.type)}</span></div></div>)}</div></section>:<section className="mt-4 space-y-3">{history.length?history.map(x=><div key={x.id||x.fileName} className="flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div><b>{formatDate(x.priceListDate)}</b><p className="mt-1 text-xs text-slate-500">{x.fileName}</p>{x.uploadedAt?<p className="mt-1 text-[10px] text-slate-400">Upload {new Date(x.uploadedAt).toLocaleString("id-ID")}</p>:null}</div><div className="text-right"><p className="font-black">{x.totalSku} SKU</p><p className="text-xs text-slate-400">{x.warnings.length} warning</p></div></div>):<div className="rounded-3xl border border-dashed p-8 text-center text-sm text-slate-400">Belum ada riwayat Pricelist.</div>}</section>}

   <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">{[["Promo Aktif",metrics.active],["Akan Datang",metrics.upcoming],["Further",metrics.further],["Berakhir",metrics.ending],["Ready",metrics.ready],["Low Stock",metrics.low],["Out",metrics.out]].map(([label,value])=><div key={String(label)} className="rounded-2xl border bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950"><p className="text-[10px] font-black uppercase text-slate-400">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>)}</section>
  </div>
  {detail?<PromoDetail item={detail} onClose={()=>setDetail(null)}/>:null}
 </main>
}
