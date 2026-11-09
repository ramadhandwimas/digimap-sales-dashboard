"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";
let clientId="",inflight=false,lastVisibleAt=0;
export default function DashboardPresenceTracker(){
 const path=usePathname();
 useEffect(()=>{
  if(path==="/login"){clientId="";lastVisibleAt=0;return}if(!clientId)clientId=crypto.randomUUID();let stopped=false;
  const send=async(visible:boolean)=>{if(stopped)return;if(visible&&(inflight||Date.now()-lastVisibleAt<45_000))return;
   if(visible)inflight=true;
   try{const r=await fetch("/api/dashboard-presence",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({clientId,visible,page:path}),cache:"no-store",keepalive:!visible});if(visible&&r.ok)lastVisibleAt=Date.now()}catch{}finally{if(visible)inflight=false}
  };
  const visibility=()=>{if(document.visibilityState==="visible"){lastVisibleAt=0;void send(true)}else void send(false)},leave=()=>void send(false);
  void send(document.visibilityState==="visible");const timer=setInterval(()=>{if(document.visibilityState==="visible")void send(true)},60_000);
  document.addEventListener("visibilitychange",visibility);window.addEventListener("pagehide",leave);
  return()=>{stopped=true;clearInterval(timer);document.removeEventListener("visibilitychange",visibility);window.removeEventListener("pagehide",leave)};
 },[path]);return null;
}
