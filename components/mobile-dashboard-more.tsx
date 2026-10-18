"use client";
import {useEffect,useRef,useState} from "react";
import dynamic from "next/dynamic";
import StockRequestMd from "@/components/stock-request-md";
const AccessoryPricelistUpload=dynamic(()=>import("@/components/accessory-pricelist-upload"));
const CopasInvoiceCheck=dynamic(()=>import("@/components/copas-invoice-check"));
const DataCopasRepair=dynamic(()=>import("@/components/data-copas-repair"));
import {Box,ChevronLeft,ChevronRight,Clock3,CreditCard,LogOut,Mail,MessageCircle,Settings,Type,Users,WalletCards,FileSpreadsheet,Smartphone,WandSparkles,Palette,Check,ReceiptText} from "lucide-react";

type ThemePreset="classic"|"midnight"|"aurora"|"playful"|"graphite"|"sunset"|"forest"|"mono"|"webhero"|"mecha"|"alliance";
type MotionPreset="instant"|"minimal"|"smooth"|"dynamic"|"cinematic";
type MotionStyle="clean"|"ios-spring"|"glass-flow"|"playful-bounce"|"executive"|"stagger"|"blur"|"elastic"|"fade-up"|"zoom-soft"|"slide-flow"|"float";
type FontPreset="system"|"rounded"|"compact"|"modern"|"editorial"|"tech"|"soft"|"bold"|"mono";

type Screen="menu"|"settings"|"stock-request"|"pricelist"|"device-pricelist"|"copas-repair"|"appearance"|"copas-invoices";

