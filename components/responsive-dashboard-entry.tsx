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
  const[viewBusy,setViewBusy]=useState(false);
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
    if("serviceWorker" in navigator)window.setTimeout(()=>navigator.serviceWorker.register("/m238-sw.js",{scope:"/"}).catch(()=>undefined),1200);
    return()=>{
      media.removeEventListener?.("change",sync);
      window.removeEventListener("m238:mobile-view-change",onChange);
    };
  },[]);

  if(mobile===null)return <div className="min-h-[100dvh] bg-[#f2f2f7] dark:bg-black" aria-hidden="true"/>;
  if(!mobile)return <><DesktopDashboard/><M238PromoBoardNavigation/></>;

  const choose=(value:MobileView)=>{
    if(viewBusy||value===mobileView)return;
    window.dispatchEvent(new CustomEvent("m238:mobile-view-change",{detail:value}));
    window.scrollTo({top:0,behavior:"instant"});
  };
  return <div className="m238-view-host">
    <div className="m238-view-tabs-wrap">
      <div role="tablist" aria-label="Versi tampilan dashboard" className="m238-view-tabs">
        {([["new","Mobile"],["classic","Versi Lama"]] as const).map(([value,label])=><button
          key={value} type="button" role="tab" id={`m238-view-tab-${value}`} aria-selected={mobileView===value} aria-controls="m238-view-panel"
          tabIndex={mobileView===value?0:-1} disabled={viewBusy} onClick={()=>choose(value)}
          onKeyDown={event=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key)||viewBusy)return;event.preventDefault();const next=event.key==="Home"?"new":event.key==="End"?"classic":value==="new"?"classic":"new";choose(next);document.getElementById(`m238-view-tab-${next}`)?.focus()}}
        >{label}</button>)}
      </div>
      {viewBusy?<p role="status" className="sr-only">Tunggu proses data selesai untuk mengganti tampilan.</p>:null}
    </div>
    <div role="tabpanel" id="m238-view-panel" aria-labelledby={`m238-view-tab-${mobileView}`}>
      {mobileView==="new"?<><MobileDashboard onBusyChange={setViewBusy}/><MobilePromoPanel/></>:<><DesktopDashboard/><M238PromoBoardNavigation/></>}
    </div>
  </div>;
}
