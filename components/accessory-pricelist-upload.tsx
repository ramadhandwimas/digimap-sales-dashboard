"use client";

import {useId,useRef,useState,useSyncExternalStore} from "react";
import {FileSpreadsheet,Upload,LoaderCircle} from "lucide-react";
import type {MasterRow,ReviewItem} from "@/lib/accessory-pricelist";
import DataCopasRepair from "@/components/data-copas-repair";
import AccessoryMasterRepair from "@/components/accessory-master-repair";

type LastImport={fileName:string;timestamp:string;count:number};
type Result={total:number;newCount:number;accessoryCount:number;deviceCount?:number;vasCount:number;existing:number;duplicates:number;ignored:number;reviewCount:number;preview:MasterRow[];review:ReviewItem[];planId:string;imported?:number;message?:string};

const importEvent="m238:pricelist-import";
function subscribeImports(notify:()=>void){window.addEventListener("storage",notify);window.addEventListener(importEvent,notify);return()=>{window.removeEventListener("storage",notify);window.removeEventListener(importEvent,notify)}}
function lastImportValue(raw:string|null):LastImport|null{try{const saved=JSON.parse(raw||"null");return saved&&typeof saved.fileName==="string"&&typeof saved.timestamp==="string"&&Number.isFinite(Date.parse(saved.timestamp))&&Number.isFinite(saved.count)?saved:null}catch{return null}}

