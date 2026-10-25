"use client";

import dynamic from "next/dynamic";
import {useEffect,useState} from "react";
import M238PromoBoardNavigation from "@/components/m238-promo-board-navigation";
import MobilePromoPanel from "@/components/mobile-promo-panel";

const MobileDashboard=dynamic(()=>import("@/components/mobile-dashboard-app"),{ssr:false});
const DesktopDashboard=dynamic(()=>import("@/components/desktop-dashboard-shell"),{ssr:false});

type MobileView="classic"|"new";

export default function ResponsiveDashboardEntry(){
  const[mobile,setMobile]=useState<boolean|null>(null);
  const[mobileView,setMobileView]=useState<MobileView>(()=>{try{if(typeof window!=="undefined"&&localStorage.getItem("m238-mobile-view")==="classic")return "classic"}catch{}return "new"});

  useEffect(()=>{
    const media=window.matchMedia("(max-width: 768px)");
    const sync=()=>setMobile(media.matches);
    sync();
    media.addEventListener?.("change",sync);
    const onChange=(event:Event)=>{
      const value=(event as CustomEvent<MobileView>).detail;
      if(value==="classic"||value==="new"){
        try{localStorage.setItem("m238-mobile-view",value)}catch{}
        setMobileView(value);
      }
    };
    window.addEventListener("m238:mobile-view-change",onChange);
    const onActivity=(event:Event)=>{
      const detail=(event as CustomEvent<{label?:string;title?:string;detail?:string;count?:number;type?:string}>).detail;
      if(!detail?.label&&!detail?.title)return;
      void fetch("/api/activity-history",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(detail),keepalive:true}).catch(()=>undefined);
    };
    window.addEventListener("m238:data-activity",onActivity);
    if("serviceWorker" in navigator)window.setTimeout(()=>navigator.serviceWorker.register("/m238-sw.js",{scope:"/"}).catch(()=>undefined),1200);
    return()=>{
      media.removeEventListener?.("change",sync);
      window.removeEventListener("m238:mobile-view-change",onChange);
      window.removeEventListener("m238:data-activity",onActivity);
    };
  },[]);

  if(mobile===null)return <div className="min-h-[100dvh] bg-[#f2f2f7] dark:bg-black" aria-hidden="true"/>;
  if(!mobile)return <><DesktopDashboard/><M238PromoBoardNavigation/></>;

  if(mobileView==="new")return <><MobileDashboard/><MobilePromoPanel/></>;
  return <><DesktopDashboard/><M238PromoBoardNavigation/></>;
}
