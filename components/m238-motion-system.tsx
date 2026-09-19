"use client";

import {useEffect, useRef} from "react";

const PAGE_SELECTOR = "main.min-w-0 > div.px-4.pt-6";

export default function M238MotionSystem(){
  const seq=useRef(0);

  useEffect(()=>{
    document.body.classList.add("m238-motion-ready");

    const root=()=>document.querySelector(PAGE_SELECTOR) as HTMLElement|null;
    const visibleStage=()=>{
      const inline=document.querySelector<HTMLElement>("[data-inline-native]");
      if(inline && inline.offsetParent!==null)return inline;
      return root();
    };

    const animateStage=()=>{
      const stage=visibleStage();
      if(!stage)return;
      const id=String(++seq.current);
      stage.dataset.motionSeq=id;
      stage.classList.remove("m238-page-enter");
      void stage.offsetWidth;
      stage.classList.add("m238-page-enter");

      const cards=Array.from(stage.querySelectorAll<HTMLElement>("section[class*='rounded'], article, .m238-soft-card, .m238-subcard"))
        .filter(el=>el.offsetParent!==null).slice(0,8);
      cards.forEach((el,index)=>{
        el.dataset.motionSeen=id;
        el.style.setProperty("--motion-delay", String(Math.min(index*30,120))+"ms");
        el.classList.remove("m238-card-enter");
        void el.offsetWidth;
        el.classList.add("m238-card-enter");
      });

      const table=stage.querySelector<HTMLElement>("table");
      if(table){
        const holder=(table.closest(".overflow-x-auto") as HTMLElement|null)||table;
        holder.classList.remove("m238-table-enter");
        void holder.offsetWidth;
        holder.classList.add("m238-table-enter");
      }
      const chart=stage.querySelector<HTMLElement>(".recharts-wrapper");
      if(chart){
        const holder=(chart.closest("section") as HTMLElement|null)||chart;
        holder.classList.remove("m238-chart-enter");
        void holder.offsetWidth;
        holder.classList.add("m238-chart-enter");
      }
    };

    const navClick=(event:MouseEvent)=>{
      const target=event.target as Element|null;
      const button=target?.closest("aside nav button") as HTMLButtonElement|null;
      if(!button||button.hasAttribute("aria-expanded"))return;
      const stage=visibleStage();
      if(stage){
        stage.classList.add("m238-page-leave");
        window.setTimeout(()=>stage.classList.remove("m238-page-leave"),90);
      }
      window.setTimeout(()=>requestAnimationFrame(animateStage),35);
    };

    const observer=new MutationObserver((mutations)=>{
      if(mutations.some(m=>m.type==="childList"&&(m.addedNodes.length>0||m.removedNodes.length>0))){
        requestAnimationFrame(()=>requestAnimationFrame(animateStage));
      }
    });

    const host=root();
    if(host)observer.observe(host,{childList:true,subtree:true});
    document.addEventListener("click",navClick,true);
    const readyTimer=window.setTimeout(animateStage,60);

    return()=>{
      window.clearTimeout(readyTimer);
      observer.disconnect();
      document.removeEventListener("click",navClick,true);
      document.body.classList.remove("m238-motion-ready");
    };
  },[]);

  return <style jsx global>{`
    :root{
      --motion-fast:120ms;
      --motion-normal:220ms;
      --motion-slow:300ms;
      --ease-standard:cubic-bezier(0.22,1,0.36,1);
      --ease-out:cubic-bezier(0.16,1,0.3,1);
    }
    body.m238-motion-ready .m238-page-enter{animation:m238-page-in var(--motion-normal) var(--ease-standard) both}
    body.m238-motion-ready .m238-page-leave{opacity:.72;transform:translateY(2px);transition:opacity 90ms ease,transform 90ms ease}
    @keyframes m238-page-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    body.m238-motion-ready .m238-card-enter{animation:m238-card-in 260ms var(--ease-out) both;animation-delay:var(--motion-delay,0ms)}
    @keyframes m238-card-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    body.m238-motion-ready .m238-table-enter,body.m238-motion-ready .m238-chart-enter{animation:m238-data-in 200ms var(--ease-out) both}
    @keyframes m238-data-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}

    body.m238-motion-ready .m238-sidebar nav button{position:relative;transition:background-color 180ms ease,color 180ms ease,transform 180ms ease,border-color 180ms ease,box-shadow 180ms ease!important}
    body.m238-motion-ready .m238-sidebar nav button:not([aria-expanded]):hover{transform:translateX(2px)}
    body.m238-motion-ready .m238-sidebar nav button[aria-current="page"]::before,
    body.m238-motion-ready .m238-sidebar nav button[class*="bg-white/20"]::before{
      content:"";position:absolute;left:2px;top:50%;width:3px;height:18px;border-radius:999px;transform:translateY(-50%);background:currentColor;opacity:.9;animation:m238-indicator-in 220ms var(--ease-standard) both
    }
    @keyframes m238-indicator-in{from{opacity:0;transform:translateY(-50%) scaleY(.5)}to{opacity:.9;transform:translateY(-50%) scaleY(1)}}

    body.m238-motion-ready button,body.m238-motion-ready [role="button"]{transition:background-color 150ms ease,border-color 150ms ease,color 150ms ease,transform 120ms ease,box-shadow 150ms ease}
    body.m238-motion-ready button:active,body.m238-motion-ready [role="button"]:active{transform:scale(.98)}
    body.m238-motion-ready tbody tr{transition:background-color 120ms ease}

    body.m238-motion-ready [role="menu"],body.m238-motion-ready [role="listbox"],
    body.m238-motion-ready [data-slot="popover-content"],body.m238-motion-ready [data-slot="dropdown-menu-content"]{
      transform-origin:top center;animation:m238-pop-in 150ms var(--ease-out) both
    }
    @keyframes m238-pop-in{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
    body.m238-motion-ready [data-slot="dialog-overlay"],body.m238-motion-ready [data-radix-dialog-overlay]{animation:m238-overlay-in 180ms ease both}
    body.m238-motion-ready [role="dialog"]{animation:m238-modal-in 200ms var(--ease-out) both}
    @keyframes m238-overlay-in{from{opacity:0}to{opacity:1}}
    @keyframes m238-modal-in{from{opacity:0;transform:translateY(6px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}

    body.m238-motion-ready input,body.m238-motion-ready select,body.m238-motion-ready textarea{transition:background-color 180ms ease,border-color 150ms ease,color 180ms ease,box-shadow 150ms ease}
    html,body.m238-motion-ready,body.m238-motion-ready .m238-main,body.m238-motion-ready .m238-sidebar,body.m238-motion-ready article,body.m238-motion-ready section,body.m238-motion-ready header{
      transition:background-color 200ms ease,color 200ms ease,border-color 200ms ease
    }
    body.m238-motion-ready .m238-main:has(> header .animate-spin)>div[class*="px-4"]{opacity:.72;transition:opacity 150ms ease}

    body.m238-motion-ready .m238-skeleton{position:relative;overflow:hidden;background:color-mix(in srgb,var(--m238-panel-subtle,#e5e7eb) 88%,transparent)}
    body.m238-motion-ready .m238-skeleton::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent);animation:m238-shimmer 1.6s ease-in-out infinite}
    .dark body.m238-motion-ready .m238-skeleton::after{background:linear-gradient(90deg,transparent,rgba(255,255,255,.055),transparent)}
    @keyframes m238-shimmer{100%{transform:translateX(100%)}}

    @media(prefers-reduced-motion:reduce){
      *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}
    }
  `}</style>;
}
