"use client";
import {useEffect} from "react";

const plans:Record<string,string>={
 "AirPods":"Maksimalkan AirPods Try On dengan benefit voucher Rp250.000, pastikan promo disampaikan sebelum closing, cek stok tipe yang turun, dan dorong attachment AirPods pada setiap penjualan device yang relevan.",
 "MacBook":"Maksimalkan MacBook Try On dengan benefit voucher Rp600.000, demo sesuai kebutuhan kerja atau kuliah customer, follow-up seluruh opportunity, dan fokuskan stok serta demo pada type yang menjadi Product Focus weekly.",
 "iPad":"Maksimalkan iPad Try On dengan benefit voucher Rp600.000, demo use case sesuai kebutuhan customer, tawarkan Pencil/keyboard yang relevan, dan fokuskan follow-up pada type Product Focus weekly.",
 "Watch":"Perkuat demo fitur health, fitness, safety dan kebutuhan gift, cek stok size/color yang paling dicari, manfaatkan promo aktif, dan follow-up customer potensial dari week berjalan.",
 "iPhone":"Untuk customer yang mempertimbangkan menunggu iPhone 18, gali kebutuhan penggunaan dan urgensi secara relevan tanpa hard selling. Fokuskan value iPhone yang tersedia sekarang melalui stok siap pakai, promo/BNPL/Trade-In yang berjalan, kebutuhan upgrade aktual, dan lakukan follow-up terjadwal bila customer tetap memilih menunggu. Tetap prioritaskan type iPhone yang menjadi Product Focus weekly.",
};

export default function WeeklyCopyEnhancer(){
 useEffect(()=>{
  let scheduled=false;
  const enhance=()=>{
   scheduled=false;
   const reason=[...document.querySelectorAll("h3")].find(x=>x.textContent?.trim()==="Reason Weekly per LOB");
   if(!reason)return;
   const wrap=reason.parentElement;if(!wrap)return;
   const desc=reason.nextElementSibling as HTMLElement|null;
   const wanted="Review dibuat dari hasil compare, target, pergerakan type, Product Focus Weekly, serta feedback staff pada periode week agar reason tetap sesuai kondisi store.";
   if(desc&&desc.textContent!==wanted)desc.textContent=wanted;
   for(const article of wrap.querySelectorAll("article")){
    const name=article.querySelector("h4")?.textContent?.trim()||"";
    const label=[...article.querySelectorAll("b")].find(x=>x.textContent?.trim()==="Action Plan");
    const p=label?.parentElement?.querySelector("p") as HTMLElement|null;
    if(p&&plans[name]&&p.textContent!==plans[name])p.textContent=plans[name];
    const reviewLabel=[...article.querySelectorAll("b")].find(x=>x.textContent?.trim()==="Weekly Review");
    const review=reviewLabel?.parentElement?.querySelector("p") as HTMLElement|null;
    if(review&&!review.querySelector("[data-feedback-note]")){
      const note=document.createElement("span");note.dataset.feedbackNote="1";note.className="mt-2 block text-xs font-semibold text-slate-500";
      note.textContent="Reason juga mempertimbangkan feedback staff pada periode weekly dan kondisi type Product Focus pada Target LOB Weekly.";review.appendChild(note);
    }
   }
  };
  const queue=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(enhance)};
  queue();const obs=new MutationObserver(queue);obs.observe(document.body,{childList:true,subtree:true});
  return()=>obs.disconnect();
 },[]);
 return null;
}
