"use client";

import {useEffect} from "react";

export type MobileNavigationTheme=
 |"minimal-clean"
 |"glassmorphism"
 |"floating"
 |"neumorphism"
 |"pill-highlight"
 |"center-fab"
 |"gradient-bold"
 |"outline-icons"
 |"tab-indicator"
 |"curved-background";

export const mobileNavigationThemes:{id:MobileNavigationTheme;name:string;desc:string}[]=[
 {id:"minimal-clean",name:"Minimal Clean",desc:"Simple • Clean • Focused"},
 {id:"glassmorphism",name:"Glassmorphism",desc:"Modern • Blurred • Aesthetic"},
 {id:"floating",name:"Floating",desc:"Detached • Premium • Elevated"},
 {id:"neumorphism",name:"Neumorphism",desc:"Soft • Subtle • Smooth"},
 {id:"pill-highlight",name:"Pill Highlight",desc:"Clear • Friendly • Usable"},
 {id:"center-fab",name:"Center FAB",desc:"Action Focused • Bold"},
 {id:"gradient-bold",name:"Gradient Bold",desc:"Vibrant • Modern"},
 {id:"outline-icons",name:"Outline Icons",desc:"Light • Minimal • Elegant"},
 {id:"tab-indicator",name:"Tab Indicator",desc:"Simple • Intuitive"},
 {id:"curved-background",name:"Curved Background",desc:"Soft Curve • Stylish"}
];

const allowed=new Set<string>(mobileNavigationThemes.map(x=>x.id));
export const NAV_THEME_KEY="m238-mobile-nav-theme";

function normalize(value:string|null):MobileNavigationTheme{
 return allowed.has(String(value))?value as MobileNavigationTheme:"floating";
}

export function applyMobileNavigationTheme(value:string|null){
 const theme=normalize(value);
 document.documentElement.dataset.m238NavTheme=theme;
 return theme;
}

