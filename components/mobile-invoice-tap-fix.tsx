"use client";

import {useEffect} from "react";

/**
 * iOS Safari can occasionally treat the first tap inside the scrollable
 * invoice bottom-sheet as scroll intent and delay/suppress React's click.
 * Promote a clean touch/pen pointer-up to a click for invoice rows only.
 * Mouse behaviour is left untouched.
 */
export default function MobileInvoiceTapFix(){
  useEffect(()=>{
    let active: {button: HTMLButtonElement; x: number; y: number; pointerId: number} | null = null;

    const invoiceButton=(target: EventTarget | null)=>
      target instanceof Element
        ? target.closest<HTMLButtonElement>("button.m238m-invoice-card-button")
        : null;

    const onPointerDown=(event: PointerEvent)=>{
      if(event.pointerType!=="touch"&&event.pointerType!=="pen")return;
      const button=invoiceButton(event.target);
      if(!button)return;
      active={button,x:event.clientX,y:event.clientY,pointerId:event.pointerId};
    };

    const onPointerUp=(event: PointerEvent)=>{
      if(!active||active.pointerId!==event.pointerId)return;
      const {button,x,y}=active;
      active=null;
      const moved=Math.hypot(event.clientX-x,event.clientY-y);
      if(moved>10||!button.isConnected||button.disabled)return;
      event.preventDefault();
      button.click();
    };

    const clear=(event: PointerEvent)=>{
      if(active?.pointerId===event.pointerId)active=null;
    };

    document.addEventListener("pointerdown",onPointerDown,{capture:true,passive:true});
    document.addEventListener("pointerup",onPointerUp,{capture:true,passive:false});
    document.addEventListener("pointercancel",clear,{capture:true,passive:true});
    return()=>{
      document.removeEventListener("pointerdown",onPointerDown,true);
      document.removeEventListener("pointerup",onPointerUp,true);
      document.removeEventListener("pointercancel",clear,true);
    };
  },[]);

  return null;
}
