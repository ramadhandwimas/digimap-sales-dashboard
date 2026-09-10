"use client";

import {useEffect} from "react";

const allowed=new Set(["classic","natural","worklife","happiness","premium"]);

function applySavedTheme(){
 const raw=localStorage.getItem("m238-style")||"worklife";
 const theme=allowed.has(raw)?raw:"worklife";
 document.documentElement.dataset.m238DashboardTheme=theme;
}

export default function M238ThemePersistence(){
 useEffect(()=>{
  applySavedTheme();
  let last=localStorage.getItem("m238-style")||"worklife";
  const sync=()=>{
   const current=localStorage.getItem("m238-style")||"worklife";
   if(current!==last||document.documentElement.dataset.m238DashboardTheme!==current){last=current;applySavedTheme()}
  };
  const timer=window.setInterval(sync,250);
  const onStorage=(e:StorageEvent)=>{if(e.key==="m238-style")sync()};
  window.addEventListener("storage",onStorage);
  return()=>{window.clearInterval(timer);window.removeEventListener("storage",onStorage)};
 },[]);
 return <style jsx global>{`
  html[data-m238-dashboard-theme='classic'] body.m238-apple-ui{--m238-bg:#f8fafc;--m238-accent:#2563eb;--m238-accent-soft:#eff6ff}
  html[data-m238-dashboard-theme='natural'] body.m238-apple-ui{--m238-bg:#f4f7f4;--m238-accent:#059669;--m238-accent-soft:#ecfdf5}
  html[data-m238-dashboard-theme='worklife'] body.m238-apple-ui{--m238-bg:#f8fafc;--m238-accent:#334155;--m238-accent-soft:#f1f5f9}
  html[data-m238-dashboard-theme='happiness'] body.m238-apple-ui{--m238-bg:#fffaf5;--m238-accent:#f97316;--m238-accent-soft:#fff7ed}
  html[data-m238-dashboard-theme='premium'] body.m238-apple-ui{--m238-bg:#f4f6f8;--m238-accent:#0f3b66;--m238-accent-soft:#eaf0f6}

  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-sidebar button:hover,
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-sidebar button[aria-current='page'],
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-sidebar button[class*='bg-white/20']{
   background:var(--m238-accent-soft)!important;
   color:var(--m238-accent)!important;
   box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--m238-accent) 14%, transparent)!important;
  }
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-sidebar .size-11{
   background:var(--m238-accent)!important;
   color:#fff!important;
  }
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-main{background:var(--m238-bg)!important}
 `}</style>;
}
