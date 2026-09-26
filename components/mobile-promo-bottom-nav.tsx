"use client";

import {useEffect} from "react";

const BTN_ID="m238-mobile-promo-nav";
const STYLE_ID="m238-mobile-promo-nav-style";
const NAV_SELECTOR=".m238m-bottom";

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
        .m238m-bottom[data-promo-nav="1"]>button{min-width:0!important;padding-left:2px!important;padding-right:2px!important;}
        .m238m-bottom[data-promo-nav="1"] .m238m-nav-label{font-size:10px!important;white-space:nowrap;}
        #${BTN_ID} .m238m-nav-icon{color:inherit;}
      `;
      document.head.appendChild(style);
    };

    const ensureButton=()=>{
      const nav=document.querySelector<HTMLElement>(NAV_SELECTOR);
      if(!nav)return;
      nav.dataset.promoNav="1";
      if(nav.querySelector(`#${BTN_ID}`))return;

      const button=document.createElement("button");
      button.id=BTN_ID;
      button.type="button";
      button.setAttribute("aria-label","Promo Board");
      button.innerHTML=`<span class="m238m-nav-icon">${promoIcon()}</span><span class="m238m-nav-label">Promo</span>`;
      button.addEventListener("click",()=>{window.location.assign("/promo-board")});

      const buttons=Array.from(nav.querySelectorAll<HTMLButtonElement>(":scope > button"));
      const report=buttons.find(el=>el.textContent?.trim().toLowerCase().includes("report"));
      if(report)nav.insertBefore(button,report.nextSibling);
      else nav.appendChild(button);
    };

    ensureStyle();
    ensureButton();

    const observer=new MutationObserver(()=>ensureButton());
    observer.observe(document.body,{childList:true,subtree:true});

    return()=>{
      observer.disconnect();
      document.getElementById(BTN_ID)?.remove();
      const nav=document.querySelector<HTMLElement>(NAV_SELECTOR);
      if(nav)delete nav.dataset.promoNav;
      document.getElementById(STYLE_ID)?.remove();
    };
  },[]);

  return null;
}
