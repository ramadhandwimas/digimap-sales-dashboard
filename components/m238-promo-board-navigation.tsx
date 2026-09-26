"use client";

import {useEffect} from "react";

function label(button:HTMLButtonElement){return(button.dataset.menuLabel||button.querySelector("span:last-child")?.textContent||button.textContent||"").trim()}

function makeButton(base?:HTMLButtonElement|null){
  const button=document.createElement("button");
  button.type="button";
  button.dataset.m238PromoBoardMenu="1";
  button.dataset.menuLabel="Promo Board";
  button.className=base?.className||"flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-bold lg:pl-7";
  button.innerHTML='<span aria-hidden="true">🏷️</span><span>Promo Board</span>';
  button.addEventListener("click",()=>{window.location.href="/promo-board"});
  return button;
}

export default function M238PromoBoardNavigation(){
  useEffect(()=>{
    const inject=()=>{
      const nav=document.querySelector("aside nav");
      if(!nav||nav.querySelector("[data-m238-promo-board-menu]"))return;
      const adminHeader=Array.from(nav.querySelectorAll<HTMLButtonElement>("button")).find(b=>label(b)==="Administrasi");
      const adminGroup=adminHeader?.closest("div.rounded-xl")||nav.querySelector("[data-administration-group]");
      if(!adminGroup)return;
      const list=Array.from(adminGroup.querySelectorAll<HTMLElement>("div")).find(el=>Array.from(el.children).some(child=>child.tagName==="BUTTON"))||adminGroup;
      const upload=Array.from(adminGroup.querySelectorAll<HTMLButtonElement>("button")).find(b=>label(b)==="Data Upload");
      const sample=upload||Array.from(adminGroup.querySelectorAll<HTMLButtonElement>("button")).find(b=>label(b)!=="Administrasi");
      const button=makeButton(sample);
      if(upload&&upload.parentElement===list)list.insertBefore(button,upload);else list.appendChild(button);
    };
    inject();
    const observer=new MutationObserver(()=>requestAnimationFrame(inject));
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);
  return null;
}
