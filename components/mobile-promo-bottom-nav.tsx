"use client";

import {useEffect} from "react";

const BTN_ID="m238-mobile-promo-nav";
const STYLE_ID="m238-mobile-promo-nav-style";
const OPEN_EVENT="m238:promo-open";
const CLOSE_EVENT="m238:promo-close";

function promoIcon(){
  return `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.59 13.41 11 3.83V3H4v7h.83l9.58 9.59a2 2 0 0 0 2.82 0l3.36-3.36a2 2 0 0 0 0-2.82Z"/><path d="M7 6h.01"/></svg>`;
}

export default function MobilePromoBottomNav(){
  useEffect(()=>{
    const ensureStyle=()=>{
      if(document.getElementById(STYLE_ID))return;
      const style=document.createElement("style");
      style.id=STYLE_ID;
      style.textContent=`
        .m238m-bottom[data-promo-nav="1"]{grid-template-columns:repeat(6,minmax(0,1fr))!important;}
        .m238m-bottom[data-promo-nav="1"] button{min-width:0!important;padding-left:2px!important;padding-right:2px!important;}
        .m238m-bottom[data-promo-nav="1"] .m238m-nav-label{font-size:10px!important;white-space:nowrap;}
        #${BTN_ID}.active .m238m-nav-icon,#${BTN_ID}.active .m238m-nav-label{color:#2563eb!important;}
      `;
      document.head.appendChild(style);
    };
    const ensureButton=()=>{
      const nav=document.querySelector<HTMLElement>(".m238m-bottom");
      if(!nav)return;
      nav.dataset.promoNav="1";
      if(document.getElementById(BTN_ID))return;
      const button=document.createElement("button");
      button.id=BTN_ID;
      button.type="button";
      button.setAttribute("aria-label","Promo Board");
      button.innerHTML=`<span class="m238m-nav-icon">${promoIcon()}</span><span class="m238m-nav-label">Promo</span>`;
      button.addEventListener("click",()=>{
        button.classList.add("active");
        window.dispatchEvent(new CustomEvent(OPEN_EVENT));
      });
      const buttons=Array.from(nav.querySelectorAll(":scope > button"));
      const report=buttons.find(el=>el.textContent?.trim().toLowerCase().includes("report"));
      if(report)nav.insertBefore(button,report.nextSibling);
      else nav.appendChild(button);
    };
    const closePromo=()=>document.getElementById(BTN_ID)?.classList.remove("active");
    const onNavClick=(event:Event)=>{
      const target=event.target as Element|null;
      const clicked=target?.closest("button");
      if(clicked&&clicked.id!==BTN_ID&&clicked.closest(".m238m-bottom")){
        closePromo();
        window.dispatchEvent(new CustomEvent(CLOSE_EVENT));
      }
    };
    const onClose=()=>closePromo();
    ensureStyle();
    ensureButton();
    document.addEventListener("click",onNavClick,true);
    window.addEventListener(CLOSE_EVENT,onClose);
    const observer=new MutationObserver(()=>ensureButton());
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>{
      observer.disconnect();
      document.removeEventListener("click",onNavClick,true);
      window.removeEventListener(CLOSE_EVENT,onClose);
      document.getElementById(BTN_ID)?.remove();
      const nav=document.querySelector<HTMLElement>(".m238m-bottom");
      if(nav)delete nav.dataset.promoNav;
      document.getElementById(STYLE_ID)?.remove();
    };
  },[]);
  return null;
}
