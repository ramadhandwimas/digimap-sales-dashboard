"use client";
import {useEffect,useMemo,useState} from "react";
import {ArrowLeft,Download,Eye,FileCheck2,Printer,RefreshCw,Search,ShieldAlert,X} from "lucide-react";
import styles from "@/app/price-ticket/price-ticket.module.css";

type Slot={id:string;label:string;oldFullPrice:number;currentFullPrice:number|null;status:"CURRENT"|"CHANGED"|"MISSING"|"CONFLICT";articles:string[]};
type Ticket={id:string;title:string;subtitle:string;previewFile:string;status:"CURRENT"|"CHANGED"|"BLOCKED";changedCount:number;warningCount:number;slots:Slot[]};
type Payload={ok?:boolean;error?:string;source?:{fileName:string;priceListDate:string|null;uploadedAt:string};tickets?:Ticket[]};
const money=(value:number|null)=>value==null?"—":new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value);

export default function PriceTicketWorkspace(){
 const[data,setData]=useState<Payload>({}),[loading,setLoading]=useState(true),[query,setQuery]=useState(""),[selected,setSelected]=useState<Ticket|null>(null),[error,setError]=useState("");
 const load=async()=>{setLoading(true);setError("");try{const response=await fetch("/api/price-ticket",{cache:"no-store"}),body=await response.json() as Payload;if(!response.ok)throw new Error(body.error||"Price Ticket gagal dimuat.");setData(body)}catch(e){setError(e instanceof Error?e.message:"Price Ticket gagal dimuat.")}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 const tickets=useMemo(()=>{const needle=query.trim().toLowerCase();return(data.tickets||[]).filter(item=>!needle||`${item.title} ${item.subtitle}`.toLowerCase().includes(needle))},[data.tickets,query]);
 const pdf=(ticket:Ticket,download=false)=>`/api/price-ticket/${ticket.id}/pdf${download?"?download=1":""}`;
 const download=(ticket:Ticket)=>{const anchor=document.createElement("a");anchor.href=pdf(ticket,true);anchor.download=`${ticket.id}.pdf`;document.body.append(anchor);anchor.click();anchor.remove()};
 const print=(ticket:Ticket)=>window.open(pdf(ticket),"_blank","noopener,noreferrer");
 return <main className={styles.shell}>
  <header className={styles.header}><a href="/" className={styles.back}><ArrowLeft size={20}/> Dashboard</a><div><p>Digimap PIM 2</p><h1>Price Ticket</h1><span>Master DOCX asli · sinkron harga otomatis</span></div><button type="button" onClick={()=>void load()} disabled={loading} aria-label="Muat ulang"><RefreshCw size={20} className={loading?styles.spin:""}/></button></header>
  <section className={styles.source}><FileCheck2 size={22}/><div><strong>{data.source?.fileName||"Pricelist Device existing"}</strong><span>{data.source?.priceListDate?`Sumber harga aktif ${data.source.priceListDate}`:"Menunggu sumber harga aktif"}</span></div></section>
  <section className={styles.rules}><strong>Original Format Preservation</strong><p>Sistem hanya mengganti nominal yang berubah. Nama produk, spesifikasi, susunan, font, tabel, disclaimer, dan ukuran cetak tidak disentuh.</p></section>
  <label className={styles.search}><Search size={20}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Cari master Price Ticket…"/></label>
  {error?<div className={styles.error}><ShieldAlert size={21}/><span>{error}</span></div>:null}
  {loading?<div className={styles.loading}>Memeriksa harga dari Pricelist aktif…</div>:<section className={styles.grid}>{tickets.map(ticket=><article className={styles.card} key={ticket.id}>
    <div className={styles.preview}><img src={`/price-tickets/preview/${ticket.previewFile}`} alt={`Preview ${ticket.title}`}/><span data-status={ticket.status}>{ticket.status==="BLOCKED"?"Perlu diperiksa":ticket.status==="CHANGED"?`${ticket.changedCount} harga berubah`:"Harga sesuai"}</span></div>
    <div className={styles.cardBody}><h2>{ticket.title}</h2><p>{ticket.subtitle}</p>{ticket.warningCount?<small>{ticket.warningCount} konfigurasi belum aman untuk diterbitkan.</small>:<small>{ticket.changedCount?"Nominal baru siap diterapkan pada posisi asli.":"Tidak ada nominal yang perlu diubah."}</small>}
      <div className={styles.actions}><button type="button" onClick={()=>setSelected(ticket)}><Eye size={17}/>Preview</button><button type="button" disabled={ticket.status==="BLOCKED"} onClick={()=>download(ticket)}><Download size={17}/>PDF</button><button type="button" disabled={ticket.status==="BLOCKED"} onClick={()=>print(ticket)}><Printer size={17}/>Print</button></div>
    </div>
  </article>)}</section>}
  {selected?<div className={styles.modal} role="dialog" aria-modal="true" aria-label={`Preview ${selected.title}`}><div className={styles.modalCard}><header><div><strong>{selected.title}</strong><span>{selected.status==="BLOCKED"?"Master asli · hasil update diblokir":"Preview PDF hasil sinkronisasi"}</span></div><button type="button" aria-label="Tutup" onClick={()=>setSelected(null)}><X size={22}/></button></header>
    <div className={styles.modalPreview}>{selected.status==="BLOCKED"?<img src={`/price-tickets/preview/${selected.previewFile}`} alt={selected.title}/>:<iframe src={pdf(selected)} title={`PDF ${selected.title}`}/>}</div>
    <section className={styles.changes}><h3>Pemeriksaan nominal</h3>{selected.slots.map(slot=><div key={slot.id} data-state={slot.status}><span><b>{slot.label}</b><small>{slot.status==="MISSING"?"SKU tidak ditemukan":slot.status==="CONFLICT"?"Harga konflik":slot.status==="CHANGED"?"Harga berubah":"Tidak berubah"}</small></span><span>{money(slot.oldFullPrice)}{slot.status==="CHANGED"?<><em>→</em><strong>{money(slot.currentFullPrice)}</strong></>:null}</span></div>)}</section>
    <footer><button type="button" disabled={selected.status==="BLOCKED"} onClick={()=>download(selected)}><Download size={18}/>Download PDF</button><button type="button" disabled={selected.status==="BLOCKED"} onClick={()=>print(selected)}><Printer size={18}/>Print 100% Actual Size</button></footer>
  </div></div>:null}
 </main>
}
