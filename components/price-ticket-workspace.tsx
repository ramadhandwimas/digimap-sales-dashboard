"use client";
import {useEffect,useMemo,useState} from "react";
import {ArrowLeft,CheckSquare2,Download,Eye,FileCheck2,Printer,RefreshCw,Search,ShieldAlert,Square,X} from "lucide-react";
import styles from "@/app/price-ticket/price-ticket.module.css";
import PriceTicketPdfPreview from "@/components/price-ticket-pdf-preview";

type Slot={id:string;label:string;oldFullPrice:number;currentFullPrice:number|null;status:"CURRENT"|"CHANGED"|"MISSING"|"CONFLICT";articles:string[]};
type Ticket={id:string;title:string;subtitle:string;previewFile:string;status:"CURRENT"|"CHANGED"|"BLOCKED";changedCount:number;warningCount:number;slots:Slot[]};
type Payload={ok?:boolean;error?:string;source?:{fileName:string;priceListDate:string|null;uploadedAt:string};tickets?:Ticket[]};
const money=(value:number|null)=>value==null?"—":new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value);

export default function PriceTicketWorkspace(){
 const[data,setData]=useState<Payload>({}),[loading,setLoading]=useState(true),[query,setQuery]=useState(""),[selected,setSelected]=useState<Ticket|null>(null),[selectedIds,setSelectedIds]=useState<Set<string>>(new Set()),[error,setError]=useState("");
 const load=async()=>{setLoading(true);setError("");try{const response=await fetch("/api/price-ticket",{cache:"no-store"}),body=await response.json() as Payload;if(!response.ok)throw new Error(body.error||"Price Ticket gagal dimuat.");setData(body)}catch(e){setError(e instanceof Error?e.message:"Price Ticket gagal dimuat.")}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 const tickets=useMemo(()=>{const needle=query.trim().toLowerCase();return(data.tickets||[]).filter(item=>!needle||`${item.title} ${item.subtitle}`.toLowerCase().includes(needle))},[data.tickets,query]);
 const pdf=(ticket:Ticket,download=false)=>`/api/price-ticket/${ticket.id}/pdf${download?"?download=1":""}`;
 const docx=(ticket:Ticket)=>`/api/price-ticket/${ticket.id}/docx`;
 const download=(ticket:Ticket)=>{const anchor=document.createElement("a");anchor.href=docx(ticket);anchor.download=`${ticket.id}.docx`;document.body.append(anchor);anchor.click();anchor.remove()};
 const print=(ticket:Ticket)=>window.open(pdf(ticket),"_blank","noopener,noreferrer");
 const printable=tickets.filter(item=>item.status==="CURRENT"),chosen=(data.tickets||[]).filter(item=>selectedIds.has(item.id));
 const toggle=(ticket:Ticket)=>{if(ticket.status!=="CURRENT")return;setSelectedIds(current=>{const next=new Set(current);if(next.has(ticket.id))next.delete(ticket.id);else next.add(ticket.id);return next})};
 const selectAll=()=>setSelectedIds(new Set(printable.map(item=>item.id)));
 const printMultiple=()=>{if(!chosen.length)return;window.open(`/api/price-ticket/batch?ids=${encodeURIComponent(chosen.map(item=>item.id).join(","))}`,"_blank","noopener,noreferrer")};
 return <main className={styles.shell}>
  <header className={styles.header}><a href="/" className={styles.back}><ArrowLeft size={20}/> Dashboard</a><div><p>Digimap PIM 2</p><h1>Price Ticket</h1><span>Master DOCX asli · sinkron harga otomatis</span></div><button type="button" onClick={()=>void load()} disabled={loading} aria-label="Muat ulang"><RefreshCw size={20} className={loading?styles.spin:""}/></button></header>
  <section className={styles.source}><FileCheck2 size={22}/><div><strong>{data.source?.fileName||"Pricelist Device existing"}</strong><span>{data.source?.priceListDate?`Sumber harga aktif ${data.source.priceListDate}`:"Menunggu sumber harga aktif"}</span></div></section>
  <section className={styles.rules}><strong>Original Format Preservation</strong><p>Sistem hanya mengganti nominal yang berubah. Nama produk, spesifikasi, susunan, font, tabel, disclaimer, dan ukuran cetak tidak disentuh.</p></section>
  <label className={styles.search}><Search size={20}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Cari master Price Ticket…"/></label>
  {!loading&&!error?<section className={styles.batch}><div><strong>Print multiple</strong><span>{selectedIds.size?`${selectedIds.size} Price Ticket dipilih`:"Pilih beberapa Price Ticket untuk dijadikan satu file cetak"}</span></div><button type="button" onClick={selectAll} disabled={!printable.length}><CheckSquare2 size={17}/>Pilih semua</button>{selectedIds.size?<button type="button" onClick={()=>setSelectedIds(new Set())}><X size={17}/>Batal</button>:null}<button type="button" className={styles.batchPrint} onClick={printMultiple} disabled={!chosen.length}><Printer size={18}/>Print pilihan ({chosen.length})</button></section>:null}
  {error?<div className={styles.error}><ShieldAlert size={21}/><span>{error}</span></div>:null}
  {loading?<div className={styles.loading}>Memeriksa harga dari Pricelist aktif…</div>:<section className={styles.grid}>{tickets.map(ticket=><article className={styles.card} key={ticket.id} data-selected={selectedIds.has(ticket.id)}>
    <div className={styles.preview}><img src={`/price-tickets/preview/${ticket.previewFile}`} alt={`Preview ${ticket.title}`}/><button type="button" className={styles.pick} disabled={ticket.status!=="CURRENT"} onClick={()=>toggle(ticket)} aria-label={`${selectedIds.has(ticket.id)?"Batalkan":"Pilih"} ${ticket.title}`}>{selectedIds.has(ticket.id)?<CheckSquare2/>:<Square/>}</button><span data-status={ticket.status}>{ticket.status==="BLOCKED"?"Perlu diperiksa":ticket.status==="CHANGED"?`${ticket.changedCount} harga berubah`:"Harga sesuai"}</span></div>
    <div className={styles.cardBody}><h2>{ticket.title}</h2><p>{ticket.subtitle}</p>{ticket.warningCount?<small>{ticket.warningCount} konfigurasi belum aman untuk diterbitkan.</small>:<small>{ticket.changedCount?"Nominal baru siap diterapkan pada posisi asli.":"Tidak ada nominal yang perlu diubah."}</small>}
      <div className={styles.actions}><button type="button" onClick={()=>setSelected(ticket)}><Eye size={17}/>Preview</button><button type="button" disabled={ticket.status==="BLOCKED"} onClick={()=>download(ticket)}><Download size={17}/>Word</button><button type="button" disabled={ticket.status==="BLOCKED"||ticket.status==="CHANGED"} onClick={()=>print(ticket)}><Printer size={17}/>Print PDF</button></div>
    </div>
  </article>)}</section>}
  {selected?<div className={styles.modal} role="dialog" aria-modal="true" aria-label={`Preview ${selected.title}`}><div className={styles.modalCard}><header><div><strong>{selected.title}</strong><span>{selected.status==="CURRENT"?"Preview PDF master asli":"Preview master asli · nominal baru tersedia di Word"}</span></div><button type="button" aria-label="Tutup" onClick={()=>setSelected(null)}><X size={22}/></button></header>
    <div className={styles.modalPreview}>{selected.status!=="CURRENT"?<img src={`/price-tickets/preview/${selected.previewFile}`} alt={selected.title}/>:<PriceTicketPdfPreview src={pdf(selected)} title={selected.title}/>}</div>
    <section className={styles.changes}><h3>Pemeriksaan nominal</h3>{selected.slots.map(slot=><div key={slot.id} data-state={slot.status}><span><b>{slot.label}</b><small>{slot.status==="MISSING"?"SKU tidak ditemukan":slot.status==="CONFLICT"?"Harga konflik":slot.status==="CHANGED"?"Harga berubah":"Tidak berubah"}</small></span><span>{money(slot.oldFullPrice)}{slot.status==="CHANGED"?<><em>→</em><strong>{money(slot.currentFullPrice)}</strong></>:null}</span></div>)}</section>
    <footer><button type="button" disabled={selected.status==="BLOCKED"} onClick={()=>download(selected)}><Download size={18}/>Download Word (Format Asli)</button><button type="button" disabled={selected.status!=="CURRENT"} onClick={()=>print(selected)}><Printer size={18}/>Print PDF 100% Actual Size</button></footer>
  </div></div>:null}
 </main>
}
