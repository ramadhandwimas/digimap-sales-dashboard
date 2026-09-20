"use client";

import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties,type ReactNode} from "react";
import {
  Activity,Box,Briefcase,CalendarDays,ChevronRight,ClipboardCheck,Copy,CreditCard,FileDown,
  FileSpreadsheet,Home,Lightbulb,LogOut,MessageCircle,MoreHorizontal,Moon,
  PackageSearch,RefreshCw,Settings,Share2,Sun,Target,TrendingUp,Users,WalletCards,X
} from "lucide-react";
import {exportReportPdf,exportReportPng,exportReportXlsx} from "@/lib/dashboard-export";
import MobileOperations from "@/components/mobile-operations";
import {makeDailySalesPicture,makeLobPicture,makeVasPicture} from "@/components/daily-sales-alerts";

type Tab="home"|"sales"|"team"|"report"|"admin"|"more";
type SalesMode="daily"|"summary"|"lob";
type FocusMode="lob"|"vas"|"third";
type ReportMode="weekly"|"feedback"|"cx";
type HomeMode="monthly"|"ytd"|"compare";
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
type Feedback={rows:{date:string;staffId:string;name:string;category:string;raw:string;professional:string}[]};
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
const compact=(v:number)=>Math.abs(v)>=1e9?`Rp ${(v/1e9).toLocaleString("id-ID",{maximumFractionDigits:2})} M`:Math.abs(v)>=1e6?`Rp ${(v/1e6).toLocaleString("id-ID",{maximumFractionDigits:0})} jt`:money.format(v);
function retailWeek(){const now=new Date(`${today()}T00:00:00+07:00`),m=now.getMonth()+1,starts=[10,1,4,7],startMonth=starts.find(x=>x<=m)||10,startYear=startMonth===10&&m<10?now.getFullYear()-1:now.getFullYear(),start=new Date(startYear,startMonth-1,1),diff=Math.floor((now.getTime()-start.getTime())/86400000);return Math.max(1,Math.ceil((diff+start.getDay()+1)/7))}
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
  const[overview,setOverview]=useState<Overview|null>(null),[traffic,setTraffic]=useState<Traffic|null>(null),[daily,setDaily]=useState<Daily|null>(null),[summary,setSummary]=useState<DailySummary|null>(null),[weekly,setWeekly]=useState<Weekly|null>(null),[weeklySummary,setWeeklySummary]=useState<DailySummary|null>(null),[feedback,setFeedback]=useState<Feedback|null>(null),[cx,setCx]=useState<Cx|null>(null),[staffDetail,setStaffDetail]=useState<Staff|null>(null),[staffDetailMode,setStaffDetailMode]=useState<"daily"|"monthly">("monthly"),[dayDetail,setDayDetail]=useState<DailyRow|null>(null);
  const[homeMode,setHomeMode]=useState<HomeMode>("monthly"),[salesMode,setSalesMode]=useState<SalesMode>("daily"),[reportMode,setReportMode]=useState<ReportMode>("weekly"),[teamFilter,setTeamFilter]=useState("all"),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[error,setError]=useState(""),[dark,setDark]=useState(false);
  const rootRef=useRef<HTMLDivElement>(null),touchStart=useRef<number|null>(null);

  const loadOverview=useCallback(async(force=false)=>{
    setError("");
    const monthlyFrom=`${period}-01`,monthlyTo=period===periodNow()?today():`${period}-${String(new Date(Number(period.slice(0,4)),Number(period.slice(5,7)),0).getDate()).padStart(2,"0")}`;
    const from=periodMode==="week"&&activeRange?activeRange.from:monthlyFrom,to=periodMode==="week"&&activeRange?activeRange.to:monthlyTo;
    const overviewUrl=periodMode==="week"&&activeRange?`/api/overview?period=${from.slice(0,7)}&from=${from}&to=${to}&label=${encodeURIComponent(selectedWeek)}`:`/api/overview?period=${period}`;
    const[o,t]=await Promise.all([
      cachedJson<Overview>(overviewUrl,180000,force),
      cachedJson<Traffic>(`/api/traffic?from=${from}&to=${to}`,180000,force)
    ]);
    setOverview(o);setTraffic(t);
  },[period,periodMode,activeRange,selectedWeek]);

  useEffect(()=>{setLoading(true);loadOverview().catch(e=>setError(e instanceof Error?e.message:"Gagal memuat dashboard")).finally(()=>setLoading(false))},[loadOverview]);
  useEffect(()=>{const d=localStorage.getItem("m238-theme")==="dark";setDark(d);document.documentElement.classList.toggle("dark",d)},[]);

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
  const loadFeedback=useCallback(async(force=false)=>setFeedback(await cachedJson<Feedback>(`/api/feedback?period=${period}`,180000,force)),[period]);
  const loadCx=useCallback(async(force=false)=>setCx(await cachedJson<Cx>(`/api/cx-member?period=${period}`,180000,force)),[period]);

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
  const toggleDark=()=>{const next=!dark;setDark(next);localStorage.setItem("m238-theme",next?"dark":"light");document.documentElement.classList.toggle("dark",next);let meta=document.querySelector('meta[name="theme-color"]') as HTMLMetaElement|null;if(!meta){meta=document.createElement("meta");meta.name="theme-color";document.head.appendChild(meta)}meta.content=next?"#000000":"#f2f2f7"};
  const transaction=overview?.summary.invoices||0,trafficValue=traffic?.total||0,cvr=trafficValue?transaction/trafficValue*100:0,achievement=overview?.target.amount?((overview.summary.amount/overview.target.amount)*100):0;
  const team=useMemo(()=>{const rows=overview?.staff||[];if(teamFilter==="top")return rows.filter(x=>x.status==="Productive");if(teamFilter==="attention")return rows.filter(x=>x.status!=="Productive");return rows},[overview,teamFilter]);

  const openPeriodSheet=()=>{setDraftPeriod(period);setDraftPeriodMode(periodMode);setDraftWeek(selectedWeek||weekly?.labelB||"");setSheet("period");if(!weekly)void loadWeekly()};
  const applyPeriod=async()=>{
    if(draftPeriodMode==="week"){
      if(!draftWeek)return;
      setRefreshing(true);
      try{
        const w=await loadWeekly(true,draftWeek);
        if(w?.periodB?.start&&w?.periodB?.end){
          setPeriodMode("week");setSelectedWeek(w.labelB||draftWeek);setActiveRange({from:w.periodB.start,to:w.periodB.end});setPeriod(w.periodB.start.slice(0,7));
          setSummary(null);setFeedback(null);setCx(null);setOverview(null);setTraffic(null);setSheet(null);
        }
      }finally{setRefreshing(false)}
      return;
    }
    setPeriodMode("month");setActiveRange(null);setSelectedWeek("");setPeriod(draftPeriod);setDaily(null);setSummary(null);setFeedback(null);setCx(null);setOverview(null);setTraffic(null);setSheet(null);
  };
  const shareText=`M238 PIM 2 • ${overview?.label||monthLabel(period)}\nSales ${money.format(overview?.summary.amount||0)}\nAchievement ${pct(achievement)}\nUPT ${(overview?.summary.upt||0).toFixed(1)}`;
  const doShare=async(kind:string)=>{if(kind==="wa")window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`,"_blank");else if(kind==="copy")await navigator.clipboard.writeText(shareText);else if(rootRef.current&&kind==="png")await exportReportPng(rootRef.current,`M238-${period}`);else if(rootRef.current&&kind==="pdf")await exportReportPdf(rootRef.current,`M238-${period}`);else if(kind==="xlsx"&&overview)await exportReportXlsx([{name:"Overview",rows:[["Periode",overview.label],["Sales",overview.summary.amount],["Target",overview.target.amount],["Achievement",achievement],["UPT",overview.summary.upt],[],["Staff","Sales","Achievement"],...overview.staff.map(s=>[s.name,s.amount,s.achievement??0])]}],`M238-${period}`);setSheet(null)};

  const handleMore=async(action:string)=>{
    if(action==="cx"){setTab("report");setReportMode("cx");return}
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

  return <div ref={rootRef} className="m238m-app" onTouchStart={e=>{if(window.scrollY===0)touchStart.current=e.touches[0].clientY}} onTouchMove={touchMove} onTouchEnd={()=>{touchStart.current=null}}>
    <header className="m238m-header">
      <div><span>M238 Dashboard</span><strong>PIM 2</strong></div>
      <div className="m238m-header-actions"><button onClick={()=>setSheet("share")} aria-label="Share"><Share2 size={19}/></button><button onClick={()=>void refresh()} aria-label="Refresh"><RefreshCw size={19} className={refreshing?"spin":""}/></button></div>
    </header>
    <main className="m238m-content">
      <button className="m238m-period" onClick={openPeriodSheet}><CalendarDays size={15}/><span>{periodMode==="week"?(selectedWeek||weekly?.labelB||"Pilih Week"):monthLabel(period)}</span><small>{periodMode==="week"?"Weekly":(weekly?.labelB||"Week berjalan")}</small><ChevronRight size={15}/></button>
      {refreshing?<div className="m238m-refreshing"><RefreshCw size={14} className="spin"/> Memperbarui data…</div>:null}
      {error?<Card className="m238m-error">{error}</Card>:null}
      {loading&&!overview?<Skeleton/>:null}
      {!loading&&overview&&tab==="home"?<HomeScreen mode={homeMode} setMode={setHomeMode} overview={overview} traffic={traffic} cvr={cvr} achievement={achievement} onOpenSalesDetail={()=>void openHomeSalesDetail()}/>:null}
      {tab==="sales"?<SalesScreen mode={salesMode} setMode={setSalesMode} daily={daily} summary={summary} period={period} periodMode={periodMode} selectedWeek={selectedWeek} activeRange={activeRange} onStaff={s=>void openStaff(s,"daily")} onDay={row=>{setDayDetail(row);setSheet("day")}}/>:null}
      {tab==="team"?<TeamScreen rows={team} filter={teamFilter} setFilter={setTeamFilter} onStaff={s=>void openStaff(s,"monthly")}/>:null}
      {tab==="report"?<ReportScreen mode={reportMode} setMode={setReportMode} weekly={weekly} weeklySummary={weeklySummary} feedback={feedback} cx={cx} staff={overview?.staff||[]}/>:null}
      {tab==="admin"?<AdminScreen onAction={handleMore}/>:null}
      {tab==="more"?<MoreScreen dark={dark} toggleDark={toggleDark} onAction={handleMore}/>:null}
    </main>

    <nav className="m238m-bottom" style={{"--m238m-active-index":String(["home","sales","team","report","admin","more"].indexOf(tab))} as CSSProperties}>
      <span className="m238m-liquid-bubble" aria-hidden="true"/>
      {[
        ["home","Home",Home],["sales","Sales",TrendingUp],["team","Team",Users],["report","Report",FileDown],["admin","Administrasi",Briefcase],["more","More",MoreHorizontal]
      ].map(([key,label,Icon])=><button key={String(key)} onClick={()=>setTab(key as Tab)} className={tab===key?"active":""}><span className="m238m-nav-icon"><Icon size={21}/></span><span className="m238m-nav-label">{String(label)}</span></button>)}
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
    <Sheet open={sheet==="more"} onClose={()=>setSheet(null)} title={moreKind==="incentive"?"Estimasi Incentive":moreKind==="bnpl"?"BNPL & Trade-In":moreKind==="target"?"Target & Program":moreKind==="soh"?"Stock On Hand":moreKind==="stokan"?"Stokan":moreKind==="mading"?"Mading Performance":moreKind==="checklist"?"Checklist Store":moreKind==="mobile-view"?"Versi Tampilan HP":"Detail"}>
      {moreBusy?<Skeleton/>:<MoreDetail kind={moreKind} data={moreData} period={period}/>} 
    </Sheet>
    <style jsx global>{mobileCss}</style>
  </div>
}


function HomeScreen({mode,setMode,overview,traffic,cvr,achievement,onOpenSalesDetail}:{mode:HomeMode;setMode:(v:HomeMode)=>void;overview:Overview;traffic:Traffic|null;cvr:number;achievement:number;onOpenSalesDetail:()=>void}){
 const salesRows=overview.daily||[],latestSales=salesRows.at(-1)?.amount||0,prevSales=salesRows.at(-2)?.amount||0,salesDelta=prevSales?((latestSales-prevSales)/prevSales)*100:null;
 const trafficRows=traffic?.daily||[],latestTraffic=trafficRows.at(-1)?.traffic||0,prevTraffic=trafficRows.at(-2)?.traffic||0,trafficDelta=prevTraffic?((latestTraffic-prevTraffic)/prevTraffic)*100:null;
 const insight=salesDelta==null
  ? (achievement>=100?"Target bulan ini sudah tercapai. Pertahankan momentum penjualan.":achievement>=80?"Achievement sudah mendekati target. Fokuskan opportunity yang siap closing.":"Achievement masih perlu didorong. Prioritaskan opportunity dan follow-up yang aktif.")
  : `Sales hari terakhir ${salesDelta>=0?"naik":"turun"} ${pct(Math.abs(salesDelta))} dibanding hari sebelumnya.`;
 const selectedCompare=overview.compare?.find(x=>x.month===Number(overview.period.slice(5,7)))||overview.lfl;
 return <div className="m238m-stack m238m-enter">
  <div className="m238m-home-tabs">
    <button className={mode==="monthly"?"active":""} onClick={()=>setMode("monthly")}>Overview Bulanan</button>
    <button className={mode==="ytd"?"active":""} onClick={()=>setMode("ytd")}>YTD Overview</button>
    <button className={mode==="compare"?"active":""} onClick={()=>setMode("compare")}>Compare<br/>2025 vs 2026</button>
  </div>

  {mode==="monthly"?<>
    <button className="m238m-hero-button" onClick={onOpenSalesDetail}>
      <Card className="m238m-hero m238m-home-hero"><div className="m238m-hero-title"><span>Total Sales</span><ChevronRight size={18}/></div><strong>{money.format(overview.summary.amount)}</strong><p>{pct(achievement)} dari Target</p><Progress value={achievement}/><div className="m238m-hero-meta"><span>Target <b>{money.format(overview.target.amount)}</b></span><span>Point Store <b>{overview.summary.point.total.toFixed(1)}</b></span></div></Card>
    </button>
    <div className="m238m-grid"><Metric label="Achievement" value={pct(achievement)} sub={overview.summary.status}/><Metric label="Gap / Variance" value={money.format(overview.summary.gap)} sub={overview.summary.gap>0?"Sisa ke target":"Target tercapai"}/><Metric label="Estimate" value={money.format(overview.summary.estimate.amount)} sub="Proyeksi bulan"/><Metric label="Pace" value={pct(overview.summary.pace)} sub={overview.summary.status}/></div>
    <Card className="m238m-point-card"><div><span>Point Store</span><strong>{overview.summary.point.total.toFixed(1)}</strong></div><div className="m238m-point-breakdown"><span>Device {overview.summary.point.device.toFixed(1)}/60</span><span>ACC {overview.summary.point.accessories.toFixed(1)}/30</span><span>VAS {overview.summary.point.vas.toFixed(1)}/10</span></div></Card>
    <div className="m238m-section-head"><h2>Penjualan per Kategori</h2><span>{overview.label}</span></div>
    <div className="m238m-grid"><Metric label="Device" value={money.format(overview.summary.device)} sub={`Target ${money.format(overview.target.device)}`}/><Metric label="Accessories" value={money.format(overview.summary.accessories)} sub={`Target ${money.format(overview.target.accessories)}`}/><Metric label="VAS" value={money.format(overview.summary.vas)} sub={`Target ${money.format(overview.target.vas)}`}/></div>
    <div className="m238m-section-head"><h2>Traffic & Conversion</h2></div>
    <div className="m238m-grid"><Metric label="Traffic" value={num.format(traffic?.total||0)} sub={trafficDelta==null?undefined:`${trafficDelta>=0?"+":""}${pct(trafficDelta)} vs hari sebelumnya`}/><Metric label="Transaksi" value={num.format(overview.summary.invoices)} sub="Invoice unique"/><Metric label="CVR" value={pct(cvr)} sub="Traffic → transaksi"/><Metric label="UPT" value={overview.summary.upt.toFixed(1)} sub="Unit per transaksi"/><Metric label="Qty" value={num.format(overview.summary.qty)} sub="Total unit"/><Metric label="ATV" value={money.format(overview.summary.atv)} sub="Average ticket"/></div>
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

function SalesScreen({mode,setMode,daily,summary,period,periodMode,selectedWeek,activeRange,onStaff,onDay}:{mode:SalesMode;setMode:(v:SalesMode)=>void;daily:Daily|null;summary:DailySummary|null;period:string;periodMode:"month"|"week";selectedWeek:string;activeRange:{from:string;to:string}|null;onStaff:(s:Staff)=>void;onDay:(r:DailyRow)=>void}){
 const[showTodayDetail,setShowTodayDetail]=useState(false),[dailyLobPick,setDailyLobPick]=useState<{label:string;key:"iphone"|"mac"|"ipad"|"watch"|"airpods"}|null>(null),[dailyVasPick,setDailyVasPick]=useState<{label:string;key:"qoala"|"telkomsel"|"xl"|"indosat"}|null>(null),[dailyDrillStaff,setDailyDrillStaff]=useState<Staff|null>(null),[dailyProductDetail,setDailyProductDetail]=useState<any>(null),[dailyProductBusy,setDailyProductBusy]=useState(false);
 const ach=daily?.total.target?daily.total.amount/daily.total.target*100:0,device=daily?Math.max(0,daily.total.amount-daily.total.accessories-daily.total.vas):0;
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
 const lobStaff=dailyLobPick&&daily?daily.staff.filter(st=>Number(st.lob?.[dailyLobPick.key]||0)>0).sort((a,b)=>Number(b.lob?.[dailyLobPick.key]||0)-Number(a.lob?.[dailyLobPick.key]||0)):[];
 const vasStaff=dailyVasPick&&daily?daily.staff.filter(st=>Number(st.vasDetail?.[dailyVasPick.key]?.qty||0)>0||Number(st.vasDetail?.[dailyVasPick.key]?.value||0)>0).sort((a,b)=>Number(b.vasDetail?.[dailyVasPick.key]?.value||0)-Number(a.vasDetail?.[dailyVasPick.key]?.value||0)):[];
 const productPrefix=(key:string)=>key==="iphone"?"iPhone":key==="mac"?"MacBook":key==="ipad"?"iPad":key==="watch"?"Apple Watch":"AirPods";
 const selectedProductStaff=dailyDrillStaff&&dailyLobPick?(dailyProductDetail?.lob?.staff||[]).find((x:any)=>String(x.id)===String(dailyDrillStaff.id));
 const selectedProducts=dailyDrillStaff&&dailyLobPick?Object.entries(selectedProductStaff?.products||{}).filter(([name,v]:any)=>name.startsWith(productPrefix(dailyLobPick.key))&&Number(v?.qty||0)>0).map(([name,v]:any)=>({name,qty:Number(v.qty||0),value:Number(v.value||0)})).sort((a,b)=>b.qty-a.qty):[];
 return <div className="m238m-stack m238m-enter">
  <Segmented value={mode} onChange={setMode} items={[{value:"daily",label:"Daily"},{value:"summary",label:"Summary"},{value:"lob",label:"Fokus Product"}]}/>
  {mode==="daily"?(daily?<>
    <button className="m238m-click-card" onClick={()=>setShowTodayDetail(true)}><Card className="m238m-hero compact m238m-sales-hero m238m-tappable-card"><div className="m238m-weekly-hero-title"><span>Sales Today</span><ChevronRight size={18}/></div><strong>{money.format(daily.total.amount)}</strong><p>Target {money.format(daily.total.target)} • {pct(ach)}</p><Progress value={ach}/><small className="m238m-tap-hint">Tap untuk lihat detail penjualan hari ini</small></Card></button>
    <div className="m238m-grid"><Metric label="Device" value={money.format(device)}/><Metric label="ACC" value={money.format(daily.total.accessories)} sub={`Target ${money.format(daily.total.accTarget)}`}/><Metric label="VAS" value={money.format(daily.total.vas)} sub={`Target ${money.format(daily.total.vasTarget)}`}/><Metric label="UPT" value={daily.total.upt.toFixed(1)}/><Metric label="Invoice" value={num.format(daily.total.invoices)}/><Metric label="Qty" value={num.format(daily.total.qty)}/></div>
    <div className="m238m-section-head"><h2>Staff Performance Today</h2><span>{daily.staff.length} staff</span></div>
    <div className="m238m-list">{daily.staff.map(s=><StaffRow key={s.id} staff={s} onClick={()=>onStaff(s)} shortName fullMoney/>)}</div>
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
    {lobStaff.length?<div className="m238m-list">{lobStaff.map((st,i)=><button key={st.id} className="m238m-click-card" onClick={()=>setDailyDrillStaff(st)}><Card className="m238m-product-detail-row"><div><strong>#{i+1} {shortStaffName(st.name)}</strong><span>Penjualan {dailyLobPick.label}</span></div><div><b>{num.format(Number(st.lob?.[dailyLobPick.key]||0))} unit</b><ChevronRight size={15}/></div></Card></button>)}</div>:<Card className="m238m-empty">Belum ada staff yang menjual {dailyLobPick.label} hari ini.</Card>}
   </div>:null}
  </Sheet>

  <Sheet open={!!dailyVasPick} onClose={()=>{setDailyVasPick(null);setDailyDrillStaff(null)}} title={dailyVasPick?`${dailyVasPick.label} • Staff Hari Ini`:"VAS Staff"}>
   {dailyVasPick?<div className="m238m-stack">
    <Card className="m238m-copy-card"><strong>{dailyVasPick.label}</strong><p>Pilih staff untuk melihat detail VAS yang dijual hari ini.</p></Card>
    {vasStaff.length?<div className="m238m-list">{vasStaff.map((st,i)=>{const x=st.vasDetail?.[dailyVasPick.key];return <button key={st.id} className="m238m-click-card" onClick={()=>setDailyDrillStaff(st)}><Card className="m238m-product-detail-row"><div><strong>#{i+1} {shortStaffName(st.name)}</strong><span>{num.format(Number(x?.qty||0))} qty</span></div><div><b>{money.format(Number(x?.value||0))}</b><ChevronRight size={15}/></div></Card></button>})}</div>:<Card className="m238m-empty">Belum ada penjualan {dailyVasPick.label} hari ini.</Card>}
   </div>:null}
  </Sheet>

  <Sheet open={!!dailyDrillStaff} onClose={()=>setDailyDrillStaff(null)} title={dailyDrillStaff?`${shortStaffName(dailyDrillStaff.name)} • Detail Penjualan`:"Detail Staff"}>
   {dailyDrillStaff&&dailyLobPick?<div className="m238m-stack">
    <Card className="m238m-detail-sales"><span>{dailyLobPick.label}</span><strong>{num.format(Number(dailyDrillStaff.lob?.[dailyLobPick.key]||0))} unit</strong><small>{daily.date}</small></Card>
    <div className="m238m-section-head"><h2>Unit / Model Terjual</h2><span>{selectedProducts.length} type</span></div>
    {dailyProductBusy?<Skeleton/>:selectedProducts.length?<div className="m238m-list">{selectedProducts.map(p=><Card key={p.name} className="m238m-product-detail-row"><div><strong>{p.name}</strong><span>Penjualan hari ini</span></div><b>{num.format(p.qty)} unit</b></Card>)}</div>:<Card className="m238m-empty">{dailyLobPick.key==="airpods"?"Breakdown model AirPods belum tersedia dari source detail harian; total unit staff tetap ditampilkan di atas.":"Tidak ada breakdown model yang cocok pada source detail harian."}</Card>}
   </div>:dailyDrillStaff&&dailyVasPick?<div className="m238m-stack">
    <Card className="m238m-detail-sales"><span>VAS Staff • {shortStaffName(dailyDrillStaff.name)}</span><strong>{money.format(Number(dailyDrillStaff.vasDetail?.[dailyVasPick.key]?.value||0))}</strong><small>{dailyVasPick.label} • {num.format(Number(dailyDrillStaff.vasDetail?.[dailyVasPick.key]?.qty||0))} qty</small></Card>
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
   const [fp,third,lt,la,vt,tt,sp]=await Promise.all([
    cachedJson<any>(focusUrl,180000,force),
    cachedJson<any>(thirdUrl,180000,force),
    cachedJson<any>(`/api/manual-target?scope=${targetScope}&period=${encodeURIComponent(targetPeriod)}&group=lob-focus`,180000,force),
    cachedJson<any>(`/api/manual-target?scope=${targetScope}&period=${encodeURIComponent(targetPeriod)}&group=lob-focus-active`,180000,force),
    cachedJson<any>(`/api/manual-target?scope=${targetScope}&period=${encodeURIComponent(targetPeriod)}&group=vas-focus`,180000,force),
    cachedJson<any>(`/api/manual-target?scope=${targetScope}&period=${encodeURIComponent(targetPeriod)}&group=product-focus-value`,180000,force),
    cachedJson<{staff:Staff[]}>(staffUrl,180000,force)
   ]);
   setFocus(fp);setThirdData(third);setStaffPerf(sp.staff||[]);
   setLobTargets(Object.fromEntries(Object.entries(lt.targets||{}).map(([k,v]:any)=>[k,Number(v.target||0)])));
   setLobActive(Object.fromEntries(Object.entries(la.targets||{}).map(([k,v]:any)=>[k,Number(v.target||0)])));
   setVasTargets(Object.fromEntries(Object.entries(vt.targets||{}).map(([k,v]:any)=>[k,Number(v.target||0)])));
   setThirdTargets(Object.fromEntries(thirdKeys.map(k=>[k,Number(tt.targets?.[k]?.target??(k==="IGA"?tt.targets?.Iga?.target:0)??0)])));
   setShares((vt.staff||lt.staff||[]).map((x:any)=>({id:String(x.id),name:String(x.name),share:Number(x.share||0)})));
  }finally{setLoading(false)}
 },[period,periodMode,selectedWeek,activeRange,focusUrl,thirdUrl,staffUrl,targetScope,targetPeriod]);
 useEffect(()=>{void load()},[load]);

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
function StaffRow({staff,onClick,shortName=false,fullMoney=false}:{staff:Staff;onClick:()=>void;shortName?:boolean;fullMoney?:boolean}){
 const target=staff.targets?.amount||staff.target||0,a=target?staff.amount/target*100:staff.achievement||0,gap=target?Math.max(0,target-staff.amount):staff.gap||0;
 return <button className="m238m-staff-row" onClick={onClick}><div className="m238m-avatar">{initials(staff.name)}</div><div className="m238m-staff-main"><div><strong>{shortName?shortStaffName(staff.name):staff.name}</strong><b>{fullMoney?money.format(staff.amount):compact(staff.amount)}</b></div><Progress value={a}/><small>{pct(a)} • Gap {fullMoney?money.format(gap):compact(gap)} • UPT {(staff.upt||0).toFixed(1)}</small></div><ChevronRight size={17}/></button>
}
function TeamScreen({rows,filter,setFilter,onStaff}:{rows:Staff[];filter:string;setFilter:(v:string)=>void;onStaff:(s:Staff)=>void}){
 return <div className="m238m-stack m238m-enter"><div className="m238m-chips">{[["all","All"],["top","Top Performer"],["attention","Perlu Perhatian"]].map(([k,l])=><button key={k} className={filter===k?"active":""} onClick={()=>setFilter(k)}>{l}</button>)}</div><div className="m238m-section-head"><h2>Staff Performance</h2><span>{rows.length} staff</span></div><div className="m238m-list">{rows.map(s=><StaffRow key={s.id} staff={s} onClick={()=>onStaff(s)} fullMoney/>)}</div></div>
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
function ReportScreen({mode,setMode,weekly,weeklySummary,feedback,cx,staff}:{mode:ReportMode;setMode:(v:ReportMode)=>void;weekly:Weekly|null;weeklySummary:DailySummary|null;feedback:Feedback|null;cx:Cx|null;staff:Staff[]}){
 return <div className="m238m-stack m238m-enter"><Segmented value={mode} onChange={setMode} items={[{value:"weekly",label:"Weekly"},{value:"feedback",label:"Feedback"},{value:"cx",label:"CX"}]}/>{mode==="weekly"?(weekly?<WeeklyView weekly={weekly} summary={weeklySummary}/>:<Skeleton/>):mode==="feedback"?(feedback?<FeedbackView data={feedback} staff={staff}/>:<Skeleton/>):(cx?<CxView data={cx} staff={staff}/>:<Skeleton/>)}</div>
}
function WeeklyView({weekly,summary}:{weekly:Weekly;summary:DailySummary|null}){
 const[showDetail,setShowDetail]=useState(false),[selectedLob,setSelectedLob]=useState<{name:string;key:string}|null>(null),[copyMsg,setCopyMsg]=useState("");
 const sum=(obj:Record<string,{qty:number;amount:number}>={})=>Object.values(obj).reduce((a,x)=>({qty:a.qty+x.qty,amount:a.amount+x.amount}),{qty:0,amount:0});
 const total=(side:Weekly["b"])=>sum(side.scheme),cur=total(weekly.b),prev=total(weekly.a),growth=prev.amount?(cur.amount-prev.amount)/prev.amount*100:0;
 const lobs=[["iPhone","IPHONE"],["iPad","IPAD"],["MacBook","MAC"],["Apple Watch","APPLE WATCH"],["AirPods","AIRPODS"]] as const;
 const schemes=[...new Set([...Object.keys(weekly.a.scheme||{}),...Object.keys(weekly.b.scheme||{})])];
 const vasKeys=[...new Set([...Object.keys(weekly.a.vas||{}),...Object.keys(weekly.b.vas||{})])];
 const delta=(a:number,b:number)=>a?((b-a)/a)*100:(b?100:0);
 const lobDetailRows=selectedLob?[...new Set([...Object.keys(weekly.a.lob?.[selectedLob.key]||{}),...Object.keys(weekly.b.lob?.[selectedLob.key]||{})])].map(type=>{
   const a=weekly.a.lob?.[selectedLob.key]?.[type]||{qty:0,amount:0},b=weekly.b.lob?.[selectedLob.key]?.[type]||{qty:0,amount:0};
   return{type,a,b,qtyDelta:b.qty-a.qty,qtyPct:delta(a.qty,b.qty),amountDelta:b.amount-a.amount,amountPct:delta(a.amount,b.amount)};
 }).sort((x,y)=>x.qtyDelta-y.qtyDelta||x.amountDelta-y.amountDelta):[];
 const copyLobCompare=async()=>{
  if(!selectedLob)return;
  const lines=[`*${selectedLob.name} • ${weekly.labelA} vs ${weekly.labelB}*`,...lobDetailRows.map(r=>`${r.type}: ${r.a.qty} → ${r.b.qty} unit (${r.qtyDelta>=0?"+":""}${r.qtyDelta}; ${r.qtyPct>=0?"+":""}${pct(r.qtyPct)}) | ${money.format(r.a.amount)} → ${money.format(r.b.amount)} (${r.amountPct>=0?"+":""}${pct(r.amountPct)})`)];
  try{await navigator.clipboard.writeText(lines.join("\n"));setCopyMsg("Compare berhasil disalin.");setTimeout(()=>setCopyMsg(""),1800)}catch{setCopyMsg("Gagal menyalin.")}
 };
 return <>
  <button className="m238m-click-card" onClick={()=>setShowDetail(true)}><Card className="m238m-hero compact m238m-weekly-hero"><div className="m238m-weekly-hero-title"><span>Weekly Sales • {weekly.labelB}</span><ChevronRight size={18}/></div><strong>{compact(cur.amount)}</strong><p>{growth>=0?"+":""}{pct(growth)} vs {weekly.labelA} • Qty {num.format(cur.qty)}</p>{summary?.dailyRows?.length?<TouchLineChart rows={summary.dailyRows}/>:null}<small className="m238m-tap-hint">Tap untuk detail compare {weekly.labelA} vs {weekly.labelB}</small></Card></button>
  {summary?<div className="m238m-grid"><Metric label="Traffic" value={num.format(summary.summary.traffic)}/><Metric label="CVR" value={pct(summary.summary.cvr)}/><Metric label="Transaction" value={num.format(summary.summary.transaction)}/><Metric label="UPT" value={summary.summary.upt.toFixed(1)}/><Metric label="ATV" value={compact(summary.summary.atv)}/><Metric label="Qty" value={num.format(summary.summary.qty)}/></div>:null}
  <div className="m238m-section-head"><h2>Sales Summary</h2><span>{weekly.labelA} → {weekly.labelB}</span></div>
  <div className="m238m-list">{schemes.map(k=>{const a=weekly.a.scheme[k]||{qty:0,amount:0},b=weekly.b.scheme[k]||{qty:0,amount:0},d=delta(a.amount,b.amount);return <Card key={k} className="m238m-copy-card"><div className="m238m-copy-head"><strong>{k}</strong><b>{compact(b.amount)}</b></div><p>{num.format(b.qty)} qty • {d>=0?"+":""}{pct(d)} amount vs {weekly.labelA}</p></Card>})}</div>
  <div className="m238m-section-head"><h2>VAS Performance</h2><span>Qoala / Provider</span></div>
  <div className="m238m-list">{vasKeys.map(k=>{const a=weekly.a.vas[k]||{qty:0,amount:0},b=weekly.b.vas[k]||{qty:0,amount:0},d=delta(a.amount,b.amount);return <Card key={k} className="m238m-copy-card"><div className="m238m-copy-head"><strong>{k}</strong><b>{compact(b.amount)}</b></div><p>{num.format(b.qty)} qty • {d>=0?"+":""}{pct(d)} vs {weekly.labelA}</p></Card>})}</div>
  <div className="m238m-section-head"><h2>LOB Performance</h2><span>Target vs Actual</span></div>
  <Card><div className="m238m-lob-list">{lobs.map(([name,key])=>{const current=sum(weekly.b.lob?.[key]||{}),previous=sum(weekly.a.lob?.[key]||{}),target=weekly.targets?.lob?.[key]||0,a=target?current.qty/target*100:0,d=delta(previous.qty,current.qty);return <div key={key}><div><strong>{name}</strong><span>{target?pct(a):num.format(current.qty)+" unit"}</span></div>{target?<Progress value={a}/>:null}<small>{num.format(current.qty)} unit • {compact(current.amount)} • vs {weekly.labelA}: {d>=0?"+":""}{pct(d)}{target?" • Target "+target+" • Gap "+(current.qty-target):""}</small></div>})}</div></Card>
  {weekly.targets?.types?<><div className="m238m-section-head"><h2>Target LOB Focus</h2><span>{weekly.targets.sourceWeek||weekly.labelB}</span></div><div className="m238m-list">{Object.entries(weekly.targets.types).flatMap(([lob,types])=>Object.entries(types).filter(([,v])=>v.focus||v.target>0).map(([type,v])=>{const actual=weekly.b.lob?.[lob]?.[type]?.qty||0,a=v.target?actual/v.target*100:0;return <Card key={lob+"-"+type} className="m238m-copy-card"><div className="m238m-copy-head"><strong>{type}</strong><b>{actual}/{v.target}</b></div><Progress value={a}/><p>{pct(a)} • Gap {actual-v.target}{v.focus?" • Fokus":""}</p></Card>}))}</div></>:null}
  <div className="m238m-section-head"><h2>Reason & Action Plan</h2><span>{weekly.feedbackCount?weekly.feedbackCount+" feedback":""}</span></div>
  {weekly.feedbackSummary?<Card className="m238m-copy-card"><strong>Reason Store</strong><p>{weekly.feedbackSummary}</p></Card>:null}
  {Object.entries(weekly.analysis||{}).map(([k,v])=><Card key={k} className="m238m-copy-card"><strong>{k==="APPLE WATCH"?"Apple Watch":k.charAt(0)+k.slice(1).toLowerCase()}</strong><p>{v.review}</p><small>Action Plan</small><p>{v.actionPlan}</p></Card>)}

  <Sheet open={showDetail} onClose={()=>setShowDetail(false)} title={`Weekly Compare • ${weekly.labelA} vs ${weekly.labelB}`}>
   <div className="m238m-stack">
    <Card className="m238m-weekly-compare-total">
      <div className="m238m-section-head compact"><h2>Total Sales</h2><span>Week to Week</span></div>
      <div className="m238m-compare-pair"><div><span>{weekly.labelA}</span><strong>{money.format(prev.amount)}</strong><small>{num.format(prev.qty)} qty</small></div><div><span>{weekly.labelB}</span><strong>{money.format(cur.amount)}</strong><small>{num.format(cur.qty)} qty</small></div></div>
      <div className={"m238m-growth-pill "+(growth>=0?"positive":"negative")}>{growth>=0?"+":""}{pct(growth)} Sales Growth</div>
    </Card>

    {summary?<><div className="m238m-section-head"><h2>Performance {weekly.labelB}</h2></div><div className="m238m-grid"><Metric label="Traffic" value={num.format(summary.summary.traffic)}/><Metric label="Transaction" value={num.format(summary.summary.transaction)}/><Metric label="CVR" value={pct(summary.summary.cvr)}/><Metric label="UPT" value={summary.summary.upt.toFixed(1)}/><Metric label="ATV" value={money.format(summary.summary.atv)}/><Metric label="Qty" value={num.format(summary.summary.qty)}/></div></>:null}

    <div className="m238m-section-head"><h2>Sales Summary</h2><span>{weekly.labelA} → {weekly.labelB}</span></div>
    <div className="m238m-list">{schemes.map(k=>{const a=weekly.a.scheme[k]||{qty:0,amount:0},b=weekly.b.scheme[k]||{qty:0,amount:0},d=delta(a.amount,b.amount);return <Card key={k} className="m238m-week-compare-row"><div className="m238m-week-compare-head"><strong>{k}</strong><b className={d>=0?"positive":"negative"}>{d>=0?"+":""}{pct(d)}</b></div><div className="m238m-week-compare-values"><div><span>{weekly.labelA}</span><b>{money.format(a.amount)}</b><small>{num.format(a.qty)} qty</small></div><div><span>{weekly.labelB}</span><b>{money.format(b.amount)}</b><small>{num.format(b.qty)} qty</small></div></div></Card>})}</div>

    <div className="m238m-section-head"><h2>VAS</h2><span>Week to Week</span></div>
    <div className="m238m-list">{vasKeys.map(k=>{const a=weekly.a.vas[k]||{qty:0,amount:0},b=weekly.b.vas[k]||{qty:0,amount:0},d=delta(a.amount,b.amount);return <Card key={k} className="m238m-week-compare-row"><div className="m238m-week-compare-head"><strong>{k}</strong><b className={d>=0?"positive":"negative"}>{d>=0?"+":""}{pct(d)}</b></div><div className="m238m-week-compare-values"><div><span>{weekly.labelA}</span><b>{money.format(a.amount)}</b><small>{num.format(a.qty)} qty</small></div><div><span>{weekly.labelB}</span><b>{money.format(b.amount)}</b><small>{num.format(b.qty)} qty</small></div></div></Card>})}</div>

    <div className="m238m-section-head"><h2>LOB Performance</h2><span>Target vs Actual</span></div>
    <div className="m238m-list">{lobs.map(([name,key])=>{const a=sum(weekly.a.lob?.[key]||{}),b=sum(weekly.b.lob?.[key]||{}),target=weekly.targets?.lob?.[key]||0,ach=target?b.qty/target*100:0,d=delta(a.qty,b.qty);return <button key={key} className="m238m-click-card" onClick={()=>setSelectedLob({name,key})}><Card className="m238m-week-compare-row"><div className="m238m-week-compare-head"><strong>{name}</strong><div className="m238m-row-chevron"><b className={d>=0?"positive":"negative"}>{d>=0?"+":""}{pct(d)} Qty</b><ChevronRight size={16}/></div></div><div className="m238m-week-compare-values"><div><span>{weekly.labelA}</span><b>{num.format(a.qty)} unit</b><small>{money.format(a.amount)}</small></div><div><span>{weekly.labelB}</span><b>{num.format(b.qty)} unit</b><small>{money.format(b.amount)}</small></div></div>{target?<div className="m238m-week-target"><div><span>Target {num.format(target)}</span><b>{pct(ach)}</b></div><Progress value={ach}/><small>Gap {b.qty-target>=0?"+":""}{num.format(b.qty-target)} unit</small></div>:null}<small className="m238m-tap-hint">Tap untuk lihat detail type/model</small></Card></button>})}</div>

    {weekly.targets?.types?<><div className="m238m-section-head"><h2>Target LOB Focus</h2><span>{weekly.targets.sourceWeek||weekly.labelB}</span></div><div className="m238m-list">{Object.entries(weekly.targets.types).flatMap(([lob,types])=>Object.entries(types).filter(([,v])=>v.focus||v.target>0).map(([type,v])=>{const actual=weekly.b.lob?.[lob]?.[type]?.qty||0,ach=v.target?actual/v.target*100:0;return <Card key={lob+"-"+type+"-detail"} className="m238m-copy-card"><div className="m238m-copy-head"><strong>{type}</strong><b>{num.format(actual)} / {num.format(v.target)}</b></div><Progress value={ach}/><p>{pct(ach)} • Gap {actual-v.target>=0?"+":""}{num.format(actual-v.target)}{v.focus?" • Fokus":""}</p></Card>}))}</div></>:null}

    <div className="m238m-section-head"><h2>Reason & Action Plan</h2><span>{weekly.feedbackCount?weekly.feedbackCount+" feedback":""}</span></div>
    {weekly.feedbackSummary?<Card className="m238m-copy-card"><strong>Reason Store</strong><p>{weekly.feedbackSummary}</p></Card>:null}
    {Object.entries(weekly.analysis||{}).map(([k,v])=><Card key={k+"-detail"} className="m238m-week-analysis"><strong>{k==="APPLE WATCH"?"Apple Watch":k.charAt(0)+k.slice(1).toLowerCase()}</strong><span>Weekly Review</span><p>{v.review}</p><span>Action Plan</span><p>{v.actionPlan}</p></Card>)}
   </div>
  </Sheet>

  <Sheet open={!!selectedLob} onClose={()=>setSelectedLob(null)} title={selectedLob?`${selectedLob.name} • Detail Compare`:"LOB Detail"}>
   {selectedLob?<div className="m238m-stack">
    <Card className="m238m-copy-card"><div className="m238m-copy-head"><strong>{weekly.labelA} vs {weekly.labelB}</strong><button className="m238m-mini-action" onClick={()=>void copyLobCompare()}><Copy size={14}/> Salin Compare</button></div><p>Urut dari penurunan qty terbesar supaya mudah melihat type/model yang turun.</p>{copyMsg?<small className="m238m-notice">{copyMsg}</small>:null}</Card>
    <div className="m238m-list">{lobDetailRows.map(r=><Card key={r.type} className="m238m-lob-type-compare"><div className="m238m-week-compare-head"><strong>{r.type}</strong><div className="m238m-lob-deltas"><b className={r.qtyDelta>=0?"positive":"negative"}>{r.qtyDelta>=0?"+":""}{num.format(r.qtyDelta)} unit</b><small className={r.amountDelta>=0?"positive":"negative"}>{r.amountPct>=0?"+":""}{pct(r.amountPct)} amount</small></div></div><div className="m238m-week-compare-values"><div><span>{weekly.labelA}</span><b>{num.format(r.a.qty)} unit</b><small>{money.format(r.a.amount)}</small></div><div><span>{weekly.labelB}</span><b>{num.format(r.b.qty)} unit</b><small>{money.format(r.b.amount)}</small></div></div><div className="m238m-type-delta-line"><span>Qty</span><b className={r.qtyDelta>=0?"positive":"negative"}>{r.qtyPct>=0?"+":""}{pct(r.qtyPct)}</b><span>Amount</span><b className={r.amountDelta>=0?"positive":"negative"}>{r.amountPct>=0?"+":""}{pct(r.amountPct)}</b></div></Card>)}</div>
   </div>:null}
  </Sheet>
 </>
}

function TouchLineChart({rows}:{rows:NonNullable<DailySummary["dailyRows"]>}){
 const[selected,setSelected]=useState(Math.max(0,rows.length-1)),w=320,h=94,pad=10,max=Math.max(...rows.map(r=>r.totalSales),1),min=Math.min(...rows.map(r=>r.totalSales),0),span=Math.max(1,max-min);
 const pts=rows.map((r,i)=>({x:pad+(rows.length===1?0:(i/(rows.length-1))*(w-pad*2)),y:h-pad-((r.totalSales-min)/span)*(h-pad*2),row:r}));
 const path=pts.map((p,i)=>`${i?"L":"M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
 const active=pts[selected]||pts[0];
 return <div className="m238m-touch-chart">
   {active?<div className="m238m-chart-tip"><b>{active.row.day||active.row.date.slice(8,10)}</b><span>{compact(active.row.totalSales)}</span></div>:null}
   <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Sales harian week terpilih">
     <path d={path} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
     {pts.map((p,i)=><circle key={p.row.date} cx={p.x} cy={p.y} r={i===selected?5:3.2} className={i===selected?"active":""} onClick={()=>setSelected(i)}/>)}
   </svg>
   <div className="m238m-chart-days">{rows.map((r,i)=><button key={r.date} onClick={()=>setSelected(i)} className={i===selected?"active":""}>{r.day||r.date.slice(8,10)}</button>)}</div>
 </div>
}

function FeedbackView({data,staff}:{data:Feedback;staff:Staff[]}){
 const[rows,setRows]=useState(data.rows),[staffId,setStaffId]=useState(staff[0]?.id||""),[category,setCategory]=useState("external"),[text,setText]=useState(""),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 useEffect(()=>setRows(data.rows),[data]);
 const submit=async()=>{const person=staff.find(x=>x.id===staffId);if(!person||!text.trim())return;setBusy(true);setMsg("");try{const r=await fetch("/api/feedback",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({date:today(),staffId,name:person.name,category,feedback:text.trim()})}),j=await r.json();if(!r.ok)throw new Error(j.error||"Gagal menyimpan feedback");setRows(v=>[...v,{date:j.date,staffId:j.staffId,name:j.name,category:j.category,raw:j.raw,professional:j.professional}]);setText("");setMsg("Feedback tersimpan.")}catch(e){setMsg(e instanceof Error?e.message:"Gagal menyimpan feedback")}finally{setBusy(false)}};
 return <><Card className="m238m-form-card"><strong>Tambah Feedback</strong><select value={staffId} onChange={e=>setStaffId(e.target.value)}>{staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><select value={category} onChange={e=>setCategory(e.target.value)}><option value="external">Faktor eksternal</option><option value="promo">Promo</option><option value="bnpl">BNPL</option><option value="performance">Performa staff</option><option value="stock">Ketersediaan stok</option></select><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Tuliskan reason / kondisi di floor…"/><button className="m238m-primary" disabled={busy||!text.trim()} onClick={()=>void submit()}>{busy?"Menyimpan…":"Simpan Feedback"}</button>{msg?<small>{msg}</small>:null}</Card><div className="m238m-section-head"><h2>Feedback Team</h2><span>{rows.length} data</span></div><div className="m238m-list">{rows.length?rows.slice().reverse().map((r,i)=><Card key={`${r.date}-${r.staffId}-${i}`} className="m238m-copy-card"><div className="m238m-copy-head"><strong>{r.name}</strong><span>{r.date}</span></div><p>{r.professional||r.raw}</p></Card>):<Card>Belum ada feedback pada periode ini.</Card>}</div></>
}
function CxView({data,staff}:{data:Cx;staff:Staff[]}){
 const[rows,setRows]=useState(data.rows),[staffId,setStaffId]=useState(staff[0]?.id||""),[cxInput,setCxInput]=useState(""),[memberInput,setMemberInput]=useState(""),[activeStaff,setActiveStaff]=useState<Staff[]>([]),[notice,setNotice]=useState("");
 useEffect(()=>setRows(data.rows),[data]);
 useEffect(()=>{let alive=true;cachedJson<Daily>("/api/daily-fast?date="+today(),90000).then(d=>{if(alive)setActiveStaff(d.staff||[])}).catch(()=>{});return()=>{alive=false}},[]);
 const cx=rows.reduce((a,r)=>a+r.cx,0),member=rows.reduce((a,r)=>a+r.member,0),todayRows=rows.filter(r=>r.date===today()),submitted=new Set(todayRows.map(r=>r.staffId)),missing=activeStaff.filter(r=>!submitted.has(r.id));
 const staffRecap=useMemo(()=>{const map=new Map<string,{id:string;name:string;cx:number;member:number;days:Set<string>}>();for(const r of rows){const v=map.get(r.staffId)||{id:r.staffId,name:r.name,cx:0,member:0,days:new Set<string>()};v.cx+=r.cx;v.member+=r.member;v.days.add(r.date);map.set(r.staffId,v)}return [...map.values()].map(v=>({...v,daysCount:v.days.size,total:v.cx+v.member})).sort((a,b)=>b.total-a.total)},[rows]);
 const save=async()=>{const person=staff.find(x=>x.id===staffId)||activeStaff.find(x=>x.id===staffId);if(!person)return;setNotice("");const r=await fetch("/api/cx-member",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({date:today(),staffId,name:person.name,cx:Number(cxInput)||0,member:Number(memberInput)||0})}),j=await r.json();if(r.ok){setRows(v=>[...v,{date:j.date,staffId:j.staffId,name:j.name,cx:j.cx,member:j.member}]);setCxInput("");setMemberInput("");setNotice("Data berhasil disimpan.")}else setNotice(j.error||"Data gagal disimpan.")};
 return <>
  <Card className={missing.length?"m238m-warning-card":"m238m-success-card"}><div className="m238m-copy-head"><strong>Reminder Staff Hari Ini</strong><b>{missing.length?missing.length+" belum isi":"Lengkap"}</b></div><p>{missing.length?missing.map(x=>x.name).join(", "):"Semua staff yang masuk sudah mengisi CX / New Member."}</p></Card>
  <div className="m238m-grid"><Metric label="CX Bulan" value={num.format(cx)}/><Metric label="New Member Bulan" value={num.format(member)}/><Metric label="Input Hari Ini" value={num.format(todayRows.length)}/><Metric label="Belum Isi" value={num.format(missing.length)}/></div>
  <Card className="m238m-form-card"><strong>Input CX & Member</strong><select value={staffId} onChange={e=>setStaffId(e.target.value)}><option value="">Pilih Staff</option>{(activeStaff.length?activeStaff:staff).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><div className="m238m-form-grid"><input inputMode="numeric" value={cxInput} onChange={e=>setCxInput(e.target.value)} placeholder="CX"/><input inputMode="numeric" value={memberInput} onChange={e=>setMemberInput(e.target.value)} placeholder="New Member"/></div><button className="m238m-primary" disabled={!staffId} onClick={()=>void save()}>Simpan</button>{notice?<small>{notice}</small>:null}</Card>
  <div className="m238m-section-head"><h2>Rekap Per Staff</h2><span>{staffRecap.length} staff</span></div>
  <div className="m238m-list">{staffRecap.map((r,i)=><Card key={r.id} className="m238m-copy-card"><div className="m238m-copy-head"><strong>#{i+1} {r.name}</strong><b>{r.total}</b></div><p>{r.daysCount} hari input • CX {r.cx} • New Member {r.member}</p></Card>)}</div>
  <div className="m238m-section-head"><h2>Detail Hari Ini</h2><span>{todayRows.length} input</span></div>
  <div className="m238m-list">{todayRows.map((r,i)=><Card key={r.staffId+"-"+i} className="m238m-copy-card"><div className="m238m-copy-head"><strong>{r.name}</strong><span>{r.date}</span></div><p>CX {num.format(r.cx)} • New Member {num.format(r.member)}</p></Card>)}</div>
 </>
}

function AdminScreen({onAction}:{onAction:(action:string)=>void}){
 const groups=[
  ["Operasional",[
   [PackageSearch,"SOH","soh","Cek stock on hand device & accessories"],
   [Box,"Stokan","stokan","Pembagian dan histori stokan accessories"],
   [Activity,"Mading","mading","Performance store untuk mading"]
  ]],
  ["Administrasi Penjualan",[
   [CreditCard,"BNPL & Trade-In","bnpl","Input, edit, dan monitoring transaksi"],
   [Target,"Target & Program","target","Target LOB, 3PP, VAS & product focus"],
   [ClipboardCheck,"Checklist Store","checklist","Checklist SPV dan staff"]
  ]]
 ] as const;
 return <div className="m238m-admin m238m-enter">
  <Card className="m238m-admin-intro"><div className="m238m-admin-icon"><Briefcase size={22}/></div><div><strong>Administrasi M238</strong><p>Menu operasional dan administrasi store dalam satu tempat.</p></div></Card>
  {groups.map(([title,items])=><section key={title}><div className="m238m-section-head"><h2>{title}</h2></div><div className="m238m-admin-grid">{items.map(([Icon,label,action,desc])=><button key={action} className="m238m-admin-card" onClick={()=>onAction(action)}><i><Icon size={19}/></i><div><strong>{label}</strong><span>{desc}</span></div><ChevronRight size={16}/></button>)}</div></section>)}
 </div>
}

function MoreScreen({dark,toggleDark,onAction}:{dark:boolean;toggleDark:()=>void;onAction:(action:string)=>void}){
 const groups=[
  ["Performance",[[WalletCards,"Incentive","incentive"],[Users,"NPS / CX & Member","cx"],[TrendingUp,"Aktivitas Toko","activity"]]],
  ["Appearance",[[Settings,"Versi Tampilan HP","mobile-view"],[dark?Sun:Moon,dark?"Light Mode":"Dark Mode","theme"]]],
  ["Account",[[Settings,"Settings","settings"],[LogOut,"Logout","logout"]]]
 ] as const;
 return <div className="m238m-more">{groups.map(([title,items])=><section key={title}><h3>{title}</h3><div>{items.map(([Icon,label,action])=><button key={label} onClick={()=>{if(action==="theme")toggleDark();else if(action==="logout")void fetch("/api/auth/logout",{method:"POST"}).finally(()=>{window.location.href="/login"});else onAction(action)}}><span><i><Icon size={18}/></i>{label}</span><ChevronRight size={17}/></button>)}</div></section>)}</div>
}
function MoreDetail({kind,data,period}:{kind:string;data:any;period:string}){
 if(["soh","stokan","mading","bnpl","target"].includes(kind))return <MobileOperations kind={kind} period={period}/>;
 if(kind==="checklist")return <div className="m238m-action-list"><button onClick={()=>window.open("https://forms.cloud.microsoft/pages/responsepage.aspx?id=iAw5Rakbn0eYpYaKADRxVqklIyFb72JDrV7GtVMqEcNUMUdNM1Q1VU4zTU9PTlpVTERHVUpZUk9BQS4u&route=shorturl","_blank")}><ClipboardCheck/>Checklist SPV</button><button onClick={()=>window.open("https://forms.cloud.microsoft/pages/responsepage.aspx?id=iAw5Rakbn0eYpYaKADRxVqklIyFb72JDrV7GtVMqEcNUQVpVV1hBVTdHTDVDWVlMRkE0V0lRVDQySS4u&route=shorturl","_blank")}><ClipboardCheck/>Checklist Staff</button></div>;
 if(kind==="mobile-view")return <div className="m238m-stack"><Card className="m238m-copy-card"><strong>Versi Tampilan HP</strong><p>Pilih tampilan lama jika ingin menggunakan dashboard responsive sebelumnya, atau tampilan baru untuk UI khusus iPhone.</p></Card><div className="m238m-view-picker"><button onClick={()=>window.dispatchEvent(new CustomEvent("m238:mobile-view-change",{detail:"classic"}))}>Tampilan Lama</button><button className="active" onClick={()=>window.dispatchEvent(new CustomEvent("m238:mobile-view-change",{detail:"new"}))}>Tampilan Baru ✓</button></div></div>;
 if(kind==="settings")return <Card>Pengaturan tampilan utama tetap tersedia di bagian Appearance. Pengaturan akun mengikuti sistem M238 yang sama.</Card>;
 if(data?.error)return <Card className="m238m-error">{data.error}</Card>;
 if(kind==="incentive")return <div className="m238m-stack"><Card className="m238m-hero compact"><span>Total Estimasi Incentive</span><strong>{compact(data?.total||0)}</strong></Card><div className="m238m-list">{(data?.rows||[]).map((r:any)=><Card key={r.id} className="m238m-copy-card"><div className="m238m-copy-head"><strong>{r.name}</strong><b>{compact(r.incentive?.total||0)}</b></div><p>Mac {num.format(r.qty?.mac||0)} • iPhone {num.format(r.qty?.iphone||0)} • iPad {num.format(r.qty?.ipad||0)} • Watch {num.format(r.qty?.watch||0)}</p></Card>)}</div></div>;
 if(kind==="bnpl")return <div className="m238m-stack"><div className="m238m-grid"><Metric label="BNPL" value={compact(data?.bnpl?.amount||0)} sub={`${num.format(data?.bnpl?.qty||0)} trx`}/><Metric label="Trade-In" value={compact(data?.tradeIn?.amount||0)} sub={`${num.format(data?.tradeIn?.qty||0)} trx`}/></div><Card><div className="m238m-lob-list">{(data?.providerSummary||[]).map((r:any)=><div key={r.provider}><div><strong>{r.provider}</strong><span>{num.format(r.qty||0)}</span></div><small>{compact(r.amount||0)}</small></div>)}</div></Card></div>;
 if(kind==="target")return <div className="m238m-stack"><Card className="m238m-hero compact"><span>Product Fokus Aktif</span><strong>{num.format(data?.lob?.total?.qty||0)} unit</strong><p>{data?.periodLabel||""}</p></Card><div className="m238m-list">{(data?.productFocus||[]).map((name:string)=>{const p=(data?.lob?.products||[]).find((x:any)=>x.name===name);return <Card key={name} className="m238m-copy-card"><div className="m238m-copy-head"><strong>{name}</strong><b>{num.format(p?.qty||0)} unit</b></div></Card>})}</div></div>;
 return <Card>Menu mobile siap digunakan.</Card>
}

const mobileCss=`
:root{--motion-fast:120ms;--motion-normal:200ms;--motion-slow:280ms;--m-bg:#f2f2f7;--m-surface:#fff;--m-surface2:#f7f7fa;--m-text:#101114;--m-secondary:#73737b;--m-blue:#0a84ff;--m-line:rgba(15,23,42,.06)}
.dark{--m-bg:#000;--m-surface:#1c1c1e;--m-surface2:#2c2c2e;--m-text:#fff;--m-secondary:#98989f;--m-line:rgba(255,255,255,.08)}
.m238m-app{min-height:100dvh;background:var(--m-bg);color:var(--m-text);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",Inter,system-ui,sans-serif;overflow-x:hidden}
.m238m-header{position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top) + 10px) 18px 10px;background:color-mix(in srgb,var(--m-bg) 88%,transparent);backdrop-filter:blur(18px)}
.m238m-header>div:first-child{display:flex;flex-direction:column;line-height:1.05}.m238m-header span{font-size:12px;color:var(--m-secondary);font-weight:700}.m238m-header strong{font-size:20px}.m238m-header-actions{display:flex;gap:8px}.m238m-header-actions button{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:var(--m-surface);border:0;color:var(--m-text)}
.m238m-content{padding:10px 16px calc(94px + env(safe-area-inset-bottom));max-width:620px;margin:0 auto}
.m238m-period{width:100%;display:grid;grid-template-columns:auto 1fr auto auto;gap:8px;align-items:center;border:0;background:transparent;color:var(--m-text);padding:6px 2px 14px;text-align:left}.m238m-period span{font-size:14px;font-weight:800}.m238m-period small{font-size:12px;color:var(--m-secondary)}
.m238m-stack{display:flex;flex-direction:column;gap:12px}.m238m-card{background:var(--m-surface);border-radius:18px;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,.025)}.m238m-card:active{transform:scale(.99);transition:transform var(--motion-fast)}
.m238m-hero{border-radius:22px;background:linear-gradient(145deg,#0a66d6,#5241b8);color:white;padding:20px;box-shadow:0 12px 28px rgba(10,102,214,.14)}.m238m-hero>span{display:block;font-size:13px;opacity:.78;font-weight:800}.m238m-hero>strong{display:block;font-size:32px;letter-spacing:-.04em;margin-top:7px}.m238m-hero>p{font-size:13px;opacity:.82;margin:6px 0 12px}.m238m-hero>div:last-child{display:flex;justify-content:space-between;margin-top:13px;font-size:12px}.m238m-hero.compact>strong{font-size:29px}
.m238m-progress{height:6px;border-radius:999px;background:rgba(127,127,127,.16);overflow:hidden}.m238m-progress i{display:block;height:100%;border-radius:inherit;background:var(--m-blue);transition:width var(--motion-slow) cubic-bezier(.22,1,.36,1)}.m238m-hero .m238m-progress{background:rgba(255,255,255,.2)}.m238m-hero .m238m-progress i{background:white}
.m238m-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.m238m-metric{padding:14px;min-height:92px}.m238m-metric>span{display:block;font-size:12px;color:var(--m-secondary);font-weight:700}.m238m-metric>strong{display:block;font-size:22px;letter-spacing:-.025em;margin-top:7px;overflow-wrap:anywhere}.m238m-grid .m238m-metric>strong{font-size:clamp(17px,5vw,22px)}.m238m-metric>small{display:block;font-size:11px;color:var(--m-secondary);margin-top:4px}
.m238m-insight{display:flex;gap:12px;align-items:flex-start}.m238m-insight>svg{color:#ff9f0a;flex:none}.m238m-insight span{font-weight:850;font-size:14px;color:var(--m-text)}.m238m-insight p{margin:4px 0 0;font-size:13px;color:var(--m-secondary);line-height:1.45}
.m238m-section-head{display:flex;align-items:center;justify-content:space-between;padding:8px 2px 0}.m238m-section-head h2{font-size:19px;margin:0}.m238m-section-head span{font-size:12px;color:var(--m-secondary)}
.m238m-segment{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;padding:3px;background:var(--m-surface2);border-radius:12px;gap:2px}.m238m-segment button{border:0;background:transparent;color:var(--m-secondary);border-radius:10px;padding:9px 10px;font-size:13px;font-weight:800}.m238m-segment button.active{background:var(--m-surface);color:var(--m-text);box-shadow:0 1px 4px rgba(0,0,0,.08)}
.m238m-list{display:flex;flex-direction:column;gap:8px}.m238m-sales-hero>strong{font-size:clamp(25px,7vw,31px);overflow-wrap:anywhere}.m238m-metric-button{display:block;width:100%;border:0;background:transparent;padding:0;text-align:left;color:inherit}.m238m-metric-button>.m238m-card{width:100%;height:100%}.m238m-drill-card{position:relative}.m238m-drill-card>svg{position:absolute;right:10px;top:10px;color:var(--m-secondary)}.m238m-drill-card>small{display:block;margin-top:6px;font-size:9px;color:var(--m-secondary)}.m238m-sales-hero>p{line-height:1.35}.m238m-day-row{width:100%;border:0;background:var(--m-surface);color:var(--m-text);border-radius:16px;padding:14px 13px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;text-align:left}.m238m-day-row:active{transform:scale(.99)}.m238m-day-main{min-width:0;display:flex;flex-direction:column;gap:6px}.m238m-day-main strong{font-size:14px;line-height:1.25}.m238m-day-main b{font-size:17px;letter-spacing:-.015em;overflow-wrap:anywhere}.m238m-day-main small{font-size:10px;line-height:1.35;color:var(--m-secondary)}.m238m-day-row>svg{color:var(--m-secondary)} .m238m-focus-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;padding:3px;background:var(--m-surface2);border-radius:12px}.m238m-focus-tabs button{border:0;background:transparent;color:var(--m-secondary);border-radius:9px;padding:9px 4px;font-size:10px;font-weight:850;white-space:nowrap}.m238m-focus-tabs button.active{background:var(--m-surface);color:var(--m-blue);box-shadow:0 1px 4px rgba(0,0,0,.08)}.m238m-focus-tabs-three{grid-template-columns:repeat(3,minmax(0,1fr))}.m238m-text-action{border:0;background:transparent;color:var(--m-blue);font-size:11px;font-weight:850}.m238m-focus-unit-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.m238m-focus-unit-card{position:relative;border:0;background:color-mix(in srgb,var(--m-blue) 7%,var(--m-surface));color:var(--m-text);border-radius:16px;padding:13px;text-align:left;display:flex;flex-direction:column;gap:5px}.m238m-focus-unit-card span{font-size:12px;font-weight:850;line-height:1.25}.m238m-focus-unit-card strong{font-size:16px}.m238m-focus-unit-card small{font-size:9px;color:var(--m-secondary);line-height:1.3}.m238m-focus-unit-card>svg{position:absolute;right:9px;top:10px;color:var(--m-blue)}.m238m-focus-editor>p,.m238m-vas-target-editor>p{font-size:11px;color:var(--m-secondary);line-height:1.4;margin:5px 0 12px}.m238m-focus-edit-list{display:flex;flex-direction:column;gap:7px;margin-bottom:12px}.m238m-focus-edit-list>div{display:grid;grid-template-columns:1fr 88px;gap:8px;align-items:center}.m238m-focus-edit-list label{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:700}.m238m-focus-edit-list input[type="number"],.m238m-vas-target-editor input{width:100%;border:0;background:var(--m-surface2);color:var(--m-text);border-radius:9px;padding:9px;font-size:11px;text-align:right}.m238m-row-chevron{display:flex!important;align-items:center!important;gap:8px!important}.m238m-row-chevron>div{display:flex;flex-direction:column;align-items:flex-end}.m238m-row-chevron small{font-size:9px;color:var(--m-secondary)}.m238m-vas-target-editor{display:flex;flex-direction:column;gap:8px}.m238m-vas-target-editor>label{display:grid;grid-template-columns:1fr 130px;align-items:center;gap:10px}.m238m-vas-target-editor>label>span{font-size:11px;font-weight:800}.m238m-product-detail-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.m238m-product-detail-row>div{display:flex;flex-direction:column;gap:3px}.m238m-product-detail-row>div:last-child{align-items:flex-end}.m238m-product-detail-row span{font-size:10px;color:var(--m-secondary)}.m238m-product-detail-row b{font-size:14px}.m238m-staff-breakdown-row{display:grid;grid-template-columns:28px 1fr auto;gap:8px;align-items:center}.m238m-staff-breakdown-row>span{font-size:10px;color:var(--m-secondary)}.m238m-staff-breakdown-row>strong{font-size:13px}.m238m-staff-breakdown-row>b{font-size:13px}.m238m-vas-staff-row{display:flex;flex-direction:column;gap:8px}.m238m-vas-staff-head{display:grid;grid-template-columns:28px 1fr auto;gap:8px;align-items:center}.m238m-vas-staff-head>span{font-size:10px;color:var(--m-secondary)}.m238m-vas-staff-head strong,.m238m-vas-staff-head b{font-size:12px}.m238m-vas-staff-meta{display:flex;flex-direction:column;gap:3px;font-size:9px;color:var(--m-secondary)}.m238m-vas-staff-meta b{color:var(--m-text)}.m238m-focus-ach-row{display:grid;grid-template-columns:1fr minmax(86px,34%);gap:12px;align-items:center}.m238m-focus-ach-row>div:first-child{display:flex;flex-direction:column;gap:3px}.m238m-focus-ach-row strong{font-size:13px}.m238m-focus-ach-row span{font-size:10px;color:var(--m-secondary);line-height:1.35}.m238m-focus-ach-row>div:last-child{text-align:right}.m238m-focus-ach-row>div:last-child b{font-size:13px}.m238m-focus-ach-row .m238m-progress{margin-top:6px}.m238m-third-sales-row{display:flex;align-items:center;justify-content:space-between;gap:10px}.m238m-third-sales-row>div:first-child{display:flex;flex-direction:column;gap:3px;min-width:0}.m238m-third-sales-row strong{font-size:14px}.m238m-third-sales-row span{font-size:9px;color:var(--m-secondary)}.m238m-third-product-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.m238m-third-product-row>div{display:flex;flex-direction:column;gap:3px}.m238m-third-product-row>div:first-child{min-width:0}.m238m-third-product-row>div:last-child{text-align:right;flex:none}.m238m-third-product-row strong{font-size:12px;line-height:1.3}.m238m-third-product-row span,.m238m-third-product-row small{font-size:9px;color:var(--m-secondary);line-height:1.3}.m238m-third-product-row b{font-size:12px}
.m238m-third-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.m238m-third-row>strong{font-size:14px}.m238m-third-row>div{display:flex;flex-direction:column;text-align:right}.m238m-third-row span{font-size:10px;color:var(--m-secondary)}.m238m-third-row b{font-size:15px}.m238m-lob-summary{display:grid;grid-template-columns:1fr;gap:10px}.m238m-lob-summary>div{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:10px;border-bottom:1px solid var(--m-line)}.m238m-lob-summary>div:last-child{border-bottom:0;padding-bottom:0}.m238m-lob-summary span,.m238m-vas-total span{font-size:11px;color:var(--m-secondary);font-weight:800}.m238m-lob-summary strong{font-size:15px;text-align:right;overflow-wrap:anywhere}.m238m-lob-row,.m238m-vas-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.m238m-lob-row>div,.m238m-vas-row>div{display:flex;flex-direction:column;gap:3px}.m238m-lob-row strong,.m238m-vas-row strong{font-size:14px}.m238m-lob-row span,.m238m-vas-row span{font-size:10px;color:var(--m-secondary)}.m238m-lob-row b,.m238m-vas-row b{font-size:14px;text-align:right;overflow-wrap:anywhere}.m238m-vas-total{background:color-mix(in srgb,var(--m-blue) 7%,var(--m-surface))}.m238m-vas-total strong{display:block;margin-top:5px;font-size:20px;overflow-wrap:anywhere} .m238m-staff-row{display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:11px;width:100%;border:0;background:var(--m-surface);color:var(--m-text);padding:13px;border-radius:16px;text-align:left}.m238m-avatar{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#dbeafe,#c4b5fd);color:#345; font-weight:900;font-size:13px}.dark .m238m-avatar{background:linear-gradient(145deg,#203450,#352d60);color:#eaf2ff}.m238m-avatar.big{width:58px;height:58px;font-size:17px}.m238m-staff-main>div{display:flex;justify-content:space-between;gap:8px;margin-bottom:7px}.m238m-staff-main strong{font-size:14px}.m238m-staff-main b{font-size:12px;text-align:right;overflow-wrap:anywhere;max-width:48%}.m238m-staff-detail-hero>strong{font-size:clamp(24px,6.6vw,30px);overflow-wrap:anywhere}.m238m-incentive-detail-list{display:flex;flex-direction:column;gap:8px}.m238m-incentive-detail-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.m238m-incentive-detail-row>div{display:flex;flex-direction:column;gap:4px;min-width:0}.m238m-incentive-detail-row strong{font-size:14px}.m238m-incentive-detail-row span{font-size:10px;color:var(--m-secondary);line-height:1.4}.m238m-incentive-detail-row>b{font-size:13px;flex:none;text-align:right}.m238m-incentive-total-card{display:flex;flex-direction:column;gap:10px}.m238m-incentive-total-card>div{display:flex;align-items:center;justify-content:space-between;gap:12px}.m238m-incentive-total-card span{font-size:11px;color:var(--m-secondary)}.m238m-incentive-total-card>div:first-child span,.m238m-incentive-total-card>div:first-child strong{font-size:15px;font-weight:850}.m238m-incentive-total-card b{font-size:12px}.m238m-staff-main small{display:block;color:var(--m-secondary);font-size:10px;margin-top:4px}
.m238m-chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}.m238m-chips button{white-space:nowrap;border:0;border-radius:999px;background:var(--m-surface);color:var(--m-secondary);padding:9px 13px;font-size:12px;font-weight:800}.m238m-chips button.active{background:var(--m-text);color:var(--m-bg)}
.m238m-profile{display:flex;align-items:center;gap:12px}.m238m-profile h2{font-size:20px;margin:0}.m238m-profile p{font-size:12px;color:var(--m-secondary);margin:2px 0 0}
.m238m-copy-card strong{font-size:14px}.m238m-copy-card p{font-size:13px;line-height:1.48;color:var(--m-secondary);margin:7px 0}.m238m-copy-card small{display:block;margin-top:10px;color:var(--m-blue);font-weight:800}.m238m-copy-head{display:flex;justify-content:space-between;gap:10px}.m238m-copy-head span{font-size:11px;color:var(--m-secondary)}
.m238m-chart{width:100%;height:86px;margin-top:13px;color:rgba(255,255,255,.92)}.m238m-lob-list{display:flex;flex-direction:column;gap:15px}.m238m-lob-list>div>div:first-child{display:flex;justify-content:space-between;margin-bottom:7px}.m238m-lob-list strong{font-size:14px}.m238m-lob-list span{font-size:12px;font-weight:800}.m238m-lob-list small{display:block;color:var(--m-secondary);font-size:10px;margin-top:5px}
.m238m-admin{display:flex;flex-direction:column;gap:18px}.m238m-admin-intro{display:flex;gap:12px;align-items:center}.m238m-admin-intro p{margin:4px 0 0;font-size:12px;color:var(--m-secondary);line-height:1.4}.m238m-admin-icon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:color-mix(in srgb,var(--m-blue) 12%,var(--m-surface));color:var(--m-blue);flex:none}.m238m-admin-grid{display:flex;flex-direction:column;gap:8px;margin-top:9px}.m238m-admin-card{width:100%;border:0;background:var(--m-surface);color:var(--m-text);border-radius:16px;padding:13px;display:grid;grid-template-columns:38px 1fr auto;gap:11px;align-items:center;text-align:left}.m238m-admin-card>i{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:var(--m-surface2);color:var(--m-blue);font-style:normal}.m238m-admin-card>div{min-width:0;display:flex;flex-direction:column;gap:3px}.m238m-admin-card strong{font-size:14px}.m238m-admin-card span{font-size:10px;line-height:1.35;color:var(--m-secondary)}.m238m-admin-card>svg{color:var(--m-secondary)}.m238m-admin-card:active{transform:scale(.99)}
.m238m-more{display:flex;flex-direction:column;gap:18px}.m238m-more h3{font-size:12px;color:var(--m-secondary);margin:0 0 7px 12px}.m238m-more section>div{background:var(--m-surface);border-radius:16px;overflow:hidden}.m238m-more button{width:100%;height:52px;border:0;border-bottom:1px solid var(--m-line);display:flex;align-items:center;justify-content:space-between;background:transparent;color:var(--m-text);padding:0 14px}.m238m-more button:last-child{border-bottom:0}.m238m-more button>span{display:flex;align-items:center;gap:11px;font-size:14px;font-weight:700}.m238m-more button i{width:29px;height:29px;border-radius:8px;background:var(--m-surface2);display:grid;place-items:center;color:var(--m-blue)}
.m238m-home-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:3px;background:var(--m-surface2);border-radius:13px;position:sticky;top:65px;z-index:18}.m238m-home-tabs button{min-height:44px;border:0;border-radius:10px;background:transparent;color:var(--m-secondary);font-size:11px;line-height:1.15;font-weight:800;padding:7px 5px}.m238m-home-tabs button.active{background:var(--m-blue);color:#fff;box-shadow:0 4px 12px rgba(10,132,255,.2)}.m238m-hero-button{display:block;width:100%;border:0;background:transparent;padding:0;text-align:left;color:inherit}.m238m-hero-button .m238m-card:active{transform:scale(.985)}.m238m-home-hero>strong{font-size:30px;white-space:nowrap}.m238m-hero-title{display:flex;align-items:center;justify-content:space-between}.m238m-hero-title>span{font-size:13px;opacity:.82;font-weight:800}.m238m-hero-title svg{opacity:.8}.m238m-hero-meta{display:grid!important;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px!important}.m238m-hero-meta span{display:flex;flex-direction:column;gap:2px;opacity:.9}.m238m-hero-meta b{font-size:14px}.m238m-point-card{display:flex;align-items:center;justify-content:space-between;gap:12px}.m238m-point-card>div:first-child{display:flex;flex-direction:column}.m238m-point-card>div:first-child span{font-size:11px;color:var(--m-secondary);font-weight:800}.m238m-point-card>div:first-child strong{font-size:24px}.m238m-point-breakdown{display:flex;flex-direction:column;gap:3px;text-align:right;font-size:10px;color:var(--m-secondary)}.m238m-ytd-hero{padding:16px}.m238m-section-head.compact{padding:0 0 12px}.m238m-section-head.compact h2{font-size:16px}.m238m-compare-pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}.m238m-compare-pair>div{background:var(--m-surface2);border-radius:14px;padding:13px}.m238m-compare-pair span{display:block;font-size:11px;color:var(--m-secondary);font-weight:700}.m238m-compare-pair strong{display:block;margin-top:5px;font-size:18px;letter-spacing:-.02em;word-break:break-word}.m238m-growth-pill{display:inline-flex;margin-top:11px;padding:6px 9px;border-radius:999px;font-size:11px;font-weight:850}.m238m-growth-pill.positive,.positive{color:#168347}.m238m-growth-pill.negative,.negative{color:#d92d20}.m238m-growth-pill.positive{background:#e8f8ef}.m238m-growth-pill.negative{background:#fff0ef}.dark .m238m-growth-pill.positive{background:rgba(38,183,94,.15)}.dark .m238m-growth-pill.negative{background:rgba(255,69,58,.15)}.m238m-compare-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.m238m-compare-row>div{display:flex;flex-direction:column;gap:3px}.m238m-compare-row>div:last-child{text-align:right}.m238m-compare-row strong,.m238m-compare-row b{font-size:13px}.m238m-compare-row span,.m238m-compare-row small{font-size:10px;color:var(--m-secondary)}.m238m-click-card{display:block;width:100%;border:0;background:transparent;padding:0;text-align:left;color:inherit}.m238m-click-card>.m238m-card{width:100%}.m238m-click-card:active>.m238m-card{transform:scale(.985)}.m238m-compare-row>div:last-child svg{margin-left:auto;color:var(--m-secondary)}.m238m-tappable-card{position:relative}.m238m-tappable-card .m238m-section-head span{display:flex;align-items:center;gap:4px}.m238m-tap-hint{display:block;margin-top:10px;color:var(--m-blue)!important;font-size:10px!important;font-weight:800}.m238m-lob-compare-bar>div:first-child,.m238m-lob-compare-bar>div:last-child{display:flex;justify-content:space-between;gap:12px;font-size:11px}.m238m-lob-compare-bar span{color:var(--m-secondary)}.m238m-dual-bar{display:flex!important;flex-direction:column;gap:4px;margin:10px 0}.m238m-dual-bar i,.m238m-dual-bar em{display:block;height:7px;border-radius:999px}.m238m-dual-bar i{background:#a7c7ff}.m238m-dual-bar em{background:var(--m-blue)}.m238m-compare-total-head{padding:16px;background:linear-gradient(145deg,color-mix(in srgb,var(--m-blue) 10%,var(--m-surface)),var(--m-surface))}.m238m-total-variance{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.m238m-total-variance>div{background:var(--m-surface2);border-radius:11px;padding:10px;min-width:0}.m238m-total-variance span{display:block;font-size:10px;color:var(--m-secondary);font-weight:700}.m238m-total-variance b{display:block;margin-top:4px;font-size:12px;overflow-wrap:anywhere}.m238m-monthly-compare-list{display:flex;flex-direction:column;gap:9px}.m238m-month-compare-card{padding:14px}.m238m-month-compare-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.m238m-month-compare-head strong{font-size:15px}.m238m-month-compare-head small{font-size:11px;font-weight:850}.m238m-month-values{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:11px}.m238m-month-values>div{background:var(--m-surface2);border-radius:11px;padding:10px;min-width:0}.m238m-month-values span{display:block;font-size:10px;color:var(--m-secondary);font-weight:700}.m238m-month-values b{display:block;font-size:12px;margin-top:4px;overflow-wrap:anywhere}.m238m-month-variance{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding-top:9px;border-top:1px solid var(--m-line);font-size:11px}.m238m-month-variance span{color:var(--m-secondary)}
.m238m-detail-sales{background:linear-gradient(145deg,#0a66d6,#5241b8);color:#fff}.m238m-detail-sales>span,.m238m-detail-sales>small{display:block;opacity:.78;font-size:11px}.m238m-detail-sales>strong{display:block;font-size:25px;margin:5px 0}.m238m-detail-list{background:var(--m-surface);border-radius:16px;overflow:hidden}.m238m-detail-list>div{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:12px 14px;border-bottom:1px solid var(--m-line)}.m238m-detail-list>div:last-child{border-bottom:0}.m238m-detail-list span{font-size:12px;color:var(--m-secondary)}.m238m-detail-list b{font-size:12px;text-align:right;max-width:62%;word-break:break-word}
.m238m-bottom{--m238m-active-index:0;position:fixed;z-index:40;left:14px;right:14px;bottom:calc(10px + env(safe-area-inset-bottom));height:64px;display:grid;grid-template-columns:repeat(6,1fr);align-items:center;padding:0 6px;background:color-mix(in srgb,var(--m-surface) 94%,transparent);backdrop-filter:blur(26px);-webkit-backdrop-filter:blur(26px);border:1px solid color-mix(in srgb,var(--m-line) 85%,transparent);border-radius:21px;box-shadow:0 12px 30px rgba(15,23,42,.12);isolation:isolate;overflow:visible}.m238m-liquid-bubble{position:absolute;z-index:1;top:-17px;left:calc((var(--m238m-active-index) + .5) * 16.6666667%);width:48px;height:48px;border-radius:50%;background:color-mix(in srgb,var(--m-blue) 12%,var(--m-surface));border:5px solid var(--m-bg);box-shadow:0 9px 22px rgba(15,23,42,.12);transform:translateX(-50%);transition:left 420ms cubic-bezier(.22,1,.36,1),transform 220ms ease,box-shadow 220ms ease}.m238m-liquid-bubble:before,.m238m-liquid-bubble:after{content:"";position:absolute;top:12px;width:13px;height:13px;background:transparent}.m238m-liquid-bubble:before{left:-16px;border-top-right-radius:13px;box-shadow:5px -5px 0 0 var(--m-bg)}.m238m-liquid-bubble:after{right:-16px;border-top-left-radius:13px;box-shadow:-5px -5px 0 0 var(--m-bg)}.m238m-bottom button{position:relative;z-index:2;height:58px;border:0;background:transparent;color:var(--m-secondary);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-radius:15px;font-size:10px;font-weight:800;transition:color 260ms ease,transform 360ms cubic-bezier(.22,1,.36,1)}.m238m-nav-icon{width:32px;height:28px;display:grid;place-items:center;transition:transform 420ms cubic-bezier(.22,1,.36,1),color 260ms ease}.m238m-nav-label{max-height:14px;font-size:9px;opacity:.78;transform:translateY(0);transition:opacity 220ms ease,transform 320ms cubic-bezier(.22,1,.36,1),max-height 220ms ease}.m238m-bottom button.active{color:var(--m-text);transform:none}.m238m-bottom button.active .m238m-nav-icon{transform:translateY(-19px) scale(1.04);color:var(--m-blue)}.m238m-bottom button.active .m238m-nav-label{opacity:1;transform:translateY(-2px);color:var(--m-blue)}.m238m-bottom button:not(.active) .m238m-nav-label{opacity:0;max-height:0;transform:translateY(5px)}.m238m-bottom button:active .m238m-nav-icon{transform:scale(.9)}.m238m-bottom button.active:active .m238m-nav-icon{transform:translateY(-18px) scale(.92)}.dark .m238m-bottom{background:color-mix(in srgb,var(--m-surface) 92%,transparent);border-color:color-mix(in srgb,var(--m-line) 90%,transparent);box-shadow:0 14px 34px rgba(0,0,0,.28)}.dark .m238m-liquid-bubble{background:color-mix(in srgb,var(--m-blue) 18%,var(--m-surface))}.dark .m238m-bottom button.active .m238m-nav-label{color:var(--m-blue)}
.m238m-sheet-layer{position:fixed;z-index:100;inset:0;background:rgba(0,0,0,.28);backdrop-filter:blur(3px);display:flex;align-items:flex-end}.m238m-sheet{width:100%;max-height:86dvh;overflow:auto;background:var(--m-bg);color:var(--m-text);border-radius:24px 24px 0 0;padding:8px 16px calc(16px + env(safe-area-inset-bottom));animation:m238mSheet var(--motion-slow) cubic-bezier(.22,1,.36,1);will-change:transform}.m238m-handle-button{display:block;width:100%;height:24px;border:0;background:transparent;padding:8px 0}.m238m-handle{display:block;width:38px;height:5px;border-radius:999px;background:rgba(127,127,127,.35);margin:0 auto}.m238m-sheet-head{display:flex;justify-content:space-between;align-items:center;padding:7px 2px 12px}.m238m-sheet-head h3{font-size:19px;margin:0}.m238m-sheet-head button{border:0;background:var(--m-surface2);color:var(--m-text);width:32px;height:32px;border-radius:50%;display:grid;place-items:center}
.m238m-form-card{display:flex;flex-direction:column;gap:10px}.m238m-form-card select,.m238m-form-card textarea,.m238m-form-card input{width:100%;border:0;background:var(--m-surface2);color:var(--m-text);border-radius:12px;padding:12px;font:inherit;outline:none}.m238m-form-card textarea{min-height:104px;resize:vertical}.m238m-form-card small{color:var(--m-secondary)}.m238m-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.m238m-period-sheet-top{position:sticky;top:0;z-index:4;background:var(--m-surface);padding-bottom:8px}.m238m-period-sheet-top .m238m-primary{margin-top:8px}.m238m-sheet-list{background:var(--m-surface);border-radius:16px;overflow:hidden;margin:12px 0}.m238m-sheet-list button{display:flex;justify-content:space-between;width:100%;padding:14px;border:0;border-bottom:1px solid var(--m-line);background:transparent;color:var(--m-text);font-weight:700;text-align:left}.m238m-sheet-list button.selected{color:var(--m-blue)}.m238m-primary,.m238m-cancel{width:100%;border:0;border-radius:14px;padding:14px;font-size:15px;font-weight:850}.m238m-primary{background:var(--m-blue);color:white}.m238m-cancel{background:var(--m-surface);color:var(--m-text);margin-top:10px}.m238m-action-list{background:var(--m-surface);border-radius:16px;overflow:hidden}.m238m-action-list button{width:100%;height:54px;display:flex;align-items:center;gap:12px;border:0;border-bottom:1px solid var(--m-line);background:transparent;color:var(--m-text);font-size:14px;font-weight:750;padding:0 15px}.m238m-action-list button svg{width:19px;color:var(--m-blue)}
.m238m-input-icon{display:flex;align-items:center;gap:8px;background:var(--m-surface2);border-radius:12px;padding:0 10px}.m238m-input-icon input{background:transparent!important;padding-left:0!important}.m238m-stock-row,.m238m-rank-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.m238m-stock-row>div:first-child{min-width:0;display:flex;flex-direction:column}.m238m-stock-row>div:first-child strong{font-size:13px}.m238m-stock-row>div:first-child span,.m238m-rank-row span{font-size:11px;color:var(--m-secondary)}.m238m-stock-row>div:last-child{text-align:right;display:flex;flex-direction:column}.m238m-stock-row>div:last-child b{font-size:18px}.m238m-stock-row>div:last-child small{font-size:10px;color:var(--m-secondary)}.m238m-kpi-detail>span{font-size:11px;color:var(--m-secondary);font-weight:800}.m238m-kpi-detail>strong{display:block;font-size:18px;margin:5px 0}.m238m-kpi-detail>p,.m238m-kpi-detail>small{font-size:10px;color:var(--m-secondary)}.m238m-kpi-detail .m238m-progress{margin:7px 0}.m238m-rank-row>div{display:flex;flex-direction:column;flex:1}.m238m-form-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.m238m-form-actions .m238m-cancel{margin-top:0}.m238m-primary{display:flex;align-items:center;justify-content:center;gap:7px}.m238m-cancel.danger,.m238m-row-actions .danger{color:#ff453a}.m238m-row-actions{display:flex;gap:8px;margin-top:10px}.m238m-row-actions button,.m238m-inline-link{border:0;background:var(--m-surface2);color:var(--m-text);border-radius:10px;padding:8px 10px;font-size:11px;font-weight:800;display:inline-flex;align-items:center;gap:5px}.m238m-inline-link{margin-top:10px;color:var(--m-blue)}.m238m-mini-list{margin-top:10px;display:flex;flex-direction:column;gap:6px}.m238m-mini-list>div{display:grid;grid-template-columns:1fr auto;gap:3px 10px;background:var(--m-surface2);padding:9px;border-radius:10px}.m238m-mini-list span,.m238m-mini-list b{font-size:11px}.m238m-mini-list small{grid-column:1/-1;font-size:10px;color:var(--m-secondary)}.m238m-target-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}.m238m-target-row>div{display:flex;flex-direction:column}.m238m-target-row>div span{font-size:10px;color:var(--m-secondary)}.m238m-target-row label{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--m-secondary)}.m238m-target-row input[type="number"]{width:76px;border:0;background:var(--m-surface2);color:var(--m-text);border-radius:9px;padding:8px;text-align:right}.m238m-toggle-row{grid-column:1/-1;justify-content:flex-end}.m238m-notice{display:block;text-align:center;color:var(--m-secondary)}.m238m-empty{text-align:center;color:var(--m-secondary);font-size:12px}.m238m-op-row .m238m-copy-head>div{display:flex;flex-direction:column}.m238m-op-row .m238m-copy-head span{font-size:10px;color:var(--m-secondary)}.m238m-view-picker{display:grid;grid-template-columns:1fr 1fr;gap:8px}.m238m-view-picker button{border:0;border-radius:14px;background:var(--m-surface);color:var(--m-text);padding:14px 10px;font-weight:850}.m238m-view-picker button.active{background:var(--m-blue);color:white}.m238m-weekly-hero-title{display:flex;align-items:center;justify-content:space-between;gap:10px}.m238m-weekly-hero-title svg{opacity:.8}.m238m-weekly-compare-total{background:linear-gradient(145deg,color-mix(in srgb,var(--m-blue) 10%,var(--m-surface)),var(--m-surface))}.m238m-weekly-compare-total .m238m-compare-pair small{display:block;margin-top:4px;font-size:9px;color:var(--m-secondary)}.m238m-week-compare-row{display:flex;flex-direction:column;gap:10px}.m238m-week-compare-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.m238m-week-compare-head strong,.m238m-week-compare-head b{font-size:13px}.m238m-week-compare-values{display:grid;grid-template-columns:1fr 1fr;gap:8px}.m238m-week-compare-values>div{background:var(--m-surface2);border-radius:11px;padding:10px;min-width:0}.m238m-week-compare-values span{display:block;font-size:9px;color:var(--m-secondary);font-weight:700}.m238m-week-compare-values b{display:block;margin-top:3px;font-size:11px;overflow-wrap:anywhere}.m238m-week-compare-values small{display:block;margin-top:3px;font-size:9px;color:var(--m-secondary);overflow-wrap:anywhere}.m238m-week-target{padding-top:8px;border-top:1px solid var(--m-line)}.m238m-week-target>div{display:flex;align-items:center;justify-content:space-between;font-size:10px}.m238m-week-target>small{font-size:9px;color:var(--m-secondary)}.m238m-week-analysis span{display:block;margin-top:8px;font-size:10px;font-weight:850;color:var(--m-blue)}.m238m-week-analysis p{font-size:11px;line-height:1.5;color:var(--m-secondary);margin:4px 0 0}.m238m-mini-action{display:inline-flex;align-items:center;gap:5px;border:0;background:color-mix(in srgb,var(--m-blue) 10%,var(--m-surface2));color:var(--m-blue);border-radius:9px;padding:7px 9px;font-size:10px;font-weight:850}.m238m-lob-type-compare{display:flex;flex-direction:column;gap:10px}.m238m-lob-deltas{display:flex;flex-direction:column;align-items:flex-end;gap:2px}.m238m-lob-deltas b{font-size:12px}.m238m-lob-deltas small{font-size:9px}.m238m-type-delta-line{display:grid;grid-template-columns:auto 1fr auto 1fr;align-items:center;gap:5px 8px;padding-top:8px;border-top:1px solid var(--m-line);font-size:10px}.m238m-type-delta-line span{color:var(--m-secondary)}.m238m-type-delta-line b{text-align:right}.m238m-touch-chart{margin-top:12px}.m238m-touch-chart svg{width:100%;height:94px;color:rgba(255,255,255,.95);overflow:visible}.m238m-touch-chart circle{fill:rgba(255,255,255,.72);stroke:none;cursor:pointer}.m238m-touch-chart circle.active{fill:white}.m238m-chart-tip{display:flex;align-items:center;justify-content:space-between;font-size:11px;margin-bottom:3px}.m238m-chart-tip span{color:white!important;opacity:.9}.m238m-chart-days{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:2px}.m238m-chart-days button{border:0;background:transparent;color:rgba(255,255,255,.65);font-size:10px;font-weight:800;padding:4px 0;border-radius:8px}.m238m-chart-days button.active{background:rgba(255,255,255,.14);color:white}.m238m-skeleton{background:linear-gradient(90deg,var(--m-surface2),color-mix(in srgb,var(--m-surface) 75%,var(--m-surface2)),var(--m-surface2));background-size:200% 100%;animation:m238mShimmer 1.2s infinite;border-radius:18px}.m238m-skeleton.hero{height:190px;border-radius:22px}.m238m-skeleton.tile{height:92px}.m238m-skeleton.list{height:70px}.m238m-refreshing{display:flex;align-items:center;gap:6px;justify-content:center;font-size:11px;color:var(--m-secondary);padding-bottom:7px}.m238m-warning-card{background:color-mix(in srgb,#ff9f0a 12%,var(--m-surface));border:1px solid color-mix(in srgb,#ff9f0a 30%,transparent)}.m238m-success-card{background:color-mix(in srgb,#30d158 10%,var(--m-surface));border:1px solid color-mix(in srgb,#30d158 24%,transparent)}.m238m-error{color:#ff453a;font-size:13px}.spin{animation:m238mSpin .8s linear infinite}.m238m-enter{animation:m238mEnter var(--motion-normal) cubic-bezier(.22,1,.36,1)}
@keyframes m238mEnter{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}@keyframes m238mSheet{from{transform:translateY(100%)}to{transform:none}}@keyframes m238mShimmer{to{background-position:-200% 0}}@keyframes m238mSpin{to{transform:rotate(360deg)}}
@media(min-width:769px){.m238m-app{display:none!important}}
`;

