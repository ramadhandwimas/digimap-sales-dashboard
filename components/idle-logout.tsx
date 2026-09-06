"use client";

import {useEffect} from "react";

const IDLE_MS=15*60*1000;

export default function IdleLogout(){
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>;
  const logout=async()=>{
   try{await fetch("/api/auth/logout",{method:"POST",cache:"no-store"})}finally{window.location.assign("/login?reason=idle")}
  };
  const reset=()=>{
   clearTimeout(timer);
   timer=setTimeout(()=>{void logout()},IDLE_MS);
  };
  const events=["pointerdown","keydown","touchstart","scroll","focus"] as const;
  events.forEach(event=>window.addEventListener(event,reset,{passive:true}));
  reset();
  return()=>{
   clearTimeout(timer);
   events.forEach(event=>window.removeEventListener(event,reset));
  };
 },[]);
 return null;
}
