"use client";

import {useEffect,useState} from "react";
import PromoBoardV9 from "@/components/promo-board-v9";

const OPEN_EVENT="m238:promo-open";
const CLOSE_EVENT="m238:promo-close";

export default function MobilePromoPanel(){
  const[open,setOpen]=useState(false);
  const[mounted,setMounted]=useState(false);

  useEffect(()=>{
    const timer=window.setTimeout(()=>setMounted(true),350);
    const onOpen=()=>{setMounted(true);setOpen(true)};
    const onClose=()=>setOpen(false);
    window.addEventListener(OPEN_EVENT,onOpen);
    window.addEventListener(CLOSE_EVENT,onClose);
    return()=>{
      window.clearTimeout(timer);
      window.removeEventListener(OPEN_EVENT,onOpen);
      window.removeEventListener(CLOSE_EVENT,onClose);
    };
  },[]);

  useEffect(()=>{
    if(!open)return;
    const previousOverflow=document.body.style.overflow;
    const previousOverscroll=document.body.style.overscrollBehavior;
    document.body.style.overflow="hidden";
    document.body.style.overscrollBehavior="none";
    document.documentElement.dataset.m238PromoOpen="1";
    return()=>{
      document.body.style.overflow=previousOverflow;
      document.body.style.overscrollBehavior=previousOverscroll;
      delete document.documentElement.dataset.m238PromoOpen;
    };
  },[open]);

  if(!mounted)return null;

  return <div
    className={`fixed inset-0 z-[9000] overflow-y-auto bg-slate-50 transition-opacity duration-150 dark:bg-slate-900 ${open?"pointer-events-auto opacity-100":"pointer-events-none opacity-0"}`}
    aria-hidden={!open}
  >
    <style>{`
      .m238-mobile-promo-panel > main > div > .sticky:first-child a{display:none!important}
      .m238-mobile-promo-panel > main{min-height:100dvh!important;padding-bottom:calc(118px + env(safe-area-inset-bottom))!important;background:#f8fafc!important}
      .dark .m238-mobile-promo-panel > main{background:#0f172a!important}
      .m238-mobile-promo-panel > main > div{padding-top:8px!important}
    `}</style>
    <div className="m238-mobile-promo-panel min-h-[100dvh] bg-slate-50 dark:bg-slate-900">
      <PromoBoardV9 />
    </div>
  </div>;
}
