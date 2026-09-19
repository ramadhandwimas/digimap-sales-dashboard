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
  const savedTheme=localStorage.getItem("m238-theme")==="dark"?"dark":"light";
  document.documentElement.classList.toggle("dark",savedTheme==="dark");
  document.documentElement.dataset.theme=savedTheme;
  applySavedTheme();
  let last=localStorage.getItem("m238-style")||"worklife";
  const sync=()=>{
   const savedTheme=localStorage.getItem("m238-theme")==="dark"?"dark":"light";
   document.documentElement.classList.toggle("dark",savedTheme==="dark");
   document.documentElement.dataset.theme=savedTheme;
   const current=localStorage.getItem("m238-style")||"worklife";
   if(current!==last||document.documentElement.dataset.m238DashboardTheme!==current){last=current;applySavedTheme()}
  };
  const timer=window.setInterval(sync,250);
  const onStorage=(e:StorageEvent)=>{if(e.key==="m238-style"||e.key==="m238-theme")sync()};
  window.addEventListener("storage",onStorage);
  return()=>{window.clearInterval(timer);window.removeEventListener("storage",onStorage)};
 },[]);
 return <style jsx global>{`
  /* Full visual preset system: every preset owns the complete dashboard skin. */
  html[data-m238-dashboard-theme='classic'] body.m238-apple-ui{
   --m238-bg:#f5f7fb;--m238-panel:#ffffff;--m238-panel-solid:#ffffff;--m238-panel-subtle:#f8fafd;
   --m238-text:#1f2937;--m238-muted:#667085;--m238-muted-2:#98a2b3;
   --m238-border:#e3e8f1;--m238-border-strong:#d8e0eb;
   --m238-accent:#4a90ff;--m238-accent-hover:#347ff2;--m238-accent-soft:#edf5ff;
   --m238-sidebar-bg:#0a1020;--m238-sidebar-bg-2:#111a31;
   --m238-sidebar-glow:rgba(49,88,196,.19);--m238-sidebar-active:rgba(74,144,255,.16);
   --m238-hero-a:#4a90ff;--m238-hero-b:#806df0;--m238-hero-glow:rgba(255,216,77,.22);
   --m238-table-head:#f8fafc;--m238-row-hover:#f8fbff;
   --m238-radius:20px;--m238-shadow-xs:0 3px 10px rgba(15,23,42,.045);--m238-shadow-sm:0 6px 18px rgba(15,23,42,.075);
  }

  html[data-m238-dashboard-theme='natural'] body.m238-apple-ui{
   --m238-bg:#f1f7f3;--m238-panel:#fbfefc;--m238-panel-solid:#fbfefc;--m238-panel-subtle:#edf7f1;
   --m238-text:#20342a;--m238-muted:#667a70;--m238-muted-2:#92a69b;
   --m238-border:#dce9e1;--m238-border-strong:#cfdfd5;
   --m238-accent:#20a36a;--m238-accent-hover:#17885a;--m238-accent-soft:#e7f7ee;
   --m238-sidebar-bg:#09241d;--m238-sidebar-bg-2:#103a2f;
   --m238-sidebar-glow:rgba(66,199,122,.18);--m238-sidebar-active:rgba(66,199,122,.15);
   --m238-hero-a:#27ad73;--m238-hero-b:#2a8f88;--m238-hero-glow:rgba(255,216,77,.18);
   --m238-table-head:#eef7f2;--m238-row-hover:#f1faf5;
   --m238-radius:22px;--m238-shadow-xs:0 3px 12px rgba(25,72,50,.05);--m238-shadow-sm:0 8px 22px rgba(25,72,50,.08);
  }

  html[data-m238-dashboard-theme='worklife'] body.m238-apple-ui{
   --m238-bg:#f4f6f9;--m238-panel:#ffffff;--m238-panel-solid:#ffffff;--m238-panel-subtle:#f6f8fb;
   --m238-text:#202936;--m238-muted:#687384;--m238-muted-2:#9aa3af;
   --m238-border:#dfe4eb;--m238-border-strong:#d2d9e3;
   --m238-accent:#334e73;--m238-accent-hover:#263f60;--m238-accent-soft:#edf1f6;
   --m238-sidebar-bg:#0b1220;--m238-sidebar-bg-2:#162235;
   --m238-sidebar-glow:rgba(86,112,148,.18);--m238-sidebar-active:rgba(112,145,190,.14);
   --m238-hero-a:#334e73;--m238-hero-b:#4c6c94;--m238-hero-glow:rgba(100,170,255,.15);
   --m238-table-head:#f3f5f8;--m238-row-hover:#f5f7fa;
   --m238-radius:16px;--m238-shadow-xs:0 2px 8px rgba(15,23,42,.045);--m238-shadow-sm:0 5px 16px rgba(15,23,42,.07);
  }

  html[data-m238-dashboard-theme='happiness'] body.m238-apple-ui{
   --m238-bg:#fff8f2;--m238-panel:#fffdfb;--m238-panel-solid:#fffdfb;--m238-panel-subtle:#fff2e7;
   --m238-text:#3a2c2b;--m238-muted:#796865;--m238-muted-2:#a9908c;
   --m238-border:#f1dfd3;--m238-border-strong:#e9d3c5;
   --m238-accent:#f47b42;--m238-accent-hover:#df6530;--m238-accent-soft:#fff0e5;
   --m238-sidebar-bg:#27172e;--m238-sidebar-bg-2:#4a2445;
   --m238-sidebar-glow:rgba(255,159,67,.19);--m238-sidebar-active:rgba(255,159,67,.16);
   --m238-hero-a:#ff8a4c;--m238-hero-b:#936cf4;--m238-hero-glow:rgba(255,216,77,.30);
   --m238-table-head:#fff2ea;--m238-row-hover:#fff6f0;
   --m238-radius:24px;--m238-shadow-xs:0 4px 12px rgba(115,55,38,.055);--m238-shadow-sm:0 9px 24px rgba(115,55,38,.09);
  }

  html[data-m238-dashboard-theme='premium'] body.m238-apple-ui{
   --m238-bg:#f2f4f7;--m238-panel:#ffffff;--m238-panel-solid:#ffffff;--m238-panel-subtle:#f5f7f9;
   --m238-text:#16202c;--m238-muted:#65707d;--m238-muted-2:#98a1ab;
   --m238-border:#dce2e8;--m238-border-strong:#ccd5df;
   --m238-accent:#0f3b66;--m238-accent-hover:#092d50;--m238-accent-soft:#e8eff6;
   --m238-sidebar-bg:#050b13;--m238-sidebar-bg-2:#0b1d30;
   --m238-sidebar-glow:rgba(29,102,167,.20);--m238-sidebar-active:rgba(48,130,201,.15);
   --m238-hero-a:#0f3b66;--m238-hero-b:#176b91;--m238-hero-glow:rgba(78,191,218,.18);
   --m238-table-head:#f1f4f7;--m238-row-hover:#f5f8fa;
   --m238-radius:18px;--m238-shadow-xs:0 3px 12px rgba(7,26,43,.05);--m238-shadow-sm:0 8px 24px rgba(7,26,43,.085);
  }

  /* Dark mode keeps the selected preset identity but uses comfortable dark surfaces. */
  html.dark[data-m238-dashboard-theme] body.m238-apple-ui{
   --m238-bg:#0b0d10;--m238-panel:#14171c;--m238-panel-solid:#14171c;--m238-panel-subtle:#1a1e24;
   --m238-text:#f5f7fa;--m238-muted:#a7afba;--m238-muted-2:#6f7782;
   --m238-border:#262b33;--m238-border-strong:#303640;
   --m238-table-head:#171b20;--m238-row-hover:#1d2229;
   --m238-shadow-xs:none;--m238-shadow-sm:none;
  }
  html.dark[data-m238-dashboard-theme='classic'] body.m238-apple-ui{--m238-accent:#5b9cff;--m238-accent-hover:#74abff;--m238-accent-soft:rgba(74,144,255,.12);--m238-sidebar-bg:#070a10;--m238-sidebar-bg-2:#0e1627;--m238-hero-a:#2457a9;--m238-hero-b:#5d4fc3}
  html.dark[data-m238-dashboard-theme='natural'] body.m238-apple-ui{--m238-accent:#42c77a;--m238-accent-hover:#58d58a;--m238-accent-soft:rgba(66,199,122,.12);--m238-sidebar-bg:#07110d;--m238-sidebar-bg-2:#0d2419;--m238-hero-a:#187c50;--m238-hero-b:#206d68}
  html.dark[data-m238-dashboard-theme='worklife'] body.m238-apple-ui{--m238-accent:#7e9bc1;--m238-accent-hover:#95afd0;--m238-accent-soft:rgba(126,155,193,.12);--m238-sidebar-bg:#070b12;--m238-sidebar-bg-2:#101923;--m238-hero-a:#2a3c55;--m238-hero-b:#3c5677}
  html.dark[data-m238-dashboard-theme='happiness'] body.m238-apple-ui{--m238-accent:#ff9f43;--m238-accent-hover:#ffb260;--m238-accent-soft:rgba(255,159,67,.12);--m238-sidebar-bg:#120a14;--m238-sidebar-bg-2:#251228;--m238-hero-a:#b95b31;--m238-hero-b:#6549a8}
  html.dark[data-m238-dashboard-theme='premium'] body.m238-apple-ui{--m238-accent:#4c8dff;--m238-accent-hover:#67a0ff;--m238-accent-soft:rgba(76,141,255,.12);--m238-sidebar-bg:#05080d;--m238-sidebar-bg-2:#091421;--m238-hero-a:#0b3154;--m238-hero-b:#11526f}

  html[data-m238-dashboard-theme] body.m238-apple-ui,
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-main,
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-app-shell{
   background:var(--m238-bg)!important;
  }

  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-sidebar{
   background:
    radial-gradient(circle at 18% 0%,var(--m238-sidebar-glow),transparent 31%),
    linear-gradient(180deg,var(--m238-sidebar-bg-2),var(--m238-sidebar-bg))!important;
  }

  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-sidebar .m238-menu-item.is-active,
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-sidebar .m238-menu-item[aria-current='page']{
   background:color-mix(in srgb,var(--m238-accent) 18%,transparent)!important;
   border-color:color-mix(in srgb,var(--m238-accent) 24%,transparent)!important;
   color:#fff!important;
  }
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-sidebar .m238-menu-item.is-active::before,
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-sidebar .m238-menu-item[aria-current='page']::before{
   background:var(--m238-accent)!important;
   box-shadow:0 0 10px color-mix(in srgb,var(--m238-accent) 45%,transparent)!important;
  }

  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-sidebar .size-11{
   background:linear-gradient(145deg,var(--m238-accent),color-mix(in srgb,var(--m238-accent) 72%,#8a6fff))!important;
  }

  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-main>header{
   background:color-mix(in srgb,var(--m238-bg) 88%,transparent)!important;
   border-color:var(--m238-border)!important;
  }

  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-main article,
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-main section[class*='rounded-2xl']:not([class*='bg-gradient']),
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-main section[class*='rounded-3xl']:not([class*='bg-gradient']),
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-main div[class*='rounded-2xl'][class*='border'][class*='bg-white']{
   background:var(--m238-panel)!important;
   border-color:var(--m238-border)!important;
   border-radius:var(--m238-radius)!important;
   box-shadow:var(--m238-shadow-xs)!important;
  }

  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-main section[class*='bg-gradient-to-br'],
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-main .m238-hero-block{
   background:
    radial-gradient(circle at 92% -20%,var(--m238-hero-glow),transparent 34%),
    linear-gradient(135deg,var(--m238-hero-a),var(--m238-hero-b))!important;
  }

  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-main select,
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-main input,
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-main textarea{
   background:var(--m238-panel-solid)!important;
   color:var(--m238-text)!important;
   border-color:var(--m238-border-strong)!important;
  }

  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-main select:focus,
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-main input:focus,
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-main textarea:focus{
   border-color:color-mix(in srgb,var(--m238-accent) 60%,var(--m238-border))!important;
   box-shadow:0 0 0 4px color-mix(in srgb,var(--m238-accent) 10%,transparent)!important;
  }

  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-main button[class*='bg-blue-600'],
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-main button[class*='bg-blue-500']{
   background:var(--m238-accent)!important;border-color:var(--m238-accent)!important;
  }

  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-main thead{background:var(--m238-table-head)!important}
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-main tbody tr:hover{background:var(--m238-row-hover)!important}

  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-filter-block,
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-subcard,
  html[data-m238-dashboard-theme] body.m238-apple-ui .m238-soft-card{
   background:var(--m238-panel-subtle)!important;border-color:var(--m238-border)!important;
  }

  html[data-m238-dashboard-theme] body.m238-apple-ui *{
   transition-property:background-color,border-color,color,box-shadow;
   transition-duration:180ms;
   transition-timing-function:ease;
  }
 `}</style>;
}
