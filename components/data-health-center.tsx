"use client";
import {useCallback,useEffect,useState} from "react";
import {AlertTriangle,CheckCircle2,ChevronRight,Clock3,Database,RefreshCw,XCircle} from "lucide-react";

type Status="healthy"|"warning"|"critical";
type Check={id:string;label:string;status:Status;updatedAt:string|null;total:number;issues:number;summary:string;detail:string;action:string};
type Health={summary:{healthy:number;warning:number;critical:number;issues:number};checks:Check[];generatedAt:string};

function dateLabel(value:string|null){
 if(!value)return"Belum ada waktu update";
 const normalized=/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value}T00:00:00+07:00`:value;
 const date=new Date(normalized);if(Number.isNaN(date.getTime()))return value;
 return new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:/T/.test(normalized)?"short":undefined,timeZone:"Asia/Jakarta"}).format(date);
}
const meta:Record<Status,{label:string;Icon:typeof CheckCircle2}>={healthy:{label:"Normal",Icon:CheckCircle2},warning:{label:"Periksa",Icon:AlertTriangle},critical:{label:"Bermasalah",Icon:XCircle}};

export default function DataHealthCenter({onOpen}:{onOpen:(action:string)=>void}){
 const[data,setData]=useState<Health|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=useCallback(async()=>{setLoading(true);setError("");try{const response=await fetch("/api/data-health?refresh=1",{cache:"no-store"}),json=await response.json();if(!response.ok)throw new Error(json.error||"Pemeriksaan gagal");setData(json)}catch(reason){setError(reason instanceof Error?reason.message:"Pemeriksaan gagal")}finally{setLoading(false)}},[]);
 useEffect(()=>{void load()},[load]);
 if(loading&&!data)return <div className="m238-health-loading" role="status"><RefreshCw className="spin" size={22}/><strong>Memeriksa seluruh sumber data…</strong><span>SPW, Data Copas, Master, SOH, dan Pricelist</span></div>;
 if(error&&!data)return <div className="m238-health-error" role="alert"><XCircle size={24}/><strong>Data Health belum berhasil dibuka</strong><span>{error}</span><button type="button" onClick={()=>void load()}>Coba Lagi</button></div>;
 const total=(data?.summary.healthy||0)+(data?.summary.warning||0)+(data?.summary.critical||0),healthy=data?.summary.healthy||0;
 return <div className="m238-health">
  <section className="m238-health-overview">
   <div className="m238-health-score"><strong>{healthy}/{total}</strong><span>Sumber normal</span></div>
   <div className="m238-health-summary"><strong>{data?.summary.critical?`${data.summary.critical} masalah utama`:data?.summary.warning?`${data.summary.warning} perlu diperiksa`:"Semua sumber normal"}</strong><span>{data?.summary.issues||0} temuan data terdeteksi</span></div>
   <button type="button" aria-label="Periksa ulang" disabled={loading} onClick={()=>void load()}><RefreshCw className={loading?"spin":""} size={18}/></button>
  </section>
  {error?<p className="m238-health-inline-error">{error}</p>:null}
  <div className="m238-health-list">{data?.checks.map(item=>{const{label,Icon}=meta[item.status];return <button type="button" key={item.id} className={`m238-health-card ${item.status}`} onClick={()=>onOpen(item.action)}>
   <span className="m238-health-icon"><Database size={19}/></span>
   <span className="m238-health-copy"><span className="m238-health-card-title"><strong>{item.label}</strong><b><Icon size={13}/>{label}</b></span><span>{item.summary}</span><small>{item.detail}</small><em><Clock3 size={12}/>{dateLabel(item.updatedAt)}</em></span>
   <ChevronRight size={18}/>
  </button>})}</div>
  <p className="m238-health-note">Ketuk sumber data untuk membuka menu upload atau perbaikannya. Stok 0 ditampilkan sebagai informasi operasional, bukan error sistem.</p>
 </div>;
}
