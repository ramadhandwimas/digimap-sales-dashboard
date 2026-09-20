"use client";

import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties,type ReactNode} from "react";
import {
  Activity,Box,CalendarDays,ChevronRight,ClipboardCheck,Copy,CreditCard,FileDown,
  FileSpreadsheet,Home,Lightbulb,LogOut,MessageCircle,MoreHorizontal,Moon,
  PackageSearch,RefreshCw,Settings,Share2,Sun,Target,TrendingUp,Users,WalletCards,X
} from "lucide-react";
import {exportReportPdf,exportReportPng,exportReportXlsx} from "@/lib/dashboard-export";
import MobileOperations from "@/components/mobile-operations";
import {makeDailySalesPicture,makeLobPicture,makeVasPicture} from "@/components/daily-sales-alerts";

type Tab="home"|"sales"|"team"|"report"|"more";
type SalesMode="daily"|"summary"|"lob";
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
  const[tab,setTab]=useState<Tab>("home"),[period,setPeriod]=useState(periodNow()),[draftPeriod,setDraftPeriod]=useState(periodNow()),[periodMode,setPeriodMode]=useState<"month"|"week">("month"),[draftPeriodMode,setDraftPeriodMode]=useState<"month"|"week">("month"),[selectedWeek,setSelectedWeek]=useState(""),[draftWeek,setDraftWeek]=useState(""),[sheet,setSheet]=useState<SheetName>(null),[moreKind,setMoreKind]=useState(""),[moreData,setMoreData]=useState<any>(null),[moreBusy,setMoreBusy]=useState(false);
  const[overview,setOverview]=useState<Overview|null>(null),[traffic,setTraffic]=useState<Traffic|null>(null),[daily,setDaily]=useState<Daily|null>(null),[summary,setSummary]=useState<DailySummary|null>(null),[weekly,setWeekly]=useState<Weekly|null>(null),[weeklySummary,setWeeklySummary]=useState<DailySummary|null>(null),[feedback,setFeedback]=useState<Feedback|null>(null),[cx,setCx]=useState<Cx|null>(null),[staffDetail,setStaffDetail]=useState<Staff|null>(null),[staffDetailMode,setStaffDetailMode]=useState<"daily"|"monthly">("monthly"),[dayDetail,setDayDetail]=useState<DailyRow|null>(null);
  const[homeMode,setHomeMode]=useState<HomeMode>("monthly"),[salesMode,setSalesMode]=useState<SalesMode>("daily"),[reportMode,setReportMode]=useState<ReportMode>("weekly"),[teamFilter,setTeamFilter]=useState("all"),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[error,setError]=useState(""),[dark,setDark]=useState(false);
  const rootRef=useRef<HTMLDivElement>(null),touchStart=useRef<number|null>(null);

  const loadOverview=useCallback(async(force=false)=>{
    setError("");
    const from=`${period}-01`,to=period===periodNow()?today():`${period}-${String(new Date(Number(period.slice(0,4)),Number(period.slice(5,7)),0).getDate()).padStart(2,"0")}`;
    const[o,t]=await Promise.all([
      cachedJson<Overview>(`/api/overview?period=${period}`,180000,force),
      cachedJson<Traffic>(`/api/traffic?from=${from}&to=${to}`,180000,force)
    ]);
    setOverview(o);setTraffic(t);
  },[period]);

  useEffect(()=>{setLoading(true);loadOverview().catch(e=>setError(e instanceof Error?e.message:"Gagal memuat dashboard")).finally(()=>setLoading(false))},[loadOverview]);
  useEffect(()=>{const d=localStorage.getItem("m238-theme")==="dark";setDark(d);document.documentElement.classList.toggle("dark",d)},[]);

  const loadDaily=useCallback(async(force=false)=>{const d=await cachedJson<Daily>(`/api/daily-fast?date=${today()}`,90000,force);setDaily(d)},[]);
  const loadSummary=useCallback(async(force=false)=>{const from=`${period}-01`,to=period===periodNow()?today():`${period}-${String(new Date(Number(period.slice(0,4)),Number(period.slice(5,7)),0).getDate()).padStart(2,"0")}`;const d=await cachedJson<DailySummary>(`/api/daily-summary-fast?from=${from}&to=${to}&mode=monthly`,180000,force);setSummary(d)},[period]);
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
  },[]);
  const loadFeedback=useCallback(async(force=false)=>setFeedback(await cachedJson<Feedback>(`/api/feedback?period=${period}`,180000,force)),[period]);
  const loadCx=useCallback(async(force=false)=>setCx(await cachedJson<Cx>(`/api/cx-member?period=${period}`,180000,force)),[period]);

  useEffect(()=>{if(tab==="sales"){if(salesMode==="daily"&&!daily)void loadDaily();if(salesMode==="summary"&&!summary)void loadSummary()}},[tab,salesMode,daily,summary,loadDaily,loadSummary]);
  useEffect(()=>{if(tab!=="report")return;if(reportMode==="weekly"&&!weekly)void loadWeekly();if(reportMode==="feedback"&&!feedback)void loadFeedback();if(reportMode==="cx"&&!cx)void loadCx()},[tab,reportMode,weekly,feedback,cx,loadWeekly,loadFeedback,loadCx]);

  const refresh=useCallback(async()=>{
    setRefreshing(true);
    try{
      if(tab==="home")await loadOverview(true);
      else if(tab==="sales")await (salesMode==="daily"?loadDaily(true):loadSummary(true));
      else if(tab==="report")await (reportMode==="weekly"?loadWeekly(true):reportMode==="feedback"?loadFeedback(true):loadCx(true));
      else if(tab==="team")await loadOverview(true);
    }finally{setRefreshing(false)}
  },[tab,salesMode,reportMode,loadOverview,loadDaily,loadSummary,loadWeekly,loadFeedback,loadCx]);

  const openStaff=async(staff:Staff,mode:"daily"|"monthly"="monthly")=>{setStaffDetailMode(mode);setStaffDetail(staff);setSheet("staff");if(mode==="daily")return;try{const d=await cachedJson<{staff:Staff[]}>(`/api/staff-performance-month?period=${period}`,180000);const full=d.staff.find(x=>x.id===staff.id);if(full)setStaffDetail(full)}catch{}};
  const openHomeSalesDetail=async()=>{
    setSheet("home-sales");
    if(summary)return;
    try{await loadSummary()}catch(e){setError(e instanceof Error?e.message:"Gagal memuat detail Total Sales")}
  };
  const toggleDark=()=>{const next=!dark;setDark(next);localStorage.setItem("m238-theme",next?"dark":"light");document.documentElement.classList.toggle("dark",next);let meta=document.querySelector('meta[name="theme-color"]') as HTMLMetaElement|null;if(!meta){meta=document.createElement("meta");meta.name="theme-color";document.head.appendChild(meta)}meta.content=next?"#000000":"#f2f2f7"};
  const transaction=overview?.summary.invoices||0,trafficValue=traffic?.total||0,cvr=trafficValue?transaction/trafficValue*100:0,achievement=overview?.target.amount?((overview.summary.amount/overview.target.amount)*100):0;
  const team=useMemo(()=>{const rows=overview?.staff||[];if(teamFilter==="top")return rows.filter(x=>x.status==="Productive");if(teamFilter==="attention")return rows.filter(x=>x.status!=="Productive");return rows},[overview,teamFilter]);

  const openPeriodSheet=()=>{setDraftPeriod(period);setDraftPeriodMode(periodMode);setDraftWeek(selectedWeek||weekly?.labelB||"");setSheet("period");if(!weekly)void loadWeekly()};
  const applyPeriod=()=>{if(draftPeriodMode==="week"){setPeriodMode("week");setSheet(null);setTab("report");setReportMode("weekly");void loadWeekly(true,draftWeek);return}setPeriodMode("month");setPeriod(draftPeriod);setDaily(null);setSummary(null);setFeedback(null);setCx(null);setSheet(null)};
  const shareText=`M238 PIM 2 • ${overview?.label||monthLabel(period)}\nSales ${money.format(overview?.summary.amount||0)}\nAchievement ${pct(achievement)}\nUPT ${(overview?.summary.upt||0).toFixed(1)}`;
  const doShare=async(kind:string)=>{if(kind==="wa")window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`,"_blank");else if(kind==="copy")await navigator.clipboard.writeText(shareText);else if(rootRef.current&&kind==="png")await exportReportPng(rootRef.current,`M238-${period}`);else if(rootRef.current&&kind==="pdf")await exportReportPdf(rootRef.current,`M238-${period}`);else if(kind==="xlsx"&&overview)await exportReportXlsx([{name:"Overview",rows:[["Periode",overview.label],["Sales",overview.summary.amount],["Target",overview.target.amount],["Achievement",achievement],["UPT",overview.summary.upt],[],["Staff","Sales","Achievement"],...overview.staff.map(s=>[s.name,s.amount,s.achievement??0])]}],`M238-${period}`);setSheet(null)};

  const handleMore=async(action:string)=>{
    if(action==="cx"){setTab("report");setReportMode("cx");return}
    if(action==="activity"){setTab("sales");setSalesMode("summary");return}
    setMoreKind(action);setMoreData(null);setSheet("more");
    if(action!=="incentive")return;
    setMoreBusy(true);
    try{
      const from=`${period}-01`,to=period===periodNow()?today():`${period}-${String(new Date(Number(period.slice(0,4)),Number(period.slice(5,7)),0).getDate()).padStart(2,"0")}`;
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
      <button className="m238m-period" onClick={openPeriodSheet}><CalendarDays size={15}/><span>{periodMode==="week"?(selectedWeek||weekly?.labelB||"Pilih Week"):monthLabel(period)}</span><small>{periodMode==="week"?"Weekly":(weekly?.labelB||`Week ${retailWeek()}`)}</small><ChevronRight size={15}/></button>
      {refreshing?<div className="m238m-refreshing"><RefreshCw size={14} className="spin"/> Memperbarui data…</div>:null}
      {error?<Card className="m238m-error">{error}</Card>:null}
      {loading&&!overview?<Skeleton/>:null}
      {!loading&&overview&&tab==="home"?<HomeScreen mode={homeMode} setMode={setHomeMode} overview={overview} traffic={traffic} cvr={cvr} achievement={achievement} onOpenSalesDetail={()=>void openHomeSalesDetail()}/>:null}
      {tab==="sales"?<SalesScreen mode={salesMode} setMode={setSalesMode} daily={daily} summary={summary} onStaff={s=>void openStaff(s,"daily")} onDay={row=>{setDayDetail(row);setSheet("day")}}/>:null}
      {tab==="team"?<TeamScreen rows={team} filter={teamFilter} setFilter={setTeamFilter} onStaff={s=>void openStaff(s,"monthly")}/>:null}
      {tab==="report"?<ReportScreen mode={reportMode} setMode={setReportMode} weekly={weekly} weeklySummary={weeklySummary} feedback={feedback} cx={cx} staff={overview?.staff||[]}/>:null}
      {tab==="more"?<MoreScreen dark={dark} toggleDark={toggleDark} onAction={handleMore}/>:null}
    </main>

    <nav className="m238m-bottom" style={{"--m238m-active-index":String(["home","sales","team","report","more"].indexOf(tab))} as CSSProperties}>
      <span className="m238m-liquid-bubble" aria-hidden="true"/>
      {[
        ["home","Home",Home],["sales","Sales",TrendingUp],["team","Team",Users],["report","Report",FileDown],["more","More",MoreHorizontal]
      ].map(([key,label,Icon])=><button key={String(key)} onClick={()=>setTab(key as Tab)} className={tab===key?"active":""}><span className="m238m-nav-icon"><Icon size={21}/></span><span className="m238m-nav-label">{String(label)}</span></button>)}
    </nav>

    <Sheet open={sheet==="period"} onClose={()=>setSheet(null)} title="Pilih Periode">
      <Segmented value={draftPeriodMode} onChange={setDraftPeriodMode} items={[{value:"month",label:"Month"},{value:"week",label:"Week"}]}/>
      {draftPeriodMode==="month"?<div className="m238m-sheet-list">{months.map(p=><button key={p} onClick={()=>setDraftPeriod(p)} className={draftPeriod===p?"selected":""}><span>{monthLabel(p)}</span>{draftPeriod===p?<strong>✓</strong>:null}</button>)}</div>:<div className="m238m-sheet-list">{(weekly?.availableWeeks||[]).slice().reverse().map(w=><button key={w} onClick={()=>setDraftWeek(w)} className={draftWeek===w?"selected":""}><span>{w}</span>{draftWeek===w?<strong>✓</strong>:null}</button>)}</div>}
      <button className="m238m-primary" disabled={draftPeriodMode==="week"&&!draftWeek} onClick={applyPeriod}>Terapkan</button>
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
      <Card className="m238m-hero m238m-home-hero"><div className="m238m-hero-title"><span>Total Sales</span><ChevronRight size={18}/></div><strong>{money.format(overview.summary.amount)}</strong><p>{pct(achievement)} dari Target</p><Progress value={achievement}/><div className="m238m-hero-meta"><span>Target <b>{compact(overview.target.amount)}</b></span><span>Point Store <b>{overview.summary.point.total.toFixed(1)}</b></span></div></Card>
    </button>
    <div className="m238m-grid"><Metric label="Achievement" value={pct(achievement)} sub={overview.summary.status}/><Metric label="Gap / Variance" value={compact(overview.summary.gap)} sub={overview.summary.gap>0?"Sisa ke target":"Target tercapai"}/><Metric label="Estimate" value={compact(overview.summary.estimate.amount)} sub="Proyeksi bulan"/><Metric label="Pace" value={pct(overview.summary.pace)} sub={overview.summary.status}/></div>
    <Card className="m238m-point-card"><div><span>Point Store</span><strong>{overview.summary.point.total.toFixed(1)}</strong></div><div className="m238m-point-breakdown"><span>Device {overview.summary.point.device.toFixed(1)}/60</span><span>ACC {overview.summary.point.accessories.toFixed(1)}/30</span><span>VAS {overview.summary.point.vas.toFixed(1)}/10</span></div></Card>
    <div className="m238m-section-head"><h2>Penjualan per Kategori</h2><span>{overview.label}</span></div>
    <div className="m238m-grid"><Metric label="Device" value={compact(overview.summary.device)} sub={`Target ${compact(overview.target.device)}`}/><Metric label="Accessories" value={compact(overview.summary.accessories)} sub={`Target ${compact(overview.target.accessories)}`}/><Metric label="VAS" value={compact(overview.summary.vas)} sub={`Target ${compact(overview.target.vas)}`}/></div>
    <div className="m238m-section-head"><h2>Traffic & Conversion</h2></div>
    <div className="m238m-grid"><Metric label="Traffic" value={num.format(traffic?.total||0)} sub={trafficDelta==null?undefined:`${trafficDelta>=0?"+":""}${pct(trafficDelta)} vs hari sebelumnya`}/><Metric label="Transaksi" value={num.format(overview.summary.invoices)} sub="Invoice unique"/><Metric label="CVR" value={pct(cvr)} sub="Traffic → transaksi"/><Metric label="UPT" value={overview.summary.upt.toFixed(1)} sub="Unit per transaksi"/><Metric label="Qty" value={num.format(overview.summary.qty)} sub="Total unit"/><Metric label="ATV" value={compact(overview.summary.atv)} sub="Average ticket"/></div>
    <Card className="m238m-insight"><Lightbulb size={18}/><div><span>Insight Hari Ini</span><p>{insight}</p></div></Card>
  </>:mode==="ytd"?<YtdOverview overview={overview}/>:<CompareOverview overview={overview} compare={selectedCompare as CompareMonth|undefined}/>}
 </div>
}

function YtdOverview({overview}:{overview:Overview}){
 const y=overview.ytd;
 if(!y)return <Card className="m238m-empty">Data YTD belum tersedia.</Card>;
 const lobs=y.lobs||[];
 return <>
  <Card className="m238m-ytd-hero"><div className="m238m-section-head compact"><h2>Total Sales YTD</h2><span>s.d. bulan {y.throughMonth||Number(overview.period.slice(5,7))}</span></div><div className="m238m-compare-pair"><div><span>2026</span><strong>{compact(y.amount2026)}</strong></div><div><span>2025</span><strong>{compact(y.amount2025)}</strong></div></div><div className={"m238m-growth-pill "+(y.growth>=0?"positive":"negative")}>{y.growth>=0?"+":""}{pct(y.growth)} Growth YTD</div></Card>
  <div className="m238m-section-head"><h2>Qty YTD</h2></div>
  <div className="m238m-grid"><Metric label="2026" value={num.format(y.qty2026)}/><Metric label="2025" value={num.format(y.qty2025)} sub={`${y.qtyGrowth>=0?"+":""}${pct(y.qtyGrowth)} growth`}/></div>
  <div className="m238m-section-head"><h2>Device YTD</h2></div>
  <div className="m238m-grid"><Metric label="Device 2026" value={compact(y.device2026||0)} sub={`${(y.deviceGrowth||0)>=0?"+":""}${pct(y.deviceGrowth||0)}`}/><Metric label="Device 2025" value={compact(y.device2025||0)}/><Metric label="Qty Device 2026" value={num.format(y.deviceQty2026||0)}/><Metric label="Qty Device 2025" value={num.format(y.deviceQty2025||0)}/></div>
  {lobs.length?<><div className="m238m-section-head"><h2>Top LOB YTD</h2><span>2026 vs 2025</span></div><div className="m238m-list">{lobs.map(r=><Card key={r.lob} className="m238m-compare-row"><div><strong>{r.lob}</strong><span>{num.format(r.qty2026||0)} vs {num.format(r.qty2025)} unit</span></div><div><b>{compact(r.amount2026||0)}</b><small className={(r.growth||0)>=0?"positive":"negative"}>{(r.growth||0)>=0?"+":""}{pct(r.growth||0)}</small></div></Card>)}</div></>:null}
 </>
}

function CompareOverview({overview,compare}:{overview:Overview;compare?:CompareMonth}){
 if(!compare)return <Card className="m238m-empty">Data compare belum tersedia.</Card>;
 return <>
  <Card className="m238m-ytd-hero"><div className="m238m-section-head compact"><h2>Total Sales</h2><span>{overview.label}</span></div><div className="m238m-compare-pair"><div><span>2025</span><strong>{money.format(compare.amount2025||0)}</strong></div><div><span>2026</span><strong>{compare.amount2026==null?"—":money.format(compare.amount2026)}</strong></div></div><div className={"m238m-growth-pill "+((compare.growth||0)>=0?"positive":"negative")}>{compare.diff==null?"Belum ada data":`${compare.diff>=0?"+":""}${money.format(compare.diff)} • ${(compare.growth||0)>=0?"+":""}${pct(compare.growth||0)}`}</div></Card>
  <div className="m238m-section-head"><h2>Qty</h2></div>
  <div className="m238m-grid"><Metric label="2025" value={num.format(compare.qty2025||0)}/><Metric label="2026" value={compare.qty2026==null?"—":num.format(compare.qty2026)} sub={compare.qtyGrowth==null?undefined:`${compare.qtyGrowth>=0?"+":""}${pct(compare.qtyGrowth)}`}/></div>
  <div className="m238m-section-head"><h2>Device</h2><span>Value & Qty</span></div>
  <div className="m238m-grid"><Metric label="Device 2025" value={compact(compare.device2025||0)} sub={`${num.format(compare.deviceQty2025||0)} unit`}/><Metric label="Device 2026" value={compare.device2026==null?"—":compact(compare.device2026)} sub={compare.deviceQty2026==null?undefined:`${num.format(compare.deviceQty2026)} unit`}/></div>
  {compare.lobs?.length?<><div className="m238m-section-head"><h2>Perbandingan LOB</h2><span>2025 → 2026</span></div><div className="m238m-list">{compare.lobs.map(r=><Card key={r.lob} className="m238m-compare-row"><div><strong>{r.lob}</strong><span>{compact(r.amount2025)} → {r.amount2026==null?"—":compact(r.amount2026)}</span></div><div><b>{r.qty2025} → {r.qty2026??"—"}</b><small className={(r.growth||0)>=0?"positive":"negative"}>{r.growth==null?"—":`${r.growth>=0?"+":""}${pct(r.growth)}`}</small></div></Card>)}</div></>:null}
 </>
}

function HomeSalesDetail({overview,traffic,summary}:{overview:Overview;traffic:Traffic|null;summary:DailySummary|null}){
 const ach=overview.target.amount?overview.summary.amount/overview.target.amount*100:0;
 const cvr=summary?.summary.cvr??((traffic?.total||0)?overview.summary.invoices/(traffic?.total||1)*100:0);
 return <div className="m238m-stack">
  <Card className="m238m-detail-sales"><span>Total Sales</span><strong>{money.format(overview.summary.amount)}</strong><small>{overview.label}</small></Card>
  <div className="m238m-detail-list">
   {[
    ["Target",compact(overview.target.amount)],
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

function SalesScreen({mode,setMode,daily,summary,onStaff,onDay}:{mode:SalesMode;setMode:(v:SalesMode)=>void;daily:Daily|null;summary:DailySummary|null;onStaff:(s:Staff)=>void;onDay:(r:DailyRow)=>void}){
 const ach=daily?.total.target?daily.total.amount/daily.total.target*100:0,device=daily?Math.max(0,daily.total.amount-daily.total.accessories-daily.total.vas):0;
 return <div className="m238m-stack m238m-enter">
  <Segmented value={mode} onChange={setMode} items={[{value:"daily",label:"Daily"},{value:"summary",label:"Summary"},{value:"lob",label:"LOB & VAS"}]}/>
  {mode==="daily"?(daily?<>
    <Card className="m238m-hero compact"><span>Sales Today</span><strong>{compact(daily.total.amount)}</strong><p>Target {compact(daily.total.target)} • {pct(ach)}</p><Progress value={ach}/></Card>
    <div className="m238m-grid"><Metric label="Device" value={compact(device)}/><Metric label="ACC" value={compact(daily.total.accessories)} sub={`Target ${compact(daily.total.accTarget)}`}/><Metric label="VAS" value={compact(daily.total.vas)} sub={`Target ${compact(daily.total.vasTarget)}`}/><Metric label="UPT" value={daily.total.upt.toFixed(1)}/><Metric label="Invoice" value={num.format(daily.total.invoices)}/><Metric label="Qty" value={num.format(daily.total.qty)}/></div>
    <div className="m238m-section-head"><h2>Staff Performance Today</h2><span>{daily.staff.length} staff</span></div>
    <div className="m238m-list">{daily.staff.map(s=><StaffRow key={s.id} staff={s} onClick={()=>onStaff(s)}/>)}</div>
  </>:<Skeleton/>):mode==="summary"?(summary?<>
    <Card className="m238m-hero compact"><span>Daily Summary</span><strong>{compact(summary.summary.totalSales)}</strong><p>{pct(summary.summary.achievementPct)} dari Target • {summary.summary.growthPct==null?"No comparison":`${summary.summary.growthPct>=0?"+":""}${pct(summary.summary.growthPct)} vs periode sebelumnya`}</p><Progress value={summary.summary.achievementPct}/></Card>
    <div className="m238m-grid"><Metric label="Target" value={compact(summary.summary.target)}/><Metric label="Traffic" value={num.format(summary.summary.traffic)}/><Metric label="Transaction" value={num.format(summary.summary.transaction)}/><Metric label="CVR" value={pct(summary.summary.cvr)}/><Metric label="ATV" value={compact(summary.summary.atv)}/><Metric label="UPT" value={summary.summary.upt.toFixed(1)}/><Metric label="Qty" value={num.format(summary.summary.qty)}/><Metric label="Invoice" value={num.format(summary.summary.invoice)}/></div>
    <div className="m238m-section-head"><h2>Breakdown</h2></div>
    <div className="m238m-grid"><Metric label="Device" value={compact(summary.breakdown.device)}/><Metric label="ACC" value={compact(summary.breakdown.accessories)}/><Metric label="VAS" value={compact(summary.breakdown.vas)}/></div>
    <div className="m238m-section-head"><h2>Per Hari</h2><span>Tap untuk detail</span></div>
    <div className="m238m-list">{(summary.dailyRows||[]).slice().reverse().map(r=><button key={r.date} className="m238m-day-row" onClick={()=>onDay(r)}><div><strong>{r.day||r.date} • {r.date}</strong><span>{compact(r.totalSales)}</span></div><div><small>{pct(r.achievementPct)} target</small><small>CVR {pct(r.cvr)} • UPT {r.upt.toFixed(1)}</small></div><ChevronRight size={17}/></button>)}</div>
  </>:<Skeleton/>):(summary?<LobVasView summary={summary}/>:<Skeleton/>)}
 </div>
}

function LobVasView({summary}:{summary:DailySummary}){
 const lob=summary.breakdown.lob||{iphone:0,macbook:0,ipad:0,appleWatch:0,airpods:0},vas=(summary.dailyRows||[]).reduce((a,r)=>({qoalaQty:a.qoalaQty+(r.vas?.qoalaQty||0),qoalaValue:a.qoalaValue+(r.vas?.qoalaValue||0),telkomselQty:a.telkomselQty+(r.vas?.telkomselQty||0),telkomselValue:a.telkomselValue+(r.vas?.telkomselValue||0),xlQty:a.xlQty+(r.vas?.xlQty||0),xlValue:a.xlValue+(r.vas?.xlValue||0),indosatQty:a.indosatQty+(r.vas?.indosatQty||0),indosatValue:a.indosatValue+(r.vas?.indosatValue||0)}),{qoalaQty:0,qoalaValue:0,telkomselQty:0,telkomselValue:0,xlQty:0,xlValue:0,indosatQty:0,indosatValue:0});
 return <><div className="m238m-section-head"><h2>LOB Performance</h2><span>Qty periode</span></div><div className="m238m-grid"><Metric label="iPhone" value={num.format(lob.iphone)}/><Metric label="MacBook" value={num.format(lob.macbook)}/><Metric label="iPad" value={num.format(lob.ipad)}/><Metric label="Apple Watch" value={num.format(lob.appleWatch)}/><Metric label="AirPods" value={num.format(lob.airpods)}/></div><div className="m238m-section-head"><h2>VAS Provider</h2><span>Qty & value</span></div><div className="m238m-grid"><Metric label="Qoala" value={compact(vas.qoalaValue)} sub={`${num.format(vas.qoalaQty)} qty`}/><Metric label="Telkomsel" value={compact(vas.telkomselValue)} sub={`${num.format(vas.telkomselQty)} qty`}/><Metric label="XL" value={compact(vas.xlValue)} sub={`${num.format(vas.xlQty)} qty`}/><Metric label="Indosat" value={compact(vas.indosatValue)} sub={`${num.format(vas.indosatQty)} qty`}/></div></>
}

function DailyDetail({row}:{row:DailyRow}){
 return <div className="m238m-stack"><Card className="m238m-hero compact"><span>{row.day||"Daily"} • {row.date}</span><strong>{compact(row.totalSales)}</strong><p>Target {compact(row.target)} • {pct(row.achievementPct)}</p><Progress value={row.achievementPct}/></Card><div className="m238m-grid"><Metric label="Traffic" value={num.format(row.traffic)}/><Metric label="CVR" value={pct(row.cvr)}/><Metric label="Transaction" value={num.format(row.transaction)}/><Metric label="Qty" value={num.format(row.qty)}/><Metric label="UPT" value={row.upt.toFixed(1)}/><Metric label="ATV" value={compact(row.atv)}/></div><div className="m238m-section-head"><h2>Sales Breakdown</h2></div><div className="m238m-grid"><Metric label="Device" value={compact(row.breakdown.device)}/><Metric label="ACC" value={compact(row.breakdown.accessories)}/><Metric label="VAS" value={compact(row.breakdown.vas)}/></div><div className="m238m-section-head"><h2>LOB Qty</h2></div><div className="m238m-grid"><Metric label="iPhone" value={num.format(row.lob.iphoneQty)}/><Metric label="MacBook" value={num.format(row.lob.macbookQty)}/><Metric label="iPad" value={num.format(row.lob.ipadQty)}/><Metric label="Apple Watch" value={num.format(row.lob.appleWatchQty)}/><Metric label="AirPods" value={num.format(row.lob.airpodsQty)}/></div><div className="m238m-section-head"><h2>VAS Provider</h2></div><div className="m238m-grid"><Metric label="Qoala" value={compact(row.vas.qoalaValue)} sub={`${num.format(row.vas.qoalaQty)} qty`}/><Metric label="Telkomsel" value={compact(row.vas.telkomselValue)} sub={`${num.format(row.vas.telkomselQty)} qty`}/><Metric label="XL" value={compact(row.vas.xlValue)} sub={`${num.format(row.vas.xlQty)} qty`}/><Metric label="Indosat" value={compact(row.vas.indosatValue)} sub={`${num.format(row.vas.indosatQty)} qty`}/></div></div>
}

function StaffRow({staff,onClick}:{staff:Staff;onClick:()=>void}){
 const target=staff.targets?.amount||staff.target||0,a=target?staff.amount/target*100:staff.achievement||0,gap=target?Math.max(0,target-staff.amount):staff.gap||0;
 return <button className="m238m-staff-row" onClick={onClick}><div className="m238m-avatar">{initials(staff.name)}</div><div className="m238m-staff-main"><div><strong>{staff.name}</strong><b>{compact(staff.amount)}</b></div><Progress value={a}/><small>{pct(a)} • Gap {compact(gap)} • UPT {(staff.upt||0).toFixed(1)}</small></div><ChevronRight size={17}/></button>
}
function TeamScreen({rows,filter,setFilter,onStaff}:{rows:Staff[];filter:string;setFilter:(v:string)=>void;onStaff:(s:Staff)=>void}){
 return <div className="m238m-stack m238m-enter"><div className="m238m-chips">{[["all","All"],["top","Top Performer"],["attention","Perlu Perhatian"]].map(([k,l])=><button key={k} className={filter===k?"active":""} onClick={()=>setFilter(k)}>{l}</button>)}</div><div className="m238m-section-head"><h2>Staff Performance</h2><span>{rows.length} staff</span></div><div className="m238m-list">{rows.map(s=><StaffRow key={s.id} staff={s} onClick={()=>onStaff(s)}/>)}</div></div>
}
function StaffDetail({staff,mode}:{staff:Staff;mode:"daily"|"monthly"}){
 const target=staff.targets?.amount||staff.target||0,a=target?staff.amount/target*100:staff.achievement||0,device=staff.device||Math.max(0,(staff.amount||0)-(staff.accessories||0)-(staff.vas||0)),gap=target?Math.max(0,target-staff.amount):staff.gap||0;
 const lob=staff.lob||{iphone:0,mac:0,ipad:0,watch:0,airpods:0},vas=staff.vasDetail||{},inc=staff.incentive;
 return <div className="m238m-stack">
  <div className="m238m-profile"><div className="m238m-avatar big">{initials(staff.name)}</div><div><h2>{staff.name}</h2><p>{staff.position||"Staff M238"} • {mode==="daily"?"Hari ini":"Bulanan"}</p></div></div>
  <Card className="m238m-hero compact"><span>Sales</span><strong>{compact(staff.amount)}</strong><p>Target {compact(target)} • {pct(a)}</p><Progress value={a}/></Card>
  <div className="m238m-grid"><Metric label="Gap" value={compact(gap)}/><Metric label="Device" value={compact(device)} sub={staff.targets?.device?`Target ${compact(staff.targets.device)}`:undefined}/><Metric label="ACC" value={compact(staff.accessories||0)} sub={staff.targets?.accessories?`Target ${compact(staff.targets.accessories)}`:undefined}/><Metric label="VAS" value={compact(staff.vas||0)} sub={staff.targets?.vas?`Target ${compact(staff.targets.vas)}`:undefined}/><Metric label="Qty" value={num.format(staff.qty||0)}/><Metric label="Invoice" value={num.format(staff.invoices||0)}/><Metric label="UPT" value={(staff.upt||0).toFixed(1)}/><Metric label="ATV" value={compact(staff.atv||0)}/></div>
  {(lob.iphone||lob.mac||lob.ipad||lob.watch||lob.airpods)?<><div className="m238m-section-head"><h2>LOB Qty</h2></div><div className="m238m-grid"><Metric label="iPhone" value={num.format(lob.iphone)}/><Metric label="MacBook" value={num.format(lob.mac)}/><Metric label="iPad" value={num.format(lob.ipad)}/><Metric label="Apple Watch" value={num.format(lob.watch)}/><Metric label="AirPods" value={num.format(lob.airpods)}/></div></>:null}
  {(vas.qoala||vas.telkomsel||vas.xl||vas.indosat)?<><div className="m238m-section-head"><h2>VAS Provider</h2></div><div className="m238m-grid"><Metric label="Qoala" value={compact(vas.qoala?.value||0)} sub={`${num.format(vas.qoala?.qty||0)} qty`}/><Metric label="Telkomsel" value={compact(vas.telkomsel?.value||0)} sub={`${num.format(vas.telkomsel?.qty||0)} qty`}/><Metric label="XL" value={compact(vas.xl?.value||0)} sub={`${num.format(vas.xl?.qty||0)} qty`}/><Metric label="Indosat" value={compact(vas.indosat?.value||0)} sub={`${num.format(vas.indosat?.qty||0)} qty`}/></div></>:null}
  {mode==="monthly"&&inc?<><div className="m238m-section-head"><h2>Estimated Incentive</h2><span>{compact(inc.total)}</span></div><div className="m238m-grid"><Metric label="MacBook" value={compact(inc.mac)}/><Metric label="iPhone" value={compact(inc.iphone)}/><Metric label="iPad" value={compact(inc.ipad)}/><Metric label="Watch" value={compact(inc.watch)}/><Metric label="Accessories" value={compact(inc.accessories)}/><Metric label="Qoala" value={compact(inc.qoala)}/></div></>:null}
 </div>
}

function ReportScreen({mode,setMode,weekly,weeklySummary,feedback,cx,staff}:{mode:ReportMode;setMode:(v:ReportMode)=>void;weekly:Weekly|null;weeklySummary:DailySummary|null;feedback:Feedback|null;cx:Cx|null;staff:Staff[]}){
 return <div className="m238m-stack m238m-enter"><Segmented value={mode} onChange={setMode} items={[{value:"weekly",label:"Weekly"},{value:"feedback",label:"Feedback"},{value:"cx",label:"CX"}]}/>{mode==="weekly"?(weekly?<WeeklyView weekly={weekly} summary={weeklySummary}/>:<Skeleton/>):mode==="feedback"?(feedback?<FeedbackView data={feedback} staff={staff}/>:<Skeleton/>):(cx?<CxView data={cx} staff={staff}/>:<Skeleton/>)}</div>
}
function WeeklyView({weekly,summary}:{weekly:Weekly;summary:DailySummary|null}){
 const sum=(obj:Record<string,{qty:number;amount:number}>={})=>Object.values(obj).reduce((a,x)=>({qty:a.qty+x.qty,amount:a.amount+x.amount}),{qty:0,amount:0});
 const total=(side:Weekly["b"])=>sum(side.scheme),cur=total(weekly.b),prev=total(weekly.a),growth=prev.amount?(cur.amount-prev.amount)/prev.amount*100:0;
 const lobs=[["iPhone","IPHONE"],["iPad","IPAD"],["MacBook","MAC"],["Apple Watch","APPLE WATCH"],["AirPods","AIRPODS"]] as const;
 const schemes=[...new Set([...Object.keys(weekly.a.scheme||{}),...Object.keys(weekly.b.scheme||{})])];
 const vasKeys=[...new Set([...Object.keys(weekly.a.vas||{}),...Object.keys(weekly.b.vas||{})])];
 const delta=(a:number,b:number)=>a?((b-a)/a)*100:(b?100:0);
 return <>
  <Card className="m238m-hero compact"><span>Weekly Sales • {weekly.labelB}</span><strong>{compact(cur.amount)}</strong><p>{growth>=0?"+":""}{pct(growth)} vs {weekly.labelA} • Qty {num.format(cur.qty)}</p>{summary?.dailyRows?.length?<TouchLineChart rows={summary.dailyRows}/>:null}</Card>
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

function MoreScreen({dark,toggleDark,onAction}:{dark:boolean;toggleDark:()=>void;onAction:(action:string)=>void}){
 const groups=[["Performance",[[WalletCards,"Incentive","incentive"],[CreditCard,"BNPL & Trade-In","bnpl"],[Target,"Target & Program","target"]]],["Operational",[[PackageSearch,"SOH","soh"],[Box,"Stokan","stokan"],[Activity,"Mading","mading"],[ClipboardCheck,"Checklist Store","checklist"],[Users,"NPS / CX & Member","cx"],[TrendingUp,"Aktivitas Toko","activity"]]],["Appearance",[[Settings,"Versi Tampilan HP","mobile-view"],[dark?Sun:Moon,dark?"Light Mode":"Dark Mode","theme"]]],["Account",[[Settings,"Settings","settings"],[LogOut,"Logout","logout"]]]] as const;
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
.m238m-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.m238m-metric{padding:14px;min-height:92px}.m238m-metric>span{display:block;font-size:12px;color:var(--m-secondary);font-weight:700}.m238m-metric>strong{display:block;font-size:22px;letter-spacing:-.025em;margin-top:7px}.m238m-metric>small{display:block;font-size:11px;color:var(--m-secondary);margin-top:4px}
.m238m-insight{display:flex;gap:12px;align-items:flex-start}.m238m-insight>svg{color:#ff9f0a;flex:none}.m238m-insight span{font-weight:850;font-size:14px;color:var(--m-text)}.m238m-insight p{margin:4px 0 0;font-size:13px;color:var(--m-secondary);line-height:1.45}
.m238m-section-head{display:flex;align-items:center;justify-content:space-between;padding:8px 2px 0}.m238m-section-head h2{font-size:19px;margin:0}.m238m-section-head span{font-size:12px;color:var(--m-secondary)}
.m238m-segment{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;padding:3px;background:var(--m-surface2);border-radius:12px;gap:2px}.m238m-segment button{border:0;background:transparent;color:var(--m-secondary);border-radius:10px;padding:9px 10px;font-size:13px;font-weight:800}.m238m-segment button.active{background:var(--m-surface);color:var(--m-text);box-shadow:0 1px 4px rgba(0,0,0,.08)}
.m238m-list{display:flex;flex-direction:column;gap:8px}.m238m-staff-row{display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:11px;width:100%;border:0;background:var(--m-surface);color:var(--m-text);padding:13px;border-radius:16px;text-align:left}.m238m-avatar{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#dbeafe,#c4b5fd);color:#345; font-weight:900;font-size:13px}.dark .m238m-avatar{background:linear-gradient(145deg,#203450,#352d60);color:#eaf2ff}.m238m-avatar.big{width:58px;height:58px;font-size:17px}.m238m-staff-main>div{display:flex;justify-content:space-between;gap:8px;margin-bottom:7px}.m238m-staff-main strong{font-size:14px}.m238m-staff-main b{font-size:13px}.m238m-staff-main small{display:block;color:var(--m-secondary);font-size:10px;margin-top:4px}
.m238m-chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}.m238m-chips button{white-space:nowrap;border:0;border-radius:999px;background:var(--m-surface);color:var(--m-secondary);padding:9px 13px;font-size:12px;font-weight:800}.m238m-chips button.active{background:var(--m-text);color:var(--m-bg)}
.m238m-profile{display:flex;align-items:center;gap:12px}.m238m-profile h2{font-size:20px;margin:0}.m238m-profile p{font-size:12px;color:var(--m-secondary);margin:2px 0 0}
.m238m-copy-card strong{font-size:14px}.m238m-copy-card p{font-size:13px;line-height:1.48;color:var(--m-secondary);margin:7px 0}.m238m-copy-card small{display:block;margin-top:10px;color:var(--m-blue);font-weight:800}.m238m-copy-head{display:flex;justify-content:space-between;gap:10px}.m238m-copy-head span{font-size:11px;color:var(--m-secondary)}
.m238m-chart{width:100%;height:86px;margin-top:13px;color:rgba(255,255,255,.92)}.m238m-lob-list{display:flex;flex-direction:column;gap:15px}.m238m-lob-list>div>div:first-child{display:flex;justify-content:space-between;margin-bottom:7px}.m238m-lob-list strong{font-size:14px}.m238m-lob-list span{font-size:12px;font-weight:800}.m238m-lob-list small{display:block;color:var(--m-secondary);font-size:10px;margin-top:5px}
.m238m-more{display:flex;flex-direction:column;gap:18px}.m238m-more h3{font-size:12px;color:var(--m-secondary);margin:0 0 7px 12px}.m238m-more section>div{background:var(--m-surface);border-radius:16px;overflow:hidden}.m238m-more button{width:100%;height:52px;border:0;border-bottom:1px solid var(--m-line);display:flex;align-items:center;justify-content:space-between;background:transparent;color:var(--m-text);padding:0 14px}.m238m-more button:last-child{border-bottom:0}.m238m-more button>span{display:flex;align-items:center;gap:11px;font-size:14px;font-weight:700}.m238m-more button i{width:29px;height:29px;border-radius:8px;background:var(--m-surface2);display:grid;place-items:center;color:var(--m-blue)}
.m238m-home-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:3px;background:var(--m-surface2);border-radius:13px;position:sticky;top:65px;z-index:18}.m238m-home-tabs button{min-height:44px;border:0;border-radius:10px;background:transparent;color:var(--m-secondary);font-size:11px;line-height:1.15;font-weight:800;padding:7px 5px}.m238m-home-tabs button.active{background:var(--m-blue);color:#fff;box-shadow:0 4px 12px rgba(10,132,255,.2)}.m238m-hero-button{display:block;width:100%;border:0;background:transparent;padding:0;text-align:left;color:inherit}.m238m-hero-button .m238m-card:active{transform:scale(.985)}.m238m-home-hero>strong{font-size:30px;white-space:nowrap}.m238m-hero-title{display:flex;align-items:center;justify-content:space-between}.m238m-hero-title>span{font-size:13px;opacity:.82;font-weight:800}.m238m-hero-title svg{opacity:.8}.m238m-hero-meta{display:grid!important;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px!important}.m238m-hero-meta span{display:flex;flex-direction:column;gap:2px;opacity:.9}.m238m-hero-meta b{font-size:14px}.m238m-point-card{display:flex;align-items:center;justify-content:space-between;gap:12px}.m238m-point-card>div:first-child{display:flex;flex-direction:column}.m238m-point-card>div:first-child span{font-size:11px;color:var(--m-secondary);font-weight:800}.m238m-point-card>div:first-child strong{font-size:24px}.m238m-point-breakdown{display:flex;flex-direction:column;gap:3px;text-align:right;font-size:10px;color:var(--m-secondary)}.m238m-ytd-hero{padding:16px}.m238m-section-head.compact{padding:0 0 12px}.m238m-section-head.compact h2{font-size:16px}.m238m-compare-pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}.m238m-compare-pair>div{background:var(--m-surface2);border-radius:14px;padding:13px}.m238m-compare-pair span{display:block;font-size:11px;color:var(--m-secondary);font-weight:700}.m238m-compare-pair strong{display:block;margin-top:5px;font-size:18px;letter-spacing:-.02em;word-break:break-word}.m238m-growth-pill{display:inline-flex;margin-top:11px;padding:6px 9px;border-radius:999px;font-size:11px;font-weight:850}.m238m-growth-pill.positive,.positive{color:#168347}.m238m-growth-pill.negative,.negative{color:#d92d20}.m238m-growth-pill.positive{background:#e8f8ef}.m238m-growth-pill.negative{background:#fff0ef}.dark .m238m-growth-pill.positive{background:rgba(38,183,94,.15)}.dark .m238m-growth-pill.negative{background:rgba(255,69,58,.15)}.m238m-compare-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.m238m-compare-row>div{display:flex;flex-direction:column;gap:3px}.m238m-compare-row>div:last-child{text-align:right}.m238m-compare-row strong,.m238m-compare-row b{font-size:13px}.m238m-compare-row span,.m238m-compare-row small{font-size:10px;color:var(--m-secondary)}.m238m-detail-sales{background:linear-gradient(145deg,#0a66d6,#5241b8);color:#fff}.m238m-detail-sales>span,.m238m-detail-sales>small{display:block;opacity:.78;font-size:11px}.m238m-detail-sales>strong{display:block;font-size:25px;margin:5px 0}.m238m-detail-list{background:var(--m-surface);border-radius:16px;overflow:hidden}.m238m-detail-list>div{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:12px 14px;border-bottom:1px solid var(--m-line)}.m238m-detail-list>div:last-child{border-bottom:0}.m238m-detail-list span{font-size:12px;color:var(--m-secondary)}.m238m-detail-list b{font-size:12px;text-align:right;max-width:62%;word-break:break-word}
.m238m-bottom{--m238m-active-index:0;position:fixed;z-index:40;left:14px;right:14px;bottom:calc(10px + env(safe-area-inset-bottom));height:64px;display:grid;grid-template-columns:repeat(5,1fr);align-items:center;padding:0 6px;background:color-mix(in srgb,var(--m-surface) 94%,transparent);backdrop-filter:blur(26px);-webkit-backdrop-filter:blur(26px);border:1px solid color-mix(in srgb,var(--m-line) 85%,transparent);border-radius:21px;box-shadow:0 12px 30px rgba(15,23,42,.12);isolation:isolate;overflow:visible}.m238m-liquid-bubble{position:absolute;z-index:1;top:-17px;left:calc((var(--m238m-active-index) + .5) * 20%);width:48px;height:48px;border-radius:50%;background:color-mix(in srgb,var(--m-blue) 12%,var(--m-surface));border:5px solid var(--m-bg);box-shadow:0 9px 22px rgba(15,23,42,.12);transform:translateX(-50%);transition:left 420ms cubic-bezier(.22,1,.36,1),transform 220ms ease,box-shadow 220ms ease}.m238m-liquid-bubble:before,.m238m-liquid-bubble:after{content:"";position:absolute;top:12px;width:13px;height:13px;background:transparent}.m238m-liquid-bubble:before{left:-16px;border-top-right-radius:13px;box-shadow:5px -5px 0 0 var(--m-bg)}.m238m-liquid-bubble:after{right:-16px;border-top-left-radius:13px;box-shadow:-5px -5px 0 0 var(--m-bg)}.m238m-bottom button{position:relative;z-index:2;height:58px;border:0;background:transparent;color:var(--m-secondary);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-radius:15px;font-size:10px;font-weight:800;transition:color 260ms ease,transform 360ms cubic-bezier(.22,1,.36,1)}.m238m-nav-icon{width:32px;height:28px;display:grid;place-items:center;transition:transform 420ms cubic-bezier(.22,1,.36,1),color 260ms ease}.m238m-nav-label{max-height:14px;opacity:.78;transform:translateY(0);transition:opacity 220ms ease,transform 320ms cubic-bezier(.22,1,.36,1),max-height 220ms ease}.m238m-bottom button.active{color:var(--m-text);transform:none}.m238m-bottom button.active .m238m-nav-icon{transform:translateY(-19px) scale(1.04);color:var(--m-blue)}.m238m-bottom button.active .m238m-nav-label{opacity:1;transform:translateY(-2px);color:var(--m-blue)}.m238m-bottom button:not(.active) .m238m-nav-label{opacity:0;max-height:0;transform:translateY(5px)}.m238m-bottom button:active .m238m-nav-icon{transform:scale(.9)}.m238m-bottom button.active:active .m238m-nav-icon{transform:translateY(-18px) scale(.92)}.dark .m238m-bottom{background:color-mix(in srgb,var(--m-surface) 92%,transparent);border-color:color-mix(in srgb,var(--m-line) 90%,transparent);box-shadow:0 14px 34px rgba(0,0,0,.28)}.dark .m238m-liquid-bubble{background:color-mix(in srgb,var(--m-blue) 18%,var(--m-surface))}.dark .m238m-bottom button.active .m238m-nav-label{color:var(--m-blue)}
.m238m-sheet-layer{position:fixed;z-index:100;inset:0;background:rgba(0,0,0,.28);backdrop-filter:blur(3px);display:flex;align-items:flex-end}.m238m-sheet{width:100%;max-height:86dvh;overflow:auto;background:var(--m-bg);color:var(--m-text);border-radius:24px 24px 0 0;padding:8px 16px calc(16px + env(safe-area-inset-bottom));animation:m238mSheet var(--motion-slow) cubic-bezier(.22,1,.36,1);will-change:transform}.m238m-handle-button{display:block;width:100%;height:24px;border:0;background:transparent;padding:8px 0}.m238m-handle{display:block;width:38px;height:5px;border-radius:999px;background:rgba(127,127,127,.35);margin:0 auto}.m238m-sheet-head{display:flex;justify-content:space-between;align-items:center;padding:7px 2px 12px}.m238m-sheet-head h3{font-size:19px;margin:0}.m238m-sheet-head button{border:0;background:var(--m-surface2);color:var(--m-text);width:32px;height:32px;border-radius:50%;display:grid;place-items:center}
.m238m-form-card{display:flex;flex-direction:column;gap:10px}.m238m-form-card select,.m238m-form-card textarea,.m238m-form-card input{width:100%;border:0;background:var(--m-surface2);color:var(--m-text);border-radius:12px;padding:12px;font:inherit;outline:none}.m238m-form-card textarea{min-height:104px;resize:vertical}.m238m-form-card small{color:var(--m-secondary)}.m238m-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.m238m-sheet-list{background:var(--m-surface);border-radius:16px;overflow:hidden;margin:12px 0}.m238m-sheet-list button{display:flex;justify-content:space-between;width:100%;padding:14px;border:0;border-bottom:1px solid var(--m-line);background:transparent;color:var(--m-text);font-weight:700;text-align:left}.m238m-sheet-list button.selected{color:var(--m-blue)}.m238m-primary,.m238m-cancel{width:100%;border:0;border-radius:14px;padding:14px;font-size:15px;font-weight:850}.m238m-primary{background:var(--m-blue);color:white}.m238m-cancel{background:var(--m-surface);color:var(--m-text);margin-top:10px}.m238m-action-list{background:var(--m-surface);border-radius:16px;overflow:hidden}.m238m-action-list button{width:100%;height:54px;display:flex;align-items:center;gap:12px;border:0;border-bottom:1px solid var(--m-line);background:transparent;color:var(--m-text);font-size:14px;font-weight:750;padding:0 15px}.m238m-action-list button svg{width:19px;color:var(--m-blue)}
.m238m-input-icon{display:flex;align-items:center;gap:8px;background:var(--m-surface2);border-radius:12px;padding:0 10px}.m238m-input-icon input{background:transparent!important;padding-left:0!important}.m238m-stock-row,.m238m-rank-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.m238m-stock-row>div:first-child{min-width:0;display:flex;flex-direction:column}.m238m-stock-row>div:first-child strong{font-size:13px}.m238m-stock-row>div:first-child span,.m238m-rank-row span{font-size:11px;color:var(--m-secondary)}.m238m-stock-row>div:last-child{text-align:right;display:flex;flex-direction:column}.m238m-stock-row>div:last-child b{font-size:18px}.m238m-stock-row>div:last-child small{font-size:10px;color:var(--m-secondary)}.m238m-kpi-detail>span{font-size:11px;color:var(--m-secondary);font-weight:800}.m238m-kpi-detail>strong{display:block;font-size:18px;margin:5px 0}.m238m-kpi-detail>p,.m238m-kpi-detail>small{font-size:10px;color:var(--m-secondary)}.m238m-kpi-detail .m238m-progress{margin:7px 0}.m238m-rank-row>div{display:flex;flex-direction:column;flex:1}.m238m-form-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.m238m-form-actions .m238m-cancel{margin-top:0}.m238m-primary{display:flex;align-items:center;justify-content:center;gap:7px}.m238m-cancel.danger,.m238m-row-actions .danger{color:#ff453a}.m238m-row-actions{display:flex;gap:8px;margin-top:10px}.m238m-row-actions button,.m238m-inline-link{border:0;background:var(--m-surface2);color:var(--m-text);border-radius:10px;padding:8px 10px;font-size:11px;font-weight:800;display:inline-flex;align-items:center;gap:5px}.m238m-inline-link{margin-top:10px;color:var(--m-blue)}.m238m-mini-list{margin-top:10px;display:flex;flex-direction:column;gap:6px}.m238m-mini-list>div{display:grid;grid-template-columns:1fr auto;gap:3px 10px;background:var(--m-surface2);padding:9px;border-radius:10px}.m238m-mini-list span,.m238m-mini-list b{font-size:11px}.m238m-mini-list small{grid-column:1/-1;font-size:10px;color:var(--m-secondary)}.m238m-target-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}.m238m-target-row>div{display:flex;flex-direction:column}.m238m-target-row>div span{font-size:10px;color:var(--m-secondary)}.m238m-target-row label{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--m-secondary)}.m238m-target-row input[type="number"]{width:76px;border:0;background:var(--m-surface2);color:var(--m-text);border-radius:9px;padding:8px;text-align:right}.m238m-toggle-row{grid-column:1/-1;justify-content:flex-end}.m238m-notice{display:block;text-align:center;color:var(--m-secondary)}.m238m-empty{text-align:center;color:var(--m-secondary);font-size:12px}.m238m-op-row .m238m-copy-head>div{display:flex;flex-direction:column}.m238m-op-row .m238m-copy-head span{font-size:10px;color:var(--m-secondary)}.m238m-view-picker{display:grid;grid-template-columns:1fr 1fr;gap:8px}.m238m-view-picker button{border:0;border-radius:14px;background:var(--m-surface);color:var(--m-text);padding:14px 10px;font-weight:850}.m238m-view-picker button.active{background:var(--m-blue);color:white}.m238m-touch-chart{margin-top:12px}.m238m-touch-chart svg{width:100%;height:94px;color:rgba(255,255,255,.95);overflow:visible}.m238m-touch-chart circle{fill:rgba(255,255,255,.72);stroke:none;cursor:pointer}.m238m-touch-chart circle.active{fill:white}.m238m-chart-tip{display:flex;align-items:center;justify-content:space-between;font-size:11px;margin-bottom:3px}.m238m-chart-tip span{color:white!important;opacity:.9}.m238m-chart-days{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:2px}.m238m-chart-days button{border:0;background:transparent;color:rgba(255,255,255,.65);font-size:10px;font-weight:800;padding:4px 0;border-radius:8px}.m238m-chart-days button.active{background:rgba(255,255,255,.14);color:white}.m238m-skeleton{background:linear-gradient(90deg,var(--m-surface2),color-mix(in srgb,var(--m-surface) 75%,var(--m-surface2)),var(--m-surface2));background-size:200% 100%;animation:m238mShimmer 1.2s infinite;border-radius:18px}.m238m-skeleton.hero{height:190px;border-radius:22px}.m238m-skeleton.tile{height:92px}.m238m-skeleton.list{height:70px}.m238m-refreshing{display:flex;align-items:center;gap:6px;justify-content:center;font-size:11px;color:var(--m-secondary);padding-bottom:7px}.m238m-warning-card{background:color-mix(in srgb,#ff9f0a 12%,var(--m-surface));border:1px solid color-mix(in srgb,#ff9f0a 30%,transparent)}.m238m-success-card{background:color-mix(in srgb,#30d158 10%,var(--m-surface));border:1px solid color-mix(in srgb,#30d158 24%,transparent)}.m238m-error{color:#ff453a;font-size:13px}.spin{animation:m238mSpin .8s linear infinite}.m238m-enter{animation:m238mEnter var(--motion-normal) cubic-bezier(.22,1,.36,1)}
@keyframes m238mEnter{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}@keyframes m238mSheet{from{transform:translateY(100%)}to{transform:none}}@keyframes m238mShimmer{to{background-position:-200% 0}}@keyframes m238mSpin{to{transform:rotate(360deg)}}
@media(min-width:769px){.m238m-app{display:none!important}}
`;

