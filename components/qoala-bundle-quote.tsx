"use client";
import {useState} from "react";
import {qoala24Quote} from "@/lib/qoala-24";
const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
export default function QoalaBundleQuote({price,lob,detail=false}:{price:number;lob:string;detail?:boolean}){
 const [include,setInclude]=useState(true);
 const eligible=["iPhone","Mac","iPad","Watch"].includes(lob),quote=eligible?qoala24Quote(price):null,combined=Boolean(include&&quote),total=combined?quote!.total:price;
 return <div className="pb-quote">
  {quote?<div className="pb-package" role="group" aria-label="Pilihan paket device"><button type="button" aria-pressed={!include} onClick={()=>setInclude(false)}>Device saja</button><button type="button" aria-pressed={include} onClick={()=>setInclude(true)}>+ Qoala 24 bulan</button></div>:null}
  {combined&&quote?<div className="pb-breakdown"><div><span>Harga device</span><b>{money.format(price)}</b></div><div><span>Qoala {quote.name} · 24 bulan</span><b>{money.format(quote.premium)}</b></div>{detail?<p>Tier device {money.format(quote.min)}–{money.format(quote.max)}</p>:null}</div>:null}
  <div className="pb-quote-total"><p>{combined?"Total device + Qoala":"Harga device"}</p><strong>{price>0?money.format(total):"—"}</strong></div>
  {eligible&&price>0&&!quote?<p className="pb-quote-note">Tier Qoala 24 bulan belum tersedia untuk harga ini.</p>:null}
  <div className="pb-installments">{[12,24].map(months=><div key={months}><p>Cicilan {months} bulan</p><b>{total>0?money.format(Math.round(total/months)):"—"}<small> /bln</small></b></div>)}</div>
  <p className="pb-quote-note">Estimasi 0%. Mengikuti ketentuan bank.</p>
  {detail?<p className="pb-quote-note">{combined?"Proteksi Qoala reguler 24 bulan. ":""}Estimasi belum termasuk bunga atau biaya admin jika ada. Kelayakan proteksi, penggabungan pembayaran, dan tenor mengikuti ketentuan Qoala serta bank/pembiayaan.</p>:null}
 </div>;
}
