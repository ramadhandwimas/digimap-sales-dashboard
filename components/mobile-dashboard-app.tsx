"use client";

import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties,type ReactNode} from "react";
import dynamic from "next/dynamic";
import {
  Activity,Box,Briefcase,CalendarDays,ChevronRight,ClipboardCheck,Copy,CreditCard,FileDown,
  FileSpreadsheet,Home,Lightbulb,LogOut,MessageCircle,MoreHorizontal,Moon,
  PackageSearch,RefreshCw,Settings,Share2,Sun,Target,TrendingUp,Users,WalletCards,X
} from "lucide-react";
import {exportReportPdf,exportReportPng,exportReportXlsx} from "@/lib/dashboard-export";

const ReportScreen=dynamic(()=>import("@/components/mobile-dashboard-report"),{ssr:false,loading:()=> <div className="m238m-stack m238m-fade"><div className="m238m-skeleton hero"/><div className="m238m-skeleton list"/></div>});
const MoreScreen=dynamic(()=>import("@/components/mobile-dashboard-more"),{ssr:false,loading:()=> <div className="m238m-stack m238m-fade"><div className="m238m-skeleton list"/><div className="m238m-skeleton list"/></div>});
const MobileOperations=dynamic(()=>import("@/components/mobile-operations"),{ssr:false,loading:()=> <div className="m238m-card">Memuat menu operasional…</div>});

type Tab="home"|"sales"|"team"|"report"|"admin"|"more";
type SalesMode="daily"|"summary"|"lob";
type FocusMode="lob"|"vas"|"third";
type ReportMode="weekly"|"feedback"|"cx";
type HomeMode="monthly"|"ytd"|"compare";
type ThemePreset="classic"|"midnight"|"aurora"|"playful"|"graphite"|"sunset"|"forest"|"mono";
type MotionPreset="minimal"|"smooth"|"dynamic";
type MotionStyle="clean"|"ios-spring"|"glass-flow"|"playful-bounce"|"executive"|"stagger"|"blur"|"elastic";
type CompareLob={lob:string;amount2025:number;amount2026:number|null;qty2025:number;qty2026:number|null;diff:number|null;growth:number|null;qtyDiff:number|null;qtyGrowth:number|null};
type CompareMonth={month:number;period2025:string;period2026:string;amount2025:number;amount2026:number|null;qty2025:number;qty2026:number|null;diff:number|null;growth:number|null;qtyDiff:number|null;qtyGrowth:number|null;device2025:number;device2026:number|null;deviceQty2025:number;deviceQty2026:number|null;deviceDiff:number|null;deviceGrowth:number|null;deviceQtyDiff:number|null;deviceQtyGrowth:number|null;lobs:CompareLob[];started:boolean};
type SheetName="period"|"share"|"staff"|"day"|"home-sales"|"more"|null;
type ProviderMetric={qty:number;value:number};
type Staff={
 id:string;name:string;position?:string;status?:string;amount:number;device:number;accessories:number;vas:number;qty:number;invoices:number;upt:number;atv:number;
 target?:number;achievement?:number|null;gap?:number;
 targets?:{amount:number;device:number;accessories:number;vas:number};
 lob?:{iphone:number;mac:number;ipad:number;watch:number;airpods:number};
 incentive?:{mac:number;iphone:number;ipad:number;watch:number;qoala:number;accessories:number;total:number};
 incentiveDetail?:{from:string;to:string;qty:{mac:number;iphone:number;ipad:number;watch:number;accessories:number;qoala:number};activeDays:number;rates:{accessories:Record<string,number>;qoala:Record<string,number>};teamTotal:number};
 vasDetail?:{qoala?:ProviderMetric;telkomsel?:ProviderMetric;xl?:ProviderMetric;indosat?:ProviderMetric};
};
type Overview={
 period:string;label:string;
 target:{amount:number;device:number;accessories:number;vas:number};
 summary:{amount:number;device:number;accessories:number;vas:number;invoices:number;qty:number;upt:number;atv:number;achievement:number;gap:number;pace:number;status:string;estimate:{amount:number;device:number;accessories:number;vas:number};point:{total:number;device:number;accessories:number;vas:number}};
 staff:Staff[];daily:{date:string;amount:number}[];
 lfl?:{amount2025?:number;amount2026?:number|null;diff?:number|null;growth:number|null;qty2025?:number;qty2026?:number|null;qtyGrowth?:number|null};
 team:{total:number;productive:number;needPush:number;totalTransactions?:number;avgUpt?:number;avgAtv?:number};
 compare?:CompareMonth[];
 ytd?:{amount2025:number;amount2026:number;growth:number;qty2025:number;qty2026:number;qtyGrowth:number;diff?:number;qtyDiff?:number;device2025?:number;device2026?:number;deviceQty2025?:number;deviceQty2026?:number;deviceDiff?:number;deviceGrowth?:number;deviceQtyDiff?:number;deviceQtyGrowth?:number;lobs?:CompareLob[];throughMonth?:number};
};
type Traffic={total:number;daily?:{date:string;traffic:number}[]};
type Daily={date:string;staff:Staff[];total:{amount:number;target:number;accessories:number;accTarget:number;vas:number;vasTarget:number;qty:number;invoices:number;upt:number}};
type DailyRow={
 date:string;day?:string;totalSales:number;target:number;achievementPct:number;traffic:number;cvr:number;upt:number;atv:number;transaction:number;invoice:number;qty:number;
 breakdown:{device:number;accessories:number;vas:number};
 lob:{iphoneQty:number;macbookQty:number;ipadQty:number;appleWatchQty:number;airpodsQty:number};
 vas:{qoalaQty:number;qoalaValue:number;telkomselQty:number;telkomselValue:number;xlQty:number;xlValue:number;indosatQty:number;indosatValue:number};
};
type LobFocus={lob?:Record<string,{target:number|null;achievement:number}>;types?:unknown[];configuredFocusKeys?:string[]};
type DailySummary={
 summary:{totalSales:number;target:number;achievementPct:number;transaction:number;invoice:number;qty:number;upt:number;atv:number;traffic:number;cvr:number;growthPct:number|null;previousTotal?:number;bestDay?:{date:string;amount:number}|null;lowestDay?:{date:string;amount:number}|null};
 breakdown:{device:number;accessories:number;vas:number;lob:{iphone:number;macbook:number;ipad:number;appleWatch:number;airpods:number}};
 lobFocus?:LobFocus;dailyRows?:DailyRow[];
};
type Weekly={labelA:string;labelB:string;availableWeeks?:string[];periodA?:{start:string;end:string};periodB:{start:string;end:string};a:{scheme:Record<string,{qty:number;amount:number}>;vas:Record<string,{qty:number;amount:number}>;lob:Record<string,Record<string,{qty:number;amount:number}>>};b:{scheme:Record<string,{qty:number;amount:number}>;vas:Record<string,{qty:number;amount:number}>;lob:Record<string,Record<string,{qty:number;amount:number}>>};targets:{configured?:boolean;sourceWeek?:string;lob:Record<string,number>;types?:Record<string,Record<string,{target:number;focus:boolean}>>;grandTotal:number};analysis:Record<string,{review:string;actionPlan:string;target:number;achievement:number;gap:number}>;feedbackCount?:number;feedbackSummary?:string};
type Feedback={rows:{date:string;staffId:string;name:string;category:string;raw:string;professional:string}[];summary?:string};
type Cx={rows:{date:string;staffId:string;name:string;cx:number;member:number}[]};

const cache=new Map<string,{at:number,data:unknown}>();
const inflight=new Map<string,Promise<unknown>>();
async function cachedJson<T>(url:string,ttl=180000,force=false):Promise<T>{
  if(force)cache.delete(url);
  const hit=cache.get(url);
  if(hit&&Date.now()-hit.at<ttl)return hit.data as T;
  const active=inflight.get(url);
  if(active)return active as Promise<T>;
  const task=fetch(url,force?{cache:"no-store"}:undefined).then(async r=>{const j=await r.json();if(!r.ok||j?.error)throw new Error(j?.error||"Data gagal dimuat");cache.set(url,{at:Date.now(),data:j});return j}).finally(()=>inflight.delete(url));
  inflight.set(url,task);
  return task as Promise<T>;
}

const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const num=new Intl.NumberFormat("id-ID");
const pct=(v:number|null|undefined)=>`${new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(Number(v||0))}%`;
const today=()=>new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());
const periodNow=()=>today().slice(0,7);
const monthLabel=(p:string)=>new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric",timeZone:"Asia/Jakarta"}).format(new Date(`${p}-01T00:00:00Z`));
const months=Array.from({length:12},(_,i)=>`2026-${String(i+1).padStart(2,"0")}`);
function initials(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()}
function shortStaffName(name:string){
 const raw=name.trim(),key=raw.toLowerCase();
 if(key.startsWith("muhammad farabi"))return "Farabi";
 if(key.startsWith("muhammada farabi"))return "Farabi";
 if(key.startsWith("muhammad haykal"))return "Haykal";
 if(key.startsWith("muhammada haykal"))return "Haykal";
 if(key==="rifo arvian ario"||key.startsWith("rifo arvian"))return "Rifo";
 const parts=raw.split(/\s+/).filter(Boolean);
 if(parts.length<=1)return raw;
 const preferred=parts[0].length<=4&&parts.length>2?parts[1]:parts[0];
 const rest=preferred===parts[0]?parts.slice(1):parts.filter(x=>x!==preferred);
 const initial=rest.find(x=>x.length>1)?.[0]||rest[0]?.[0]||"";
 return initial?`${preferred} ${initial}.`:preferred;
}
function salesDateLabel(date:string){
 const d=new Date(`${date}T00:00:00+07:00`);
 const day=new Intl.DateTimeFormat("id-ID",{day:"numeric",timeZone:"Asia/Jakarta"}).format(d);
 const month=new Intl.DateTimeFormat("id-ID",{month:"short",timeZone:"Asia/Jakarta"}).format(d).replace(".","");
 const year=new Intl.DateTimeFormat("id-ID",{year:"numeric",timeZone:"Asia/Jakarta"}).format(d);
 const weekday=new Intl.DateTimeFormat("id-ID",{weekday:"long",timeZone:"Asia/Jakarta"}).format(d);
 return `${day} ${month} ${year} • ${weekday}`;
}

function Card({children,className=""}:{children:ReactNode;className?:string}){return <section className={`m238m-card ${className}`}>{children}</section>}
function Progress({value}:{value:number}){return <div className="m238m-progress"><i style={{width:`${Math.max(0,Math.min(100,value))}%`}}/></div>}
function Metric({label,value,sub}:{label:string;value:string;sub?:string}){return <Card className="m238m-metric"><span>{label}</span><strong>{value}</strong>{sub?<small>{sub}</small>:null}</Card>}
function Segmented<T extends string>({value,onChange,items}:{value:T;onChange:(v:T)=>void;items:{value:T;label:string}[]}){return <div className="m238m-segment">{items.map(x=><button key={x.value} onClick={()=>onChange(x.value)} className={value===x.value?"active":""}>{x.label}</button>)}</div>}
function Skeleton(){return <div className="m238m-stack m238m-fade"><div className="m238m-skeleton hero"/><div className="m238m-grid">{Array.from({length:4},(_,i)=><div key={i} className="m238m-skeleton tile"/>)}</div><div className="m238m-skeleton list"/><div className="m238m-skeleton list"/></div>}

function Sheet({open,onClose,title,children}:{open:boolean;onClose:()=>void;title:string;children:ReactNode}){
  const[startY,setStartY]=useState<number|null>(null),[dragY,setDragY]=useState(0);
  useEffect(()=>{
    if(!open)return;
    const body=document.body,key="m238SheetLocks",count=Number(body.dataset[key]||0)+1;
    body.dataset[key]=String(count);body.style.overflow="hidden";
    return()=>{const next=Math.max(0,Number(body.dataset[key]||1)-1);if(next)body.dataset[key]=String(next);else{delete body.dataset[key];body.style.overflow=""}};
  },[open]);
  if(!open)return null;
  const move=(y:number)=>{if(startY==null)return;setDragY(Math.max(0,y-startY))};
  const end=()=>{if(dragY>90)onClose();setStartY(null);setDragY(0)};
  return <div className="m238m-sheet-layer" onClick={onClose}>
    <div className="m238m-sheet" style={{transform:dragY?`translateY(${dragY}px)`:undefined,transition:dragY?"none":undefined}} onClick={e=>e.stopPropagation()} onTouchMove={e=>move(e.touches[0].clientY)} onTouchEnd={end}>
      <button className="m238m-handle-button" aria-label="Geser untuk menutup" onTouchStart={e=>setStartY(e.touches[0].clientY)}><span className="m238m-handle"/></button>
      <div className="m238m-sheet-head"><h3>{title}</h3><button onClick={onClose}><X size={18}/></button></div>{children}
    </div>
  </div>
}

