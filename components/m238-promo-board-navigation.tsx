"use client";

import {useEffect} from "react";

function label(button:HTMLButtonElement){return(button.dataset.menuLabel||button.querySelector("span:last-child")?.textContent||button.textContent||"").trim()}

function makeDesktopButton(base?:HTMLButtonElement|null){
  const button=document.createElement("button");
  button.type="button";
  button.dataset.m238PromoBoardMenu="1";
  button.dataset.menuLabel="Promo Board";
  button.className=base?.className||"flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-bold lg:pl-7";
  button.innerHTML='<span aria-hidden="true">🏷️</span><span>Promo Board</span>';
  button.addEventListener("click",()=>{window.location.href="/promo-board"});
  return button;
}

function injectDesktop(){
  const nav=document.querySelector("aside nav");
  if(!nav||nav.querySelector("[data-m238-promo-board-menu]"))return;
  const adminHeader=Array.from(nav.querySelectorAll<HTMLButtonElement>("button")).find(b=>label(b)==="Administrasi");
  const adminGroup=adminHeader?.closest("div.rounded-xl")||nav.querySelector("[data-administration-group]");
  if(!adminGroup)return;
  const list=Array.from(adminGroup.querySelectorAll<HTMLElement>("div")).find(el=>Array.from(el.children).some(child=>child.tagName==="BUTTON"))||adminGroup;
  const upload=Array.from(adminGroup.querySelectorAll<HTMLButtonElement>("button")).find(b=>label(b)==="Data Upload");
  const sample=upload||Array.from(adminGroup.querySelectorAll<HTMLButtonElement>("button")).find(b=>label(b)!=="Administrasi");
  const button=makeDesktopButton(sample);
  if(upload&&upload.parentElement===list)list.insertBefore(button,upload);else list.appendChild(button);
}

function injectMobileMore(){
  const list=document.querySelector(".m238m-direct-menu");
  if(!list||list.querySelector("[data-m238-promo-board-mobile-menu]"))return;
  const sample=list.querySelector<HTMLButtonElement>("button:not(.m238m-logout-row)");
  const button=document.createElement("button");
  button.type="button";
  button.dataset.m238PromoBoardMobileMenu="1";
  if(sample?.className)button.className=sample.className;
  button.innerHTML='<span class="m238m-direct-icon" aria-hidden="true">🏷️</span><span class="m238m-direct-copy"><strong>Promo Board</strong><small>Cek promo device & ketersediaan stok</small></span><span aria-hidden="true">›</span>';
  button.addEventListener("click",()=>{window.location.href="/promo-board"});
  const soh=Array.from(list.querySelectorAll<HTMLButtonElement>("button")).find(b=>b.textContent?.trim().startsWith("SOH"));
  if(soh)list.insertBefore(button,soh);else list.prepend(button);
}

export default function M238PromoBoardNavigation(){
  useEffect(()=>{
    const inject=()=>{injectDesktop();injectMobileMore()};
    inject();
    const observer=new MutationObserver(()=>requestAnimationFrame(inject));
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);
  return null;
}
