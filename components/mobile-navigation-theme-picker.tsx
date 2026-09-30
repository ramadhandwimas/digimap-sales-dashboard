"use client";

import {useEffect,useMemo,useState} from "react";
import {ChevronRight} from "lucide-react";
import {
 NAV_THEME_KEY,
 mobileNavigationThemes,
 type MobileNavigationTheme
} from "@/components/mobile-navigation-theme-manager";

const previewStyle:Record<MobileNavigationTheme,{bar:string;active:string;floating?:boolean;flat?:boolean}>={
 "minimal-clean":{bar:"#ffffff",active:"#7657e8",flat:true},
 glassmorphism:{bar:"linear-gradient(105deg,rgba(98,91,230,.7),rgba(121,177,255,.55),rgba(241,124,190,.62))",active:"#ffffff",floating:true},
 floating:{bar:"#ffffff",active:"#6f59dc",floating:true},
 neumorphism:{bar:"#eef1f6",active:"#7059d9",floating:true},
 "pill-highlight":{bar:"#ffffff",active:"#7658df",floating:true},
 "center-fab":{bar:"#ffffff",active:"#6655df",floating:true},
 "gradient-bold":{bar:"linear-gradient(100deg,#5146ef,#8d4ee6 50%,#ef4fa2)",active:"#ffffff",floating:true},
 "outline-icons":{bar:"#ffffff",active:"#735ce4",flat:true},
 "tab-indicator":{bar:"#ffffff",active:"#735ce4",flat:true},
 "curved-background":{bar:"linear-gradient(100deg,#7658e9,#9a5de1,#d065d8)",active:"#ffffff",floating:true}
};

function valid(value:string|null):value is MobileNavigationTheme{
 return mobileNavigationThemes.some(item=>item.id===value);
}

export default function MobileNavigationThemePicker(){
 const[open,setOpen]=useState(false);
 const[current,setCurrent]=useState<MobileNavigationTheme>("floating");

 useEffect(()=>{
  const saved=localStorage.getItem(NAV_THEME_KEY);
  if(valid(saved))setCurrent(saved);
  const sync=(event:Event)=>{
   const value=(event as CustomEvent<string>).detail;
   if(valid(value))setCurrent(value);
  };
  const storage=(event:StorageEvent)=>{
   if(event.key===NAV_THEME_KEY&&valid(event.newValue))setCurrent(event.newValue);
  };
  window.addEventListener("m238:navigation-theme-change",sync);
  window.addEventListener("storage",storage);
  return()=>{
   window.removeEventListener("m238:navigation-theme-change",sync);
   window.removeEventListener("storage",storage);
  };
 },[]);

 const active=useMemo(()=>mobileNavigationThemes.find(x=>x.id===current),[current]);
 const choose=(id:MobileNavigationTheme)=>{
  setCurrent(id);
  localStorage.setItem(NAV_THEME_KEY,id);
  window.dispatchEvent(new CustomEvent("m238:navigation-theme-change",{detail:id}));
 };

 return <div className={"m238m-appearance-panel "+(open?"open":"")}>
  <button className="m238m-appearance-summary" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>
   <span><strong>Navigation Style</strong><small>{active?.name||"Floating"}</small></span>
   <ChevronRight size={18}/>
  </button>
  {open?<div className="m238m-appearance-body">
   <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:9}}>
    {mobileNavigationThemes.map((theme,index)=>{
     const preview=previewStyle[theme.id],selected=current===theme.id;
     return <button
      key={theme.id}
      onClick={()=>choose(theme.id)}
      style={{height:"auto",minHeight:116,border:selected?"2px solid var(--m-blue)":"1px solid var(--m-line)",borderRadius:15,padding:10,background:"var(--m-surface2)",display:"flex",flexDirection:"column",alignItems:"stretch",justifyContent:"space-between",gap:8,textAlign:"left"}}
      aria-pressed={selected}
     >
      <span style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:6,width:"100%"}}>
       <strong style={{fontSize:10,lineHeight:1.2}}>{String(index+1).padStart(2,"0")} {theme.name}</strong>
       {selected?<b style={{fontSize:12,color:"var(--m-blue)"}}>✓</b>:null}
      </span>
      <i style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",alignItems:"center",gap:3,height:33,padding:"4px 5px",borderRadius:preview.flat?4:12,background:preview.bar,boxShadow:theme.id==="neumorphism"?"4px 4px 8px rgba(130,138,155,.22),-4px -4px 8px rgba(255,255,255,.8)":preview.floating?"0 5px 10px rgba(30,41,59,.13)":"none",border:"1px solid rgba(120,130,150,.10)",fontStyle:"normal",overflow:"visible"}}>
       {[0,1,2,3,4].map(i=><span key={i} style={{position:"relative",display:"grid",placeItems:"center",height:22}}>
        <b style={{display:"block",width:theme.id==="center-fab"&&i===2?18:7,height:theme.id==="center-fab"&&i===2?18:7,borderRadius:theme.id==="center-fab"&&i===2?"50%":3,background:i===0?preview.active:"rgba(100,110,130,.42)",boxShadow:theme.id==="center-fab"&&i===2?"0 3px 7px rgba(91,78,215,.32)":"none",transform:theme.id==="center-fab"&&i===2?"translateY(-8px)":"none"}}/>
        {theme.id==="tab-indicator"&&i===0?<em style={{position:"absolute",bottom:-3,width:12,height:2,borderRadius:99,background:preview.active}}/>:null}
        {theme.id==="pill-highlight"&&i===0?<em style={{position:"absolute",inset:"1px -2px",borderRadius:7,background:"rgba(118,88,223,.12)",zIndex:-1}}/>:null}
       </span>)}
      </i>
      <small style={{fontSize:8.5,lineHeight:1.25,color:"var(--m-secondary)"}}>{theme.desc}</small>
     </button>
    })}
   </div>
   <small style={{display:"block",marginTop:10,color:"var(--m-secondary)",fontSize:9,lineHeight:1.4}}>Pilihan tersimpan di perangkat ini dan langsung diterapkan ke navigation bawah.</small>
  </div>:null}
 </div>;
}