export default function MoreScreen({theme,motion,motionStyle,font,onTheme,onMotion,onMotionStyle,onFont,onAction,onBusyChange}:{theme:ThemePreset;motion:MotionPreset;motionStyle:MotionStyle;font:FontPreset;onTheme:(v:ThemePreset)=>void;onMotion:(v:MotionPreset)=>void;onMotionStyle:(v:MotionStyle)=>void;onFont:(v:FontPreset)=>void;onAction:(action:string)=>void;onBusyChange?:(busy:boolean)=>void}){
 const[screen,setScreen]=useState<Screen>("menu"),[busy,setBusy]=useState(false);
 const headingRef=useRef<HTMLHeadingElement>(null);
 const changeBusy=(value:boolean)=>{setBusy(value);onBusyChange?.(value)};
 useEffect(()=>{window.scrollTo({top:0,behavior:"instant"});headingRef.current?.focus({preventScroll:true})},[screen]);
 const navigate=(next:Screen)=>{if(!busy)setScreen(next)};
 const titles:Record<Screen,string>={menu:"More",settings:"Settings","stock-request":"Stock Request MD",pricelist:"Pricelist Aksesoris","device-pricelist":"Pricelist Device","copas-repair":"Perbaiki Data Copas",appearance:"Tampilan","copas-invoices":"Cek Invoice Exchange/Cancel"};
 const subheading:Record<Screen,string>={menu:"Menu tambahan M238",settings:"Data master dan pengaturan dashboard","stock-request":"SOH, penjualan dan kebutuhan stok",pricelist:"Data Master / Accessories & VAS","device-pricelist":"Data Master / Apple Device","copas-repair":"Data Master / Perbaikan klasifikasi",appearance:"Tema, font dan animasi","copas-invoices":"RAW kolom Y / Pemeriksaan Data Copas"};
 const pageHeader=(back:Screen)=><header className="m238-settings-heading"><button type="button" disabled={busy} onClick={()=>navigate(back)} aria-label={back==="settings"?"Kembali ke Settings":"Kembali ke More"}><ChevronLeft size={20}/></button><div><h1 ref={headingRef} tabIndex={-1}>{titles[screen]}</h1><p>{subheading[screen]}</p></div></header>;

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
  {id:"alliance",name:"Hero Alliance",desc:"Navy silver premium"}
 ];
 const motionLabels:Record<MotionPreset,string>={instant:"Instant",minimal:"Minimal",smooth:"Smooth",dynamic:"Dynamic",cinematic:"Cinematic"};
 const styleLabels:Record<MotionStyle,string>={clean:"Clean","ios-spring":"iOS Spring","glass-flow":"Glass Flow","playful-bounce":"Bounce",executive:"Executive",stagger:"Stagger",blur:"Blur",elastic:"Elastic","fade-up":"Fade Up","zoom-soft":"Soft Zoom","slide-flow":"Slide Flow",float:"Float"};
 const fontLabels:Record<FontPreset,string>={system:"System / iOS",rounded:"Rounded",compact:"Compact",modern:"Modern",editorial:"Editorial",tech:"Tech",soft:"Soft",bold:"Bold Display",mono:"Mono"};
 const activeTheme=themes.find(t=>t.id===theme);


 const items=[
  {label:"SOH",sub:"Cek stock on hand",icon:Box,action:"soh"},
  {label:"Stock Request MD",sub:"Compile SOH, sales week & lost ke email",icon:Mail,action:"stock-request"},
  {label:"BNPL",sub:"BNPL & Trade-In",icon:CreditCard,action:"bnpl"},
  {label:"Feedback",sub:"Input feedback staff",icon:MessageCircle,action:"add-feedback"},
  {label:"CX & New Member",sub:"Input CX dan member",icon:Users,action:"add-cx"},
  {label:"Incentive",sub:"Estimasi incentive staff",icon:WalletCards,action:"incentive"},
  {label:"Versi Lama",sub:"Buka tampilan desktop lama",icon:Clock3,action:"mobile-view"},
  {label:"Settings",sub:"Pricelist, perbaikan data dan tampilan",icon:Settings,action:"settings"},
 ] as const;

 if(screen==="stock-request")return <div className="m238-settings">{pageHeader("menu")}<StockRequestMd/></div>;

 if(screen==="pricelist"||screen==="device-pricelist"||screen==="copas-repair"||screen==="copas-invoices")return <div className="m238-settings m238-settings-tool">{pageHeader("settings")}
  {screen==="copas-invoices"?<CopasInvoiceCheck onBusyChange={changeBusy}/>:screen==="copas-repair"?<DataCopasRepair onBusyChange={changeBusy}/>:<AccessoryPricelistUpload key={screen} kind={screen==="device-pricelist"?"device":"accessory"} onBusyChange={changeBusy}/>}
 </div>;

 if(screen==="appearance")return <div className="m238-settings">{pageHeader("settings")}
  <p className="m238-settings-hint">Perubahan langsung terlihat dan tersimpan di perangkat ini.</p>
  <section className="m238-settings-group"><h2>Tema</h2><div className="m238-theme-options">{themes.slice(0,3).map(t=><button type="button" key={t.id} data-preview={t.id} className={theme===t.id?"selected":""} aria-pressed={theme===t.id} onClick={()=>onTheme(t.id)}><span className="m238-theme-swatch"/><span><strong>{t.name}</strong><small>{t.desc}</small></span>{theme===t.id?<Check size={18}/>:null}</button>)}</div>
   <details className="m238-settings-advanced"><summary>Tema lainnya</summary><div className="m238-setting-chips">{themes.slice(3).map(t=><button type="button" key={t.id} aria-pressed={theme===t.id} onClick={()=>onTheme(t.id)}>{t.name}</button>)}</div></details>
  </section>
  <section className="m238-settings-group"><h2>Font</h2><div className="m238-setting-chips">{(["system","rounded","modern"] as FontPreset[]).map(id=><button type="button" key={id} aria-pressed={font===id} onClick={()=>onFont(id)}>{fontLabels[id]}</button>)}</div>
   <details className="m238-settings-advanced"><summary>Font lainnya</summary><div className="m238-setting-chips">{(["compact","editorial","tech","soft","bold","mono"] as FontPreset[]).map(id=><button type="button" key={id} aria-pressed={font===id} onClick={()=>onFont(id)}><Type size={16}/>{fontLabels[id]}</button>)}</div></details>
  </section>
  <section className="m238-settings-group"><h2>Animasi</h2><div className="m238-setting-chips">{([["instant","Instan"],["minimal","Ringan"],["smooth","Halus"]] as [MotionPreset,string][]).map(([id,label])=><button type="button" key={id} aria-pressed={motion===id} onClick={()=>onMotion(id)}>{label}</button>)}</div>
   <details className="m238-settings-advanced"><summary>Pengaturan animasi lanjutan</summary><p>Kecepatan</p><div className="m238-setting-chips">{(["dynamic","cinematic"] as MotionPreset[]).map(id=><button type="button" key={id} aria-pressed={motion===id} onClick={()=>onMotion(id)}>{motionLabels[id]}</button>)}</div><p>Gaya animasi</p><div className="m238-setting-chips">{(Object.keys(styleLabels) as MotionStyle[]).map(id=><button type="button" key={id} aria-pressed={motionStyle===id} onClick={()=>onMotionStyle(id)}>{styleLabels[id]}</button>)}</div></details>
  </section>
 </div>;

 if(screen==="settings")return <div className="m238-settings">{pageHeader("menu")}
  <section className="m238-settings-group"><h2>Data Master</h2><div className="m238-settings-list">{([
   ["pricelist","Pricelist Aksesoris","Tambah Accessories dan VAS ke Master",FileSpreadsheet],
   ["device-pricelist","Pricelist Device","Tambah unit baru dan klasifikasi",Smartphone],
   ["copas-repair","Perbaiki Data Copas","Cek dan perbaiki N/A dari Master",WandSparkles],
   ["copas-invoices","Cek Invoice Exchange/Cancel","Periksa invoice kolom Y di Data Copas",ReceiptText],
  ] as const).map(([next,title,description,Icon])=><button type="button" key={next} onClick={()=>navigate(next)}><span className="m238-settings-icon"><Icon size={19}/></span><span className="m238-settings-copy"><strong>{title}</strong><small>{description}</small></span><ChevronRight size={18}/></button>)}</div></section>
  <section className="m238-settings-group"><h2>Preferensi</h2><div className="m238-settings-list"><button type="button" onClick={()=>navigate("appearance")}><span className="m238-settings-icon"><Palette size={19}/></span><span className="m238-settings-copy"><strong>Tampilan</strong><small>{activeTheme?.name||theme} · {fontLabels[font]} · {motionLabels[motion]}</small></span><ChevronRight size={18}/></button></div></section>
  <p className="m238-settings-hint">Pilih menu Data Master untuk upload dan pemeriksaan. Setiap perubahan data ditampilkan terlebih dahulu sebelum disimpan.</p>
 </div>;

 return <div className="m238m-more m238m-more-direct">
  <div className="m238m-more-title"><strong>More</strong><span>Menu tambahan M238</span></div>
  <div className="m238m-direct-menu">
   {items.map(({label,sub,icon:Icon,action})=><button key={action} onClick={()=>action==="settings"?navigate("settings"):action==="stock-request"?navigate("stock-request"):onAction(action)}>
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
