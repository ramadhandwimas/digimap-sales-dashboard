"use client";
import {useEffect} from "react";

export default function PwaRegister(){
  useEffect(()=>{
    if(!("serviceWorker" in navigator))return;

    let timer:ReturnType<typeof setTimeout>|undefined;

    const register=()=>{
      void navigator.serviceWorker
        .register("/sw.js",{scope:"/",updateViaCache:"none"})
        .catch(()=>undefined);
    };

    const schedule=()=>{
      timer=setTimeout(register,2500);
    };

    if(document.readyState==="complete")schedule();
    else window.addEventListener("load",schedule,{once:true});

    return()=>{
      window.removeEventListener("load",schedule);
      if(timer)clearTimeout(timer);
    };
  },[]);

  return null;
}