export default function AccessoryPricelistUpload({kind="accessory",onBusyChange}:{kind?:"accessory"|"device";onBusyChange?:(busy:boolean)=>void}={}){
 const device=kind==="device";
 const inputId=useId(),[file,setFile]=useState<File|null>(null),[result,setResult]=useState<Result|null>(null);
 const[busy,setBusy]=useState<"preview"|"import"|null>(null),[error,setError]=useState("");
 const[repairSource,setRepairSource]=useState<"master"|"copas"|null>(null);
 const repairBusy=repairSource!==null;
 const active=useRef(false),[needsRecheck,setNeedsRecheck]=useState(false);
 const savedImport=useSyncExternalStore(subscribeImports,()=>{try{return localStorage.getItem(`m238-pricelist-import-${kind}`)}catch{return null}},()=>null);
 const lastImport=lastImportValue(savedImport);

 const steps=["Pilih file","Periksa data","Simpan ke Master"],step=result?.imported!==undefined?3:result?2:file?1:0;

 async function run(mode:"preview"|"import"){
  if(!file||active.current||repairBusy||mode==="import"&&(!result||needsRecheck||result.imported!==undefined))return;
  if(!/\.xlsx?$/i.test(file.name)||file.size>4*1024*1024||!file.size){setError("Pilih file Excel .xlsx / .xls, maksimal 4 MB.");return}
  active.current=true;setBusy(mode);onBusyChange?.(true);setError("");
  try{
   const body=new FormData();body.append("file",file);body.append("mode",mode);
   if(mode==="import"&&result)body.append("planId",result.planId);
   const response=await fetch(device?"/api/upload-device-pricelist":"/api/upload-accessory-pricelist",{method:"POST",body,cache:"no-store"});
   const payload=await response.json().catch(()=>({error:response.status===401?"Sesi login berakhir. Silakan login kembali.":response.status===413?"File terlalu besar. Maksimal 4 MB.":"Server belum merespons dengan benar. Coba cek pricelist lagi."}));
   if(!response.ok){
    if(payload.planId)setResult(payload);
    setNeedsRecheck(true);
    throw new Error(payload.error||"Upload gagal. Coba cek pricelist ulang.");
   }
   setResult(payload);setNeedsRecheck(false);
   if(mode==="import"&&Number(payload.imported)>0){const last={fileName:file.name,timestamp:new Date().toISOString(),count:Number(payload.imported)};try{localStorage.setItem(`m238-pricelist-import-${kind}`,JSON.stringify(last));window.dispatchEvent(new Event(importEvent));window.dispatchEvent(new CustomEvent("m238:data-activity",{detail:{label:device?"Upload Pricelist Device":"Upload Pricelist Accessories & VAS",detail:`${file.name} · ${payload.imported} produk`,count:Number(payload.imported),type:device?"PRICELIST_DEVICE":"PRICELIST_ACCESSORY"}}))}catch{}}
  }catch(e){setNeedsRecheck(true);setError(e instanceof Error?e.message:"Upload gagal.")}
  finally{active.current=false;setBusy(null);onBusyChange?.(false)}
 }
 return <section className="acc-pricelist" aria-label={device?"Upload Pricelist Device":"Upload Pricelist Accessories dan VAS"}>
  <div className="acc-heading"><FileSpreadsheet size={22}/><div><h3>{device?"Upload Pricelist Device":"Upload Pricelist Accessories & VAS"}</h3><p>{device?"Tambahkan unit baru beserta kategori dan Type/model ke Master. AirPods tetap masuk Accessories.":"Tambahkan Accessories serta VAS Qoala, Telkomsel, XL, dan Indosat ke Master."}</p></div></div>
  <ol className="acc-steps" aria-label="Tahapan upload">{steps.map((label,index)=><li key={label} data-state={index<step?"complete":index===step?"current":"waiting"} aria-current={index===Math.min(step,2)?"step":undefined}><b>{index<step?"✓":index+1}</b><span>{label}</span></li>)}</ol>
  {lastImport?<div className="acc-last-import"><strong>Terakhir berhasil di perangkat ini</strong><span>{lastImport.fileName}</span><small>{new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Jakarta"}).format(new Date(lastImport.timestamp))} WIB · {lastImport.count} produk ditambahkan</small></div>:null}
  <label htmlFor={inputId}>File pricelist (.xlsx / .xls, maks. 4 MB)</label>
  <input id={inputId} type="file" accept=".xlsx,.xls" disabled={!!busy||repairBusy} onChange={e=>{setFile(e.target.files?.[0]||null);setResult(null);setError("");setNeedsRecheck(false)}}/>
  <div className="acc-actions">
   <button type="button" disabled={!file||!!busy||repairBusy} onClick={()=>void run("preview")}>
    {busy==="preview"?<LoaderCircle className="animate-spin" size={17}/>:<FileSpreadsheet size={17}/>}{busy==="preview"?"Mengecek Master…":"Cek Pricelist"}
   </button>
   {result&&result.newCount>0&&result.imported===undefined?<button type="button" className="acc-primary" disabled={!!busy||repairBusy||needsRecheck} onClick={()=>void run("import")}>
    {busy==="import"?<LoaderCircle className="animate-spin" size={17}/>:<Upload size={17}/>}{busy==="import"?"Menyimpan…":`Tambahkan ${result.newCount.toLocaleString("id-ID")} Produk`}
   </button>:null}
  </div>
  <details className="acc-help"><summary>Panduan file dan langkah berikutnya</summary><p className="acc-note">{device?"Upload pricelist Apple Device dengan kolom SAP Article dan SAP Description / SAPDescription. Periksa preview lalu tambahkan produk baru. Setelah tersimpan, gunakan Cek & Perbaiki Data Copas di bawah untuk memperbaiki N/A. Untuk Daily Sales aktif, upload ulang SPW setelah impor.":"Pengecekan memakai SAP Article dan isi Master terbaru. AppleCare tetap Accessories; Qoala, Telkomsel, XL, dan Indosat masuk VAS. Produk yang belum cocok akan ditampilkan untuk diperiksa."}</p></details>
  {file?<p className="acc-file-name">{file.name} · {(file.size/1024).toLocaleString("id-ID",{maximumFractionDigits:0})} KB</p>:null}
  {busy?<p role="status" className="acc-progress"><LoaderCircle className="animate-spin" size={16}/>{busy==="import"?"Menyimpan produk ke Master. Tunggu hingga selesai.":"Membaca file dan mencocokkan SAP Article dengan Master…"}</p>:null}
  {error?<div role="alert" className="acc-error"><p>{error}</p><p>File dan hasil pemeriksaan tetap tersedia. Klik Cek Pricelist untuk memeriksa ulang sebelum menyimpan.</p></div>:null}
  {result?<div aria-live="polite" className="acc-results">
   {result.message?<p className="acc-success">{result.message}</p>:null}
   <div className="acc-counts">
    <div><strong>{result.imported??result.newCount}</strong><span>{result.imported!==undefined?"Produk ditambahkan":"Produk siap ditambahkan"}</span></div>
    <div><strong>{result.existing}</strong><span>Sudah di Master</span></div>
    <div><strong>{result.reviewCount}</strong><span>Perlu diperiksa</span></div>
   </div>
   <p className="acc-note">{device?`${result.deviceCount||0} Device · ${result.accessoryCount} AirPods`:`${result.accessoryCount} Accessories · ${result.vasCount} VAS`} · {result.total.toLocaleString("id-ID")} baris produk · {result.duplicates} duplikat dalam file · {result.ignored} baris kosong/header dilewati.</p>
   {result.newCount===0&&result.imported===undefined?<p>{device?"Tidak ada device baru yang siap ditambahkan.":"Tidak ada produk Accessories/VAS baru yang siap ditambahkan."}</p>:null}
   {result.preview.length?<details open><summary>Produk yang {result.imported!==undefined?"ditambahkan":"akan ditambahkan"} ({result.newCount})</summary><div className="acc-product-cards">{result.preview.map(row=><article key={row[1]}><div><small>{row[3]} · {row[5]}</small><h4>{row[2]}</h4><p>{row[1]}</p></div><dl><div><dt>Type</dt><dd>{row[4]||"—"}</dd></div><div><dt>Brand / Core</dt><dd>{row[0]} / {row[6]}</dd></div></dl></article>)}</div><div className="acc-table acc-table-desktop"><table><thead><tr>{["Brand","SAP Article","Deskripsi","Kategori","Type","Group","Core"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{result.preview.map(row=><tr key={row[1]}>{row.map((cell,i)=><td key={i}>{cell||"—"}</td>)}</tr>)}</tbody></table></div>{result.newCount>50?<p className="acc-note">Menampilkan 50 produk pertama.</p>:null}</details>:null}
   {result.review.length?<details><summary>Perlu diperiksa ({result.reviewCount})</summary><div className="acc-review">{result.review.map((item,i)=><div key={`${item.article}-${i}`}><strong>{item.article||"Tanpa SAP Article"}</strong><p>{item.description}</p><p>{item.reason}</p><small>{item.sheet}, baris {item.row}</small></div>)}</div>{result.reviewCount>100?<p className="acc-note">Menampilkan 100 baris pertama.</p>:null}</details>:null}
  </div>:null}
  <div inert={!!busy}>{device?<DataCopasRepair scope="device" onBusyChange={value=>{setRepairSource(value?"copas":null);onBusyChange?.(value)}}/>:<><div inert={repairSource==="copas"}><AccessoryMasterRepair onBusyChange={value=>{setRepairSource(value?"master":null);onBusyChange?.(value)}}/></div><div inert={repairSource==="master"}><DataCopasRepair scope="accessory-vas" onBusyChange={value=>{setRepairSource(value?"copas":null);onBusyChange?.(value)}}/></div></>}</div>
 </section>;
}
