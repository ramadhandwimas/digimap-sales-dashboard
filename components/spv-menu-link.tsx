"use client";
import {useEffect,useState} from "react";
import {ChevronRight,Wallet} from "lucide-react";
export default function SpvMenuLink({desktop=false}:{desktop?:boolean}){
 const[allowed,setAllowed]=useState(false);
 useEffect(()=>{const controller=new AbortController();fetch("/api/spv/petty-cash?access=1",{signal:controller.signal,cache:"no-store"}).then(r=>{if(r.ok)setAllowed(true)}).catch(()=>{});return()=>controller.abort()},[]);
 if(!allowed)return null;
 return <a href="/spv" className={desktop?"m238-menu-item flex w-full items-center gap-2 rounded-lg px-3 py-3 text-sm font-bold text-white/90 hover:bg-white/10":"m238-spv-menu"}>
  <span className={desktop?"":"m238m-direct-icon"}><Wallet size={19}/></span><span className={desktop?"flex-1":"m238m-direct-copy"}><strong>SPV</strong>{desktop?null:<small>Petty Cash · Presentasi M238 · Ceklis Store</small>}</span><ChevronRight size={18}/>
 </a>;
}
