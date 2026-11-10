"use client";
import {useEffect,useRef,useState} from "react";
import {ArrowDown,ArrowUp,Download,FileText,ImagePlus,Share2,Trash2} from "lucide-react";
import {exportPettyCashPdf,type ReceiptPhoto} from "@/lib/petty-cash-pdf";
import {MAX_RECEIPT_PAGES,prepareReceiptFile} from "@/lib/petty-cash-import";
import type {PettyCash} from "@/lib/petty-cash";
import {sharePettyCashFile} from "@/lib/petty-cash-share";
export default function PettyCashReceipts({data,photos,onChange,onExported,onBusy}:{data:PettyCash;photos:ReceiptPhoto[];onChange:(photos:ReceiptPhoto[])=>void;onExported:()=>void;onBusy:(busy:boolean)=>void}){
 const[busy,setBusy]=useState(false),[status,setStatus]=useState(""),[error,setError]=useState(""),[result,setResult]=useState<{blob:Blob;file:File;url:string;name:string}|null>(null);
 const resultRef=useRef(result);resultRef.current=result;
 useEffect(()=>{setResult(previous=>{if(previous)URL.revokeObjectURL(previous.url);return null});setStatus("")},[data,photos]);
 useEffect(()=>()=>{if(resultRef.current)URL.revokeObjectURL(resultRef.current.url)},[]);
 const lock=(value:boolean)=>{setBusy(value);onBusy(value)};
 const clearResult=()=>{if(resultRef.current)URL.revokeObjectURL(resultRef.current.url);setResult(null)};
 const change=(next:ReceiptPhoto[])=>{clearResult();onChange(next)};
 const upload=async(files:File[])=>{
  if(!files.length||busy)return;if(photos.length+files.length>MAX_RECEIPT_PAGES){setError("Maksimal 24 halaman bukti dalam satu PDF. Kurangi file yang dipilih.");return}
  lock(true);setError("");clearResult();const added:ReceiptPhoto[]=[],failed:string[]=[];
  try{for(let i=0;i<files.length;i++){setStatus(`Menyiapkan file ${i+1}/${files.length}…`);try{const pages=await prepareReceiptFile(files[i],MAX_RECEIPT_PAGES-photos.length-added.length,setStatus);for(const page of pages)added.push({id:crypto.randomUUID(),name:page.name,pcv:String(photos.length+added.length+1),blob:page.blob,url:URL.createObjectURL(page.blob)})}catch(error){failed.push(error instanceof Error?error.message:"Bukti gagal dibaca.")}}
   onChange([...photos,...added]);setStatus(`${photos.length+added.length} halaman bukti siap dilampirkan.`);if(failed.length)setError(failed.join(" "));
  }finally{lock(false)}
 };
 const sharePdf=async()=>{
  if(!result||busy)return;lock(true);setError("");
  try{const outcome=await sharePettyCashFile(result.file);if(outcome==="shared"){onExported();setStatus("PDF telah dibagikan. Untuk menyimpan di iPhone, pilih Simpan ke File pada menu berbagi.")}else if(outcome==="unsupported")setError("Browser ini belum mendukung berbagi file. Tekan Unduh PDF, atau buka dashboard di Safari melalui ikon kompas lalu pilih Bagikan / Simpan PDF.")}
  catch{setError("Menu berbagi belum dapat dibuka. PDF tetap tersedia. Coba Bagikan / Simpan PDF lagi, atau buka dashboard di Safari.")}
  finally{lock(false)}
 };
 const createPdf=async()=>{
  if(busy)return;lock(true);setError("");clearResult();
  try{const blob=await exportPettyCashPdf(data,photos,setStatus),name=`PC-M238-${(data.pcrs||data.date||"draft").replace(/[^a-zA-Z0-9_-]/g,"-")}.pdf`,file={blob,file:new File([blob],name,{type:"application/pdf"}),url:URL.createObjectURL(blob),name};setResult(file);setStatus(`PDF gabungan siap · ${(blob.size/1_000_000).toFixed(2)} MB · ${photos.length} halaman bukti. Pilih Bagikan / Simpan PDF atau Unduh PDF di bawah.`)}catch(error){setStatus("");setError(error instanceof Error?error.message:"PDF belum dapat dibuat.")}finally{lock(false)}
 };
 return <section className="pc-receipts pc-no-print" aria-label="Bukti pembelian">
  <div className="pc-receipt-head"><div><h2>Bukti Pembelian</h2><p>Upload foto atau PDF, lalu gabungkan ringkasan dan semua bukti menjadi satu PDF maksimal 2 MB.</p></div><span>{photos.length}/24 halaman</span></div>
  <p className="pc-receipt-note">Isi tanggal, deskripsi, dan nominal pada tabel petty cash. Setiap halaman PDF menjadi satu lampiran. Periksa nomor PCV agar sesuai baris tabel.</p>
  <label className={`pc-photo-upload ${busy?"pc-disabled":""}`}><ImagePlus size={22}/><strong>Tambah foto / PDF bukti</strong><span>Foto atau PDF beberapa halaman · bisa pilih beberapa file sekaligus</span><input type="file" accept="application/pdf,.pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple disabled={busy} aria-label="Upload foto atau PDF bukti pembelian" onChange={event=>{const files=Array.from(event.target.files||[]);event.target.value="";void upload(files)}}/></label>
  {photos.length?<ol className="pc-photo-list">{photos.map((photo,index)=><li key={photo.id}><img src={photo.url} alt={`Bukti pembelian ${index+1}`}/><div className="pc-photo-meta"><strong>{photo.name}</strong><label>PCV No.<input value={photo.pcv} aria-label={`PCV foto ${index+1}`} disabled={busy} maxLength={30} onChange={event=>change(photos.map(item=>item.id===photo.id?{...item,pcv:event.target.value}:item))}/></label><small>Halaman bukti {index+1}</small></div><div className="pc-photo-actions"><button aria-label={`Pindahkan foto ${index+1} ke atas`} disabled={busy||index===0} onClick={()=>{const next=[...photos];[next[index-1],next[index]]=[next[index],next[index-1]];change(next)}}><ArrowUp size={15}/></button><button aria-label={`Pindahkan foto ${index+1} ke bawah`} disabled={busy||index===photos.length-1} onClick={()=>{const next=[...photos];[next[index+1],next[index]]=[next[index],next[index+1]];change(next)}}><ArrowDown size={15}/></button><button aria-label={`Hapus foto ${index+1}`} disabled={busy} onClick={()=>{URL.revokeObjectURL(photo.url);change(photos.filter(item=>item.id!==photo.id))}}><Trash2 size={15}/></button></div></li>)}</ol>:null}
  <div className="pc-receipt-download"><button type="button" disabled={busy} onClick={()=>void createPdf()}><FileText size={18}/>{busy?"Memproses…":result?"Buat Ulang PDF Gabungan":"Buat PDF Gabungan · Maks. 2 MB"}</button></div>
  {result?<div className="pc-pdf-ready"><div><strong>PDF siap disimpan</strong><span>{result.name} · {(result.blob.size/1_000_000).toFixed(2)} MB</span></div><div className="pc-pdf-ready-actions"><button type="button" className="pc-primary" disabled={busy} onClick={()=>void sharePdf()}><Share2 size={18}/>Bagikan / Simpan PDF</button><a className="pc-pdf-download" href={result.url} download={result.name} target="_blank" rel="noopener noreferrer" onClick={event=>{if(busy){event.preventDefault();return}setStatus("Jika PDF terbuka sebagai preview, tekan ikon bagikan lalu pilih Simpan ke File. Kembali ke halaman ini untuk memakai Bagikan / Simpan PDF.")}}><Download size={18}/>Unduh PDF</a></div><p>Di iPhone: tekan Bagikan / Simpan PDF, lalu pilih <b>Simpan ke File</b> atau WhatsApp. PDF tidak dibuka otomatis agar halaman ini tetap tersedia.</p></div>:null}
  {status?<p className="pc-receipt-status" role="status">{status}</p>:null}{error?<p className="pc-notice pc-error" role="alert">{error}</p>:null}
  <p className="pc-receipt-note">Foto dan PDF diproses di perangkat dan tidak ikut Simpan Draft. Simpan PDF gabungan sebelum meninggalkan halaman.</p>
 </section>;
}
