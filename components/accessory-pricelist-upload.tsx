"use client";

import {useId,useRef,useState} from "react";
import {FileSpreadsheet,Upload,LoaderCircle} from "lucide-react";
import type {MasterRow,ReviewItem} from "@/lib/accessory-pricelist";
import DataCopasRepair from "@/components/data-copas-repair";
import AccessoryMasterRepair from "@/components/accessory-master-repair";

type Result={total:number;newCount:number;accessoryCount:number;deviceCount?:number;vasCount:number;existing:number;duplicates:number;ignored:number;reviewCount:number;preview:MasterRow[];review:ReviewItem[];planId:string;imported?:number;message?:string};

export default function AccessoryPricelistUpload({kind="accessory"}:{kind?:"accessory"|"device"}={}){
 const device=kind==="device";
 const inputId=useId(),[file,setFile]=useState<File|null>(null),[result,setResult]=useState<Result|null>(null);
 const[busy,setBusy]=useState<"preview"|"import"|null>(null),[error,setError]=useState("");
 const active=useRef(false);
 async function run(mode:"preview"|"import"){
  if(!file||active.current)return;
  active.current=true;setBusy(mode);setError("");
  try{
   const body=new FormData();body.append("file",file);body.append("mode",mode);
   if(mode==="import"&&result)body.append("planId",result.planId);
   const response=await fetch(device?"/api/upload-device-pricelist":"/api/upload-accessory-pricelist",{method:"POST",body});
   const payload=await response.json();
   if(!response.ok){
    if(payload.planId)setResult(payload);else setResult(null);
    throw new Error(payload.error||"Upload gagal. Coba cek pricelist ulang.");
   }
   setResult(payload);
  }catch(e){setError(e instanceof Error?e.message:"Upload gagal.")}
  finally{active.current=false;setBusy(null)}
 }
 return <section className="acc-pricelist" aria-label={device?"Upload Pricelist Device":"Upload Pricelist Accessories dan VAS"}>
  <div className="acc-heading"><FileSpreadsheet size={22}/><div><h3>{device?"Upload Pricelist Device":"Upload Pricelist Accessories & VAS"}</h3><p>{device?"Tambahkan unit baru beserta kategori dan Type/model ke Master. AirPods tetap masuk Accessories.":"Tambahkan Accessories serta VAS Qoala, Telkomsel, XL, dan Indosat ke Master."}</p></div></div>
  <label htmlFor={inputId}>File pricelist (.xlsx / .xls, maks. 4 MB)</label>
  <input id={inputId} type="file" accept=".xlsx,.xls" disabled={!!busy} onChange={e=>{setFile(e.target.files?.[0]||null);setResult(null);setError("")}}/>
  <div className="acc-actions">
   <button type="button" disabled={!file||!!busy} onClick={()=>void run("preview")}>
    {busy==="preview"?<LoaderCircle className="animate-spin" size={17}/>:<FileSpreadsheet size={17}/>}{busy==="preview"?"Mengecek Master…":"Cek Pricelist"}
   </button>
   {result&&result.newCount>0&&result.imported===undefined?<button type="button" className="acc-primary" disabled={!!busy} onClick={()=>void run("import")}>
    {busy==="import"?<LoaderCircle className="animate-spin" size={17}/>:<Upload size={17}/>}{busy==="import"?"Menyimpan…":`Tambahkan ${result.newCount.toLocaleString("id-ID")} Produk`}
   </button>:null}
  </div>
  <p className="acc-note">{device?"Upload pricelist Apple Device dengan kolom SAP Article dan SAP Description / SAPDescription. Periksa preview lalu tambahkan produk baru. Setelah tersimpan, gunakan Cek & Perbaiki Data Copas di bawah untuk memperbaiki N/A. Untuk Daily Sales aktif, upload ulang SPW setelah impor.":"Pengecekan memakai SAP Article dan isi Master terbaru. AppleCare tetap Accessories; Qoala, Telkomsel, XL, dan Indosat masuk VAS. Produk yang belum cocok akan ditampilkan untuk diperiksa."}</p>
  {error?<p role="alert" className="acc-error">{error}</p>:null}
  {result?<div aria-live="polite" className="acc-results">
   {result.message?<p className="acc-success">{result.message}</p>:null}
   <div className="acc-counts">
    <div><strong>{result.imported??result.newCount}</strong><span>{result.imported!==undefined?"Produk ditambahkan":"Produk siap ditambahkan"}</span></div>
    <div><strong>{result.existing}</strong><span>Sudah di Master</span></div>
    <div><strong>{result.reviewCount}</strong><span>Perlu diperiksa</span></div>
   </div>
   <p className="acc-note">{device?`${result.deviceCount||0} Device · ${result.accessoryCount} AirPods`:`${result.accessoryCount} Accessories · ${result.vasCount} VAS`} · {result.total.toLocaleString("id-ID")} baris produk · {result.duplicates} duplikat dalam file · {result.ignored} baris kosong/header dilewati.</p>
   {result.newCount===0&&result.imported===undefined?<p>{device?"Tidak ada device baru yang siap ditambahkan.":"Tidak ada produk Accessories/VAS baru yang siap ditambahkan."}</p>:null}
   {result.preview.length?<details><summary>Produk yang {result.imported!==undefined?"ditambahkan":"akan ditambahkan"} ({result.newCount})</summary><div className="acc-table"><table><thead><tr>{["Brand","SAP Article","Deskripsi","Kategori","Type","Group","Core"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{result.preview.map(row=><tr key={row[1]}>{row.map((cell,i)=><td key={i}>{cell||"—"}</td>)}</tr>)}</tbody></table></div>{result.newCount>50?<p className="acc-note">Menampilkan 50 produk pertama.</p>:null}</details>:null}
   {result.review.length?<details><summary>Perlu diperiksa ({result.reviewCount})</summary><div className="acc-review">{result.review.map((item,i)=><div key={`${item.article}-${i}`}><strong>{item.article||"Tanpa SAP Article"}</strong><p>{item.description}</p><p>{item.reason}</p><small>{item.sheet}, baris {item.row}</small></div>)}</div>{result.reviewCount>100?<p className="acc-note">Menampilkan 100 baris pertama.</p>:null}</details>:null}
  </div>:null}
  {device?<DataCopasRepair/>:<AccessoryMasterRepair/>}
 </section>;
}
