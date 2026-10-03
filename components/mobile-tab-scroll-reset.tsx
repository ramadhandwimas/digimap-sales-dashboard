"use client";

import {useEffect} from "react";

export default function MobileTabScrollReset(){
  useEffect(()=>{
    const resetScroll=()=>{
      window.scrollTo({top:0,left:0,behavior:"auto"});
      document.documentElement.scrollTop=0;
      document.body.scrollTop=0;
    };
    const onClick=(event:MouseEvent)=>{
      const target=event.target;
      if(!(target instanceof Element))return;
      if(!target.closest(".m238m-bottom button"))return;
      requestAnimationFrame(resetScroll);
    };
    document.addEventListener("click",onClick,true);
    return()=>document.removeEventListener("click",onClick,true);
  },[]);
  return null;
}
