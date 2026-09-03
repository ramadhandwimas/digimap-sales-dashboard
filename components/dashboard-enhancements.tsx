"use client";
import {useEffect} from "react";
import {createPortal} from "react-dom";
import {ClipboardList} from "lucide-react";
import {useState} from "react";

export default function DashboardEnhancements(){
 const[target,setTarget]=useState<HTMLElement|null>(null);
 useEffect(()=>{const nav=document.querySelector("nav");if(nav instanceof HTMLElement)setTarget(nav)},[]);
 if(!target)return null;
 return createPortal(<button onClick={()=>{window.location.href="/daily-summary"}} className="flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-bold text-white/85 transition hover:bg-white/10 lg:w-full lg:justify-start lg:text-sm"><ClipboardList className="size-4"/><span className="hidden sm:inline">Daily Summary</span></button>,target);
}
