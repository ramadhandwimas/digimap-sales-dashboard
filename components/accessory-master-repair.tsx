"use client";

import {useRef,useState} from "react";
import {CheckCircle2,LoaderCircle,WandSparkles} from "lucide-react";
import type {RepairCandidate,RepairReview} from "@/lib/accessory-master-repair";

type Result={checked:number;fixableCount:number;reviewCount:number;candidates:RepairCandidate[];review:RepairReview[];hasMore:boolean;planId:string};

export default function AccessoryMasterRepair(){
 const[result,setResult]=useState<Result|null>(null),[selected,setSelected]=useState<Set<string>>(new Set());
 const[busy,setBusy]=useState<"preview"|"apply"|null>(null),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const active=useRef(false);
 async function call(body:object){
  const response=await fetch("/api/accessory-master-repair",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const payload=await response.json();
  if(!response.ok)throw Object.assign(new Error(payload.error||"Master gagal diperiksa."),{payload});
  return payload as Result&{message?:string;applied?:number};
 }
 async function preview(preserveSuccess=false){
  if(active.current)return;
  active.current=true;setBusy("preview");setError("");if(!preserveSuccess)setSuccess("");
  try{const payload=await call({mode:"preview"});setResult(payload);setSelected(new Set())}
  catch(e){setError(e instanceof Error?e.message:"Master gagal diperiksa.")}
  finally{active.current=false;setBusy(null)}
 }
 async function apply(){
  if(!result||!selected.size||active.current)return;
  active.current=true;setBusy("apply");setError("");setSuccess("");
  try{
   const payload=await call({mode:"apply",planId:result.planId,selected:[...selected]});
   setSuccess(payload.message||"Perbaikan berhasil disimpan.");
   active.current=false;setBusy(null);await preview(true);return;
  }catch(e){
   const issue=e as Error&{payload?:Result};
   if(issue.payload?.planId){setResult(issue.payload);setSelected(new Set())}
   setError(issue.message||"Perbaikan gagal disimpan.");
  }finally{active.current=false;setBusy(null)}
 }
 const toggle=(id:string)=>setSelected(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next});
 return <div className="acc-repair">
  <div className="acc-heading"><WandSparkles size={22}/><div><h3>Cek &amp; Perbaiki Master</h3><p>Periksa seluruh Master A–G dan tampilkan saran sebelum data diperbarui.</p></div></div>
  <div className="acc-actions"><button type="button" disabled={!!busy} onClick={()=>void preview()}>
   {busy==="preview"?<LoaderCircle className="animate-spin" size={17}/>:<WandSparkles size={17}/>}{busy==="preview"?"Memeriksa Master…":"Cek & Perbaiki Master"}
  </button></div>
  <p className="acc-note">SAP Article menjadi kunci. Perbaikan otomatis hanya untuk aturan yang dapat dipastikan; temuan ambigu tidak akan diubah.</p>
  {error?<p role="alert" className="acc-error">{error}</p>:null}
  {success?<p className="acc-success"><CheckCircle2 size={16}/>{success}</p>:null}
  {result?<div aria-live="polite" className="acc-results">
   <div className="acc-counts"><div><strong>{result.checked.toLocaleString("id-ID")}</strong><span>Baris diperiksa</span></div><div><strong>{result.fixableCount}</strong><span>Bisa diperbaiki</span></div><div><strong>{result.reviewCount}</strong><span>Perlu manual</span></div></div>
   {result.candidates.length?<details open><summary>Saran perbaikan ({result.fixableCount})</summary>
    <div className="acc-select-actions"><button type="button" onClick={()=>setSelected(new Set(result.candidates.map(item=>item.id)))}>Pilih semua yang tampil</button><button type="button" onClick={()=>setSelected(new Set())}>Batalkan pilihan</button></div>
    <div className="acc-repair-list">{result.candidates.map(item=><label key={item.id} className="acc-repair-item"><input type="checkbox" checked={selected.has(item.id)} onChange={()=>toggle(item.id)}/><span><strong>Baris {item.row} · {item.article}</strong><small>{item.description}</small>{item.changes.map(change=><span className="acc-change" key={change.field}><b>{change.field}</b><del>{change.before||"—"}</del><span>→</span><ins>{change.after||"—"}</ins></span>)}<em>{item.reasons.join(" ")}</em></span></label>)}</div>
    {result.hasMore?<p className="acc-note">Menampilkan 200 temuan pertama. Simpan batch ini lalu jalankan pengecekan kembali.</p>:null}
    <div className="acc-actions"><button type="button" className="acc-primary" disabled={!selected.size||!!busy} onClick={()=>void apply()}>{busy==="apply"?<LoaderCircle className="animate-spin" size={17}/>:<CheckCircle2 size={17}/>}{busy==="apply"?"Menyimpan…":`Simpan ${selected.size} Perbaikan`}</button></div>
   </details>:<p className="acc-success"><CheckCircle2 size={16}/>Tidak ada kesalahan pasti yang dapat diperbaiki otomatis.</p>}
   {result.review.length?<details><summary>Perlu diperiksa manual ({result.reviewCount})</summary><div className="acc-review">{result.review.map((item,index)=><div key={`${item.row}-${item.article}-${index}`}><strong>Baris {item.row} · {item.article||"Tanpa SAP Article"}</strong><p>{item.description}</p><p>{item.reason}</p></div>)}</div>{result.reviewCount>100?<p className="acc-note">Menampilkan 100 temuan pertama.</p>:null}</details>:null}
  </div>:null}
 </div>;
}
