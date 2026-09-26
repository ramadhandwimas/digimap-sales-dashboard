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

  if(!mounted)return null;

  return <div
    className={`fixed inset-x-0 top-0 z-[9000] overflow-y-auto bg-slate-50 transition-opacity duration-150 dark:bg-slate-900 ${open?"pointer-events-auto opacity-100":"pointer-events-none opacity-0"}`}
    style={{bottom:"calc(82px + env(safe-area-inset-bottom))"}}
    aria-hidden={!open}
  >
    <style>{`
      .m238-mobile-promo-panel > main > div > .sticky:first-child a{display:none!important}
      .m238-mobile-promo-panel > main{min-height:100%!important;padding-bottom:24px!important}
      .m238-mobile-promo-panel > main > div{padding-top:8px!important}
    `}</style>
    <div className="m238-mobile-promo-panel min-h-full">
      <PromoBoardV9 />
    </div>
  </div>;
}
