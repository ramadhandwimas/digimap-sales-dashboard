"use client";

import { useEffect, useState } from "react";
import { Menu, MoreVertical } from "lucide-react";

export default function M238AppleUI() {
  const [hidden,setHidden]=useState(false);

  useEffect(()=>{
    const saved=localStorage.getItem("m238-sidebar-hidden")==="1";
    setHidden(saved);
    document.body.classList.add("m238-apple-ui");
    document.body.classList.toggle("m238-sidebar-hidden",saved);

    const toggle=()=>setHidden(current=>{
      const next=!current;
      localStorage.setItem("m238-sidebar-hidden",next?"1":"0");
      document.body.classList.toggle("m238-sidebar-hidden",next);
      return next;
    });
    window.addEventListener("m238-sidebar-toggle",toggle);

    const apply=()=>{
      const aside=document.querySelector("aside") as HTMLElement|null;
      const main=document.querySelector("main") as HTMLElement|null;
      if(!aside||!main)return;
      aside.parentElement?.classList.add("m238-app-shell");
      aside.classList.add("m238-sidebar");
      main.classList.add("m238-main");
      const brand=aside.querySelector(".p-5 > div.flex.items-center.gap-3") as HTMLElement|null;
      if(brand&&!brand.querySelector("[data-m238-sidebar-close]")){
        const btn=document.createElement("button");
        btn.type="button";btn.dataset.m238SidebarClose="1";btn.className="m238-brand-close";btn.title="Tutup menu";btn.setAttribute("aria-label","Tutup menu");
        btn.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>';
        btn.onclick=()=>window.dispatchEvent(new Event("m238-sidebar-toggle"));
        brand.appendChild(btn);
      }
    };
    apply();const mo=new MutationObserver(apply);mo.observe(document.body,{childList:true,subtree:true});
    return()=>{mo.disconnect();window.removeEventListener("m238-sidebar-toggle",toggle);document.body.classList.remove("m238-apple-ui","m238-sidebar-hidden")};
  },[]);

  return <>
    {hidden&&<button type="button" onClick={()=>window.dispatchEvent(new Event("m238-sidebar-toggle"))} className="m238-menu-open" title="Buka menu" aria-label="Buka menu"><Menu className="size-5"/></button>}
    <style jsx global>{`
      body.m238-apple-ui{background:#f5f5f7!important;color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Helvetica Neue",Arial,sans-serif}
      body.m238-apple-ui .m238-app-shell{background:#f5f5f7!important;transition:grid-template-columns .22s ease}
      body.m238-apple-ui .m238-sidebar{background:rgba(255,255,255,.94)!important;color:#1d1d1f!important;border-right:1px solid rgba(0,0,0,.08)!important;box-shadow:8px 0 30px rgba(0,0,0,.035);backdrop-filter:saturate(180%) blur(22px);-webkit-backdrop-filter:saturate(180%) blur(22px);overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.18) transparent}
      body.m238-apple-ui .m238-sidebar>div{min-height:100%;height:auto!important}
      body.m238-apple-ui .m238-sidebar nav{padding-bottom:32px!important}
      body.m238-apple-ui .m238-sidebar [class*="text-white"]{color:#424245!important}
      body.m238-apple-ui .m238-sidebar [class*="border-white"]{border-color:rgba(0,0,0,.08)!important}
      body.m238-apple-ui .m238-sidebar [class*="bg-white/5"]{background:rgba(118,118,128,.07)!important;border-radius:16px!important}
      body.m238-apple-ui .m238-sidebar button{color:#424245!important;border-radius:12px!important;transition:background .18s ease,color .18s ease}
      body.m238-apple-ui .m238-sidebar button:hover{background:rgba(0,113,227,.08)!important;color:#0071e3!important}
      body.m238-apple-ui .m238-sidebar button[aria-current="page"],body.m238-apple-ui .m238-sidebar button[class*="bg-white/20"]{background:#eaf3ff!important;color:#0071e3!important;box-shadow:inset 0 0 0 1px rgba(0,113,227,.08)!important}
      body.m238-apple-ui .m238-sidebar .size-11{background:linear-gradient(145deg,#1d1d1f,#4b4b4f)!important;color:#fff!important;border-radius:14px!important;box-shadow:0 7px 18px rgba(0,0,0,.14)}
      .m238-brand-close{margin-left:auto!important;width:34px;height:34px;display:grid!important;place-items:center!important;border:0!important;background:transparent!important;color:#6e6e73!important;padding:0!important;flex:0 0 auto}
      .m238-brand-close:hover{background:rgba(118,118,128,.08)!important;color:#1d1d1f!important}
      .m238-menu-open{position:fixed;z-index:90;left:14px;top:14px;width:40px;height:40px;display:grid;place-items:center;border:1px solid rgba(0,0,0,.1);border-radius:12px;background:rgba(255,255,255,.92);color:#1d1d1f;box-shadow:0 8px 24px rgba(0,0,0,.10);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
      body.m238-apple-ui .m238-main{background:#f5f5f7!important;min-width:0;width:100%}
      body.m238-apple-ui .m238-main>header{position:sticky;top:0;z-index:45;background:rgba(250,250,252,.84)!important;border-color:rgba(0,0,0,.07)!important;backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px)}
      body.m238-apple-ui .m238-main article,body.m238-apple-ui .m238-main section[class*="rounded-2xl"],body.m238-apple-ui .m238-main section[class*="rounded-3xl"]{border-color:rgba(0,0,0,.07)!important;box-shadow:0 8px 24px rgba(0,0,0,.045)!important}
      body.m238-apple-ui .m238-main h1,body.m238-apple-ui .m238-main h2,body.m238-apple-ui .m238-main h3{letter-spacing:-.025em;color:#1d1d1f}
      body.m238-apple-ui .m238-main table{background:rgba(255,255,255,.97)}
      body.m238-apple-ui .m238-main thead{background:#f5f5f7!important}
      body.m238-apple-ui .m238-main th{color:#6e6e73!important}
      body.m238-apple-ui .m238-main td{color:#1d1d1f}
      body.m238-apple-ui .m238-main tbody tr:hover{background:#f7fbff!important}
      body.m238-apple-ui .m238-main select,body.m238-apple-ui .m238-main input,body.m238-apple-ui .m238-main textarea{border-color:rgba(0,0,0,.12)!important;border-radius:12px!important;background:rgba(255,255,255,.98)!important}
      @media(min-width:1024px){
        body.m238-sidebar-hidden .m238-app-shell{display:block!important;grid-template-columns:none!important}
        body.m238-sidebar-hidden .m238-sidebar{display:none!important}
        body.m238-sidebar-hidden .m238-main{width:100%!important;max-width:none!important;margin:0!important}
        body.m238-sidebar-hidden .m238-main>div[class*="px-4"]{width:100%!important;max-width:none!important;margin:0!important;padding-left:28px!important;padding-right:28px!important}
      }
      @media(max-width:1023px){body.m238-sidebar-hidden .m238-sidebar{display:none!important}.m238-menu-open{top:12px;left:12px}}
      @media(max-width:640px){body.m238-apple-ui .m238-main>div[class*="px-4"]{padding-left:14px!important;padding-right:14px!important}}
      .dark body.m238-apple-ui{background:#000!important}.dark body.m238-apple-ui .m238-main{background:#000!important}.dark body.m238-apple-ui .m238-sidebar{background:rgba(28,28,30,.94)!important;color:#f5f5f7!important}.dark body.m238-apple-ui .m238-sidebar button{color:#f5f5f7!important}.dark body.m238-apple-ui .m238-main h1,.dark body.m238-apple-ui .m238-main h2,.dark body.m238-apple-ui .m238-main h3,.dark body.m238-apple-ui .m238-main td{color:#f5f5f7!important}
    `}</style>
  </>;
}
