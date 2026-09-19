"use client";

import dynamic from "next/dynamic";
import {useEffect,useState} from "react";

const MobileDashboard=dynamic(()=>import("@/components/mobile-dashboard-app"),{ssr:false});
const DesktopDashboard=dynamic(()=>import("@/components/desktop-dashboard-shell"),{ssr:false});

export default function ResponsiveDashboardEntry(){
  const[mobile,setMobile]=useState<boolean|null>(null);
  useEffect(()=>{
    const media=window.matchMedia("(max-width: 768px)");
    const sync=()=>setMobile(media.matches);
    sync();
    media.addEventListener?.("change",sync);
    return()=>media.removeEventListener?.("change",sync);
  },[]);
  if(mobile===null)return <div className="min-h-[100dvh] bg-[#f2f2f7] dark:bg-black" aria-hidden="true"/>;
  return mobile?<MobileDashboard/>:<DesktopDashboard/>;
}
