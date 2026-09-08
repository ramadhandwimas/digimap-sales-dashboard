"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";

type Palette="classic"|"natural"|"worklife"|"happiness";
const fonts=[
 ["system","System UI","system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"],
 ["calibri","Calibri","Calibri, 'Segoe UI', Arial, sans-serif"],
 ["arial","Arial","Arial, Helvetica, sans-serif"],
 ["comic","Comic Sans","'Comic Sans MS', 'Comic Sans', cursive"],
 ["roboto","Roboto","Roboto, Arial, sans-serif"],
 ["inter","Inter","Inter, Arial, sans-serif"],
 ["georgia","Georgia","Georgia, 'Times New Roman', serif"],
] as const;
const palettes:[Palette,string][]=[["classic","Classic Blue"],["natural","Natural Green"],["worklife","Worklife Slate"],["happiness","Happiness Rose"]];
function applyFont(key:string){const row=fonts.find(x=>x[0]===key)||fonts[0];document.documentElement.style.fontFamily=row[2];localStorage.setItem("m238-font-family",row[0])}
function applyPalette(key:Palette){document.documentElement.dataset.m238Palette=key;localStorage.setItem("m238-safe-palette",key)}
export default function M238SettingsEnhancer(){
 const[host,setHost]=useState<HTMLElement|null>(null),[font,setFont]=useState("system"),[palette,setPalette]=useState<Palette>("classic");
 useEffect(()=>{const f=localStorage.getItem("m238-font-family")||"system",p=(localStorage.getItem("m238-safe-palette")||"classic") as Palette;setFont(f);setPalette(p);applyFont(f);applyPalette(p)},[]);
 useEffect(()=>{let raf=0;const sync=()=>{raf=0;const h=Array.from(document.querySelectorAll("h1")).find(x=>(x.textContent||"").trim()==="Settings") as HTMLElement|undefined;if(!h){setHost(null);return}const root=(h.closest("main")||h.parentElement?.parentElement?.parentElement) as HTMLElement|null;if(!root)return;for(const title of Array.from(root.querySelectorAll("h3"))){if((title.textContent||"").includes("Tampilan Dashboard")){const sec=title.closest("section") as HTMLElement|null;if(sec)sec.style.display="none"}}let x=root.querySelector("[data-m238-safe-settings]") as HTMLElement|null;if(!x){x=document.createElement("div");x.dataset.m238SafeSettings="1";x.className="mt-5";root.appendChild(x)}setHost(v=>v===x?v:x)};const schedule=()=>{if(!raf)raf=requestAnimationFrame(sync)};sync();const mo=new MutationObserver(schedule);mo.observe(document.body,{childList:true,subtree:true});return()=>{if(raf)cancelAnimationFrame(raf);mo.disconnect()}},[]);
 const changeFont=(v:string)=>{setFont(v);applyFont(v)},changePalette=(v:Palette)=>{setPalette(v);applyPalette(v)};
 return <><style>{`
 html[data-m238-palette="natural"] .bg-blue-600,html[data-m238-palette="natural"] .bg-blue-500{background-color:#059669!important}html[data-m238-palette="natural"] .text-blue-600{color:#059669!important}html[data-m238-palette="natural"] .bg-blue-50{background-color:#ecfdf5!important}
 html[data-m238-palette="worklife"] .bg-blue-600,html[data-m238-palette="worklife"] .bg-blue-500{background-color:#334155!important}html[data-m238-palette="worklife"] .text-blue-600{color:#475569!important}html[data-m238-palette="worklife"] .bg-blue-50{background-color:#f1f5f9!important}
 html[data-m238-palette="happiness"] .bg-blue-600,html[data-m238-palette="happiness"] .bg-blue-500{background-color:#e11d48!important}html[data-m238-palette="happiness"] .text-blue-600{color:#e11d48!important}html[data-m238-palette="happiness"] .bg-blue-50{background-color:#fff1f2!important}
 `}</style>{host&&createPortal(<section className="grid gap-5 lg:grid-cols-2"><div className="m238-soft-card p-5"><h3 className="font-black">Tema Warna</h3><p className="mt-1 text-sm text-slate-500">Pilihan aman tanpa reload agar dashboard tidak crash.</p><div className="mt-4 grid grid-cols-2 gap-3">{palettes.map(([k,l])=><button key={k} onClick={()=>changePalette(k)} className={`rounded-xl border p-3 text-left text-sm font-bold ${palette===k?"ring-2 ring-blue-300":""}`}>{l}</button>)}</div></div><div className="m238-soft-card p-5"><h3 className="font-black">Jenis Font</h3><p className="mt-1 text-sm text-slate-500">Berlaku untuk seluruh dashboard dan tersimpan di perangkat ini.</p><select value={font} onChange={e=>changeFont(e.target.value)} className="mt-4 h-11 w-full rounded-xl border bg-white px-3 font-semibold dark:bg-slate-900">{fonts.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select><div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900" style={{fontFamily:(fonts.find(x=>x[0]===font)||fonts[0])[2]}}>Contoh tampilan font M238 Dashboard</div></div></section>,host)}</>;
}