export default function MobileDashboardApp(){
  const[tab,setTab]=useState<Tab>("home"),[period,setPeriod]=useState(periodNow()),[draftPeriod,setDraftPeriod]=useState(periodNow()),[periodMode,setPeriodMode]=useState<"month"|"week">("month"),[draftPeriodMode,setDraftPeriodMode]=useState<"month"|"week">("month"),[selectedWeek,setSelectedWeek]=useState(""),[draftWeek,setDraftWeek]=useState(""),[activeRange,setActiveRange]=useState<{from:string;to:string}|null>(null),[sheet,setSheet]=useState<SheetName>(null),[moreKind,setMoreKind]=useState(""),[moreData,setMoreData]=useState<any>(null),[moreBusy,setMoreBusy]=useState(false);
  const[overview,setOverview]=useState<Overview|null>(null),[fullOverview,setFullOverview]=useState<Overview|null>(null),[traffic,setTraffic]=useState<Traffic|null>(null),[daily,setDaily]=useState<Daily|null>(null),[summary,setSummary]=useState<DailySummary|null>(null),[weekly,setWeekly]=useState<Weekly|null>(null),[weeklySummary,setWeeklySummary]=useState<DailySummary|null>(null),[feedback,setFeedback]=useState<Feedback|null>(null),[cx,setCx]=useState<Cx|null>(null),[staffDetail,setStaffDetail]=useState<Staff|null>(null),[staffDetailMode,setStaffDetailMode]=useState<"daily"|"monthly">("monthly"),[dayDetail,setDayDetail]=useState<DailyRow|null>(null);
  const[homeMode,setHomeMode]=useState<HomeMode>("monthly"),[salesMode,setSalesMode]=useState<SalesMode>("daily"),[reportMode,setReportMode]=useState<ReportMode>("weekly"),[teamFilter,setTeamFilter]=useState("all"),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[error,setError]=useState(""),[dark,setDark]=useState(false),[themePreset,setThemePreset]=useState<ThemePreset>("classic"),[motionPreset,setMotionPreset]=useState<MotionPreset>("smooth"),[motionStyle,setMotionStyle]=useState<MotionStyle>("clean");
  const rootRef=useRef<HTMLDivElement>(null),touchStart=useRef<number|null>(null);

  const loadOverview=useCallback(async(force=false)=>{
    setError("");
    const monthlyFrom=`${period}-01`,monthlyTo=period===periodNow()?today():`${period}-${String(new Date(Number(period.slice(0,4)),Number(period.slice(5,7)),0).getDate()).padStart(2,"0")}`;
    const from=periodMode==="week"&&activeRange?activeRange.from:monthlyFrom,to=periodMode==="week"&&activeRange?activeRange.to:monthlyTo;
    const overviewUrl=periodMode==="week"&&activeRange?`/api/overview?lite=1&period=${from.slice(0,7)}&from=${from}&to=${to}&label=${encodeURIComponent(selectedWeek)}`:`/api/overview?lite=1&period=${period}`;
    const overviewPromise=cachedJson<Overview>(overviewUrl,180000,force);
    const trafficPromise=cachedJson<Traffic>(`/api/traffic?from=${from}&to=${to}`,180000,force);
    const o=await overviewPromise;
    setOverview(o);
    try{setTraffic(await trafficPromise)}catch{setTraffic(null)}
  },[period,periodMode,activeRange,selectedWeek]);

  const loadFullOverview=useCallback(async(force=false)=>{
    const d=await cachedJson<Overview>(`/api/overview?period=${period}`,180000,force);
    setFullOverview(d);
    return d;
  },[period]);
  useEffect(()=>{setLoading(true);loadOverview().catch(e=>setError(e instanceof Error?e.message:"Gagal memuat dashboard")).finally(()=>setLoading(false))},[loadOverview]);
  useEffect(()=>{if(tab==="home"&&homeMode!=="monthly"&&!fullOverview)void loadFullOverview()},[tab,homeMode,fullOverview,loadFullOverview]);
  useEffect(()=>{
    const saved=(localStorage.getItem("m238-theme-preset")||"") as ThemePreset;
    const legacyDark=localStorage.getItem("m238-theme")==="dark";
    const initial:ThemePreset=["classic","midnight","aurora","playful","graphite","sunset","forest","mono"].includes(saved)?saved:(legacyDark?"midnight":"classic");
    const motion=(localStorage.getItem("m238-motion-preset")||"smooth") as MotionPreset;
    const style=(localStorage.getItem("m238-motion-style")||"clean") as MotionStyle;
    setThemePreset(initial);setMotionPreset(["minimal","smooth","dynamic"].includes(motion)?motion:"smooth");
    setMotionStyle(["clean","ios-spring","glass-flow","playful-bounce","executive","stagger","blur","elastic"].includes(style)?style:"clean");
    const isDark=initial==="midnight"||initial==="graphite"||initial==="mono";setDark(isDark);document.documentElement.classList.toggle("dark",isDark);
  },[]);

  const loadDaily=useCallback(async(force=false)=>{const d=await cachedJson<Daily>(`/api/daily-fast?date=${today()}`,90000,force);setDaily(d)},[]);
  const loadSummary=useCallback(async(force=false)=>{const monthlyFrom=`${period}-01`,monthlyTo=period===periodNow()?today():`${period}-${String(new Date(Number(period.slice(0,4)),Number(period.slice(5,7)),0).getDate()).padStart(2,"0")}`,from=periodMode==="week"&&activeRange?activeRange.from:monthlyFrom,to=periodMode==="week"&&activeRange?activeRange.to:monthlyTo,mode=periodMode==="week"&&activeRange?"range":"monthly";const d=await cachedJson<DailySummary>(`/api/daily-summary-fast?from=${from}&to=${to}&mode=${mode}`,180000,force);setSummary(d)},[period,periodMode,activeRange]);
  const loadWeekly=useCallback(async(force=false,weekOverride="")=>{
    let url="/api/weekly-stable";
    if(weekOverride){
      const base=await cachedJson<Weekly>("/api/weekly-stable",180000,force),weeks=base.availableWeeks||[],idx=weeks.indexOf(weekOverride),from=idx>0?weeks[idx-1]:"";
      url=`/api/weekly-stable?to=${encodeURIComponent(weekOverride)}${from?`&from=${encodeURIComponent(from)}`:""}`;
    }
    const w=await cachedJson<Weekly>(url,180000,force);setWeekly(w);setSelectedWeek(w.labelB||weekOverride);
    if(w.periodB?.start&&w.periodB?.end){
      const s=await cachedJson<DailySummary>(`/api/daily-summary-fast?from=${w.periodB.start}&to=${w.periodB.end}&mode=range`,180000,force);setWeeklySummary(s);
    }
    return w;
  },[]);
  const loadFeedback=useCallback(async(force=false)=>{
    const periods=periodMode==="week"&&activeRange?[...new Set([activeRange.from.slice(0,7),activeRange.to.slice(0,7)])]:[period];
    const parts=await Promise.all(periods.map(p=>cachedJson<Feedback>(`/api/feedback?period=${p}`,180000,force)));
    const merged=[...new Map(parts.flatMap(x=>x.rows||[]).map(r=>[`${r.date}:${r.staffId}`,r])).values()];
    const rows=periodMode==="week"&&activeRange?merged.filter(r=>r.date>=activeRange.from&&r.date<=activeRange.to):merged;
    setFeedback({rows,summary:parts.map(x=>x.summary||"").find(Boolean)||""});
  },[period,periodMode,activeRange]);
  const loadCx=useCallback(async(force=false)=>{
    const periods=periodMode==="week"&&activeRange?[...new Set([activeRange.from.slice(0,7),activeRange.to.slice(0,7)])]:[period];
    const parts=await Promise.all(periods.map(p=>cachedJson<Cx>(`/api/cx-member?period=${p}`,180000,force)));
    const merged=[...new Map(parts.flatMap(x=>x.rows||[]).map(r=>[`${r.date}:${r.staffId}`,r])).values()];
    const rows=periodMode==="week"&&activeRange?merged.filter(r=>r.date>=activeRange.from&&r.date<=activeRange.to):merged;
    setCx({rows});
  },[period,periodMode,activeRange]);

  useEffect(()=>{if(tab==="sales"){if(salesMode==="daily"&&!daily)void loadDaily();if((salesMode==="summary"||salesMode==="lob")&&!summary)void loadSummary()}},[tab,salesMode,daily,summary,loadDaily,loadSummary]);
  useEffect(()=>{if(tab!=="report")return;if(reportMode==="weekly"&&!weekly)void loadWeekly();if(reportMode==="feedback"&&!feedback)void loadFeedback();if(reportMode==="cx"&&!cx)void loadCx()},[tab,reportMode,weekly,feedback,cx,loadWeekly,loadFeedback,loadCx]);
  useEffect(()=>{if(sheet==="period"&&draftPeriodMode==="week"&&!draftWeek&&weekly?.labelB)setDraftWeek(weekly.labelB)},[sheet,draftPeriodMode,draftWeek,weekly]);

  const refresh=useCallback(async()=>{
    setRefreshing(true);
    try{
      if(tab==="home")await loadOverview(true);
      else if(tab==="sales")await (salesMode==="daily"?loadDaily(true):loadSummary(true));
      else if(tab==="report")await (reportMode==="weekly"?loadWeekly(true):reportMode==="feedback"?loadFeedback(true):loadCx(true));
      else if(tab==="team")await loadOverview(true);
    }finally{setRefreshing(false)}
  },[tab,salesMode,reportMode,loadOverview,loadDaily,loadSummary,loadWeekly,loadFeedback,loadCx]);

  const openStaff=async(staff:Staff,mode:"daily"|"monthly"="monthly")=>{
    setStaffDetailMode(mode);setStaffDetail(staff);setSheet("staff");if(mode==="daily")return;
    try{
      const from=periodMode==="week"&&activeRange?activeRange.from:`${period}-01`,to=periodMode==="week"&&activeRange?activeRange.to:(period===periodNow()?today():`${period}-${String(new Date(Number(period.slice(0,4)),Number(period.slice(5,7)),0).getDate()).padStart(2,"0")}`);
      const staffUrl=periodMode==="week"&&activeRange?`/api/staff-performance-month?period=${activeRange.from.slice(0,7)}&from=${activeRange.from}&to=${activeRange.to}`:`/api/staff-performance-month?period=${period}`;
      const[d,incData]=await Promise.all([
        cachedJson<{staff:Staff[]}>(staffUrl,180000),
        cachedJson<any>(`/api/incentive-range?from=${from}&to=${to}`,180000)
      ]);
      const full=d.staff.find(x=>x.id===staff.id);
      const ir=(incData.rows||[]).find((x:any)=>String(x.id)===String(staff.id));
      if(full){
        setStaffDetail({...full,
          incentive:ir?.incentive?{
            mac:Number(ir.incentive.mac||0),
            iphone:Number(ir.incentive.iphone||0),
            ipad:Number(ir.incentive.ipad||0),
            watch:Number(ir.incentive.watch||0),
            accessories:Number(ir.incentive.accessories||0),
            qoala:Number(ir.incentive.qoala||0),
            total:Number(ir.incentive.total||0)
          }:full.incentive,
          incentiveDetail:ir?{from:incData.from,to:incData.to,qty:ir.qty||{},activeDays:Number(ir.activeDays||0),rates:ir.rates||{accessories:{},qoala:{}},teamTotal:Number(incData.total||0)}:undefined
        });
      }
    }catch{}
  };
  const openHomeSalesDetail=async()=>{
    setSheet("home-sales");
    if(summary)return;
    try{await loadSummary()}catch(e){setError(e instanceof Error?e.message:"Gagal memuat detail Total Sales")}
  };
  const applyTheme=(preset:ThemePreset)=>{
    setThemePreset(preset);localStorage.setItem("m238-theme-preset",preset);
    const isDark=preset==="midnight"||preset==="graphite"||preset==="mono";setDark(isDark);localStorage.setItem("m238-theme",isDark?"dark":"light");document.documentElement.classList.toggle("dark",isDark);
    let meta=document.querySelector('meta[name="theme-color"]') as HTMLMetaElement|null;if(!meta){meta=document.createElement("meta");meta.name="theme-color";document.head.appendChild(meta)}
    meta.content=preset==="midnight"?"#080b14":preset==="graphite"?"#111315":preset==="mono"?"#050505":preset==="aurora"?"#ece9ff":preset==="playful"?"#fff7df":preset==="sunset"?"#fff1e8":preset==="forest"?"#eef6ef":"#f2f2f7";
  };
  const applyMotion=(preset:MotionPreset)=>{setMotionPreset(preset);localStorage.setItem("m238-motion-preset",preset)};
  const applyMotionStyle=(preset:MotionStyle)=>{setMotionStyle(preset);localStorage.setItem("m238-motion-style",preset)};
  const transaction=overview?.summary.invoices||0,trafficValue=traffic?.total||0,cvr=trafficValue?transaction/trafficValue*100:0,achievement=overview?.target.amount?((overview.summary.amount/overview.target.amount)*100):0;
  const teamAll=useMemo(()=>(overview?.staff||[]).filter(x=>!/digimap\.co\.id|online/i.test(`${x.name} ${x.position||""}`)).sort((a,b)=>b.amount-a.amount),[overview]);
  const team=useMemo(()=>{
    if(teamFilter==="top")return [...teamAll].slice(0,3);
    if(teamFilter==="low")return teamAll.filter(s=>{const target=s.targets?.amount||s.target||0,ar=target?s.amount/target*100:(s.achievement||0);return ar<100}).sort((a,b)=>{const ta=a.targets?.amount||a.target||0,tb=b.targets?.amount||b.target||0,aa=ta?a.amount/ta*100:(a.achievement||0),ab=tb?b.amount/tb*100:(b.achievement||0);return aa-ab||(tb-b.amount)-(ta-a.amount)});
    return teamAll;
  },[teamAll,teamFilter]);

  const openPeriodSheet=()=>{setDraftPeriod(period);setDraftPeriodMode(periodMode);setDraftWeek(selectedWeek||weekly?.labelB||"");setSheet("period");if(!weekly)void loadWeekly()};
  const applyPeriod=async()=>{
    if(draftPeriodMode==="week"){
      if(!draftWeek)return;
      setRefreshing(true);
      try{
        const w=await loadWeekly(true,draftWeek);
        if(w?.periodB?.start&&w?.periodB?.end){
          setPeriodMode("week");setSelectedWeek(w.labelB||draftWeek);setActiveRange({from:w.periodB.start,to:w.periodB.end});setPeriod(w.periodB.start.slice(0,7));
          setDaily(null);setSummary(null);setWeeklySummary(null);setFeedback(null);setCx(null);setOverview(null);setFullOverview(null);setTraffic(null);setSheet(null);
        }
      }finally{setRefreshing(false)}
      return;
    }
    setPeriodMode("month");setActiveRange(null);setSelectedWeek("");setPeriod(draftPeriod);setDaily(null);setSummary(null);setWeekly(null);setWeeklySummary(null);setFeedback(null);setCx(null);setOverview(null);setFullOverview(null);setTraffic(null);setSheet(null);
  };
  const shareText=`M238 PIM 2 • ${overview?.label||monthLabel(period)}\nSales ${money.format(overview?.summary.amount||0)}\nAchievement ${pct(achievement)}\nUPT ${(overview?.summary.upt||0).toFixed(1)}`;
  const doShare=async(kind:string)=>{if(kind==="wa")window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`,"_blank");else if(kind==="copy")await navigator.clipboard.writeText(shareText);else if(rootRef.current&&kind==="png")await exportReportPng(rootRef.current,`M238-${period}`);else if(rootRef.current&&kind==="pdf")await exportReportPdf(rootRef.current,`M238-${period}`);else if(kind==="xlsx"&&overview)await exportReportXlsx([{name:"Overview",rows:[["Periode",overview.label],["Sales",overview.summary.amount],["Target",overview.target.amount],["Achievement",achievement],["UPT",overview.summary.upt],[],["Staff","Sales","Achievement"],...overview.staff.map(s=>[s.name,s.amount,s.achievement??0])]}],`M238-${period}`);setSheet(null)};

  const handleMore=async(action:string)=>{
    if(action==="admin"){setTab("admin");setSheet(null);return}
    if(action==="activity"){setTab("sales");setSalesMode("summary");return}
    setMoreKind(action);setMoreData(null);setSheet("more");
    if(action!=="incentive")return;
    setMoreBusy(true);
    try{
      const from=periodMode==="week"&&activeRange?activeRange.from:`${period}-01`,to=periodMode==="week"&&activeRange?activeRange.to:(period===periodNow()?today():`${period}-${String(new Date(Number(period.slice(0,4)),Number(period.slice(5,7)),0).getDate()).padStart(2,"0")}`);
      setMoreData(await cachedJson<any>(`/api/incentive-range?from=${from}&to=${to}`,180000));
    }catch(e){setMoreData({error:e instanceof Error?e.message:"Gagal memuat data"})}
    finally{setMoreBusy(false)}
  };

  const shareDailyKind=async(kind:"daily"|"lob"|"vas")=>{
    try{
      const d=daily||await cachedJson<Daily>(`/api/daily-fast?date=${today()}`,90000);
      const stamp=new Intl.DateTimeFormat("id-ID",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Asia/Jakarta"}).format(new Date()).replace(":",".");
      const {makeDailySalesPicture,makeLobPicture,makeVasPicture}=await import("@/components/daily-sales-alerts");
      let blob:Blob,title="",fileName="",text="";
      if(kind==="daily"){blob=await makeDailySalesPicture(d as any);title="M238 Daily Sales";fileName=`M238-Daily-Sales-${d.date}-${stamp}.png`;text=`M238 PIM 2\nUpdate sales jam ${stamp} WIB`}
      else if(kind==="lob"){blob=await makeLobPicture(d as any,stamp);title="M238 LOB Daily";fileName=`M238-LOB-Daily-${d.date}-${stamp}.png`;text=`M238 PIM 2\nLOB Daily • Update sales jam ${stamp} WIB`}
      else{blob=await makeVasPicture(d as any,stamp);title="M238 VAS Daily";fileName=`M238-VAS-Daily-${d.date}-${stamp}.png`;text=`M238 PIM 2\nVAS Daily • Update sales jam ${stamp} WIB`}
      const file=new File([blob],fileName,{type:"image/png"});
      if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))await navigator.share({files:[file],title,text});
      else{const url=URL.createObjectURL(file),a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
      setSheet(null);
    }catch(e){setError(e instanceof Error?e.message:"Gagal membuat report share")}
  };

  const touchMove=(e:React.TouchEvent)=>{if(touchStart.current==null||window.scrollY>0)return;const delta=e.touches[0].clientY-touchStart.current;if(delta>90&&!refreshing){touchStart.current=null;void refresh()}};

  return <div ref={rootRef} className="m238m-app" data-theme={themePreset} data-motion={motionPreset} data-motion-style={motionStyle} onTouchStart={e=>{if(window.scrollY===0)touchStart.current=e.touches[0].clientY}} onTouchMove={touchMove} onTouchEnd={()=>{touchStart.current=null}}>
    <header className="m238m-header">
      <div><span>M238 Dashboard</span><strong>PIM 2</strong></div>
      <div className="m238m-header-actions"><button onClick={()=>setSheet("share")} aria-label="Share"><Share2 size={19}/></button><button onClick={()=>void refresh()} aria-label="Refresh"><RefreshCw size={19} className={refreshing?"spin":""}/></button></div>
    </header>
    <main className="m238m-content">
      <button className="m238m-period" onClick={openPeriodSheet}><CalendarDays size={15}/><span>{periodMode==="week"?(selectedWeek||weekly?.labelB||"Pilih Week"):monthLabel(period)}</span><small>{periodMode==="week"?"Weekly":(weekly?.labelB||"Week berjalan")}</small><ChevronRight size={15}/></button>
      {refreshing?<div className="m238m-refreshing"><RefreshCw size={14} className="spin"/> Memperbarui data…</div>:null}
      {error?<Card className="m238m-error">{error}</Card>:null}
      {loading&&!overview?<Skeleton/>:null}
      {!loading&&overview&&tab==="home"?<HomeScreen mode={homeMode} setMode={setHomeMode} overview={homeMode==="monthly"?overview:(fullOverview||overview)} traffic={traffic} cvr={cvr} achievement={achievement} periodMode={periodMode} fullLoading={homeMode!=="monthly"&&!fullOverview} onOpenSalesDetail={()=>void openHomeSalesDetail()} onGoSales={()=>setTab("sales")} onGoTeam={()=>setTab("team")} onGoReport={()=>setTab("report")} onShare={()=>setSheet("share")}/>:null}
      {tab==="sales"?<SalesScreen mode={salesMode} setMode={setSalesMode} daily={daily} summary={summary} period={period} periodMode={periodMode} selectedWeek={selectedWeek} activeRange={activeRange} onStaff={s=>void openStaff(s,"daily")} onDay={row=>{setDayDetail(row);setSheet("day")}} onShare={()=>setSheet("share")}/>:null}
      {tab==="team"?<TeamScreen rows={team} allRows={teamAll} filter={teamFilter} setFilter={setTeamFilter} onStaff={s=>void openStaff(s,"monthly")}/>:null}
      {tab==="report"?<ReportScreen mode={reportMode} setMode={setReportMode} weekly={weekly} weeklySummary={weeklySummary} feedback={feedback} cx={cx} staff={overview?.staff||[]} period={period} periodMode={periodMode} activeRange={activeRange}/>:null}
      {tab==="admin"?<AdminScreen period={period} periodMode={periodMode} selectedWeek={selectedWeek} activeRange={activeRange}/>:null}
      {tab==="more"?<MoreScreen theme={themePreset} motion={motionPreset} motionStyle={motionStyle} onTheme={applyTheme} onMotion={applyMotion} onMotionStyle={applyMotionStyle} onAction={handleMore}/>:null}
    </main>

    <nav className="m238m-bottom" style={{"--m238m-active-index":String(["home","sales","team","report","more"].indexOf(tab==="admin"?"more":tab))} as CSSProperties}>
      <span className="m238m-liquid-bubble" aria-hidden="true"/>
      {(themePreset==="midnight"
        ?[["home","Home",Activity],["sales","Sales",CreditCard],["team","Team",Briefcase],["report","Report",FileSpreadsheet],["more","More",Settings]]
        :themePreset==="aurora"
        ?[["home","Home",Lightbulb],["sales","Sales",TrendingUp],["team","Team",Users],["report","Report",Share2],["more","More",MoreHorizontal]]
        :themePreset==="playful"
        ?[["home","Home",Box],["sales","Sales",Target],["team","Team",Users],["report","Report",ClipboardCheck],["more","More",Settings]]
        :themePreset==="graphite"
        ?[["home","Home",Activity],["sales","Sales",TrendingUp],["team","Team",Briefcase],["report","Report",FileSpreadsheet],["more","More",Settings]]
        :themePreset==="sunset"
        ?[["home","Home",Sun],["sales","Sales",TrendingUp],["team","Team",Users],["report","Report",FileDown],["more","More",MoreHorizontal]]
        :themePreset==="forest"
        ?[["home","Home",Home],["sales","Sales",Target],["team","Team",Users],["report","Report",ClipboardCheck],["more","More",Settings]]
        :themePreset==="mono"
        ?[["home","Home",Activity],["sales","Sales",CreditCard],["team","Team",Users],["report","Report",FileSpreadsheet],["more","More",MoreHorizontal]]
        :[["home","Home",Home],["sales","Sales",TrendingUp],["team","Team",Users],["report","Report",FileDown],["more","More",MoreHorizontal]]
      ).map(([key,label,Icon])=><button key={String(key)} onClick={()=>setTab(key as Tab)} className={(tab===key||(tab==="admin"&&key==="more"))?"active":""}><span className="m238m-nav-icon"><Icon size={themePreset==="playful"?22:21}/></span><span className="m238m-nav-label">{String(label)}</span></button>)}
    </nav>

    <Sheet open={sheet==="period"} onClose={()=>setSheet(null)} title="Pilih Periode">
      <div className="m238m-period-sheet-top"><Segmented value={draftPeriodMode} onChange={setDraftPeriodMode} items={[{value:"month",label:"Month"},{value:"week",label:"Week"}]}/><button className="m238m-primary" disabled={draftPeriodMode==="week"&&!draftWeek} onClick={()=>void applyPeriod()}>Terapkan</button></div>
      {draftPeriodMode==="month"?<div className="m238m-sheet-list">{months.map(p=><button key={p} onClick={()=>setDraftPeriod(p)} className={draftPeriod===p?"selected":""}><span>{monthLabel(p)}</span>{draftPeriod===p?<strong>✓</strong>:null}</button>)}</div>:<div className="m238m-sheet-list">{(weekly?.availableWeeks||[]).slice().reverse().map(w=><button key={w} onClick={()=>setDraftWeek(w)} className={draftWeek===w?"selected":""}><span>{w}</span>{draftWeek===w?<strong>✓</strong>:null}</button>)}</div>}
    </Sheet>

    <Sheet open={sheet==="share"} onClose={()=>setSheet(null)} title="Share Report">
      <div className="m238m-action-list">
        {tab==="sales"?<><button onClick={()=>void shareDailyKind("daily")}><MessageCircle/>Daily Sales Staff</button><button onClick={()=>void shareDailyKind("lob")}><Share2/>LOB Daily</button><button onClick={()=>void shareDailyKind("vas")}><Share2/>VAS Daily</button></>:null}
        <button onClick={()=>void doShare("wa")}><MessageCircle/>WhatsApp Summary</button>
        <button onClick={()=>void doShare("copy")}><Copy/>Copy Summary</button>
        <button onClick={()=>void doShare("png")}><Share2/>Download Picture</button>
        <button onClick={()=>void doShare("pdf")}><FileDown/>Download PDF</button>
        <button onClick={()=>void doShare("xlsx")}><FileSpreadsheet/>Download Excel</button>
      </div>
      <button className="m238m-cancel" onClick={()=>setSheet(null)}>Cancel</button>
    </Sheet>

    <Sheet open={sheet==="home-sales"} onClose={()=>setSheet(null)} title={`Detail Total Sales • ${monthLabel(period)}`}>
      {overview?<HomeSalesDetail overview={overview} traffic={traffic} summary={summary}/>:<Skeleton/>}
    </Sheet>

    <Sheet open={sheet==="staff"} onClose={()=>setSheet(null)} title={staffDetail?`${staffDetail.name} • ${staffDetailMode==="daily"?"Hari Ini":"Bulanan"}`:"Staff Detail"}>
      {staffDetail?<StaffDetail staff={staffDetail} mode={staffDetailMode}/>:<Skeleton/>}
    </Sheet>
    <Sheet open={sheet==="day"} onClose={()=>setSheet(null)} title={dayDetail?`Daily Detail • ${dayDetail.date}`:"Daily Detail"}>
      {dayDetail?<DailyDetail row={dayDetail}/>:<Skeleton/>}
    </Sheet>
    <Sheet open={sheet==="more"} onClose={()=>setSheet(null)} title={moreKind==="incentive"?"Estimasi Incentive":moreKind==="bnpl"?"BNPL & Trade-In":moreKind==="soh"?"Stock On Hand":moreKind==="stokan"?"Stokan":moreKind==="mading"?"Mading Performance":moreKind==="checklist"?"Checklist Store":moreKind==="mobile-view"?"Versi Tampilan HP":moreKind==="add-feedback"?"Tambah Feedback":moreKind==="add-cx"?"Input CX & Member":"Detail"}>
      {moreBusy?<Skeleton/>:<MoreDetail kind={moreKind} data={moreData} period={period}/>} 
    </Sheet>
  </div>
}


function HomeScreen({mode,setMode,overview,traffic,cvr,achievement,periodMode,fullLoading,onOpenSalesDetail,onGoSales,onGoTeam,onGoReport,onShare}:{mode:HomeMode;setMode:(v:HomeMode)=>void;overview:Overview;traffic:Traffic|null;cvr:number;achievement:number;periodMode:"month"|"week";fullLoading:boolean;onOpenSalesDetail:()=>void;onGoSales:()=>void;onGoTeam:()=>void;onGoReport:()=>void;onShare:()=>void}){
 const salesRows=overview.daily||[],latestSales=salesRows.at(-1)?.amount||0,prevSales=salesRows.at(-2)?.amount||0,salesDelta=prevSales?((latestSales-prevSales)/prevSales)*100:null;
 const trafficRows=traffic?.daily||[],latestTraffic=trafficRows.at(-1)?.traffic||0,prevTraffic=trafficRows.at(-2)?.traffic||0,trafficDelta=prevTraffic?((latestTraffic-prevTraffic)/prevTraffic)*100:null;
 const insight=salesDelta==null
  ? (achievement>=100?"Target bulan ini sudah tercapai. Pertahankan momentum penjualan.":achievement>=80?"Achievement sudah mendekati target. Fokuskan opportunity yang siap closing.":"Achievement masih perlu didorong. Prioritaskan opportunity dan follow-up yang aktif.")
  : `Sales hari terakhir ${salesDelta>=0?"naik":"turun"} ${pct(Math.abs(salesDelta))} dibanding hari sebelumnya.`;
 const selectedCompare=overview.compare?.find(x=>x.month===Number(overview.period.slice(5,7)))||overview.lfl;
 const categoryAttention=[
  {label:"Device",actual:overview.summary.device,target:overview.target.device},
  {label:"Accessories",actual:overview.summary.accessories,target:overview.target.accessories},
  {label:"VAS",actual:overview.summary.vas,target:overview.target.vas}
 ].filter(x=>x.target>0&&x.actual<x.target).sort((a,b)=>(a.actual/a.target)-(b.actual/b.target));
 const staffRows=(overview.staff||[]).filter(x=>!/digimap\.co\.id|online/i.test(`${x.name} ${x.position||""}`));
 const ranked=[...staffRows].sort((a,b)=>b.amount-a.amount);
 const topStaff=ranked[0]||null;
 const followStaff=[...staffRows].filter(s=>(s.achievement??((s.target||s.targets?.amount||0)>0?s.amount/(s.target||s.targets?.amount||1)*100:100))<100).sort((a,b)=>(a.achievement??0)-(b.achievement??0))[0]||null;
 const lobQty=staffRows.reduce((a,s)=>({iphone:a.iphone+Number(s.lob?.iphone||0),ipad:a.ipad+Number(s.lob?.ipad||0),mac:a.mac+Number(s.lob?.mac||0),watch:a.watch+Number(s.lob?.watch||0),airpods:a.airpods+Number(s.lob?.airpods||0)}),{iphone:0,ipad:0,mac:0,watch:0,airpods:0});
 const lobRows=[["iPhone",lobQty.iphone],["iPad",lobQty.ipad],["MacBook",lobQty.mac],["Apple Watch",lobQty.watch],["AirPods",lobQty.airpods]].sort((a,b)=>Number(b[1])-Number(a[1]));
 return <div className="m238m-stack m238m-enter">
  <div className="m238m-home-tabs">
    <button className={mode==="monthly"?"active":""} onClick={()=>setMode("monthly")}>Overview Bulanan</button>
    <button className={mode==="ytd"?"active":""} onClick={()=>setMode("ytd")}>YTD Overview</button>
    <button className={mode==="compare"?"active":""} onClick={()=>setMode("compare")}>Compare<br/>2025 vs 2026</button>
  </div>

  {fullLoading?<Skeleton/>:mode==="monthly"?<>
    <button className="m238m-hero-button" onClick={onOpenSalesDetail}>
      <Card className="m238m-hero m238m-home-hero"><div className="m238m-hero-title"><span>Total Sales</span><ChevronRight size={18}/></div><strong>{money.format(overview.summary.amount)}</strong><p>{pct(achievement)} dari Target</p><Progress value={achievement}/><div className="m238m-hero-meta"><span>Target <b>{money.format(overview.target.amount)}</b></span><span>{periodMode==="month"?"Point Store":"Periode"} <b>{periodMode==="month"?overview.summary.point.total.toFixed(1):overview.label}</b></span></div></Card>
    </button>
    <div className="m238m-grid m238m-home-kpis"><Metric label="Achievement" value={pct(achievement)} sub={overview.summary.status}/><Metric label="Gap ke Target" value={money.format(overview.summary.gap)} sub={overview.summary.gap>0?"Sisa ke target":"Target tercapai"}/><Metric label="CVR" value={pct(cvr)} sub="Traffic → transaksi"/><Metric label="UPT" value={overview.summary.upt.toFixed(1)} sub="Unit per transaksi"/></div>
    <div className="m238m-section-head"><h2>Needs Attention</h2><span>{categoryAttention.length+(followStaff?1:0)} item</span></div>
    <div className="m238m-attention-grid">
      {categoryAttention.slice(0,3).map(x=>{const a=x.target?x.actual/x.target*100:0;return <Card key={x.label} className="m238m-attention-card"><span>{x.label}</span><strong>{pct(a)}</strong><small>Belum achieve • gap {money.format(Math.max(0,x.target-x.actual))}</small></Card>})}
      {followStaff?<button className="m238m-click-card" onClick={onGoTeam}><Card className="m238m-attention-card staff"><span>Staff perlu follow-up</span><strong>{shortStaffName(followStaff.name)}</strong><small>Achievement {pct(followStaff.achievement??0)} • cek Team</small></Card></button>:null}
      {!categoryAttention.length&&!followStaff?<Card className="m238m-attention-ok"><Target size={18}/><div><strong>Tidak ada warning utama</strong><small>Target kategori dan staff berada di jalur yang baik.</small></div></Card>:null}
    </div>

    <div className="m238m-section-head"><h2>LOB Performance</h2><button className="m238m-link-button" onClick={onGoSales}>Lihat Semua</button></div>
    <div className="m238m-lob-strip">{lobRows.map(([label,value])=><Card key={String(label)} className="m238m-lob-mini"><span>{label}</span><strong>{num.format(Number(value))} unit</strong></Card>)}</div>

    <div className="m238m-section-head"><h2>Team Hari Ini</h2><button className="m238m-link-button" onClick={onGoTeam}>Lihat Semua</button></div>
    <div className="m238m-team-highlight">
      {topStaff?<button className="m238m-click-card" onClick={onGoTeam}><Card className="m238m-team-tile top"><span>Top Performer</span><strong>{shortStaffName(topStaff.name)}</strong><b>{money.format(topStaff.amount)}</b></Card></button>:null}
      {followStaff?<button className="m238m-click-card" onClick={onGoTeam}><Card className="m238m-team-tile follow"><span>Perlu Follow-up</span><strong>{shortStaffName(followStaff.name)}</strong><b>{money.format(followStaff.amount)}</b></Card></button>:null}
    </div>

    <div className="m238m-section-head"><h2>Quick Actions</h2></div>
    <div className="m238m-quick-actions">
      <button onClick={onGoSales}><TrendingUp size={17}/><span>Daily Sales</span></button>
      <button onClick={onGoReport}><FileDown size={17}/><span>Weekly Report</span></button>
      <button onClick={onGoReport}><MessageCircle size={17}/><span>Feedback</span></button>
      <button onClick={onShare}><Share2 size={17}/><span>Share</span></button>
    </div>

    <Card className="m238m-insight"><Lightbulb size={18}/><div><span>Insight Hari Ini</span><p>{insight}</p></div></Card>
  </>:mode==="ytd"?<YtdOverview overview={overview}/>:<CompareOverview overview={overview} compare={selectedCompare as CompareMonth|undefined}/>}
 </div>
}

function YtdOverview({overview}:{overview:Overview}){
 const y=overview.ytd,[selectedLob,setSelectedLob]=useState<CompareLob|null>(null);
 if(!y)return <Card className="m238m-empty">Data YTD belum tersedia.</Card>;
 const lobs=y.lobs||[];
 const contribution=selectedLob&&y.amount2026?((selectedLob.amount2026||0)/y.amount2026)*100:0;
 return <>
  <Card className="m238m-ytd-hero"><div className="m238m-section-head compact"><h2>Total Sales YTD</h2><span>s.d. bulan {y.throughMonth||Number(overview.period.slice(5,7))}</span></div><div className="m238m-compare-pair"><div><span>2026</span><strong>{money.format(y.amount2026)}</strong></div><div><span>2025</span><strong>{money.format(y.amount2025)}</strong></div></div><div className={"m238m-growth-pill "+(y.growth>=0?"positive":"negative")}>{y.growth>=0?"+":""}{pct(y.growth)} Growth YTD</div></Card>
  <div className="m238m-section-head"><h2>Qty YTD</h2></div>
  <div className="m238m-grid"><Metric label="2026" value={num.format(y.qty2026)}/><Metric label="2025" value={num.format(y.qty2025)} sub={`${y.qtyGrowth>=0?"+":""}${pct(y.qtyGrowth)} growth`}/></div>
  <div className="m238m-section-head"><h2>Device YTD</h2></div>
  <div className="m238m-grid"><Metric label="Device 2026" value={money.format(y.device2026||0)} sub={`${(y.deviceGrowth||0)>=0?"+":""}${pct(y.deviceGrowth||0)}`}/><Metric label="Device 2025" value={money.format(y.device2025||0)}/><Metric label="Qty Device 2026" value={num.format(y.deviceQty2026||0)}/><Metric label="Qty Device 2025" value={num.format(y.deviceQty2025||0)}/></div>
  {lobs.length?<><div className="m238m-section-head"><h2>Top LOB YTD</h2><span>Tap untuk detail</span></div><div className="m238m-list">{lobs.map(r=><button key={r.lob} className="m238m-click-card" onClick={()=>setSelectedLob(r)}><Card className="m238m-compare-row"><div><strong>{r.lob}</strong><span>{num.format(r.qty2026||0)} vs {num.format(r.qty2025)} unit</span></div><div><b>{money.format(r.amount2026||0)}</b><small className={(r.growth||0)>=0?"positive":"negative"}>{(r.growth||0)>=0?"+":""}{pct(r.growth||0)}</small><ChevronRight size={15}/></div></Card></button>)}</div></>:null}
  <Sheet open={!!selectedLob} onClose={()=>setSelectedLob(null)} title={selectedLob?`${selectedLob.lob} • YTD Detail`:"LOB YTD Detail"}>
   {selectedLob?<div className="m238m-stack">
    <Card className="m238m-detail-sales"><span>{selectedLob.lob} YTD 2026</span><strong>{money.format(selectedLob.amount2026||0)}</strong><small>{num.format(selectedLob.qty2026||0)} unit</small></Card>
    <div className="m238m-detail-list">
      <div><span>Value 2026</span><b>{money.format(selectedLob.amount2026||0)}</b></div>
      <div><span>Value 2025</span><b>{money.format(selectedLob.amount2025||0)}</b></div>
      <div><span>Variance Value</span><b className={(selectedLob.diff||0)>=0?"positive":"negative"}>{selectedLob.diff==null?"—":`${selectedLob.diff>=0?"+":""}${money.format(selectedLob.diff)}`}</b></div>
      <div><span>Growth Value</span><b className={(selectedLob.growth||0)>=0?"positive":"negative"}>{selectedLob.growth==null?"—":`${selectedLob.growth>=0?"+":""}${pct(selectedLob.growth)}`}</b></div>
      <div><span>Qty 2026</span><b>{num.format(selectedLob.qty2026||0)} unit</b></div>
      <div><span>Qty 2025</span><b>{num.format(selectedLob.qty2025||0)} unit</b></div>
      <div><span>Variance Qty</span><b className={(selectedLob.qtyDiff||0)>=0?"positive":"negative"}>{selectedLob.qtyDiff==null?"—":`${selectedLob.qtyDiff>=0?"+":""}${num.format(selectedLob.qtyDiff)} unit`}</b></div>
      <div><span>Growth Qty</span><b className={(selectedLob.qtyGrowth||0)>=0?"positive":"negative"}>{selectedLob.qtyGrowth==null?"—":`${selectedLob.qtyGrowth>=0?"+":""}${pct(selectedLob.qtyGrowth)}`}</b></div>
      <div><span>Kontribusi ke Sales YTD 2026</span><b>{pct(contribution)}</b></div>
    </div>
    <Card className="m238m-lob-compare-bar"><div><span>2025</span><b>{money.format(selectedLob.amount2025||0)}</b></div><div className="m238m-dual-bar"><i style={{width:`${Math.min(100,selectedLob.amount2025?100:0)}%`}}/><em style={{width:`${Math.min(100,selectedLob.amount2025?((selectedLob.amount2026||0)/selectedLob.amount2025)*100:100)}%`}}/></div><div><span>2026</span><b>{money.format(selectedLob.amount2026||0)}</b></div></Card>
   </div>:null}
  </Sheet>
 </>
}

function CompareOverview({overview,compare}:{overview:Overview;compare?:CompareMonth}){
 const[showMonthly,setShowMonthly]=useState(false);
 if(!compare)return <Card className="m238m-empty">Data compare belum tersedia.</Card>;
 const rows=(overview.compare||[]).filter(r=>r.started);
 return <>
  <button className="m238m-click-card" onClick={()=>setShowMonthly(true)}>
   <Card className="m238m-ytd-hero m238m-tappable-card"><div className="m238m-section-head compact"><h2>Total Sales</h2><span>{overview.label} <ChevronRight size={15}/></span></div><div className="m238m-compare-pair"><div><span>2025</span><strong>{money.format(compare.amount2025||0)}</strong></div><div><span>2026</span><strong>{compare.amount2026==null?"—":money.format(compare.amount2026)}</strong></div></div><div className={"m238m-growth-pill "+((compare.growth||0)>=0?"positive":"negative")}>{compare.diff==null?"Belum ada data":`${compare.diff>=0?"+":""}${money.format(compare.diff)} • ${(compare.growth||0)>=0?"+":""}${pct(compare.growth||0)}`}</div><small className="m238m-tap-hint">Tap untuk lihat compare per bulan</small></Card>
  </button>
  <div className="m238m-section-head"><h2>Qty</h2></div>
  <div className="m238m-grid"><Metric label="2025" value={num.format(compare.qty2025||0)}/><Metric label="2026" value={compare.qty2026==null?"—":num.format(compare.qty2026)} sub={compare.qtyGrowth==null?undefined:`${compare.qtyGrowth>=0?"+":""}${pct(compare.qtyGrowth)}`}/></div>
  <div className="m238m-section-head"><h2>Device</h2><span>Value & Qty</span></div>
  <div className="m238m-grid"><Metric label="Device 2025" value={money.format(compare.device2025||0)} sub={`${num.format(compare.deviceQty2025||0)} unit`}/><Metric label="Device 2026" value={compare.device2026==null?"—":money.format(compare.device2026)} sub={compare.deviceQty2026==null?undefined:`${num.format(compare.deviceQty2026)} unit`}/></div>
  {compare.lobs?.length?<><div className="m238m-section-head"><h2>Perbandingan LOB</h2><span>2025 → 2026</span></div><div className="m238m-list">{compare.lobs.map(r=><Card key={r.lob} className="m238m-compare-row"><div><strong>{r.lob}</strong><span>{money.format(r.amount2025)} → {r.amount2026==null?"—":money.format(r.amount2026)}</span></div><div><b>{r.qty2025} → {r.qty2026??"—"}</b><small className={(r.growth||0)>=0?"positive":"negative"}>{r.growth==null?"—":`${r.growth>=0?"+":""}${pct(r.growth)}`}</small></div></Card>)}</div></>:null}
  <Sheet open={showMonthly} onClose={()=>setShowMonthly(false)} title="Compare Total Sales 2025 vs 2026">
   <div className="m238m-stack">
    {overview.ytd?<Card className="m238m-compare-total-head">
      <div className="m238m-section-head compact"><h2>Total s.d. ${new Intl.DateTimeFormat("id-ID",{month:"long",timeZone:"UTC"}).format(new Date(Date.UTC(2026,(overview.ytd.throughMonth||Number(overview.period.slice(5,7)))-1,1)))} 2026</h2><span>2025 vs 2026</span></div>
      <div className="m238m-compare-pair"><div><span>2025</span><strong>{money.format(overview.ytd.amount2025)}</strong></div><div><span>2026</span><strong>{money.format(overview.ytd.amount2026)}</strong></div></div>
      <div className="m238m-total-variance"><div><span>Variance Total</span><b className={(overview.ytd.diff||0)>=0?"positive":"negative"}>{(overview.ytd.diff||0)>=0?"+":""}{money.format(overview.ytd.diff||0)}</b></div><div><span>Growth Total</span><b className={overview.ytd.growth>=0?"positive":"negative"}>{overview.ytd.growth>=0?"+":""}{pct(overview.ytd.growth)}</b></div></div>
    </Card>:null}
    <Card className="m238m-copy-card"><strong>Monthly Comparison</strong><p>Perbandingan Total Sales per bulan. Nominal ditampilkan penuh sesuai data existing.</p></Card>
    <div className="m238m-monthly-compare-list">{rows.map(r=><Card key={r.month} className="m238m-month-compare-card"><div className="m238m-month-compare-head"><strong>{new Intl.DateTimeFormat("id-ID",{month:"long",timeZone:"UTC"}).format(new Date(Date.UTC(2026,r.month-1,1)))}</strong><small className={(r.growth||0)>=0?"positive":"negative"}>{r.growth==null?"—":`${r.growth>=0?"+":""}${pct(r.growth)}`}</small></div><div className="m238m-month-values"><div><span>2025</span><b>{money.format(r.amount2025||0)}</b></div><div><span>2026</span><b>{r.amount2026==null?"—":money.format(r.amount2026)}</b></div></div><div className="m238m-month-variance"><span>Variance</span><b className={(r.diff||0)>=0?"positive":"negative"}>{r.diff==null?"—":`${r.diff>=0?"+":""}${money.format(r.diff)}`}</b></div></Card>)}</div>
   </div>
  </Sheet>
 </>
}
function HomeSalesDetail({overview,traffic,summary}:{overview:Overview;traffic:Traffic|null;summary:DailySummary|null}){
 const ach=overview.target.amount?overview.summary.amount/overview.target.amount*100:0;
 const cvr=summary?.summary.cvr??((traffic?.total||0)?overview.summary.invoices/(traffic?.total||1)*100:0);
 return <div className="m238m-stack">
  <Card className="m238m-detail-sales"><span>Total Sales</span><strong>{money.format(overview.summary.amount)}</strong><small>{overview.label}</small></Card>
  <div className="m238m-detail-list">
   {[
    ["Target",money.format(overview.target.amount)],
    ["Achievement",pct(ach)],
    ["Gap / Variance",money.format(overview.summary.gap)],
    ["Estimate",money.format(overview.summary.estimate.amount)],
    ["Point Store",overview.summary.point.total.toFixed(1)],
    ["Device",money.format(overview.summary.device)],
    ["Accessories",money.format(overview.summary.accessories)],
    ["VAS",money.format(overview.summary.vas)],
    ["Transaction",num.format(overview.summary.invoices)],
    ["Qty",num.format(overview.summary.qty)],
    ["UPT",overview.summary.upt.toFixed(1)],
    ["ATV",money.format(overview.summary.atv)],
    ["Traffic",num.format(summary?.summary.traffic??traffic?.total??0)],
    ["CVR",pct(cvr)],
    ["Best Day",summary?.summary.bestDay?`${summary.summary.bestDay.date} • ${money.format(summary.summary.bestDay.amount)}`:"—"],
    ["Lowest Day",summary?.summary.lowestDay?`${summary.summary.lowestDay.date} • ${money.format(summary.summary.lowestDay.amount)}`:"—"],
    ["Growth vs Previous",summary?.summary.growthPct==null?"—":`${summary.summary.growthPct>=0?"+":""}${pct(summary.summary.growthPct)}`]
   ].map(([label,value])=><div key={label}><span>{label}</span><b>{value}</b></div>)}
  </div>
 </div>
}

function SalesScreen({mode,setMode,daily,summary,period,periodMode,selectedWeek,activeRange,onStaff,onDay,onShare}:{mode:SalesMode;setMode:(v:SalesMode)=>void;daily:Daily|null;summary:DailySummary|null;period:string;periodMode:"month"|"week";selectedWeek:string;activeRange:{from:string;to:string}|null;onStaff:(s:Staff)=>void;onDay:(r:DailyRow)=>void;onShare:()=>void}){
 const[showTodayDetail,setShowTodayDetail]=useState(false),[dailyLobPick,setDailyLobPick]=useState<{label:string;key:"iphone"|"mac"|"ipad"|"watch"|"airpods"}|null>(null),[dailyVasPick,setDailyVasPick]=useState<{label:string;key:"qoala"|"telkomsel"|"xl"|"indosat"}|null>(null),[dailyDrillStaff,setDailyDrillStaff]=useState<Staff|null>(null),[dailyProductDetail,setDailyProductDetail]=useState<any>(null),[dailyProductBusy,setDailyProductBusy]=useState(false);
 const ach=daily?.total.target?daily.total.amount/daily.total.target*100:0,device=daily?Math.max(0,daily.total.amount-daily.total.accessories-daily.total.vas):0,dailyGap=daily?Math.max(0,daily.total.target-daily.total.amount):0,accAch=daily?.total.accTarget?daily.total.accessories/daily.total.accTarget*100:0,vasAch=daily?.total.vasTarget?daily.total.vas/daily.total.vasTarget*100:0;
 const dailyLob=daily?.staff.reduce((a,s)=>({iphone:a.iphone+Number(s.lob?.iphone||0),mac:a.mac+Number(s.lob?.mac||0),ipad:a.ipad+Number(s.lob?.ipad||0),watch:a.watch+Number(s.lob?.watch||0),airpods:a.airpods+Number(s.lob?.airpods||0)}),{iphone:0,mac:0,ipad:0,watch:0,airpods:0})||{iphone:0,mac:0,ipad:0,watch:0,airpods:0};
 const dailyVas=daily?.staff.reduce((a,s)=>({qoalaQty:a.qoalaQty+Number(s.vasDetail?.qoala?.qty||0),qoalaValue:a.qoalaValue+Number(s.vasDetail?.qoala?.value||0),telkomselQty:a.telkomselQty+Number(s.vasDetail?.telkomsel?.qty||0),telkomselValue:a.telkomselValue+Number(s.vasDetail?.telkomsel?.value||0),xlQty:a.xlQty+Number(s.vasDetail?.xl?.qty||0),xlValue:a.xlValue+Number(s.vasDetail?.xl?.value||0),indosatQty:a.indosatQty+Number(s.vasDetail?.indosat?.qty||0),indosatValue:a.indosatValue+Number(s.vasDetail?.indosat?.value||0)}),{qoalaQty:0,qoalaValue:0,telkomselQty:0,telkomselValue:0,xlQty:0,xlValue:0,indosatQty:0,indosatValue:0})||{qoalaQty:0,qoalaValue:0,telkomselQty:0,telkomselValue:0,xlQty:0,xlValue:0,indosatQty:0,indosatValue:0};
 const dailyRows=[...(summary?.dailyRows||[])].sort((a,b)=>a.date.localeCompare(b.date));
 const lobMeta=[["iPhone","iphone",dailyLob.iphone],["MacBook","mac",dailyLob.mac],["iPad","ipad",dailyLob.ipad],["Apple Watch","watch",dailyLob.watch],["AirPods","airpods",dailyLob.airpods]] as const;
 const vasMeta=[["Qoala","qoala",dailyVas.qoalaValue,dailyVas.qoalaQty],["Telkomsel","telkomsel",dailyVas.telkomselValue,dailyVas.telkomselQty],["XL","xl",dailyVas.xlValue,dailyVas.xlQty],["Indosat","indosat",dailyVas.indosatValue,dailyVas.indosatQty]] as const;
 const openDailyLob=async(label:string,key:"iphone"|"mac"|"ipad"|"watch"|"airpods")=>{
   setDailyLobPick({label,key});setDailyDrillStaff(null);
   if(dailyProductDetail)return;
   setDailyProductBusy(true);
   try{setDailyProductDetail(await cachedJson<any>(`/api/lob-target-focus?mode=range&from=${daily?.date||today()}&to=${daily?.date||today()}`,120000))}
   catch{setDailyProductDetail(null)}finally{setDailyProductBusy(false)}
 };
 const dailyLobKey=dailyLobPick?.key,dailyVasKey=dailyVasPick?.key;
 const lobStaff=dailyLobKey&&daily?daily.staff.filter(st=>Number(st.lob?.[dailyLobKey]||0)>0).sort((a,b)=>Number(b.lob?.[dailyLobKey]||0)-Number(a.lob?.[dailyLobKey]||0)):[];
 const vasStaff=dailyVasKey&&daily?daily.staff.filter(st=>Number(st.vasDetail?.[dailyVasKey]?.qty||0)>0||Number(st.vasDetail?.[dailyVasKey]?.value||0)>0).sort((a,b)=>Number(b.vasDetail?.[dailyVasKey]?.value||0)-Number(a.vasDetail?.[dailyVasKey]?.value||0)):[];
 const productPrefix=(key:string)=>key==="iphone"?"iPhone":key==="mac"?"MacBook":key==="ipad"?"iPad":key==="watch"?"Apple Watch":"AirPods";
 const selectedProductStaff=dailyDrillStaff&&dailyLobKey?(dailyProductDetail?.lob?.staff||[]).find((x:any)=>String(x.id)===String(dailyDrillStaff.id)):undefined;
 const selectedProducts=dailyDrillStaff&&dailyLobKey?Object.entries(selectedProductStaff?.products||{}).filter(([name,v]:any)=>name.startsWith(productPrefix(dailyLobKey))&&Number(v?.qty||0)>0).map(([name,v]:any)=>({name,qty:Number(v.qty||0),value:Number(v.value||0)})).sort((a,b)=>b.qty-a.qty):[];
 return <div className="m238m-stack m238m-enter">
  <Segmented value={mode} onChange={setMode} items={[{value:"daily",label:"Daily"},{value:"summary",label:"Summary"},{value:"lob",label:"Fokus Product"}]}/>
  {mode==="daily"?(daily?<>
    <button className="m238m-click-card" onClick={()=>setShowTodayDetail(true)}><Card className="m238m-hero compact m238m-sales-hero m238m-tappable-card"><div className="m238m-weekly-hero-title"><span>Sales Today</span><ChevronRight size={18}/></div><strong>{money.format(daily.total.amount)}</strong><p>Target {money.format(daily.total.target)} • {pct(ach)}</p><Progress value={ach}/><small className="m238m-tap-hint">Tap untuk lihat detail penjualan hari ini</small></Card></button>

    <div className="m238m-sales-status-grid">
      <Card className="m238m-sales-status"><span>Achievement</span><strong>{pct(ach)}</strong><small>{ach>=100?"Target tercapai":"Masih perlu closing"}</small></Card>
      <Card className="m238m-sales-status"><span>Gap Hari Ini</span><strong>{money.format(dailyGap)}</strong><small>{dailyGap>0?"Sisa ke target":"Sudah achieve"}</small></Card>
    </div>

    <div className="m238m-section-head"><h2>Breakdown Hari Ini</h2><span>Value</span></div>
    <div className="m238m-sales-breakdown">
      <Card className="m238m-sales-breakdown-card"><span>Device</span><strong>{money.format(device)}</strong><small>Actual sales</small></Card>
      <Card className="m238m-sales-breakdown-card"><span>ACC</span><strong>{money.format(daily.total.accessories)}</strong><small>{pct(accAch)} dari target</small></Card>
      <Card className="m238m-sales-breakdown-card"><span>VAS</span><strong>{money.format(daily.total.vas)}</strong><small>{pct(vasAch)} dari target</small></Card>
    </div>

    <div className="m238m-sales-ops-grid">
      <Metric label="UPT" value={daily.total.upt.toFixed(1)} sub="Unit per transaksi"/>
      <Metric label="Invoice" value={num.format(daily.total.invoices)} sub="Invoice unique"/>
      <Metric label="Qty" value={num.format(daily.total.qty)} sub="Total unit"/>
      <button className="m238m-share-sales" onClick={onShare}><Share2 size={18}/><span>Share Daily</span><small>Staff · LOB · VAS</small></button>
    </div>

    <div className="m238m-section-head"><h2>Staff Hari Ini</h2><span>{daily.staff.length} staff</span></div>
    <div className="m238m-list">{daily.staff.map(s=><StaffRow key={s.id} staff={s} onClick={()=>onStaff(s)} shortName fullMoney/>)}</div>

    <div className="m238m-sales-drill-actions">
      <button onClick={()=>setShowTodayDetail(true)}><Activity size={17}/><span>Lihat LOB & VAS</span><ChevronRight size={16}/></button>
      <button onClick={()=>setMode("summary")}><CalendarDays size={17}/><span>Lihat Summary Periode</span><ChevronRight size={16}/></button>
    </div>
  </>:<Skeleton/>):mode==="summary"?(summary?<>
    <Card className="m238m-hero compact m238m-sales-hero"><span>Daily Summary</span><strong>{money.format(summary.summary.totalSales)}</strong><p>{pct(summary.summary.achievementPct)} dari Target • {summary.summary.growthPct==null?"No comparison":`${summary.summary.growthPct>=0?"+":""}${pct(summary.summary.growthPct)} vs periode sebelumnya`}</p><Progress value={summary.summary.achievementPct}/></Card>
    <div className="m238m-grid"><Metric label="Target" value={money.format(summary.summary.target)}/><Metric label="Traffic" value={num.format(summary.summary.traffic)}/><Metric label="Transaction" value={num.format(summary.summary.transaction)}/><Metric label="CVR" value={pct(summary.summary.cvr)}/><Metric label="ATV" value={money.format(summary.summary.atv)}/><Metric label="UPT" value={summary.summary.upt.toFixed(1)}/><Metric label="Qty" value={num.format(summary.summary.qty)}/><Metric label="Invoice" value={num.format(summary.summary.invoice)}/></div>
    <div className="m238m-section-head"><h2>Breakdown</h2></div>
    <div className="m238m-grid"><Metric label="Device" value={money.format(summary.breakdown.device)}/><Metric label="ACC" value={money.format(summary.breakdown.accessories)}/><Metric label="VAS" value={money.format(summary.breakdown.vas)}/></div>
    <div className="m238m-section-head"><h2>Per Hari</h2><span>Urut dari tanggal 1</span></div>
    <div className="m238m-list">{dailyRows.map(r=><button key={r.date} className="m238m-day-row" onClick={()=>onDay(r)}><div className="m238m-day-main"><strong>{salesDateLabel(r.date)}</strong><b>{money.format(r.totalSales)}</b><small>Achievement {pct(r.achievementPct)} • CVR {pct(r.cvr)} • UPT {r.upt.toFixed(1)}</small></div><ChevronRight size={17}/></button>)}</div>
  </>:<Skeleton/>):(summary?<FocusProductView summary={summary} period={period} periodMode={periodMode} selectedWeek={selectedWeek} activeRange={activeRange}/>:<Skeleton/>)}

  <Sheet open={showTodayDetail} onClose={()=>setShowTodayDetail(false)} title="Detail Sales Today">
   {daily?<div className="m238m-stack">
    <Card className="m238m-hero compact m238m-sales-hero"><span>Sales Today</span><strong>{money.format(daily.total.amount)}</strong><p>Target {money.format(daily.total.target)} • {pct(ach)}</p><Progress value={ach}/></Card>

    <div className="m238m-section-head"><h2>Sales Breakdown</h2><span>Hari ini</span></div>
    <div className="m238m-grid">
      <Metric label="Device" value={money.format(device)}/>
      <Metric label="ACC" value={money.format(daily.total.accessories)} sub={`Target ${money.format(daily.total.accTarget)}`}/>
      <Metric label="VAS" value={money.format(daily.total.vas)} sub={`Target ${money.format(daily.total.vasTarget)}`}/>
      <Metric label="Invoice" value={num.format(daily.total.invoices)}/>
      <Metric label="Qty" value={num.format(daily.total.qty)}/>
      <Metric label="UPT" value={daily.total.upt.toFixed(1)}/>
    </div>

    <div className="m238m-section-head"><h2>LOB</h2><span>Tap untuk detail staff</span></div>
    <div className="m238m-grid">{lobMeta.map(([label,key,value])=><button key={label} className="m238m-metric-button" onClick={()=>void openDailyLob(label,key)}><Card className="m238m-metric m238m-drill-card"><span>{label}</span><strong>{num.format(Number(value))}</strong><small>Total unit</small><ChevronRight size={15}/></Card></button>)}</div>

    <div className="m238m-section-head"><h2>VAS</h2><span>Tap untuk detail staff</span></div>
    <div className="m238m-list">{vasMeta.map(([label,key,value,qty])=><button key={label} className="m238m-click-card" onClick={()=>{setDailyVasPick({label,key});setDailyDrillStaff(null)}}><Card className="m238m-vas-row"><div><strong>{label}</strong><span>{num.format(Number(qty))} qty</span></div><div className="m238m-row-chevron"><b>{money.format(Number(value))}</b><ChevronRight size={16}/></div></Card></button>)}</div>

    <div className="m238m-section-head"><h2>Staff Sales</h2><span>{daily.staff.length} staff</span></div>
    <div className="m238m-list">{daily.staff.filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount).map((staff,i)=><Card key={staff.id} className="m238m-staff-breakdown-row"><span>#{i+1}</span><strong>{shortStaffName(staff.name)}</strong><b>{money.format(staff.amount)}</b></Card>)}</div>
   </div>:null}
  </Sheet>

  <Sheet open={!!dailyLobPick} onClose={()=>{setDailyLobPick(null);setDailyDrillStaff(null)}} title={dailyLobPick?`${dailyLobPick.label} • Staff Hari Ini`:"LOB Staff"}>
   {dailyLobPick?<div className="m238m-stack">
    <Card className="m238m-copy-card"><strong>{dailyLobPick.label}</strong><p>{num.format(Number(dailyLob[dailyLobPick.key]||0))} unit terjual hari ini. Pilih staff untuk melihat unit/model yang dijual.</p></Card>
    {lobStaff.length?<div className="m238m-list">{lobStaff.map((st,i)=><button key={st.id} className="m238m-click-card" onClick={()=>setDailyDrillStaff(st)}><Card className="m238m-product-detail-row"><div><strong>#{i+1} {shortStaffName(st.name)}</strong><span>Penjualan {dailyLobPick.label}</span></div><div><b>{num.format(Number(st.lob?.[dailyLobKey!]||0))} unit</b><ChevronRight size={15}/></div></Card></button>)}</div>:<Card className="m238m-empty">Belum ada staff yang menjual {dailyLobPick.label} hari ini.</Card>}
   </div>:null}
  </Sheet>

  <Sheet open={!!dailyVasPick} onClose={()=>{setDailyVasPick(null);setDailyDrillStaff(null)}} title={dailyVasPick?`${dailyVasPick.label} • Staff Hari Ini`:"VAS Staff"}>
   {dailyVasPick?<div className="m238m-stack">
    <Card className="m238m-copy-card"><strong>{dailyVasPick.label}</strong><p>Pilih staff untuk melihat detail VAS yang dijual hari ini.</p></Card>
    {vasStaff.length?<div className="m238m-list">{vasStaff.map((st,i)=>{const x=st.vasDetail?.[dailyVasKey!];return <button key={st.id} className="m238m-click-card" onClick={()=>setDailyDrillStaff(st)}><Card className="m238m-product-detail-row"><div><strong>#{i+1} {shortStaffName(st.name)}</strong><span>{num.format(Number(x?.qty||0))} qty</span></div><div><b>{money.format(Number(x?.value||0))}</b><ChevronRight size={15}/></div></Card></button>})}</div>:<Card className="m238m-empty">Belum ada penjualan {dailyVasPick.label} hari ini.</Card>}
   </div>:null}
  </Sheet>

  <Sheet open={!!dailyDrillStaff} onClose={()=>setDailyDrillStaff(null)} title={dailyDrillStaff?`${shortStaffName(dailyDrillStaff.name)} • Detail Penjualan`:"Detail Staff"}>
   {dailyDrillStaff&&dailyLobPick?<div className="m238m-stack">
    <Card className="m238m-detail-sales"><span>{dailyLobPick.label}</span><strong>{num.format(Number(dailyDrillStaff.lob?.[dailyLobKey!]||0))} unit</strong><small>{daily.date}</small></Card>
    <div className="m238m-section-head"><h2>Unit / Model Terjual</h2><span>{selectedProducts.length} type</span></div>
    {dailyProductBusy?<Skeleton/>:selectedProducts.length?<div className="m238m-list">{selectedProducts.map(p=><Card key={p.name} className="m238m-product-detail-row"><div><strong>{p.name}</strong><span>Penjualan hari ini</span></div><b>{num.format(p.qty)} unit</b></Card>)}</div>:<Card className="m238m-empty">{dailyLobPick.key==="airpods"?"Breakdown model AirPods belum tersedia dari source detail harian; total unit staff tetap ditampilkan di atas.":"Tidak ada breakdown model yang cocok pada source detail harian."}</Card>}
   </div>:dailyDrillStaff&&dailyVasPick?<div className="m238m-stack">
    <Card className="m238m-detail-sales"><span>VAS Staff • {shortStaffName(dailyDrillStaff.name)}</span><strong>{money.format(Number(dailyDrillStaff.vasDetail?.[dailyVasKey!]?.value||0))}</strong><small>{dailyVasPick.label} • {num.format(Number(dailyDrillStaff.vasDetail?.[dailyVasKey!]?.qty||0))} qty</small></Card>
    <div className="m238m-section-head"><h2>VAS yang Dijual</h2><span>Hari ini</span></div>
    <div className="m238m-list">{(["qoala","telkomsel","xl","indosat"] as const).map(key=>{const x=dailyDrillStaff.vasDetail?.[key];if(!x||(!x.qty&&!x.value))return null;const label=key==="qoala"?"Qoala":key==="telkomsel"?"Telkomsel":key==="xl"?"XL":"Indosat";return <Card key={key} className="m238m-vas-row"><div><strong>{label}</strong><span>{num.format(Number(x.qty||0))} qty</span></div><b>{money.format(Number(x.value||0))}</b></Card>})}</div>
   </div>:null}
  </Sheet>
 </div>
}
function FocusProductView({summary,period,periodMode,selectedWeek,activeRange}:{summary:DailySummary;period:string;periodMode:"month"|"week";selectedWeek:string;activeRange:{from:string;to:string}|null}){
 const[tab,setTab]=useState<FocusMode>("lob"),[focus,setFocus]=useState<any>(null),[thirdData,setThirdData]=useState<any>(null),[staffPerf,setStaffPerf]=useState<Staff[]>([]);
 const[lobTargets,setLobTargets]=useState<Record<string,number>>({}),[lobActive,setLobActive]=useState<Record<string,number>>({}),[vasTargets,setVasTargets]=useState<Record<string,number>>({}),[thirdTargets,setThirdTargets]=useState<Record<string,number>>({});
 const[shares,setShares]=useState<Array<{id:string;name:string;share:number}>>([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[notice,setNotice]=useState("");
 const[selectedLob,setSelectedLob]=useState<string|null>(null),[selectedProduct,setSelectedProduct]=useState<string|null>(null),[selectedVas,setSelectedVas]=useState<string|null>(null),[selectedThird,setSelectedThird]=useState<string|null>(null),[editFocus,setEditFocus]=useState(false),[editVas,setEditVas]=useState(false),[editThird,setEditThird]=useState(false);
 const lob=summary.breakdown.lob||{iphone:0,macbook:0,ipad:0,appleWatch:0,airpods:0};
 const vas=(summary.dailyRows||[]).reduce((a,r)=>({qoalaQty:a.qoalaQty+(r.vas?.qoalaQty||0),qoalaValue:a.qoalaValue+(r.vas?.qoalaValue||0),telkomselQty:a.telkomselQty+(r.vas?.telkomselQty||0),telkomselValue:a.telkomselValue+(r.vas?.telkomselValue||0),xlQty:a.xlQty+(r.vas?.xlQty||0),xlValue:a.xlValue+(r.vas?.xlValue||0),indosatQty:a.indosatQty+(r.vas?.indosatQty||0),indosatValue:a.indosatValue+(r.vas?.indosatValue||0)}),{qoalaQty:0,qoalaValue:0,telkomselQty:0,telkomselValue:0,xlQty:0,xlValue:0,indosatQty:0,indosatValue:0});
 const vasTotal=vas.qoalaValue+vas.telkomselValue+vas.xlValue+vas.indosatValue,vasQty=vas.qoalaQty+vas.telkomselQty+vas.xlQty+vas.indosatQty;
 const lobRows=[["iPhone","iPhone",lob.iphone],["MacBook","MacBook",lob.macbook],["iPad","iPad",lob.ipad],["Apple Watch","Apple Watch",lob.appleWatch],["AirPods","AirPods",lob.airpods]] as const;
 const thirdKeys=["Hastag","Dino","IGA","IBacks","Handal","Omega","Torras"];
 const vasRows=[["Qoala","qoala",vas.qoalaValue,vas.qoalaQty],["Telkomsel","telkomsel",vas.telkomselValue,vas.telkomselQty],["XL","xl",vas.xlValue,vas.xlQty],["Indosat","indosat",vas.indosatValue,vas.indosatQty]] as const;

 const targetScope=periodMode==="week"?"weekly":"monthly",targetPeriod=periodMode==="week"?(selectedWeek||""):period;
 const focusUrl=periodMode==="week"&&activeRange?`/api/lob-target-focus?mode=range&from=${activeRange.from}&to=${activeRange.to}`:`/api/lob-target-focus?mode=month&month=${period}`;
 const thirdUrl=periodMode==="week"&&selectedWeek?`/api/product-focus-3pp?mode=week&week=${encodeURIComponent(selectedWeek)}`:`/api/product-focus-3pp?mode=month&month=${period}`;
 const staffUrl=periodMode==="week"&&activeRange?`/api/staff-performance-month?period=${activeRange.from.slice(0,7)}&from=${activeRange.from}&to=${activeRange.to}`:`/api/staff-performance-month?period=${period}`;
 const load=useCallback(async(force=false)=>{
  setLoading(true);
  try{
   if(tab==="lob"){
    const [fp,lt,la]=await Promise.all([
      cachedJson<any>(focusUrl,180000,force),
      cachedJson<any>(`/api/manual-target?scope=${targetScope}&period=${encodeURIComponent(targetPeriod)}&group=lob-focus`,180000,force),
      cachedJson<any>(`/api/manual-target?scope=${targetScope}&period=${encodeURIComponent(targetPeriod)}&group=lob-focus-active`,180000,force)
    ]);
    setFocus(fp);
    setLobTargets(Object.fromEntries(Object.entries(lt.targets||{}).map(([k,v]:any)=>[k,Number(v.target||0)])));
    setLobActive(Object.fromEntries(Object.entries(la.targets||{}).map(([k,v]:any)=>[k,Number(v.target||0)])));
    setShares((lt.staff||[]).map((x:any)=>({id:String(x.id),name:String(x.name),share:Number(x.share||0)})));
   }else if(tab==="vas"){
    const [fp,vt,sp]=await Promise.all([
      cachedJson<any>(focusUrl,180000,force),
      cachedJson<any>(`/api/manual-target?scope=${targetScope}&period=${encodeURIComponent(targetPeriod)}&group=vas-focus`,180000,force),
      cachedJson<{staff:Staff[]}>(staffUrl,180000,force)
    ]);
    setFocus(fp);setStaffPerf(sp.staff||[]);
    setVasTargets(Object.fromEntries(Object.entries(vt.targets||{}).map(([k,v]:any)=>[k,Number(v.target||0)])));
    setShares((vt.staff||[]).map((x:any)=>({id:String(x.id),name:String(x.name),share:Number(x.share||0)})));
   }else{
    const [third,tt,vt]=await Promise.all([
      cachedJson<any>(thirdUrl,180000,force),
      cachedJson<any>(`/api/manual-target?scope=${targetScope}&period=${encodeURIComponent(targetPeriod)}&group=product-focus-value`,180000,force),
      cachedJson<any>(`/api/manual-target?scope=${targetScope}&period=${encodeURIComponent(targetPeriod)}&group=vas-focus`,180000,force)
    ]);
    setThirdData(third);
    setThirdTargets(Object.fromEntries(thirdKeys.map(k=>[k,Number(tt.targets?.[k]?.target??(k==="IGA"?tt.targets?.Iga?.target:0)??0)])));
    setShares((vt.staff||[]).map((x:any)=>({id:String(x.id),name:String(x.name),share:Number(x.share||0)})));
   }
  }finally{setLoading(false)}
 },[tab,period,periodMode,selectedWeek,activeRange,focusUrl,thirdUrl,staffUrl,targetScope,targetPeriod]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{setThirdData(null);setSelectedThird(null)},[period,periodMode,selectedWeek,activeRange]);

 const products=(focus?.lob?.products||[]) as Array<{name:string;qty:number;value:number}>;
 const productMap=new Map(products.map(x=>[x.name,x]));
 const staffFocus=(focus?.lob?.staff||[]) as Array<{id:string;name:string;products:Record<string,{qty:number;value:number}>}>;
 const catalog=(Object.values(focus?.productCatalog||{}).flat() as string[]);
 const activeProducts=catalog.filter(name=>Number(lobActive[name]||0)>0);
 const focusFallback=(focus?.productFocus||[]) as string[];
 const selectedProducts=activeProducts.length?activeProducts:focusFallback;

 const saveLob=async()=>{
  setSaving(true);setNotice("");
  try{
   const [a,b]=await Promise.all([
    fetch("/api/manual-target",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scope:targetScope,period:targetPeriod,group:"lob-focus",targets:lobTargets})}),
    fetch("/api/manual-target",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scope:targetScope,period:targetPeriod,group:"lob-focus-active",targets:lobActive})})
   ]);
   const ja=await a.json(),jb=await b.json();if(!a.ok)throw new Error(ja.error||"Gagal menyimpan target LOB");if(!b.ok)throw new Error(jb.error||"Gagal menyimpan fokus unit");
   setNotice("Target & unit fokus tersimpan.");setEditFocus(false);await load(true);
  }catch(e){setNotice(e instanceof Error?e.message:"Gagal menyimpan")}finally{setSaving(false)}
 };
 const saveVas=async()=>{
  setSaving(true);setNotice("");
  try{const r=await fetch("/api/manual-target",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scope:targetScope,period:targetPeriod,group:"vas-focus",targets:vasTargets})}),j=await r.json();if(!r.ok)throw new Error(j.error||"Gagal menyimpan target VAS");setNotice(j.message||"Target VAS tersimpan.");setEditVas(false);await load(true)}
  catch(e){setNotice(e instanceof Error?e.message:"Gagal menyimpan")}finally{setSaving(false)}
 };
 const saveThird=async()=>{
  setSaving(true);setNotice("");
  try{const r=await fetch("/api/manual-target",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scope:targetScope,period:targetPeriod,group:"product-focus-value",targets:thirdTargets})}),j=await r.json();if(!r.ok)throw new Error(j.error||"Gagal menyimpan target Third Party");setNotice(j.message||"Target Third Party tersimpan.");setEditThird(false);await load(true)}
  catch(e){setNotice(e instanceof Error?e.message:"Gagal menyimpan")}finally{setSaving(false)}
 };

 const lobProductsFor=(group:string)=>{
  if(group==="AirPods")return products.filter(x=>x.name.toLowerCase().includes("airpods"));
  return products.filter(x=>x.name.startsWith(group));
 };
 const selectedProductStaff=selectedProduct?staffFocus.map(s=>({id:s.id,name:s.name,qty:Number(s.products?.[selectedProduct]?.qty||0)})).filter(x=>x.qty>0).sort((a,b)=>b.qty-a.qty):[];
 const selectedVasRow=vasRows.find(x=>x[0]===selectedVas);
 const selectedVasKey=selectedVasRow?.[1] as "qoala"|"telkomsel"|"xl"|"indosat"|undefined;
 const vasTarget=selectedVas?Number(vasTargets[selectedVas]||0):0;
 const selectedVasStaff=selectedVasKey?shares.map(sh=>{
   const perf=staffPerf.find(s=>s.id===sh.id),actual=Number(perf?.vasDetail?.[selectedVasKey]?.value||0),qty=Number(perf?.vasDetail?.[selectedVasKey]?.qty||0),target=vasTarget*sh.share,ar=target?actual/target*100:0;
   return{id:sh.id,name:sh.name,share:sh.share,actual,qty,target,ar};
 }).sort((a,b)=>b.actual-a.actual):[];
 const thirdSuppliers=(thirdData?.thirdParty?.suppliers||[]) as Array<{supplier:string;qty:number;value:number;brands:Array<{code:string;name:string;qty:number;value:number;details:Array<{name:string;article:string;qty:number;value:number}>}>;staff:Array<{name:string;qty:number;value:number}>}>;
 const thirdMap=new Map(thirdSuppliers.map(x=>[x.supplier.toLowerCase(),x]));
 const thirdRows=thirdKeys.map(name=>thirdMap.get(name.toLowerCase())||{supplier:name,qty:0,value:0,brands:[],staff:[]});
 const selectedThirdData=selectedThird?thirdRows.find(x=>x.supplier.toLowerCase()===selectedThird.toLowerCase()):undefined;
 const thirdShareTotal=shares.reduce((a,x)=>a+Math.max(0,x.share),0);
 const selectedThirdTarget=selectedThird?Number(thirdTargets[selectedThird]||0):0;
 const selectedThirdStaff=selectedThirdData?(()=>{
   const sales=new Map((selectedThirdData.staff||[]).map(x=>[x.name.trim().toLowerCase(),x]));
   const names=new Map<string,string>();
   for(const x of selectedThirdData.staff||[])names.set(x.name.trim().toLowerCase(),x.name);
   for(const x of shares)names.set(x.name.trim().toLowerCase(),x.name);
   return [...names.entries()].map(([key,name])=>{
    const sale=sales.get(key),share=shares.find(x=>x.name.trim().toLowerCase()===key)?.share||0,target=thirdShareTotal?selectedThirdTarget*share/thirdShareTotal:0,actual=Number(sale?.value||0),qty=Number(sale?.qty||0),ar=target?actual/target*100:0;
    return{name,share,actual,qty,target,ar};
   }).sort((a,b)=>b.actual-a.actual||b.qty-a.qty);
  })():[];
 const selectedThirdProducts=selectedThirdData?(selectedThirdData.brands||[]).flatMap(b=>(b.details||[]).map(d=>({...d,brandCode:b.code,brandName:b.name}))).sort((a,b)=>b.qty-a.qty||b.value-a.value):[];

 return <div className="m238m-stack">
  <div className="m238m-focus-tabs m238m-focus-tabs-three">
   {[["lob","LOB"],["vas","VAS"],["third","Third Party"]].map(([k,l])=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k as FocusMode)}>{l}</button>)}
  </div>

  {tab==="lob"?<>
    <div className="m238m-section-head"><h2>Unit Fokus</h2><button className="m238m-text-action" onClick={()=>setEditFocus(!editFocus)}>{editFocus?"Tutup":"Atur Fokus & Target"}</button></div>
    {selectedProducts.length?<div className="m238m-focus-unit-grid">{selectedProducts.map(name=>{const actual=Number(productMap.get(name)?.qty||0),target=Number(lobTargets[name]||0);return <button key={name} onClick={()=>setSelectedProduct(name)} className="m238m-focus-unit-card"><span>{name}</span><strong>{num.format(actual)} unit</strong><small>{target?`Target ${num.format(target)} • AR ${pct(actual/target*100)}`:"Target belum diisi"}</small><ChevronRight size={14}/></button>})}</div>:<Card className="m238m-empty">Belum ada unit fokus yang dipilih.</Card>}
    {editFocus?<Card className="m238m-focus-editor"><strong>Pilih Unit Fokus & Target</strong><p>Centang unit yang ingin tampil di atas LOB, lalu isi target unitnya.</p><div className="m238m-focus-edit-list">{catalog.map(name=><div key={name}><label><input type="checkbox" checked={Number(lobActive[name]||0)>0} onChange={e=>setLobActive(v=>({...v,[name]:e.target.checked?1:0}))}/><span>{name}</span></label><input type="number" inputMode="numeric" min={0} value={lobTargets[name]||0} onChange={e=>setLobTargets(v=>({...v,[name]:Number(e.target.value)}))} placeholder="Target"/></div>)}</div><button className="m238m-primary" disabled={saving} onClick={()=>void saveLob()}>{saving?"Menyimpan…":"Simpan Fokus & Target"}</button></Card>:null}
    {notice?<small className="m238m-notice">{notice}</small>:null}
    <div className="m238m-section-head"><h2>LOB Performance</h2><span>Tap untuk detail</span></div>
    <div className="m238m-list">{lobRows.map(([label,key,value])=><button key={label} className="m238m-click-card" onClick={()=>setSelectedLob(key)}><Card className="m238m-lob-row"><div><strong>{label}</strong><span>Lihat detail penjualan</span></div><div className="m238m-row-chevron"><b>{num.format(value)} unit</b><ChevronRight size={16}/></div></Card></button>)}</div>
  </>:null}

  {tab==="vas"?<>
    <div className="m238m-section-head"><h2>VAS</h2><button className="m238m-text-action" onClick={()=>setEditVas(!editVas)}>{editVas?"Tutup":"Atur Target"}</button></div>
    <Card className="m238m-vas-total"><span>Total VAS • {num.format(vasQty)} qty</span><strong>{money.format(vasTotal)}</strong></Card>
    {editVas?<Card className="m238m-vas-target-editor"><strong>Target Manual VAS • {periodMode==="week"?selectedWeek:monthLabel(period)}</strong><p>Target otomatis dibagi ke staff mengikuti %T existing. Setelah disimpan editor akan tertutup.</p>{vasRows.map(([label])=><label key={label}><span>{label}</span><input type="number" inputMode="numeric" min={0} value={vasTargets[label]||0} onChange={e=>setVasTargets(v=>({...v,[label]:Number(e.target.value)}))}/></label>)}<button className="m238m-primary" disabled={saving} onClick={()=>void saveVas()}>{saving?"Menyimpan…":"Simpan Target VAS"}</button></Card>:null}
    {notice?<small className="m238m-notice">{notice}</small>:null}
    <div className="m238m-list">
     {vasRows.map(([label,key,value,qty])=>{const target=Number(vasTargets[label]||0),ar=target?Number(value)/target*100:0;return <button key={label} className="m238m-click-card" onClick={()=>setSelectedVas(label)}><Card className="m238m-vas-row"><div><strong>{label}</strong><span>{num.format(Number(qty))} qty • Target {money.format(target)}</span></div><div className="m238m-row-chevron"><div><b>{money.format(Number(value))}</b><small>{target?`AR ${pct(ar)}`:"AR —"}</small></div><ChevronRight size={16}/></div></Card></button>})}
    </div>
  </>:null}

  {tab==="third"?<>
    <div className="m238m-section-head"><h2>Third Party</h2><button className="m238m-text-action" onClick={()=>setEditThird(!editThird)}>{editThird?"Tutup":"Atur Target"}</button></div>
    <Card className="m238m-vas-total"><span>Total 3PP • {num.format(Number(thirdData?.thirdParty?.total?.qty||0))} qty</span><strong>{money.format(Number(thirdData?.thirdParty?.total?.value||0))}</strong></Card>
    {editThird?<Card className="m238m-vas-target-editor"><strong>Target Manual Third Party • {periodMode==="week"?selectedWeek:monthLabel(period)}</strong><p>Target menggunakan Value dan otomatis dibagi ke staff mengikuti %T existing. Setelah disimpan editor akan tertutup.</p>{thirdKeys.map(name=><label key={name}><span>{name}</span><input type="number" inputMode="numeric" min={0} step={1000} value={thirdTargets[name]||0} onChange={e=>setThirdTargets(v=>({...v,[name]:Number(e.target.value)}))}/></label>)}<button className="m238m-primary" disabled={saving} onClick={()=>void saveThird()}>{saving?"Menyimpan…":"Simpan Target Third Party"}</button></Card>:null}
    {notice?<small className="m238m-notice">{notice}</small>:null}
    {loading?<Card>Memuat Third Party…</Card>:<div className="m238m-list">{thirdRows.map(row=>{const target=Number(thirdTargets[row.supplier]||0),ar=target?Number(row.value||0)/target*100:0,gap=Math.max(0,target-Number(row.value||0));return <button key={row.supplier} className="m238m-click-card" onClick={()=>setSelectedThird(row.supplier)}><Card className="m238m-third-sales-row"><div><strong>{row.supplier}</strong><span>{num.format(Number(row.qty||0))} qty • Target {money.format(target)}</span></div><div className="m238m-row-chevron"><div><b>{money.format(Number(row.value||0))}</b><small>{target?`AR ${pct(ar)} • Gap ${money.format(gap)}`:"Target belum diisi"}</small></div><ChevronRight size={16}/></div></Card></button>})}</div>}
  </>:null}

  <Sheet open={!!selectedLob} onClose={()=>setSelectedLob(null)} title={selectedLob?`${selectedLob} • Detail Penjualan`:"Detail LOB"}>
   {selectedLob?<div className="m238m-stack">{lobProductsFor(selectedLob).filter(x=>x.qty>0).map(p=><button key={p.name} className="m238m-click-card" onClick={()=>setSelectedProduct(p.name)}><Card className="m238m-product-detail-row"><div><strong>{p.name}</strong><span>Penjualan periode ini</span></div><div><b>{num.format(p.qty)} unit</b><ChevronRight size={15}/></div></Card></button>)}{!lobProductsFor(selectedLob).some(x=>x.qty>0)?<Card className="m238m-empty">Belum ada penjualan pada LOB ini.</Card>:null}</div>:null}
  </Sheet>

  <Sheet open={!!selectedProduct} onClose={()=>setSelectedProduct(null)} title={selectedProduct?`${selectedProduct} • Staff`:"Detail Product"}>
   {selectedProduct?<div className="m238m-stack"><Card className="m238m-detail-sales"><span>Total Penjualan</span><strong>{num.format(Number(productMap.get(selectedProduct)?.qty||0))} unit</strong><small>Target {num.format(Number(lobTargets[selectedProduct]||0))} unit</small></Card><div className="m238m-section-head"><h2>Penjualan Staff</h2><span>{selectedProductStaff.length} staff</span></div><div className="m238m-list">{selectedProductStaff.map((r,i)=><Card key={r.id} className="m238m-staff-breakdown-row"><span>#{i+1}</span><strong>{shortStaffName(r.name)}</strong><b>{num.format(r.qty)} unit</b></Card>)}</div></div>:null}
  </Sheet>

  <Sheet open={!!selectedVas} onClose={()=>setSelectedVas(null)} title={selectedVas?`${selectedVas} • Detail Staff & AR`:"Detail VAS"}>
   {selectedVas&&selectedVasRow?<div className="m238m-stack"><Card className="m238m-detail-sales"><span>{selectedVas}</span><strong>{money.format(Number(selectedVasRow[2]))}</strong><small>{num.format(Number(selectedVasRow[3]))} qty • Target {money.format(vasTarget)}</small></Card><div className="m238m-section-head"><h2>Breakdown Target & Actual</h2><span>%T Staff</span></div><div className="m238m-list">{selectedVasStaff.map((r,i)=><Card key={r.id} className="m238m-vas-staff-row"><div className="m238m-vas-staff-head"><span>#{i+1}</span><strong>{shortStaffName(r.name)}</strong><b className={r.target&&r.ar>=100?"positive":""}>{r.target?pct(r.ar):"AR —"}</b></div><div className="m238m-vas-staff-meta"><span>Actual <b>{money.format(r.actual)}</b> • {num.format(r.qty)} qty</span><span>Target <b>{money.format(r.target)}</b> • %T {pct(r.share*100)}</span></div><Progress value={r.ar}/></Card>)}</div></div>:null}
  </Sheet>
  <Sheet open={!!selectedThird} onClose={()=>setSelectedThird(null)} title={selectedThird?`${selectedThird} • Detail 3PP`:"Third Party"}>
   {selectedThird&&selectedThirdData?<div className="m238m-stack">
    <Card className="m238m-detail-sales"><span>{selectedThird} • Actual</span><strong>{money.format(Number(selectedThirdData.value||0))}</strong><small>{num.format(Number(selectedThirdData.qty||0))} qty • Target {money.format(selectedThirdTarget)} • {selectedThirdTarget?`AR ${pct(Number(selectedThirdData.value||0)/selectedThirdTarget*100)}`:"Target belum diisi"}</small></Card>
    <div className="m238m-section-head"><h2>Penjualan Staff</h2><span>{selectedThirdStaff.filter(x=>x.actual>0).length} staff sales</span></div>
    <div className="m238m-list">{selectedThirdStaff.map((r,i)=><Card key={r.name} className="m238m-vas-staff-row"><div className="m238m-vas-staff-head"><span>#{i+1}</span><strong>{shortStaffName(r.name)}</strong><b className={r.target&&r.ar>=100?"positive":""}>{r.target?pct(r.ar):"AR —"}</b></div><div className="m238m-vas-staff-meta"><span>Actual <b>{money.format(r.actual)}</b> • {num.format(r.qty)} qty</span><span>Target <b>{money.format(r.target)}</b> • %T {thirdShareTotal?pct(r.share/thirdShareTotal*100):"0%"}</span></div><Progress value={r.ar}/></Card>)}</div>
    <div className="m238m-section-head"><h2>Detail Accessories Terjual</h2><span>{selectedThirdProducts.length} item</span></div>
    <div className="m238m-list">{selectedThirdProducts.length?selectedThirdProducts.map((p,i)=><Card key={`${p.article}-${p.name}-${i}`} className="m238m-third-product-row"><div><strong>{p.name}</strong><span>{p.brandCode} • {p.brandName}{p.article?` • ${p.article}`:""}</span></div><div><b>{num.format(Number(p.qty||0))} qty</b><small>{money.format(Number(p.value||0))}</small></div></Card>):<Card className="m238m-empty">Belum ada accessories terjual untuk supplier ini pada periode aktif.</Card>}</div>
   </div>:null}
  </Sheet> </div>
}
function DailyDetail({row}:{row:DailyRow}){
 return <div className="m238m-stack"><Card className="m238m-hero compact m238m-sales-hero"><span>{salesDateLabel(row.date)}</span><strong>{money.format(row.totalSales)}</strong><p>Target {money.format(row.target)} • {pct(row.achievementPct)}</p><Progress value={row.achievementPct}/></Card><div className="m238m-grid"><Metric label="Traffic" value={num.format(row.traffic)}/><Metric label="CVR" value={pct(row.cvr)}/><Metric label="Transaction" value={num.format(row.transaction)}/><Metric label="Qty" value={num.format(row.qty)}/><Metric label="UPT" value={row.upt.toFixed(1)}/><Metric label="ATV" value={money.format(row.atv)}/></div><div className="m238m-section-head"><h2>Sales Breakdown</h2></div><div className="m238m-grid"><Metric label="Device" value={money.format(row.breakdown.device)}/><Metric label="ACC" value={money.format(row.breakdown.accessories)}/><Metric label="VAS" value={money.format(row.breakdown.vas)}/></div><div className="m238m-section-head"><h2>LOB Qty</h2></div><div className="m238m-grid"><Metric label="iPhone" value={num.format(row.lob.iphoneQty)}/><Metric label="MacBook" value={num.format(row.lob.macbookQty)}/><Metric label="iPad" value={num.format(row.lob.ipadQty)}/><Metric label="Apple Watch" value={num.format(row.lob.appleWatchQty)}/><Metric label="AirPods" value={num.format(row.lob.airpodsQty)}/></div><div className="m238m-section-head"><h2>VAS Provider</h2></div><div className="m238m-grid"><Metric label="Qoala" value={money.format(row.vas.qoalaValue)} sub={`${num.format(row.vas.qoalaQty)} qty`}/><Metric label="Telkomsel" value={money.format(row.vas.telkomselValue)} sub={`${num.format(row.vas.telkomselQty)} qty`}/><Metric label="XL" value={money.format(row.vas.xlValue)} sub={`${num.format(row.vas.xlQty)} qty`}/><Metric label="Indosat" value={money.format(row.vas.indosatValue)} sub={`${num.format(row.vas.indosatQty)} qty`}/></div></div>
}
function StaffRow({staff,onClick,shortName=false}:{staff:Staff;onClick:()=>void;shortName?:boolean;fullMoney?:boolean}){
 const target=staff.targets?.amount||staff.target||0,a=target?staff.amount/target*100:staff.achievement||0,gap=target?Math.max(0,target-staff.amount):staff.gap||0;
 return <button className="m238m-staff-row" onClick={onClick}><div className="m238m-avatar">{initials(staff.name)}</div><div className="m238m-staff-main"><div><strong>{shortName?shortStaffName(staff.name):staff.name}</strong><b>{money.format(staff.amount)}</b></div><Progress value={a}/><small>{pct(a)} • Gap {money.format(gap)} • UPT {(staff.upt||0).toFixed(1)}</small></div><ChevronRight size={17}/></button>
}
function TeamScreen({rows,allRows,filter,setFilter,onStaff}:{rows:Staff[];allRows:Staff[];filter:string;setFilter:(v:string)=>void;onStaff:(s:Staff)=>void}){
 const label=filter==="top"?"3 staff penjualan tertinggi":filter==="low"?"Staff dengan AR di bawah 100%":"Semua staff store";
 const scored=rows.map((s,i)=>{const target=s.targets?.amount||s.target||0,ar=target?s.amount/target*100:(s.achievement||0);return{...s,rank:i+1,ar,target}});
 const allScored=allRows.map(s=>{const target=s.targets?.amount||s.target||0,ar=target?s.amount/target*100:(s.achievement||0);return{...s,ar,target}});
 const achieved=allScored.filter(s=>s.ar>=100).length;
 const follow=allScored.filter(s=>s.ar<100).length;
 const avgUpt=allScored.length?allScored.reduce((a,s)=>a+Number(s.upt||0),0)/allScored.length:0;
 return <div className="m238m-stack m238m-enter">
  <div className="m238m-team-summary">
    <Card><span>Achieve</span><strong>{num.format(achieved)}</strong><small>staff ≥ 100%</small></Card>
    <Card><span>Follow-up</span><strong>{num.format(follow)}</strong><small>staff &lt; 100%</small></Card>
    <Card><span>Avg UPT</span><strong>{avgUpt.toFixed(1)}</strong><small>team aktif</small></Card>
  </div>
  <div className="m238m-chips">{[["all","Semua"],["top","Top"],["low","Perlu Follow-up"]].map(([k,l])=><button key={k} className={filter===k?"active":""} onClick={()=>setFilter(k)}>{l}</button>)}</div>
  <div className="m238m-section-head"><h2>Team Performance</h2><span>{label}</span></div>
  <div className="m238m-team-cards">{scored.map(s=><button key={s.id} className="m238m-team-card-button" onClick={()=>onStaff(s)}>
    <Card className={"m238m-team-performance-card "+(s.ar>=100?"achieve":"follow")}>
      <div className="m238m-team-performance-head">
        <div className="m238m-team-rank">#{s.rank}</div>
        <div className="m238m-avatar">{initials(s.name)}</div>
        <div className="m238m-team-name"><strong>{shortStaffName(s.name)}</strong><span>{s.position||"Staff M238"}</span></div>
        <div className={"m238m-status-pill "+(s.ar>=100?"positive":"warning")}>{s.ar>=100?"Achieve":"Follow-up"}</div>
      </div>
      <div className="m238m-team-sales"><span>Sales</span><strong>{money.format(s.amount)}</strong><b>{pct(s.ar)}</b></div>
      <Progress value={s.ar}/>
      <div className="m238m-team-metrics">
        <div><span>Device</span><b>{money.format(Number(s.device||Math.max(0,Number(s.amount||0)-Number(s.accessories||0)-Number(s.vas||0))))}</b></div>
        <div><span>ACC</span><b>{money.format(Number(s.accessories||0))}</b></div>
        <div><span>VAS</span><b>{money.format(Number(s.vas||0))}</b></div>
        <div><span>UPT</span><b>{(s.upt||0).toFixed(1)}</b></div>
      </div>
      <div className="m238m-team-card-foot"><span>{s.target?("Target "+money.format(s.target)):"Target mengikuti periode aktif"}</span><ChevronRight size={16}/></div>
    </Card>
  </button>)}</div>
  <Card className="m238m-team-disclaimer"><strong>Catatan Ranking Staff</strong><p>Penjualan digimap.co.id / channel online tidak masuk ranking staff store.</p></Card>
 </div>
}
function StaffDetail({staff,mode}:{staff:Staff;mode:"daily"|"monthly"}){
 const target=staff.targets?.amount||staff.target||0,a=target?staff.amount/target*100:staff.achievement||0,device=staff.device||Math.max(0,(staff.amount||0)-(staff.accessories||0)-(staff.vas||0)),gap=target?Math.max(0,target-staff.amount):staff.gap||0;
 const lob=staff.lob||{iphone:0,mac:0,ipad:0,watch:0,airpods:0},vas=staff.vasDetail||{},inc=staff.incentive,detail=staff.incentiveDetail;
 const rateText=(rates:Record<string,number>={})=>Object.entries(rates).filter(([,q])=>Number(q)>0).sort((a,b)=>Number(a[0])-Number(b[0])).map(([rate,q])=>`${num.format(Number(q))} eligible × ${money.format(Number(rate))}`).join(" + ");
 const avg=detail?.activeDays&&inc?inc.total/detail.activeDays:0,contribution=detail?.teamTotal&&inc?inc.total/detail.teamTotal*100:0;
 const periodText=detail?`${salesDateLabel(detail.from).split(" • ")[0]} – ${salesDateLabel(detail.to).split(" • ")[0]}`:"";
 return <div className="m238m-stack">
  <div className="m238m-profile"><div className="m238m-avatar big">{initials(staff.name)}</div><div><h2>{staff.name}</h2><p>{staff.position||"Staff M238"} • {mode==="daily"?"Hari ini":periodText||"Periode aktif"}</p></div></div>
  <Card className="m238m-hero compact m238m-staff-detail-hero"><span>Sales</span><strong>{money.format(staff.amount)}</strong><p>Target {money.format(target)} • {pct(a)}</p><Progress value={a}/></Card>
  <div className="m238m-grid"><Metric label="Gap" value={money.format(gap)}/><Metric label="Device" value={money.format(device)} sub={staff.targets?.device?`Target ${money.format(staff.targets.device)}`:undefined}/><Metric label="ACC" value={money.format(staff.accessories||0)} sub={staff.targets?.accessories?`Target ${money.format(staff.targets.accessories)}`:undefined}/><Metric label="VAS" value={money.format(staff.vas||0)} sub={staff.targets?.vas?`Target ${money.format(staff.targets.vas)}`:undefined}/><Metric label="Qty" value={num.format(staff.qty||0)}/><Metric label="Invoice" value={num.format(staff.invoices||0)}/><Metric label="UPT" value={(staff.upt||0).toFixed(1)}/><Metric label="ATV" value={money.format(staff.atv||0)}/></div>
  {(lob.iphone||lob.mac||lob.ipad||lob.watch||lob.airpods)?<><div className="m238m-section-head"><h2>LOB Qty</h2></div><div className="m238m-grid"><Metric label="iPhone" value={num.format(lob.iphone)}/><Metric label="MacBook" value={num.format(lob.mac)}/><Metric label="iPad" value={num.format(lob.ipad)}/><Metric label="Apple Watch" value={num.format(lob.watch)}/><Metric label="AirPods" value={num.format(lob.airpods)}/></div></>:null}
  {(vas.qoala||vas.telkomsel||vas.xl||vas.indosat)?<><div className="m238m-section-head"><h2>VAS</h2></div><div className="m238m-grid"><Metric label="Qoala" value={money.format(vas.qoala?.value||0)} sub={`${num.format(vas.qoala?.qty||0)} qty`}/><Metric label="Telkomsel" value={money.format(vas.telkomsel?.value||0)} sub={`${num.format(vas.telkomsel?.qty||0)} qty`}/><Metric label="XL" value={money.format(vas.xl?.value||0)} sub={`${num.format(vas.xl?.qty||0)} qty`}/><Metric label="Indosat" value={money.format(vas.indosat?.value||0)} sub={`${num.format(vas.indosat?.qty||0)} qty`}/></div></>:null}
  {mode==="monthly"&&inc?<><div className="m238m-section-head"><h2>Estimated Incentive</h2><span>{money.format(inc.total)}</span></div>
   <div className="m238m-incentive-detail-list">
    <Card className="m238m-incentive-detail-row"><div><strong>MacBook</strong><span>{num.format(detail?.qty?.mac||0)} unit eligible × {money.format(30000)}</span></div><b>{money.format(inc.mac)}</b></Card>
    <Card className="m238m-incentive-detail-row"><div><strong>iPhone</strong><span>{num.format(detail?.qty?.iphone||0)} unit eligible × {money.format(15000)}</span></div><b>{money.format(inc.iphone)}</b></Card>
    <Card className="m238m-incentive-detail-row"><div><strong>iPad</strong><span>{num.format(detail?.qty?.ipad||0)} unit eligible × {money.format(10000)}</span></div><b>{money.format(inc.ipad)}</b></Card>
    <Card className="m238m-incentive-detail-row"><div><strong>Apple Watch</strong><span>{num.format(detail?.qty?.watch||0)} unit eligible × {money.format(10000)}</span></div><b>{money.format(inc.watch)}</b></Card>
    <Card className="m238m-incentive-detail-row"><div><strong>Accessories</strong><span>{rateText(detail?.rates?.accessories)||`${num.format(detail?.qty?.accessories||0)} unit eligible`}</span></div><b>{money.format(inc.accessories)}</b></Card>
    <Card className="m238m-incentive-detail-row"><div><strong>Qoala</strong><span>{rateText(detail?.rates?.qoala)||`${num.format(detail?.qty?.qoala||0)} eligible`}</span></div><b>{money.format(inc.qoala)}</b></Card>
   </div>
   <Card className="m238m-incentive-total-card"><div><span>Total Estimated Incentive</span><strong>{money.format(inc.total)}</strong></div><div><span>Avg Incentive / Active Day</span><b>{money.format(avg)}</b></div><div><span>Contribution to Team</span><b>{pct(contribution)}</b></div></Card>
  </>:null}
 </div>
}
function AdminScreen({period,periodMode,selectedWeek,activeRange}:{period:string;periodMode:"month"|"week";selectedWeek:string;activeRange:{from:string;to:string}|null}){
 const[tab,setTab]=useState<"soh"|"bnpl">("soh");
 const items=[["soh","SOH"],["bnpl","BNPL"]] as const;
 return <div className="m238m-stack m238m-enter">
  <div className="m238m-admin-tabs">{items.map(([k,l])=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k)}>{l}</button>)}</div>
  <MobileOperations kind={tab} period={period} periodMode={periodMode} selectedWeek={selectedWeek} activeRange={activeRange}/>
 </div>
}
function FeedbackInput(){
 const[date,setDate]=useState(today()),[staff,setStaff]=useState<Staff[]>([]),[staffId,setStaffId]=useState(""),[category,setCategory]=useState("external"),[value,setValue]=useState(""),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[msg,setMsg]=useState("");
 useEffect(()=>{let alive=true;setLoading(true);cachedJson<Daily>(`/api/daily-fast?date=${date}`,30000,true).then(d=>{if(!alive)return;const rows=(d.staff||[]).filter(s=>{const target=Number(s.targets?.amount||s.target||0);return target>0&&Number(s.amount||0)<target});setStaff(rows);setStaffId(rows[0]?.id||"")}).catch(()=>alive&&setStaff([])).finally(()=>alive&&setLoading(false));return()=>{alive=false}},[date]);
 const submit=async()=>{const person=staff.find(s=>s.id===staffId);if(!person||!value.trim())return;setBusy(true);setMsg("");try{const r=await fetch("/api/feedback",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({date,staffId:person.id,name:person.name,category,feedback:value.trim()})}),j=await r.json();if(!r.ok)throw new Error(j.error||"Gagal menyimpan feedback");setValue("");setMsg("Feedback berhasil disimpan.")}catch(e){setMsg(e instanceof Error?e.message:"Gagal menyimpan feedback")}finally{setBusy(false)}};
 return <div className="m238m-stack">
  <Card className="m238m-copy-card"><strong>Tambah Feedback Staff</strong><p>Daftar staff hanya menampilkan staff yang belum achieve pada tanggal yang dipilih.</p></Card>
  <Card className="m238m-form-card"><label className="m238m-form-label">Tanggal<input type="date" value={date} max={today()} onChange={e=>setDate(e.target.value)}/></label>{loading?<small>Memuat staff…</small>:<><select value={staffId} onChange={e=>setStaffId(e.target.value)}><option value="">Pilih staff</option>{staff.map(s=><option key={s.id} value={s.id}>{shortStaffName(s.name)} • {pct((s.targets?.amount||s.target||0)?s.amount/(s.targets?.amount||s.target||1)*100:0)}</option>)}</select><select value={category} onChange={e=>setCategory(e.target.value)}><option value="external">Faktor eksternal</option><option value="promo">Promo</option><option value="bnpl">BNPL</option><option value="performance">Performa staff</option><option value="stock">Ketersediaan stok</option></select><textarea value={value} onChange={e=>setValue(e.target.value)} placeholder="Tuliskan reason / kondisi di floor…"/><button className="m238m-primary" disabled={busy||!staffId||!value.trim()} onClick={()=>void submit()}>{busy?"Menyimpan…":"Simpan Feedback"}</button>{!staff.length?<small>Semua staff pada tanggal ini achieve atau tidak ada staff yang wajib feedback.</small>:null}{msg?<small>{msg}</small>:null}</>}</Card>
 </div>
}
function CxInput(){
 const[date,setDate]=useState(today()),[staff,setStaff]=useState<Staff[]>([]),[staffId,setStaffId]=useState(""),[cxInput,setCxInput]=useState(""),[memberInput,setMemberInput]=useState(""),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 useEffect(()=>{let alive=true;setLoading(true);Promise.all([cachedJson<Daily>(`/api/daily-fast?date=${date}`,30000,true),cachedJson<Cx>(`/api/cx-member?date=${date}`,30000,true)]).then(([d,cx])=>{if(!alive)return;const submitted=new Set((cx.rows||[]).map(r=>String(r.staffId))),rows=(d.staff||[]).filter(s=>!submitted.has(String(s.id)));setStaff(rows);setStaffId(rows[0]?.id||"")}).catch(()=>alive&&setStaff([])).finally(()=>alive&&setLoading(false));return()=>{alive=false}},[date]);
 const save=async()=>{const person=staff.find(x=>x.id===staffId);if(!person)return;setBusy(true);setMsg("");try{const r=await fetch("/api/cx-member",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({date,staffId:person.id,name:person.name,cx:Number(cxInput)||0,member:Number(memberInput)||0})}),j=await r.json();if(!r.ok)throw new Error(j.error||"Data gagal disimpan");setCxInput("");setMemberInput("");setStaff(v=>v.filter(x=>x.id!==person.id));setStaffId(v=>v===person.id?"":v);setMsg("CX / New Member berhasil disimpan.")}catch(e){setMsg(e instanceof Error?e.message:"Data gagal disimpan")}finally{setBusy(false)}};
 return <div className="m238m-stack">
  <Card className="m238m-copy-card"><strong>Input CX & New Member</strong><p>Staff yang sudah input pada tanggal terpilih otomatis tidak ditampilkan lagi.</p></Card>
  <Card className="m238m-form-card"><label className="m238m-form-label">Tanggal<input type="date" value={date} max={today()} onChange={e=>setDate(e.target.value)}/></label>{loading?<small>Memuat staff…</small>:<><select value={staffId} onChange={e=>setStaffId(e.target.value)}><option value="">Pilih staff</option>{staff.map(s=><option key={s.id} value={s.id}>{shortStaffName(s.name)}</option>)}</select><div className="m238m-form-grid"><input inputMode="numeric" value={cxInput} onChange={e=>setCxInput(e.target.value)} placeholder="CX"/><input inputMode="numeric" value={memberInput} onChange={e=>setMemberInput(e.target.value)} placeholder="New Member"/></div><button className="m238m-primary" disabled={busy||!staffId} onClick={()=>void save()}>{busy?"Menyimpan…":"Simpan"}</button>{!staff.length?<small>Semua staff pada tanggal ini sudah input.</small>:null}{msg?<small>{msg}</small>:null}</>}</Card>
 </div>
}
function MoreDetail({kind,data,period}:{kind:string;data:any;period:string}){
 if(kind==="add-feedback")return <FeedbackInput/>;
 if(kind==="add-cx")return <CxInput/>;
 if(kind==="checklist")return <div className="m238m-action-list"><button onClick={()=>window.open("https://forms.cloud.microsoft/pages/responsepage.aspx?id=iAw5Rakbn0eYpYaKADRxVqklIyFb72JDrV7GtVMqEcNUMUdNM1Q1VU4zTU9PTlpVTERHVUpZUk9BQS4u&route=shorturl","_blank")}><ClipboardCheck/>Checklist SPV</button><button onClick={()=>window.open("https://forms.cloud.microsoft/pages/responsepage.aspx?id=iAw5Rakbn0eYpYaKADRxVqklIyFb72JDrV7GtVMqEcNUQVpVV1hBVTdHTDVDWVlMRkE0V0lRVDQySS4u&route=shorturl","_blank")}><ClipboardCheck/>Checklist Staff</button></div>;
 if(kind==="mobile-view")return <div className="m238m-stack"><Card className="m238m-copy-card"><strong>Versi Tampilan HP</strong><p>Pilih tampilan lama jika ingin menggunakan dashboard responsive sebelumnya, atau tampilan baru untuk UI khusus iPhone.</p></Card><div className="m238m-view-picker"><button onClick={()=>window.dispatchEvent(new CustomEvent("m238:mobile-view-change",{detail:"classic"}))}>Tampilan Lama</button><button className="active" onClick={()=>window.dispatchEvent(new CustomEvent("m238:mobile-view-change",{detail:"new"}))}>Tampilan Baru ✓</button></div></div>;
 if(kind==="settings")return <Card>Pengaturan tampilan utama tetap tersedia di bagian Appearance. Pengaturan akun mengikuti sistem M238 yang sama.</Card>;
 if(data?.error)return <Card className="m238m-error">{data.error}</Card>;
 if(kind==="incentive")return <div className="m238m-stack"><Card className="m238m-hero compact"><span>Total Estimasi Incentive</span><strong>{money.format(data?.total||0)}</strong></Card><div className="m238m-list">{(data?.rows||[]).map((r:any)=><Card key={r.id} className="m238m-copy-card"><div className="m238m-copy-head"><strong>{r.name}</strong><b>{money.format(r.incentive?.total||0)}</b></div><p>Mac {num.format(r.qty?.mac||0)} • iPhone {num.format(r.qty?.iphone||0)} • iPad {num.format(r.qty?.ipad||0)} • Watch {num.format(r.qty?.watch||0)}</p></Card>)}</div></div>;
 return <Card>Menu mobile siap digunakan.</Card>
}