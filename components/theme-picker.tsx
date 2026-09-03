"use client";
import {useEffect,useState} from "react";

type VisualTheme="professional"|"hero"|"anime";
const themes:[VisualTheme,string,string][]=[
  ["professional","Professional","bg-gradient-to-r from-slate-700 to-blue-900"],
  ["hero","Hero","bg-gradient-to-r from-red-600 via-slate-950 to-blue-700"],
  ["anime","Anime Neon","bg-gradient-to-r from-fuchsia-500 via-violet-600 to-cyan-400"],
];

export default function ThemePicker(){
  const[theme,setTheme]=useState<VisualTheme>("professional"),[open,setOpen]=useState(false);
  useEffect(()=>{const saved=(localStorage.getItem("m238-visual-theme")||"professional") as VisualTheme;const next=["professional","hero","anime"].includes(saved)?saved:"professional";setTheme(next);document.documentElement.dataset.visualTheme=next},[]);
  const apply=(next:VisualTheme)=>{setTheme(next);document.documentElement.dataset.visualTheme=next;localStorage.setItem("m238-visual-theme",next);setOpen(false)};
  return <div className="fixed bottom-4 right-4 z-[100]">
    {open&&<div className="mb-2 w-64 rounded-2xl border bg-white/95 p-3 shadow-2xl backdrop-blur-xl dark:bg-slate-950/95"><div className="mb-2 px-1"><b className="text-sm">Tema Tampilan</b><p className="text-xs text-slate-500">Tidak mengubah data atau fungsi dashboard.</p></div><div className="space-y-2">{themes.map(([key,label,gradient])=><button key={key} onClick={()=>apply(key)} className={`w-full rounded-xl border p-2 text-left ${theme===key?"ring-2 ring-blue-300":""}`}><div className={`h-7 rounded-lg ${gradient}`}/><div className="mt-1.5 text-xs font-black">{label}</div></button>)}</div></div>}
    <button onClick={()=>setOpen(v=>!v)} className="rounded-full border bg-white/95 px-4 py-3 text-sm font-black shadow-xl backdrop-blur-xl dark:bg-slate-950/95">🎨 Tema</button>
  </div>;
}
