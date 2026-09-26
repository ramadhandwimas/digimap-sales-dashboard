"use client";
import {useState} from "react";
import dynamic from "next/dynamic";
const AccessoryPricelistUpload=dynamic(()=>import("@/components/accessory-pricelist-upload"));
const DataCopasRepair=dynamic(()=>import("@/components/data-copas-repair"));
import {Box,ChevronLeft,ChevronRight,Clock3,CreditCard,LogOut,MessageCircle,Settings,Type,Users,WalletCards} from "lucide-react";

type ThemePreset="classic"|"midnight"|"aurora"|"playful"|"graphite"|"sunset"|"forest"|"mono"|"webhero"|"mecha"|"alliance"|"natalia"|"bumblebee";
type MotionPreset="instant"|"minimal"|"smooth"|"dynamic"|"cinematic";
type MotionStyle="clean"|"ios-spring"|"glass-flow"|"playful-bounce"|"executive"|"stagger"|"blur"|"elastic"|"fade-up"|"zoom-soft"|"slide-flow"|"float";
type FontPreset="system"|"rounded"|"compact"|"modern"|"editorial"|"tech"|"soft"|"bold"|"mono";

export default function MoreScreen({theme,motion,motionStyle,font,onTheme,onMotion,onMotionStyle,onFont,onAction}:{theme:ThemePreset;motion:MotionPreset;motionStyle:MotionStyle;font:FontPreset;onTheme:(v:ThemePreset)=>void;onMotion:(v:MotionPreset)=>void;onMotionStyle:(v:MotionStyle)=>void;onFont:(v:FontPreset)=>void;onAction:(action:string)=>void}){
 const[screen,setScreen]=useState<"menu"|"settings">("menu");
 const[openPanel,setOpenPanel]=useState<"theme"|"speed"|"style"|"font"|"pricelist"|"copas-repair"|null>(null);

 const themes:{id:ThemePreset;name:string;desc:string}[]=[
  {id:"classic",name:"Classic iOS",desc:"Clean, ringan, familiar"},
  {id:"midnight",name:"Midnight Pro",desc:"Dark premium"},
  {id:"aurora",name:"Aurora",desc:"Glass & soft gradient"},
  {id:"playful",name:"Playful",desc:"Fun & colorful"},
  {id:"graphite",name:"Graphite",desc:"Industrial dark"},
  {id:"sunset",name:"Sunset",desc:"Warm & soft"},
  {id:"forest",name:"Forest",desc:"Calm green"},
  {id:"mono",name:"Mono OLED",desc:"High contrast"},
  {id:"webhero",name:"Web Hero",desc:"Red & blue sporty"},
  {id:"mecha",name:"Mecha",desc:"Industrial electric"},
  {id:"alliance",name:"Hero Alliance",desc:"Navy silver premium"},
  {id:"natalia",name:"Natalia",desc:"Dark assassin • crimson purple"},
  {id:"bumblebee",name:"Bumblebee",desc:"Yellow mecha • electric blue"}
 ];
 const motionLabels:Record<MotionPreset,string>={instant:"Instant",minimal:"Minimal",smooth:"Smooth",dynamic:"Dynamic",cinematic:"Cinematic"};
 const styleLabels:Record<MotionStyle,string>={clean:"Clean","ios-spring":"iOS Spring","glass-flow":"Glass Flow","playful-bounce":"Bounce",executive:"Executive",stagger:"Stagger",blur:"Blur",elastic:"Elastic","fade-up":"Fade Up","zoom-soft":"Soft Zoom","slide-flow":"Slide Flow",float:"Float"};
 const fontLabels:Record<FontPreset,string>={system:"System / iOS",rounded:"Rounded",compact:"Compact",modern:"Modern",editorial:"Editorial",tech:"Tech",soft:"Soft",bold:"Bold Display",mono:"Mono"};
 const activeTheme=themes.find(t=>t.id===theme);
 const toggle=(panel:"theme"|"speed"|"style"|"font"|"pricelist"|"copas-repair")=>setOpenPanel(v=>v===panel?null:panel);

 const items=[
  {label:"SOH",sub:"Cek stock on hand",icon:Box,action:"soh"},
  {label:"BNPL",sub:"BNPL & Trade-In",icon:CreditCard,action:"bnpl"},
  {label:"Feedback",sub:"Input feedback staff",icon:MessageCircle,action:"add-feedback"},
  {label:"CX & New Member",sub:"Input CX dan member",icon:Users,action:"add-cx"},
  {label:"Incentive",sub:"Estimasi incentive staff",icon:WalletCards,action:"incentive"},
  {label:"Versi Lama",sub:"Buka tampilan desktop lama",icon:Clock3,action:"mobile-view"},
  {label:"Settings",sub:"Pricelist aksesoris, theme & tampilan",icon:Settings,action:"settings"},
 ] as const;

 if(screen==="settings")return <div className="m238m-more m238m-settings-page">
  <div className="m238m-settings-head">
   <button onClick={()=>{setScreen("menu");setOpenPanel(null)}} aria-label="Kembali"><ChevronLeft size={20}/></button>
   <div><strong>Settings</strong><span>Data & Tampilan Dashboard</span></div>
  </div>

  <section>
   <h3>Data Master</h3>
   <div className={"m238m-appearance-panel "+(openPanel==="pricelist"?"open":"")}>
    <button className="m238m-appearance-summary" onClick={()=>toggle("pricelist")} aria-expanded={openPanel==="pricelist"}><span><strong>Upload Pricelist Aksesoris</strong><small>Tambahkan aksesoris baru ke Master</small></span><ChevronRight size={18}/></button>
    {openPanel==="pricelist"?<AccessoryPricelistUpload/>:null}
   </div>
   <div className={"m238m-appearance-panel "+(openPanel==="copas-repair"?"open":"")}>
    <button className="m238m-appearance-summary" onClick={()=>toggle("copas-repair")} aria-expanded={openPanel==="copas-repair"}><span><strong>Cek &amp; Perbaiki Data Copas</strong><small>Perbaiki N/A dari Master terbaru</small></span><ChevronRight size={18}/></button>
    {openPanel==="copas-repair"?<div className="m238m-appearance-body"><DataCopasRepair/></div>:null}
   </div>
  </section>

  <section>
   <h3>Appearance</h3>
   <div className="m238m-appearance-accordion">
    <div className={"m238m-appearance-panel "+(openPanel==="theme"?"open":"")}>
     <button className="m238m-appearance-summary" onClick={()=>toggle("theme")}><span><strong>Theme Design</strong><small>{activeTheme?.name||"Classic iOS"}</small></span><ChevronRight size={18}/></button>
     {openPanel==="theme"?<div className="m238m-appearance-body"><div className="m238m-theme-grid">{themes.map(t=><button key={t.id} className={"m238m-theme-choice "+(theme===t.id?"active":"")} data-preview={t.id} onClick={()=>{onTheme(t.id);setOpenPanel(null)}}><i className="m238m-theme-preview"><span/><b/><em/></i><strong>{t.name}</strong><small>{t.desc}</small>{theme===t.id?<span className="m238m-theme-check">✓</span>:null}</button>)}</div></div>:null}
    </div>
    <div className={"m238m-appearance-panel "+(openPanel==="speed"?"open":"")}>
     <button className="m238m-appearance-summary" onClick={()=>toggle("speed")}><span><strong>Animation Speed</strong><small>{motionLabels[motion]}</small></span><ChevronRight size={18}/></button>
     {openPanel==="speed"?<div className="m238m-appearance-body"><div className="m238m-motion-pills">{([["instant","Instant"],["minimal","Minimal"],["smooth","Smooth"],["dynamic","Dynamic"],["cinematic","Cinematic"]] as [MotionPreset,string][]).map(([id,label])=><button key={id} className={motion===id?"active":""} onClick={()=>{onMotion(id);setOpenPanel(null)}}>{label}</button>)}</div></div>:null}
    </div>
    <div className={"m238m-appearance-panel "+(openPanel==="style"?"open":"")}>
     <button className="m238m-appearance-summary" onClick={()=>toggle("style")}><span><strong>Animation Style</strong><small>{styleLabels[motionStyle]}</small></span><ChevronRight size={18}/></button>
     {openPanel==="style"?<div className="m238m-appearance-body"><div className="m238m-motion-style-grid">{([["clean","Clean"],["ios-spring","iOS Spring"],["glass-flow","Glass Flow"],["playful-bounce","Bounce"],["executive","Executive"],["stagger","Stagger"],["blur","Blur"],["elastic","Elastic"],["fade-up","Fade Up"],["zoom-soft","Soft Zoom"],["slide-flow","Slide Flow"],["float","Float"]] as [MotionStyle,string][]).map(([id,label])=><button key={id} className={motionStyle===id?"active":""} onClick={()=>{onMotionStyle(id);setOpenPanel(null)}}>{label}</button>)}</div></div>:null}
    </div>
   </div>
  </section>

  <section>
   <h3>Font</h3>
   <div className={"m238m-appearance-panel "+(openPanel==="font"?"open":"")}>
    <button className="m238m-appearance-summary" onClick={()=>toggle("font")}><span><strong>Font Style</strong><small>{fontLabels[font]}</small></span><ChevronRight size={18}/></button>
    {openPanel==="font"?<div className="m238m-appearance-body"><div className="m238m-font-options">{(["system","rounded","compact","modern","editorial","tech","soft","bold","mono"] as FontPreset[]).map(id=><button key={id} className={font===id?"active":""} onClick={()=>{onFont(id);setOpenPanel(null)}}><Type size={16}/><span>{fontLabels[id]}</span>{font===id?<b>✓</b>:null}</button>)}</div></div>:null}
   </div>
  </section>

  <section>
   <h3>Lainnya</h3>
   <div className="m238m-settings-note">Pengaturan tampilan tersimpan di perangkat ini. Upload pricelist memperbarui Master; Cek &amp; Perbaiki Data Copas menyelaraskan kembali klasifikasi setelah konfirmasi.</div>
  </section>
 </div>;

 return <div className="m238m-more m238m-more-direct">
  <div className="m238m-more-title"><strong>More</strong><span>Menu tambahan M238</span></div>
  <div className="m238m-direct-menu">
   {items.map(({label,sub,icon:Icon,action})=><button key={action} onClick={()=>action==="settings"?setScreen("settings"):onAction(action)}>
    <span className="m238m-direct-icon"><Icon size={19}/></span>
    <span className="m238m-direct-copy"><strong>{label}</strong><small>{sub}</small></span>
    <ChevronRight size={18}/>
   </button>)}
   <button className="m238m-logout-row" onClick={()=>void fetch("/api/auth/logout",{method:"POST"}).finally(()=>{window.location.href="/login"})}>
    <span className="m238m-direct-icon"><LogOut size={19}/></span>
    <span className="m238m-direct-copy"><strong>Logout</strong><small>Keluar dari dashboard</small></span>
    <ChevronRight size={18}/>
   </button>
  </div>
 </div>
}
