"use client";

import {useEffect} from "react";

const NAV_SELECTOR=".m238m-bottom";
const FIX_ATTR="data-m238-viewport-fixed";

function safeAreaBottom(){
  const probe=document.createElement("div");
  probe.style.cssText="position:fixed;left:-9999px;bottom:0;padding-bottom:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const value=parseFloat(getComputedStyle(probe).paddingBottom)||0;
  probe.remove();
  return value;
}

export default function MobileNavigationViewportFix(){
  useEffect(()=>{
    let raf=0;
    let nav:HTMLElement|null=null;
    let observer:MutationObserver|null=null;
    const safeBottom=safeAreaBottom();

    const resolveNav=()=>{
      const next=document.querySelector<HTMLElement>(NAV_SELECTOR);
      if(next!==nav){
        if(nav){nav.style.removeProperty("translate");nav.removeAttribute(FIX_ATTR)}
        nav=next;
      }
      return nav;
    };

    const sync=()=>{
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        const el=resolveNav();
        if(!el)return;

        // Measure without our correction first. On iOS/in-app browsers a fixed
        // element can occasionally behave like it is attached to a shorter
        // containing block, leaving the navigation floating in the page.
        el.style.removeProperty("translate");
        const rect=el.getBoundingClientRect();
        const vv=window.visualViewport;
        const viewportBottom=vv?vv.offsetTop+vv.height:window.innerHeight;
        const targetBottom=viewportBottom-10-safeBottom;
        const delta=Math.round(targetBottom-rect.bottom);

        // Normal browsers are already aligned. Only compensate when the nav is
        // clearly detached from the visible bottom, avoiding needless jitter.
        if(Math.abs(delta)>18){
          el.style.setProperty("translate",`0 ${delta}px`,"important");
          el.setAttribute(FIX_ATTR,"1");
        }else{
          el.removeAttribute(FIX_ATTR);
        }
      });
    };

    observer=new MutationObserver(sync);
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener("scroll",sync,{passive:true});
    window.addEventListener("resize",sync,{passive:true});
    window.visualViewport?.addEventListener("resize",sync,{passive:true});
    window.visualViewport?.addEventListener("scroll",sync,{passive:true});
    sync();

    return()=>{
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener("scroll",sync);
      window.removeEventListener("resize",sync);
      window.visualViewport?.removeEventListener("resize",sync);
      window.visualViewport?.removeEventListener("scroll",sync);
      if(nav){nav.style.removeProperty("translate");nav.removeAttribute(FIX_ATTR)}
    };
  },[]);

  return null;
}
