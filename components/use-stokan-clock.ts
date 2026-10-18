"use client";
import {useEffect,useState} from "react";
import {currentStokanContext} from "@/lib/stokan-context";

export function useStokanClock(){
 const[clock,setClock]=useState(()=>currentStokanContext());
 useEffect(()=>{
  const update=()=>setClock(current=>{
   const next=currentStokanContext();return next.stockDate===current.stockDate?current:next;
  });
  const timer=setInterval(update,30_000);
  if(typeof document!=="undefined")document.addEventListener("visibilitychange",update);
  return()=>{clearInterval(timer);if(typeof document!=="undefined")document.removeEventListener("visibilitychange",update)};
 },[]);
 return clock;
}
