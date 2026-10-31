"use client";
import {useRef,useState} from "react";
import {ListChecks,Rows3,Trash2,ReceiptText,LoaderCircle} from "lucide-react";
type Item={id:string;row:number;date:string;staff:string;staffId:string;invoice:string;article:string;description:string;qty:number;amount:number;store:string};
type Group={invoice:string;sourceRows:number[];found:boolean;items:Item[];totalQty:number;totalAmount:number};
type Result={planId:string;groups:Group[];sourceInvoiceCount:number;foundInvoiceCount:number;notFoundInvoiceCount:number;totalRows:number;totalQty:number;totalAmount:number};
const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const input="min-h-11 w-full rounded-xl border bg-white px-3 text-sm dark:bg-slate-950";
export default function CopasInvoiceCheck({onBusyChange,onChanged}:{onBusyChange?:(busy:boolean)=>void;onChanged?:()=>void|Promise<void>}={}){
 const[result,setResult]=useState<Result|null>(null),[selected,setSelected]=useState<string[]>([]),[reason,setReason]=useState("exchange"),[busy,setBusy]=useState<"check"|"delete"|"compact"|null>(null),[notice,setNotice]=useState<{error:boolean;text:string}|null>(null);
 const active=useRef(false),items=result?.groups.flatMap(group=>group.items)||[],chosen=items.filter(item=>selected.includes(item.id));
 const fetchCheck=async()=>{const response=await fetch("/api/copas-invoices",{method:"POST",headers:{"content-type":"application/json"},cache:"no-store",body:JSON.stringify({action:"check"})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Pemeriksaan invoice gagal.");return data as Result};
 const request=async(action:"check"|"delete"|"compact")=>{
  if(active.current||action==="delete"&&(!chosen.length||chosen.length>1000))return;
  if(action==="delete"&&!window.confirm(`Hapus ${chosen.length} baris transaksi dari Data Copas yang cocok dengan daftar RAW SalesPerson kolom Y?\nQty: ${chosen.reduce((sum,item)=>sum+item.qty,0)} · ${money.format(chosen.reduce((sum,item)=>sum+item.amount,0))}\nAlasan: ${reason}\n\nSalinan data dicatat dalam riwayat penghapusan.`))return;
  if(action==="compact"&&!window.confirm("Rapikan baris kosong di Data Copas? Transaksi akan naik mengikuti urutan semula. Kolom R dan seterusnya tetap di tempatnya."))return;
  active.current=true;setBusy(action);onBusyChange?.(true);setNotice(null);
  if(action==="check"){setResult(null);setSelected([])}
  try{
   if(action==="check")setResult(await fetchCheck());
   else if(action==="compact"){
    const response=await fetch("/api/copas-invoices",{method:"POST",headers:{"content-type":"application/json"},cache:"no-store",body:JSON.stringify({action:"compact"})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||"Baris kosong gagal dirapikan.");
    setResult(null);setSelected([]);setNotice({error:false,text:data.message});
    if(Number(data.compactedRows)>0)window.dispatchEvent?.(new CustomEvent("m238:data-activity",{detail:{label:"Rapikan Data Copas",detail:`${data.compactedRows} baris kosong dirapikan`,count:Number(data.compactedRows),type:"COPAS_COMPACT"}}));
    try{setResult(await fetchCheck())}catch{setNotice({error:false,text:`${data.message} Klik Cek Ulang untuk melihat status terbaru.`})}
   }else{
    const response=await fetch("/api/copas-invoices",{method:"POST",headers:{"content-type":"application/json"},cache:"no-store",body:JSON.stringify({action:"delete",planId:result?.planId,selectedIds:selected,reason})});
    const data=await response.json();
    if(!response.ok){if(response.status===409){setResult(null);setSelected([])}throw new Error(data.error||"Penghapusan gagal.")}
    setResult(null);setSelected([]);setNotice({error:false,text:`${data.message}${data.warning?` ${data.warning}`:""}`});
    window.dispatchEvent?.(new CustomEvent("m238:data-activity",{detail:{label:`Hapus Invoice ${reason}`,detail:`${data.deletedRows||chosen.length} baris transaksi`,count:Number(data.deletedRows||chosen.length),type:"INVOICE_DELETE"}}));
    try{setResult(await fetchCheck());await onChanged?.()}catch{setNotice({error:false,text:`${data.message} Klik Cek Ulang untuk melihat status terbaru.`})}
   }
  }catch(error){setNotice({error:true,text:error instanceof Error?error.message:"Pemeriksaan invoice gagal."})}
  finally{active.current=false;setBusy(null);onBusyChange?.(false)}
 };
 return <section className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950 sm:p-5" aria-label="Cek Invoice Exchange/Cancel">
  <div className="flex items-start gap-3"><ReceiptText className="mt-1 shrink-0 text-blue-600" size={23}/><div><h3 className="font-extrabold">Cek Invoice Exchange/Cancel</h3><p className="mt-1 text-sm text-slate-500">Ambil daftar invoice dari <b>RAW SalesPerson kolom Y</b>, lalu cocokkan dengan nomor invoice di <b>Data Copas kolom D</b>.</p></div></div>
  <button type="button" disabled={!!busy} onClick={()=>void request("check")} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white disabled:opacity-40">{busy?<LoaderCircle size={17} className="animate-spin"/>:<ListChecks size={17}/>} {busy?"Memproses…":result?"Cek Ulang Invoice dari Kolom Y":"Cek Invoice dari Kolom Y"}</button>
  <button type="button" disabled={!!busy} onClick={()=>void request("compact")} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold disabled:opacity-40"><Rows3 size={17}/>Rapikan Baris Kosong</button>
  {notice?<div role="status" className={`rounded-xl p-3 text-sm ${notice.error?"bg-rose-50 text-rose-700":"bg-emerald-50 text-emerald-700"}`}>{notice.text}</div>:null}
  {result?<>
   <div className="grid grid-cols-2 gap-2 text-sm"><Metric label="Invoice di kolom Y" value={result.sourceInvoiceCount}/><Metric label="Ada di Data Copas" value={result.foundInvoiceCount}/><Metric label="Tidak ada di Data Copas" value={result.notFoundInvoiceCount}/><Metric label="Baris transaksi ditemukan" value={result.totalRows}/></div>
   {!result.groups.length?<p role="status" className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada nomor invoice di RAW SalesPerson kolom Y.</p>:null}
   {items.length?<label className="flex min-h-11 items-center gap-3 text-sm font-bold"><input type="checkbox" disabled={!!busy} checked={selected.length===items.length} onChange={event=>setSelected(event.target.checked?items.map(item=>item.id):[])} className="size-4 accent-blue-600"/>Pilih semua {items.length} baris yang ditemukan</label>:null}
   <div className="space-y-3">{result.groups.map(group=><article key={group.invoice} className="rounded-xl border p-3">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-extrabold">Invoice {group.invoice}</h4><p className="mt-1 text-xs text-slate-500">Sumber: RAW SalesPerson · Y{group.sourceRows[0]}{group.sourceRows.length>1?` dan ${group.sourceRows.length-1} baris lainnya`:""}</p></div><span className={`rounded-lg px-2 py-1 text-xs font-bold ${group.found?"bg-amber-50 text-amber-800":"bg-emerald-50 text-emerald-700"}`}>{group.found?"Ada di Data Copas":"Tidak ada di Data Copas"}</span></div>
    {group.found?<details className="mt-3"><summary className="cursor-pointer text-sm font-bold">Lihat {group.items.length} baris · Qty {group.totalQty} · {money.format(group.totalAmount)}</summary><div className="mt-3 space-y-2">{group.items.map(item=><label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${selected.includes(item.id)?"border-blue-300 bg-blue-50 dark:bg-blue-950/30":""}`}><input type="checkbox" aria-label={`Pilih baris ${item.row}`} disabled={!!busy} checked={selected.includes(item.id)} onChange={event=>setSelected(current=>event.target.checked?[...current,item.id]:current.filter(id=>id!==item.id))} className="mt-1 size-4 shrink-0 accent-blue-600"/><span className="min-w-0 flex-1 break-words text-sm"><strong>{item.description||item.article}</strong><span className="mt-1 block text-xs text-slate-500">{item.article} · Data Copas baris {item.row}</span><span className="mt-1 block text-xs">{item.date||"Tanggal tidak tersedia"} · {item.store||"Toko tidak tersedia"} · {item.staff||item.staffId}</span><span className="mt-2 block font-bold">Qty {item.qty} · {money.format(item.amount)}</span></span></label>)}</div></details>:<p className="mt-2 text-xs text-slate-500">Nomor invoice ini tidak tercatat di Data Copas. Tidak ada baris yang perlu dihapus.</p>}
   </article>)}</div>
   {items.length?<div className="space-y-3 border-t pt-4"><p className="text-xs text-slate-500">Periksa tanggal, toko, dan staff pada detail sebelum memilih baris yang akan dihapus.</p><label className="block text-xs font-bold">Alasan penghapusan<select aria-label="Alasan penghapusan" className={`${input} mt-1`} value={reason} disabled={!!busy} onChange={event=>setReason(event.target.value)}><option value="exchange">Exchange</option><option value="cancel">Cancel transaksi</option></select></label><p className="text-sm"><b>{chosen.length} baris dipilih</b> · Qty {chosen.reduce((sum,item)=>sum+item.qty,0)} · {money.format(chosen.reduce((sum,item)=>sum+item.amount,0))}</p>{chosen.length>1000?<p className="text-xs text-amber-700">Pilih maksimal 1.000 baris dalam sekali penghapusan.</p>:null}<button type="button" onClick={()=>void request("delete")} disabled={!!busy||!chosen.length||chosen.length>1000} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-black text-white disabled:opacity-40"><Trash2 size={17}/>Hapus {chosen.length} Baris dari Data Copas</button><p className="text-xs leading-5 text-slate-500">Baris kosong otomatis dirapikan setelah penghapusan. Daftar di kolom Y tetap tersimpan. Penghapusan dicatat dalam riwayat dan baris yang dihapus dilewati saat Cut Off ulang.</p></div>:null}
  </>:null}
 </section>;
}
function Metric({label,value}:{label:string;value:number}){return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-xs text-slate-500">{label}</p><b className="mt-1 block text-xl">{value}</b></div>}
