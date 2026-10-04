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
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};
    document.body.style.overflow="hidden";
    document.body.style.overscrollBehavior="none";
    document.addEventListener("click",closeOnNavigation,true);
    document.addEventListener("keydown",closeOnEscape);
    return()=>{
      document.body.style.overflow=previousOverflow;
      document.body.style.overscrollBehavior=previousOverscroll;
      document.removeEventListener("click",closeOnNavigation,true);
      document.removeEventListener("keydown",closeOnEscape);
    };
  },[open]);

  if(!mounted)return null;

  const closeFromDashboardLink=(event:MouseEvent<HTMLDivElement>)=>{
    const target=event.target as Element|null;
    if(!target?.closest('a[href="/"]'))return;
    event.preventDefault();
    setOpen(false);
  };

  return <div
    className={`fixed inset-0 z-[9000] overflow-y-auto bg-slate-50 transition-opacity duration-150 dark:bg-slate-900 ${open?"pointer-events-auto opacity-100":"pointer-events-none opacity-0"}`}
    aria-hidden={!open}
    inert={!open}
  >
    <style>{`
      .m238-mobile-promo-panel > main{min-height:100%!important;padding-bottom:calc(120px + env(safe-area-inset-bottom))!important}
      .m238-mobile-promo-panel > main > div{padding-top:8px!important}
      /* A Promo Board modal must own the full iPhone viewport. The dashboard
         bottom navigation is hidden only while that modal is open so it can
         never cover filter rows, picker options, detail, or sort actions. */
      body:has(.m238-mobile-promo-panel .fixed.inset-0) .m238m-bottom{
        opacity:0!important;
        pointer-events:none!important;
        visibility:hidden!important;
      }
      .m238-mobile-promo-panel .fixed.inset-0{
        max-height:100dvh!important;
      }
      .m238-mobile-promo-panel .fixed.inset-0 > .flex.h-\[min\(86dvh\,760px\)\]{
        height:min(92dvh,820px)!important;
        max-height:92dvh!important;
      }
    `}</style>
    <div className="m238-mobile-promo-panel min-h-full" onClick={closeFromDashboardLink}>
      <PromoBoardV9 />
    </div>
  </div>;
}
