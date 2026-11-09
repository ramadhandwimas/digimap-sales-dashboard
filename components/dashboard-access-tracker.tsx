"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";
let recording=false;
export default function DashboardAccessTracker(){
 const path=usePathname();
 useEffect(()=>{
  if(path==="/login"){try{sessionStorage.removeItem("m238-access-last-recorded")}catch{}return}let stopped=false,inflight=false;
  const record=async()=>{if(stopped||inflight||recording||document.visibilityState!=="visible")return;const key="m238-access-last-recorded";let last=0;try{last=Number(sessionStorage.getItem(key)||0)}catch{}if(Date.now()-last<15*60*1000)return;inflight=true;recording=true;
   try{const r=await fetch("/api/dashboard-access",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({eventId:crypto.randomUUID()}),cache:"no-store"});if(r.ok){try{sessionStorage.setItem(key,String(Date.now()))}catch{}}}catch{}finally{inflight=false;recording=false}
  };
  void record();document.addEventListener("visibilitychange",record);window.addEventListener("focus",record);
  return()=>{stopped=true;document.removeEventListener("visibilitychange",record);window.removeEventListener("focus",record)};
 },[path]);return null;
}
