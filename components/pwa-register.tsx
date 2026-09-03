"use client";
import {useEffect} from "react";

export default function PwaRegister(){
  useEffect(()=>{
    if(!("serviceWorker" in navigator))return;
    let timer:number|undefined;
    let idleId:number|undefined;
    const register=()=>navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"}).catch(()=>undefined);
    const schedule=()=>{
      if("requestIdleCallback" in window){
        idleId=(window as Window & {requestIdleCallback:(cb:()=>void,opts?:{timeout:number})=>number}).requestIdleCallback(()=>void register(),{timeout:5000});
      }else{
        timer=window.setTimeout(()=>void register(),2500);
      }
    };
    if(document.readyState==="complete")schedule();
    else window.addEventListener("load",schedule,{once:true});
    return()=>{
      window.removeEventListener("load",schedule);
      if(timer)window.clearTimeout(timer);
      if(idleId&&"cancelIdleCallback" in window)(window as Window & {cancelIdleCallback:(id:number)=>void}).cancelIdleCallback(idleId);
    };
  },[]);
  return null;
}