export default function MobileNavigationThemeManager(){
 useEffect(()=>{
  applyMobileNavigationTheme(localStorage.getItem(NAV_THEME_KEY));
  const onTheme=(event:Event)=>{
   const requested=(event as CustomEvent<string>).detail;
   const theme=normalize(requested);
   localStorage.setItem(NAV_THEME_KEY,theme);
   applyMobileNavigationTheme(theme);
  };
  const onStorage=(event:StorageEvent)=>{
   if(event.key===NAV_THEME_KEY)applyMobileNavigationTheme(event.newValue);
  };
  window.addEventListener("m238:navigation-theme-change",onTheme);
  window.addEventListener("storage",onStorage);
  return()=>{
   window.removeEventListener("m238:navigation-theme-change",onTheme);
   window.removeEventListener("storage",onStorage);
  };
 },[]);

 return <style jsx global>{`
  html[data-m238-nav-theme] .m238m-app .m238m-bottom,
  html[data-m238-nav-theme] .m238m-app .m238m-bottom button,
  html[data-m238-nav-theme] .m238m-app .m238m-nav-icon,
  html[data-m238-nav-theme] .m238m-app .m238m-nav-label{transition:all 280ms cubic-bezier(.22,1,.36,1)!important}

  html[data-m238-nav-theme='minimal-clean'] .m238m-app .m238m-bottom{left:0!important;right:0!important;bottom:0!important;height:76px!important;padding:4px 12px calc(4px + env(safe-area-inset-bottom))!important;border:0!important;border-top:1px solid color-mix(in srgb,var(--m-line) 86%,transparent)!important;border-radius:0!important;background:color-mix(in srgb,var(--m-surface) 98%,transparent)!important;box-shadow:none!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important}
  html[data-m238-nav-theme='minimal-clean'] .m238m-app .m238m-liquid-bubble{display:none!important}
  html[data-m238-nav-theme='minimal-clean'] .m238m-app .m238m-bottom button{height:58px!important;gap:3px!important}
  html[data-m238-nav-theme='minimal-clean'] .m238m-app .m238m-bottom button .m238m-nav-icon{transform:none!important;width:31px!important;height:28px!important}
  html[data-m238-nav-theme='minimal-clean'] .m238m-app .m238m-bottom button .m238m-nav-label{opacity:.68!important;max-height:14px!important;transform:none!important}
  html[data-m238-nav-theme='minimal-clean'] .m238m-app .m238m-bottom button.active{color:#7657e8!important}
  html[data-m238-nav-theme='minimal-clean'] .m238m-app .m238m-bottom button.active .m238m-nav-label{color:#7657e8!important;opacity:1!important}

  html[data-m238-nav-theme='glassmorphism'] .m238m-app .m238m-bottom{left:14px!important;right:14px!important;bottom:calc(10px + env(safe-area-inset-bottom))!important;height:68px!important;border-radius:24px!important;border:1px solid rgba(255,255,255,.56)!important;background:linear-gradient(105deg,rgba(98,91,230,.52),rgba(127,180,255,.32),rgba(241,124,190,.43))!important;box-shadow:0 15px 38px rgba(72,57,156,.20),inset 0 1px rgba(255,255,255,.62)!important;backdrop-filter:blur(28px) saturate(150%)!important;-webkit-backdrop-filter:blur(28px) saturate(150%)!important}
  html[data-m238-nav-theme='glassmorphism'] .m238m-app .m238m-liquid-bubble{display:none!important}
  html[data-m238-nav-theme='glassmorphism'] .m238m-app .m238m-bottom button{color:rgba(255,255,255,.76)!important;height:60px!important}
  html[data-m238-nav-theme='glassmorphism'] .m238m-app .m238m-bottom button .m238m-nav-icon{transform:none!important}
  html[data-m238-nav-theme='glassmorphism'] .m238m-app .m238m-bottom button .m238m-nav-label{opacity:.68!important;max-height:14px!important;transform:none!important;color:inherit!important}
  html[data-m238-nav-theme='glassmorphism'] .m238m-app .m238m-bottom button.active{color:#fff!important}
  html[data-m238-nav-theme='glassmorphism'] .m238m-app .m238m-bottom button.active .m238m-nav-icon{background:rgba(255,255,255,.22)!important;border-radius:13px!important;box-shadow:inset 0 1px rgba(255,255,255,.35)!important}
  html[data-m238-nav-theme='glassmorphism'] .m238m-app .m238m-bottom button.active .m238m-nav-label{color:#fff!important;opacity:1!important}

  html[data-m238-nav-theme='floating'] .m238m-app .m238m-bottom{left:14px!important;right:14px!important;bottom:calc(10px + env(safe-area-inset-bottom))!important;height:64px!important;border-radius:22px!important;background:color-mix(in srgb,var(--m-surface) 95%,transparent)!important;border:1px solid color-mix(in srgb,var(--m-line) 85%,transparent)!important;box-shadow:0 14px 34px rgba(15,23,42,.14)!important}
  html[data-m238-nav-theme='floating'] .m238m-app .m238m-liquid-bubble{display:block!important}

  html[data-m238-nav-theme='neumorphism'] .m238m-app .m238m-bottom{left:14px!important;right:14px!important;height:68px!important;border:0!important;border-radius:24px!important;background:#f2f4f8!important;box-shadow:10px 10px 24px rgba(151,158,174,.25),-10px -10px 24px rgba(255,255,255,.92)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
  .dark[data-m238-nav-theme='neumorphism'] .m238m-app .m238m-bottom{background:#171b22!important;box-shadow:8px 8px 20px rgba(0,0,0,.35),-6px -6px 16px rgba(255,255,255,.03)!important}
  html[data-m238-nav-theme='neumorphism'] .m238m-app .m238m-liquid-bubble{display:none!important}
  html[data-m238-nav-theme='neumorphism'] .m238m-app .m238m-bottom button .m238m-nav-icon{transform:none!important;border-radius:50%!important}
  html[data-m238-nav-theme='neumorphism'] .m238m-app .m238m-bottom button .m238m-nav-label{opacity:.62!important;max-height:14px!important;transform:none!important}
  html[data-m238-nav-theme='neumorphism'] .m238m-app .m238m-bottom button.active .m238m-nav-icon{color:#6f59d9!important;background:#f2f4f8!important;box-shadow:inset 4px 4px 8px rgba(156,163,179,.22),inset -4px -4px 8px #fff!important}
  .dark[data-m238-nav-theme='neumorphism'] .m238m-app .m238m-bottom button.active .m238m-nav-icon{background:#171b22!important;box-shadow:inset 3px 3px 7px rgba(0,0,0,.35),inset -3px -3px 7px rgba(255,255,255,.03)!important}

  html[data-m238-nav-theme='pill-highlight'] .m238m-app .m238m-bottom{left:14px!important;right:14px!important;height:66px!important;border-radius:22px!important;background:var(--m-surface)!important;border:1px solid var(--m-line)!important;box-shadow:0 10px 28px rgba(15,23,42,.10)!important}
  html[data-m238-nav-theme='pill-highlight'] .m238m-app .m238m-liquid-bubble{display:none!important}
  html[data-m238-nav-theme='pill-highlight'] .m238m-app .m238m-bottom button{height:48px!important;margin:0 3px!important;gap:2px!important}
  html[data-m238-nav-theme='pill-highlight'] .m238m-app .m238m-bottom button .m238m-nav-icon{transform:none!important}
  html[data-m238-nav-theme='pill-highlight'] .m238m-app .m238m-bottom button .m238m-nav-label{opacity:.55!important;max-height:14px!important;transform:none!important}
  html[data-m238-nav-theme='pill-highlight'] .m238m-app .m238m-bottom button.active{background:color-mix(in srgb,#7c5cff 11%,var(--m-surface))!important;color:#7258dc!important;border-radius:16px!important}
  html[data-m238-nav-theme='pill-highlight'] .m238m-app .m238m-bottom button.active .m238m-nav-label{color:#7258dc!important;opacity:1!important}

  html[data-m238-nav-theme='center-fab'] .m238m-app .m238m-bottom{left:14px!important;right:14px!important;height:64px!important;border-radius:22px!important;background:var(--m-surface)!important;box-shadow:0 12px 30px rgba(15,23,42,.14)!important;overflow:visible!important}
  html[data-m238-nav-theme='center-fab'] .m238m-app .m238m-liquid-bubble{display:none!important}
  html[data-m238-nav-theme='center-fab'] .m238m-app .m238m-bottom button .m238m-nav-icon{transform:none!important}
  html[data-m238-nav-theme='center-fab'] .m238m-app .m238m-bottom button .m238m-nav-label{opacity:.55!important;max-height:14px!important;transform:none!important}
  html[data-m238-nav-theme='center-fab'] .m238m-app .m238m-bottom button.active .m238m-nav-icon{width:48px!important;height:48px!important;border-radius:50%!important;transform:translateY(-17px)!important;color:#fff!important;background:linear-gradient(145deg,#7358ee,#5a62e9)!important;border:5px solid var(--m-bg)!important;box-shadow:0 10px 22px rgba(91,78,215,.30)!important}
  html[data-m238-nav-theme='center-fab'] .m238m-app .m238m-bottom button.active .m238m-nav-label{transform:translateY(-8px)!important;color:#6654d8!important;opacity:1!important}

  html[data-m238-nav-theme='gradient-bold'] .m238m-app .m238m-bottom{left:10px!important;right:10px!important;height:70px!important;border:0!important;border-radius:24px!important;background:linear-gradient(100deg,#5146ef 0%,#8d4ee6 45%,#f04fa2 100%)!important;box-shadow:0 16px 36px rgba(115,66,217,.28)!important}
  html[data-m238-nav-theme='gradient-bold'] .m238m-app .m238m-liquid-bubble{display:none!important}
  html[data-m238-nav-theme='gradient-bold'] .m238m-app .m238m-bottom button{color:rgba(255,255,255,.72)!important;height:62px!important}
  html[data-m238-nav-theme='gradient-bold'] .m238m-app .m238m-bottom button .m238m-nav-icon{transform:none!important}
  html[data-m238-nav-theme='gradient-bold'] .m238m-app .m238m-bottom button .m238m-nav-label{opacity:.62!important;max-height:14px!important;transform:none!important;color:inherit!important}
  html[data-m238-nav-theme='gradient-bold'] .m238m-app .m238m-bottom button.active{color:#fff!important}
  html[data-m238-nav-theme='gradient-bold'] .m238m-app .m238m-bottom button.active .m238m-nav-icon{background:rgba(255,255,255,.20)!important;border-radius:13px!important}
  html[data-m238-nav-theme='gradient-bold'] .m238m-app .m238m-bottom button.active .m238m-nav-label{color:#fff!important;opacity:1!important}

  html[data-m238-nav-theme='outline-icons'] .m238m-app .m238m-bottom{left:0!important;right:0!important;bottom:0!important;height:76px!important;border:0!important;border-top:1px solid var(--m-line)!important;border-radius:0!important;background:var(--m-surface)!important;box-shadow:none!important}
  html[data-m238-nav-theme='outline-icons'] .m238m-app .m238m-liquid-bubble{display:none!important}
  html[data-m238-nav-theme='outline-icons'] .m238m-app .m238m-bottom button .m238m-nav-icon{transform:none!important;background:transparent!important}
  html[data-m238-nav-theme='outline-icons'] .m238m-app .m238m-bottom button .m238m-nav-label{opacity:.7!important;max-height:14px!important;transform:none!important}
  html[data-m238-nav-theme='outline-icons'] .m238m-app .m238m-bottom button.active{color:#22233a!important}
  .dark[data-m238-nav-theme='outline-icons'] .m238m-app .m238m-bottom button.active{color:#fff!important}
  html[data-m238-nav-theme='outline-icons'] .m238m-app .m238m-bottom button.active .m238m-nav-icon{color:#735ce4!important}
  html[data-m238-nav-theme='outline-icons'] .m238m-app .m238m-bottom button.active .m238m-nav-label{color:#735ce4!important;opacity:1!important}

  html[data-m238-nav-theme='tab-indicator'] .m238m-app .m238m-bottom{left:0!important;right:0!important;bottom:0!important;height:76px!important;border:0!important;border-top:1px solid var(--m-line)!important;border-radius:0!important;background:var(--m-surface)!important;box-shadow:none!important}
  html[data-m238-nav-theme='tab-indicator'] .m238m-app .m238m-liquid-bubble{display:none!important}
  html[data-m238-nav-theme='tab-indicator'] .m238m-app .m238m-bottom button{height:60px!important;border-radius:0!important}
  html[data-m238-nav-theme='tab-indicator'] .m238m-app .m238m-bottom button:after{content:"";position:absolute;left:25%;right:25%;bottom:2px;height:3px;border-radius:999px;background:transparent}
  html[data-m238-nav-theme='tab-indicator'] .m238m-app .m238m-bottom button .m238m-nav-icon{transform:none!important}
  html[data-m238-nav-theme='tab-indicator'] .m238m-app .m238m-bottom button .m238m-nav-label{opacity:.62!important;max-height:14px!important;transform:none!important}
  html[data-m238-nav-theme='tab-indicator'] .m238m-app .m238m-bottom button.active{color:#6e58de!important}
  html[data-m238-nav-theme='tab-indicator'] .m238m-app .m238m-bottom button.active:after{background:#7a5dea!important}
  html[data-m238-nav-theme='tab-indicator'] .m238m-app .m238m-bottom button.active .m238m-nav-label{color:#6e58de!important;opacity:1!important}

  html[data-m238-nav-theme='curved-background'] .m238m-app .m238m-bottom{left:10px!important;right:10px!important;bottom:calc(8px + env(safe-area-inset-bottom))!important;height:72px!important;padding:0 8px!important;border:0!important;border-radius:34px 34px 18px 18px!important;background:linear-gradient(105deg,#7658e9,#8e5cdf 55%,#d065d8)!important;box-shadow:0 16px 34px rgba(104,73,198,.25)!important;overflow:hidden!important}
  html[data-m238-nav-theme='curved-background'] .m238m-app .m238m-bottom:before{content:"";position:absolute;left:20%;right:20%;top:-26px;height:44px;border-radius:0 0 50% 50%;background:rgba(255,255,255,.12);filter:blur(2px)}
  html[data-m238-nav-theme='curved-background'] .m238m-app .m238m-liquid-bubble{display:none!important}
  html[data-m238-nav-theme='curved-background'] .m238m-app .m238m-bottom button{height:62px!important;color:rgba(255,255,255,.68)!important}
  html[data-m238-nav-theme='curved-background'] .m238m-app .m238m-bottom button .m238m-nav-icon{transform:none!important}
  html[data-m238-nav-theme='curved-background'] .m238m-app .m238m-bottom button .m238m-nav-label{opacity:.62!important;max-height:14px!important;transform:none!important;color:inherit!important}
  html[data-m238-nav-theme='curved-background'] .m238m-app .m238m-bottom button.active{color:#fff!important}
  html[data-m238-nav-theme='curved-background'] .m238m-app .m238m-bottom button.active .m238m-nav-icon{background:rgba(255,255,255,.18)!important;border-radius:50%!important;color:#fff!important}
  html[data-m238-nav-theme='curved-background'] .m238m-app .m238m-bottom button.active .m238m-nav-label{color:#fff!important;opacity:1!important}
 `}</style>;
}
