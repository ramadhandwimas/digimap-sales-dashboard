"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";

export default function PromoBoardPromoTab(){
  const router=useRouter();
  useEffect(()=>{
    let cleanup=()=>{};
    const mount=()=>{
      const buttons=Array.from(document.querySelectorAll("button"));
      const price=buttons.find(button=>button.textContent?.trim()==="Pricelist");
      const changes=buttons.find(button=>button.textContent?.trim()==="Perubahan");
      const history=buttons.find(button=>button.textContent?.trim()==="Riwayat");
      const bar=price?.parentElement;
      if(!price||!changes||!history||!bar||bar.querySelector('[data-promo-tab="true"]'))return false;
      const promo=document.createElement("button");
      promo.type="button";
      promo.dataset.promoTab="true";
      promo.textContent="Promo";
      promo.className="min-h-10 flex-1 rounded-xl text-xs font-black text-slate-500";
      promo.setAttribute("aria-label","Lihat semua promo aktif");
      promo.addEventListener("click",()=>router.push("/promo-board/promo"));
      bar.insertBefore(promo,changes);
      cleanup=()=>promo.remove();
      return true;
    };
    if(mount())return cleanup;
    const observer=new MutationObserver(()=>{if(mount())observer.disconnect()});
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>{observer.disconnect();cleanup()};
  },[router]);
  return null;
}
