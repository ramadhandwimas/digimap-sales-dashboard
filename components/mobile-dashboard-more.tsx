"use client";
import {useState} from "react";
import {Briefcase,ChevronRight,ClipboardCheck,LogOut,MessageCircle,Settings,TrendingUp,Users,WalletCards} from "lucide-react";
type ThemePreset="classic"|"midnight"|"aurora"|"playful"|"graphite"|"sunset"|"forest"|"mono";
type MotionPreset="minimal"|"smooth"|"dynamic";
type MotionStyle="clean"|"ios-spring"|"glass-flow"|"playful-bounce"|"executive"|"stagger"|"blur"|"elastic";
export default function MoreScreen({theme,motion,motionStyle,onTheme,onMotion,onMotionStyle,onAction}:{theme:ThemePreset;motion:MotionPreset;motionStyle:MotionStyle;onTheme:(v:ThemePreset)=>void;onMotion:(v:MotionPreset)=>void;onMotionStyle:(v:MotionStyle)=>void;onAction:(action:string)=>void}){
 const[openPanel,setOpenPanel]=useState<"theme"|"speed"|"style"|"operasional"|"performance"|"account"|null>(null);
 const themes:{id:ThemePreset;name:string;desc:string}[]=[
  {id:"classic",name:"Classic iOS",desc:"Floating nav · clean cards"},{id:"midnight",name:"Midnight Pro",desc:"Neon dock · pro panels"},{id:"aurora",name:"Aurora",desc:"Glass nav · soft cards"},{id:"playful",name:"Playful",desc:"Chunky icons · fun blocks"},{id:"graphite",name:"Graphite",desc:"Industrial · sharp panels"},{id:"sunset",name:"Sunset",desc:"Warm · soft glow"},{id:"forest",name:"Forest",desc:"Calm · organic cards"},{id:"mono",name:"Mono OLED",desc:"Black · high contrast"}
 ];
 const motionLabels:Record<MotionPreset,string>={minimal:"Minimal",smooth:"Smooth",dynamic:"Dynamic"},styleLabels:Record<MotionStyle,string>={clean:"Clean","ios-spring":"iOS Spring","glass-flow":"Glass Flow","playful-bounce":"Bounce",executive:"Executive",stagger:"Stagger",blur:"Blur",elastic:"Elastic"},activeTheme=themes.find(t=>t.id===theme);
 const toggle=(panel:typeof openPanel)=>setOpenPanel(v=>v===panel?null:panel);
 const groups=[
  {id:"operasional" as const,title:"Operasional",sub:"3 menu",items:[[Briefcase,"Administrasi","admin"],[ClipboardCheck,"Checklist Store","checklist"],[TrendingUp,"Aktivitas Toko","activity"]]},
  {id:"performance" as const,title:"Performance",sub:"3 menu",items:[[MessageCircle,"Tambah Feedback","add-feedback"],[WalletCards,"Incentive","incentive"],[Users,"Input CX & Member","add-cx"]]},
  {id:"account" as const,title:"Account",sub:"2 menu",items:[[Settings,"Settings","settings"],[LogOut,"Logout","logout"]]}
 ];
 return <div className="m238m-more">
  <section className="m238m-theme-section"><h3>Tampilan Dashboard</h3><div className="m238m-appearance-accordion">
   <div className={"m238m-appearance-panel "+(openPanel==="theme"?"open":"")}><button className="m238m-appearance-summary" onClick={()=>toggle("theme")}><span><strong>Theme</strong><small>{activeTheme?.name||"Classic iOS"}</small></span><ChevronRight size={18}/></button>{openPanel==="theme"?<div className="m238m-appearance-body"><div className="m238m-theme-grid">{themes.map(t=><button key={t.id} className={"m238m-theme-choice "+(theme===t.id?"active":"")} data-preview={t.id} onClick={()=>{onTheme(t.id);setOpenPanel(null)}}><i className="m238m-theme-preview"><span/><b/><em/></i><strong>{t.name}</strong><small>{t.desc}</small>{theme===t.id?<span className="m238m-theme-check">✓</span>:null}</button>)}</div></div>:null}</div>
   <div className={"m238m-appearance-panel "+(openPanel==="speed"?"open":"")}><button className="m238m-appearance-summary" onClick={()=>toggle("speed")}><span><strong>Animation Speed</strong><small>{motionLabels[motion]}</small></span><ChevronRight size={18}/></button>{openPanel==="speed"?<div className="m238m-appearance-body"><div className="m238m-motion-pills">{([["minimal","Minimal"],["smooth","Smooth"],["dynamic","Dynamic"]] as [MotionPreset,string][]).map(([id,label])=><button key={id} className={motion===id?"active":""} onClick={()=>{onMotion(id);setOpenPanel(null)}}>{label}</button>)}</div></div>:null}</div>
   <div className={"m238m-appearance-panel "+(openPanel==="style"?"open":"")}><button className="m238m-appearance-summary" onClick={()=>toggle("style")}><span><strong>Animation Style</strong><small>{styleLabels[motionStyle]}</small></span><ChevronRight size={18}/></button>{openPanel==="style"?<div className="m238m-appearance-body"><div className="m238m-motion-style-grid">{([["clean","Clean"],["ios-spring","iOS Spring"],["glass-flow","Glass Flow"],["playful-bounce","Bounce"],["executive","Executive"],["stagger","Stagger"],["blur","Blur"],["elastic","Elastic"]] as [MotionStyle,string][]).map(([id,label])=><button key={id} className={motionStyle===id?"active":""} onClick={()=>{onMotionStyle(id);setOpenPanel(null)}}>{label}</button>)}</div></div>:null}</div>
  </div></section>
  {groups.map(g=><section key={g.id}><div className="m238m-appearance-panel"><button className="m238m-appearance-summary" onClick={()=>toggle(g.id)}><span><strong>{g.title}</strong><small>{g.sub}</small></span><ChevronRight size={18} className={openPanel===g.id?"m238m-chevron-open":""}/></button>{openPanel===g.id?<div className="m238m-more-group-body">{g.items.map(([Icon,label,action])=><button key={String(label)} onClick={()=>{if(action==="logout")void fetch("/api/auth/logout",{method:"POST"}).finally(()=>{window.location.href="/login"});else onAction(String(action))}}><span><i><Icon size={18}/></i>{String(label)}</span><ChevronRight size={17}/></button>)}</div>:null}</div></section>)}
 </div>
}
