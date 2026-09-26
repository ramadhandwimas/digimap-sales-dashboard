"use client";

import dynamic from "next/dynamic";
import {useEffect,useState} from "react";
import M238PromoBoardNavigation from "@/components/m238-promo-board-navigation";

const MobileDashboard=dynamic(()=>import("@/components/mobile-dashboard-app"),{ssr:false});
const DesktopDashboard=dynamic(()=>import("@/components/desktop-dashboard-shell"),{ssr:false});

type MobileView="classic"|"new";

export default function ResponsiveDashboardEntry(){
  const[mobile,setMobile]=useState<boolean|null>(null);
  const[mobileView,setMobileView]=useState<MobileView>("new");

  useEffect(()=>{
    const media=window.matchMedia("(max-width: 768px)");
    const sync=()=>setMobile(media.matches);
    sync();
    media.addEventListener?.("change",sync);
    const saved=localStorage.getItem("m238-mobile-view");
    if(saved==="classic"||saved==="new")setMobileView(saved);
    const onChange=(event:Event)=>{
      const value=(event as CustomEvent<MobileView>).detail;
      if(value==="classic"||value==="new"){
        localStorage.setItem("m238-mobile-view",value);
        setMobileView(value);
      }
    };
    window.addEventListener("m238:mobile-view-change",onChange);
    if("serviceWorker" in navigator)window.setTimeout(()=>navigator.serviceWorker.register("/m238-sw.js",{scope:"/"}).catch(()=>undefined),1200);
    return()=>{
      media.removeEventListener?.("change",sync);
      window.removeEventListener("m238:mobile-view-change",onChange);
    };
  },[]);

  if(mobile===null)return <div className="min-h-[100dvh] bg-[#f2f2f7] dark:bg-black" aria-hidden="true"/>;
  if(!mobile)return <><DesktopDashboard/><M238PromoBoardNavigation/></>;
  if(mobileView==="new")return <><MobileDashboard/><M238PromoBoardNavigation/></>;

  return <div className="relative min-h-[100dvh]">
    <DesktopDashboard/>
    <M238PromoBoardNavigation/>
    <button
      type="button"
      onClick={()=>window.dispatchEvent(new CustomEvent("m238:mobile-view-change",{detail:"new"}))}
      className="fixed right-3 z-[99999] rounded-full border border-white/20 bg-slate-950/90 px-3 py-2 text-[11px] font-black text-white shadow-xl backdrop-blur-xl"
      style={{top:"calc(env(safe-area-inset-top) + 10px)"}}
      aria-label="Ganti ke tampilan HP baru"
    >
      HP Baru
    </button>
  </div>;
}
