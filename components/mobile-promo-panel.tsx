"use client";

import dynamic from "next/dynamic";
import {useEffect,useState,type MouseEvent} from "react";

const PromoBoardV9=dynamic(()=>import("@/components/promo-board-v9"),{
  ssr:false,
  loading:()=> <div className="min-h-[100dvh] bg-slate-50 px-6 py-10 text-sm font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-400">Memuat Promo Board…</div>
});

const OPEN_EVENT="m238:promo-open";
const CLOSE_EVENT="m238:promo-close";

export default function MobilePromoPanel(){
  const[open,setOpen]=useState(false);
  const[mounted,setMounted]=useState(false);

  useEffect(()=>{
    const onOpen=()=>{setMounted(true);setOpen(true)};
    const onClose=()=>setOpen(false);
    window.addEventListener(OPEN_EVENT,onOpen);
    window.addEventListener(CLOSE_EVENT,onClose);
    return()=>{
      window.removeEventListener(OPEN_EVENT,onOpen);
      window.removeEventListener(CLOSE_EVENT,onClose);
    };
  },[]);

  useEffect(()=>{
    if(!open)return;
    const previousOverflow=document.body.style.overflow;
    const previousOverscroll=document.body.style.overscrollBehavior;
    const closeOnNavigation=(event:Event)=>{
      const target=event.target as Element|null;
      if(target?.closest(".m238m-bottom button"))setOpen(false);
    };
    document.body.style.overflow="hidden";
    document.body.style.overscrollBehavior="none";
    document.addEventListener("click",closeOnNavigation,true);
    return()=>{
      document.body.style.overflow=previousOverflow;
      document.body.style.overscrollBehavior=previousOverscroll;
      document.removeEventListener("click",closeOnNavigation,true);
    };
  },[open]);

  if(!mounted)return null;

  const closeFromDashboardLink=(event:MouseEvent<HTMLDivElement>)=>{
    const target=event.target as Element|null;
    if(!target?.closest('a[href="/"]'))return;
    event.preventDefault();
    setOpen(false);
  };

  const openProductDetailOnModelTap=(event:MouseEvent<HTMLDivElement>)=>{
    const target=event.target as Element|null;
    const button=target?.closest("button");
    if(!button)return;
    const label=(button.textContent||"").trim().replace(/\s+/g," ");
    if(label!=="iPhone 17 Pro Max")return;

    // PromoBoardV9 updates the selected model first. Open the existing DetailSheet
    // right after React has rendered the selected product ticket so the experience
    // matches the Overview bottom-sheet interaction.
    window.setTimeout(()=>{
      const detailButton=Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
        .find(el=>(el.textContent||"").trim().replace(/\s+/g," ").startsWith("Lihat Detail"));
      detailButton?.click();
    },80);
  };

  const handlePanelClick=(event:MouseEvent<HTMLDivElement>)=>{
    closeFromDashboardLink(event);
    openProductDetailOnModelTap(event);
  };

  return <div
    className={`fixed inset-x-0 top-0 z-[9000] overflow-y-auto bg-slate-50 transition-opacity duration-150 dark:bg-slate-900 ${open?"pointer-events-auto opacity-100":"pointer-events-none opacity-0"}`}
    style={{bottom:"calc(82px + env(safe-area-inset-bottom))"}}
    aria-hidden={!open}
  >
    <style>{`
      .m238-mobile-promo-panel > main{min-height:100%!important;padding-bottom:24px!important}
      .m238-mobile-promo-panel > main > div{padding-top:8px!important}
    `}</style>
    <div className="m238-mobile-promo-panel min-h-full" onClick={handlePanelClick}>
      <PromoBoardV9 />
    </div>
  </div>;
}
