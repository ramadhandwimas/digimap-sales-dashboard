"use client";
import {useCallback,useEffect,useState} from "react";
import {CheckCircle2,Clock3,History,RefreshCw,XCircle} from "lucide-react";

type Item={timestamp:string;type:string;title:string;detail:string;count:number;actor:string;status:string};
function stamp(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Jakarta"}).format(date)}

export default function ActivityHistory(){
 const[items,setItems]=useState<Item[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=useCallback(async()=>{setLoading(true);setError("");try{const response=await fetch("/api/activity-history",{cache:"no-store"}),data=await response.json();if(!response.ok)throw new Error(data.error||"Riwayat gagal dibaca");setItems(data.items||[])}catch(reason){setError(reason instanceof Error?reason.message:"Riwayat gagal dibaca")}finally{setLoading(false)}},[]);
 useEffect(()=>{void load()},[load]);
 if(loading&&!items.length)return <div className="m238-activity-loading" role="status"><RefreshCw className="spin"/><strong>Memuat riwayat aktivitas…</strong></div>;
 return <div className="m238-activity">
  <div className="m238-activity-toolbar"><div><strong>{items.length} aktivitas terakhir</strong><span>Upload dan perubahan data</span></div><button type="button" disabled={loading} onClick={()=>void load()} aria-label="Perbarui riwayat"><RefreshCw className={loading?"spin":""} size={17}/></button></div>
  {error?<div className="m238-health-inline-error" role="alert">{error}</div>:null}
  <div className="m238-activity-list">{items.map((item,index)=><article key={`${item.timestamp}-${item.title}-${index}`}>
   <span className="m238-activity-icon">{item.status==="SUCCESS"?<CheckCircle2 size={18}/>:<XCircle size={18}/>}</span>
   <div><strong>{item.title}</strong><span>{item.detail||"Aktivitas dashboard"}</span><small><Clock3 size={11}/>{stamp(item.timestamp)} WIB · {item.actor}</small></div>
   {item.count>0?<b>{item.count.toLocaleString("id-ID")}</b>:null}
  </article>)}</div>
  {!items.length&&!error?<div className="m238-activity-empty"><History size={24}/><strong>Belum ada aktivitas</strong><span>Upload dan perbaikan berikutnya akan tercatat di sini.</span></div>:null}
 </div>;
}
