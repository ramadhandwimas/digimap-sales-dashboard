"use client";

import {useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from "react";
import {
  Activity,CalendarDays,ChevronRight,ClipboardCheck,Copy,CreditCard,FileDown,
  FileSpreadsheet,Home,Lightbulb,LogOut,MessageCircle,MoreHorizontal,Moon,
  RefreshCw,Settings,Share2,Sun,Target,TrendingUp,Users,WalletCards,X
} from "lucide-react";
import {exportReportPdf,exportReportPng,exportReportXlsx} from "@/lib/dashboard-export";

type Tab="home"|"sales"|"team"|"report"|"more";
type SalesMode="daily"|"summary";
type ReportMode="weekly"|"feedback"|"cx";
type SheetName="period"|"share"|"staff"|"more"|null;
type Staff={id:string;name:string;position?:string;status?:string;amount:number;device:number;accessories:number;vas:number;qty:number;invoices:number;upt:number;atv:number;target?:number;achievement?:number|null;targets?:{amount:number;device:number;accessories:number;vas:number};incentive?:{total:number};vasDetail?:{qoala?:{qty:number;value:number}}};
type Overview={period:string;label:string;target:{amount:number;device:number;accessories:number;vas:number};summary:{amount:number;device:number;accessories:number;vas:number;invoices:number;qty:number;upt:number;atv:number;achievement:number;gap:number;status:string;estimate:{amount:number};point:{total:number}};staff:Staff[];daily:{date:string;amount:number}[];lfl?:{growth:number|null};team:{total:number;productive:number;needPush:number}};
type Traffic={total:number;daily?:{date:string;traffic:number}[]};
type Daily={date:string;staff:Staff[];total:{amount:number;target:number;accessories:number;accTarget:number;vas:number;vasTarget:number;qty:number;invoices:number;upt:number}};
type DailySummary={summary:{totalSales:number;target:number;achievementPct:number;transaction:number;invoice:number;qty:number;upt:number;atv:number;traffic:number;cvr:number;growthPct:number|null};breakdown:{device:number;accessories:number;vas:number};dailyRows?:unknown[]};
type Weekly={labelA:string;labelB:string;periodB:{start:string;end:string};a:{scheme:Record<string,{qty:number;amount:number}>;lob:Record<string,Record<string,{qty:number;amount:number}>>};b:{scheme:Record<string,{qty:number;amount:number}>;lob:Record<string,Record<string,{qty:number;amount:number}>>};targets:{lob:Record<string,number>;grandTotal:number};analysis:Record<string,{review:string;actionPlan:string;target:number;achievement:number;gap:number}>;feedbackSummary?:string};
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
  if(!open)return null;
  return <div className="m238m-sheet-layer" onClick={onClose}><div className="m238m-sheet" onClick={e=>e.stopPropagation()}><div className="m238m-handle"/><div className="m238m-sheet-head"><h3>{title}</h3><button onClick={onClose}><X size={18}/></button></div>{children}</div></div>
}

export default function MobileDashboardApp(){
  const[tab,setTab]=useState<Tab>("home"),[period,setPeriod]=useState(periodNow()),[draftPeriod,setDraftPeriod]=useState(periodNow()),[sheet,setSheet]=useState<SheetName>(null),[moreKind,setMoreKind]=useState(""),[moreData,setMoreData]=useState<any>(null),[moreBusy,setMoreBusy]=useState(false);
  const[overview,setOverview]=useState<Overview|null>(null),[traffic,setTraffic]=useState<Traffic|null>(null),[daily,setDaily]=useState<Daily|null>(null),[summary,setSummary]=useState<DailySummary|null>(null),[weekly,setWeekly]=useState<Weekly|null>(null),[weeklySummary,setWeeklySummary]=useState<DailySummary|null>(null),[feedback,setFeedback]=useState<Feedback|null>(null),[cx,setCx]=useState<Cx|null>(null),[staffDetail,setStaffDetail]=useState<Staff|null>(null);
  const[salesMode,setSalesMode]=useState<SalesMode>("daily"),[reportMode,setReportMode]=useState<ReportMode>("weekly"),[teamFilter,setTeamFilter]=useState("all"),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[error,setError]=useState(""),[dark,setDark]=useState(false);
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
  const loadWeekly=useCallback(async(force=false)=>{const w=await cachedJson<Weekly>("/api/weekly-stable",180000,force);setWeekly(w);if(w.periodB?.start&&w.periodB?.end){const s=await cachedJson<DailySummary>(`/api/daily-summary-fast?from=${w.periodB.start}&to=${w.periodB.end}&mode=range`,180000,force);setWeeklySummary(s)}},[]);
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

  const openStaff=async(staff:Staff)=>{setStaffDetail(staff);setSheet("staff");try{const d=await cachedJson<{staff:Staff[]}>(`/api/staff-performance-month?period=${period}`,180000);const full=d.staff.find(x=>x.id===staff.id);if(full)setStaffDetail(full)}catch{}};
  const toggleDark=()=>{const next=!dark;setDark(next);localStorage.setItem("m238-theme",next?"dark":"light");document.documentElement.classList.toggle("dark",next)};
  const transaction=overview?.summary.invoices||0,trafficValue=traffic?.total||0,cvr=trafficValue?transaction/trafficValue*100:0,achievement=overview?.target.amount?((overview.summary.amount/overview.target.amount)*100):0;
  const team=useMemo(()=>{const rows=overview?.staff||[];if(teamFilter==="top")return rows.filter(x=>x.status==="Productive");if(teamFilter==="attention")return rows.filter(x=>x.status!=="Productive");return rows},[overview,teamFilter]);

  const applyPeriod=()=>{setPeriod(draftPeriod);setDaily(null);setSummary(null);setWeekly(null);setFeedback(null);setCx(null);setSheet(null)};
  const shareText=`M238 PIM 2 • ${overview?.label||monthLabel(period)}\nSales ${money.format(overview?.summary.amount||0)}\nAchievement ${pct(achievement)}\nUPT ${(overview?.summary.upt||0).toFixed(1)}`;
  const doShare=async(kind:string)=>{if(kind==="wa")window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`,"_blank");else if(kind==="copy")await navigator.clipboard.writeText(shareText);else if(rootRef.current&&kind==="png")await exportReportPng(rootRef.current,`M238-${period}`);else if(rootRef.current&&kind==="pdf")await exportReportPdf(rootRef.current,`M238-${period}`);else if(kind==="xlsx"&&overview)await exportReportXlsx([{name:"Overview",rows:[["Periode",overview.label],["Sales",overview.summary.amount],["Target",overview.target.amount],["Achievement",achievement],["UPT",overview.summary.upt],[],["Staff","Sales","Achievement"],...overview.staff.map(s=>[s.name,s.amount,s.achievement??0])]}],`M238-${period}`);setSheet(null)};

  const handleMore=async(action:string)=>{
    if(action==="cx"){setTab("report");setReportMode("cx");return}
    if(action==="activity"){setTab("sales");setSalesMode("summary");return}
    setMoreKind(action);setMoreData(null);setSheet("more");
    if(!["incentive","bnpl","target"].includes(action))return;
    setMoreBusy(true);
    try{
      if(action==="incentive"){
        const from=`${period}-01`,to=period===periodNow()?today():`${period}-${String(new Date(Number(period.slice(0,4)),Number(period.slice(5,7)),0).getDate()).padStart(2,"0")}`;
        setMoreData(await cachedJson<any>(`/api/incentive-range?from=${from}&to=${to}`,180000));
      }else if(action==="bnpl"){
        setMoreData(await cachedJson<any>(`/api/bnpl?period=${period}`,180000));
      }else{
        setMoreData(await cachedJson<any>(`/api/lob-target-focus?mode=month&month=${period}`,180000));
      }
    }catch(e){setMoreData({error:e instanceof Error?e.message:"Gagal memuat data"})}
    finally{setMoreBusy(false)}
  };

  const touchMove=(e:React.TouchEvent)=>{if(touchStart.current==null||window.scrollY>0)return;const delta=e.touches[0].clientY-touchStart.current;if(delta>90&&!refreshing){touchStart.current=null;void refresh()}};

  return <div ref={rootRef} className="m238m-app" onTouchStart={e=>{if(window.scrollY===0)touchStart.current=e.touches[0].clientY}} onTouchMove={touchMove} onTouchEnd={()=>{touchStart.current=null}}>
    <header className="m238m-header">
      <div><span>M238 Dashboard</span><strong>PIM 2</strong></div>
      <div className="m238m-header-actions"><button onClick={()=>setSheet("share")} aria-label="Share"><Share2 size={19}/></button><button onClick={()=>void refresh()} aria-label="Refresh"><RefreshCw size={19} className={refreshing?"spin":""}/></button></div>
    </header>
    <main className="m238m-content">
      <button className="m238m-period" onClick={()=>{setDraftPeriod(period);setSheet("period")}}><CalendarDays size={15}/><span>{monthLabel(period)}</span><small>Week {retailWeek()}</small><ChevronRight size={15}/></button>
      {refreshing?<div className="m238m-refreshing"><RefreshCw size={14} className="spin"/> Memperbarui data…</div>:null}
      {error?<Card className="m238m-error">{error}</Card>:null}
      {loading&&!overview?<Skeleton/>:null}
      {!loading&&overview&&tab==="home"?<HomeScreen overview={overview} traffic={trafficValue} cvr={cvr} achievement={achievement}/>:null}
      {tab==="sales"?<SalesScreen mode={salesMode} setMode={setSalesMode} daily={daily} summary={summary} onStaff={openStaff}/>:null}
      {tab==="team"?<TeamScreen rows={team} filter={teamFilter} setFilter={setTeamFilter} onStaff={openStaff}/>:null}
      {tab==="report"?<ReportScreen mode={reportMode} setMode={setReportMode} weekly={weekly} weeklySummary={weeklySummary} feedback={feedback} cx={cx} staff={overview?.staff||[]}/>:null}
      {tab==="more"?<MoreScreen dark={dark} toggleDark={toggleDark} onAction={handleMore}/>:null}
    </main>

    <nav className="m238m-bottom">
      {[
        ["home","Home",Home],["sales","Sales",TrendingUp],["team","Team",Users],["report","Report",FileDown],["more","More",MoreHorizontal]
      ].map(([key,label,Icon])=><button key={String(key)} onClick={()=>setTab(key as Tab)} className={tab===key?"active":""}><Icon size={21}/><span>{String(label)}</span></button>)}
    </nav>

    <Sheet open={sheet==="period"} onClose={()=>setSheet(null)} title="Pilih Periode">
      <Segmented value={"month"} onChange={()=>{}} items={[{value:"month",label:"Month"}]}/>
      <div className="m238m-sheet-list">{months.map(p=><button key={p} onClick={()=>setDraftPeriod(p)} className={draftPeriod===p?"selected":""}><span>{monthLabel(p)}</span>{draftPeriod===p?<strong>✓</strong>:null}</button>)}</div>
      <button className="m238m-primary" onClick={applyPeriod}>Terapkan</button>
    </Sheet>

    <Sheet open={sheet==="share"} onClose={()=>setSheet(null)} title="Share Report">
      <div className="m238m-action-list">
        <button onClick={()=>void doShare("wa")}><MessageCircle/>WhatsApp</button>
        <button onClick={()=>void doShare("copy")}><Copy/>Copy Summary</button>
        <button onClick={()=>void doShare("png")}><Share2/>Download Picture</button>
        <button onClick={()=>void doShare("pdf")}><FileDown/>Download PDF</button>
        <button onClick={()=>void doShare("xlsx")}><FileSpreadsheet/>Download Excel</button>
      </div>
      <button className="m238m-cancel" onClick={()=>setSheet(null)}>Cancel</button>
    </Sheet>

    <Sheet open={sheet==="staff"} onClose={()=>setSheet(null)} title={staffDetail?.name||"Staff Detail"}>
      {staffDetail?<StaffDetail staff={staffDetail}/>:<Skeleton/>}
    </Sheet>
    <Sheet open={sheet==="more"} onClose={()=>setSheet(null)} title={moreKind==="incentive"?"Estimasi Incentive":moreKind==="bnpl"?"BNPL & Trade-In":moreKind==="target"?"Target & Program":moreKind==="checklist"?"Checklist Store":"Detail"}>
      {moreBusy?<Skeleton/>:<MoreDetail kind={moreKind} data={moreData}/>} 
    </Sheet>
    <style jsx global>{mobileCss}</style>
  </div>
}

function HomeScreen({overview,traffic,cvr,achievement}:{overview:Overview;traffic:number;cvr:number;achievement:number}){
 const insight=achievement>=100?"Target bulan ini sudah tercapai. Pertahankan momentum penjualan.":achievement>=80?"Achievement sudah mendekati target. Fokuskan opportunity yang siap closing.":"Achievement masih perlu didorong. Prioritaskan opportunity dan follow-up yang aktif.";
 return <div className="m238m-stack m238m-enter">
  <Card className="m238m-hero"><span>Total Sales</span><strong>{compact(overview.summary.amount)}</strong><p>{pct(achievement)} dari Target</p><Progress value={achievement}/><div><span>Target</span><b>{compact(overview.target.amount)}</b></div></Card>
  <div className="m238m-grid"><Metric label="Traffic" value={num.format(traffic)}/><Metric label="Transaction" value={num.format(overview.summary.invoices)}/><Metric label="CVR" value={pct(cvr)}/><Metric label="UPT" value={overview.summary.upt.toFixed(1)}/></div>
  <Card className="m238m-insight"><Lightbulb size={18}/><div><span>Insight Hari Ini</span><p>{insight}</p></div></Card>
  <div className="m238m-section-head"><h2>Store Performance</h2><span>{overview.summary.status}</span></div>
  <div className="m238m-grid"><Metric label="Device" value={compact(overview.summary.device)}/><Metric label="ACC" value={compact(overview.summary.accessories)}/><Metric label="VAS" value={compact(overview.summary.vas)}/><Metric label="Estimate" value={compact(overview.summary.estimate.amount)}/></div>
 </div>
}

function SalesScreen({mode,setMode,daily,summary,onStaff}:{mode:SalesMode;setMode:(v:SalesMode)=>void;daily:Daily|null;summary:DailySummary|null;onStaff:(s:Staff)=>void}){
 const ach=daily?.total.target?daily.total.amount/daily.total.target*100:0;
 return <div className="m238m-stack m238m-enter"><Segmented value={mode} onChange={setMode} items={[{value:"daily",label:"Daily"},{value:"summary",label:"Summary"}]}/>{mode==="daily"?(daily?<><Card className="m238m-hero compact"><span>Sales Today</span><strong>{compact(daily.total.amount)}</strong><p>Target {compact(daily.total.target)} • {pct(ach)}</p><Progress value={ach}/></Card><div className="m238m-grid"><Metric label="Device" value={compact(Math.max(0,daily.total.amount-daily.total.accessories-daily.total.vas))}/><Metric label="ACC" value={compact(daily.total.accessories)}/><Metric label="VAS" value={compact(daily.total.vas)}/><Metric label="UPT" value={daily.total.upt.toFixed(1)}/></div><div className="m238m-section-head"><h2>Staff Performance Today</h2></div><div className="m238m-list">{daily.staff.map(s=><StaffRow key={s.id} staff={s} onClick={()=>onStaff(s)}/>)}</div></>:<Skeleton/>):(summary?<><Card className="m238m-hero compact"><span>Daily Summary</span><strong>{compact(summary.summary.totalSales)}</strong><p>{pct(summary.summary.achievementPct)} dari Target</p><Progress value={summary.summary.achievementPct}/></Card><div className="m238m-grid"><Metric label="Target" value={compact(summary.summary.target)}/><Metric label="Traffic" value={num.format(summary.summary.traffic)}/><Metric label="Transaction" value={num.format(summary.summary.transaction)}/><Metric label="CVR" value={pct(summary.summary.cvr)}/><Metric label="ATV" value={compact(summary.summary.atv)}/><Metric label="UPT" value={summary.summary.upt.toFixed(1)}/></div><div className="m238m-section-head"><h2>Breakdown</h2></div><div className="m238m-grid"><Metric label="Device" value={compact(summary.breakdown.device)}/><Metric label="ACC" value={compact(summary.breakdown.accessories)}/><Metric label="VAS" value={compact(summary.breakdown.vas)}/></div></>:<Skeleton/>)}</div>
}

function StaffRow({staff,onClick}:{staff:Staff;onClick:()=>void}){const target=staff.targets?.amount||staff.target||0,a=target?staff.amount/target*100:staff.achievement||0;return <button className="m238m-staff-row" onClick={onClick}><div className="m238m-avatar">{initials(staff.name)}</div><div className="m238m-staff-main"><div><strong>{staff.name}</strong><b>{compact(staff.amount)}</b></div><Progress value={a}/><small>{pct(a)}</small></div><ChevronRight size={17}/></button>}
function TeamScreen({rows,filter,setFilter,onStaff}:{rows:Staff[];filter:string;setFilter:(v:string)=>void;onStaff:(s:Staff)=>void}){return <div className="m238m-stack m238m-enter"><div className="m238m-chips">{[["all","All"],["top","Top Performer"],["attention","Perlu Perhatian"]].map(([k,l])=><button key={k} className={filter===k?"active":""} onClick={()=>setFilter(k)}>{l}</button>)}</div><div className="m238m-list">{rows.map(s=><StaffRow key={s.id} staff={s} onClick={()=>onStaff(s)}/>)}</div></div>}
function StaffDetail({staff}:{staff:Staff}){const target=staff.targets?.amount||staff.target||0,a=target?staff.amount/target*100:staff.achievement||0;return <div className="m238m-stack"><div className="m238m-profile"><div className="m238m-avatar big">{initials(staff.name)}</div><div><h2>{staff.name}</h2><p>{staff.position||"Staff M238"}</p></div></div><Card className="m238m-hero compact"><span>Sales</span><strong>{compact(staff.amount)}</strong><p>Target {compact(target)} • {pct(a)}</p><Progress value={a}/></Card><div className="m238m-grid"><Metric label="Device" value={compact(staff.device||0)}/><Metric label="ACC" value={compact(staff.accessories||0)}/><Metric label="VAS" value={compact(staff.vas||0)}/><Metric label="UPT" value={(staff.upt||0).toFixed(1)}/><Metric label="ATV" value={compact(staff.atv||0)}/><Metric label="Invoice" value={num.format(staff.invoices||0)}/><Metric label="Qoala" value={compact(staff.vasDetail?.qoala?.value||0)}/><Metric label="Incentive" value={compact(staff.incentive?.total||0)}/></div></div>}

function ReportScreen({mode,setMode,weekly,weeklySummary,feedback,cx,staff}:{mode:ReportMode;setMode:(v:ReportMode)=>void;weekly:Weekly|null;weeklySummary:DailySummary|null;feedback:Feedback|null;cx:Cx|null;staff:Staff[]}){
 return <div className="m238m-stack m238m-enter"><Segmented value={mode} onChange={setMode} items={[{value:"weekly",label:"Weekly"},{value:"feedback",label:"Feedback"},{value:"cx",label:"CX"}]}/>{mode==="weekly"?(weekly?<WeeklyView weekly={weekly} summary={weeklySummary}/>:<Skeleton/>):mode==="feedback"?(feedback?<FeedbackView data={feedback} staff={staff}/>:<Skeleton/>):(cx?<CxView data={cx} staff={staff}/>:<Skeleton/>)}</div>
}
function WeeklyView({weekly,summary}:{weekly:Weekly;summary:DailySummary|null}){const total=(s:Weekly["b"])=>Object.values(s.scheme||{}).reduce((a,x)=>a+x.amount,0),cur=total(weekly.b),prev=total(weekly.a),growth=prev?(cur-prev)/prev*100:0;const lobs=[["iPhone","IPHONE"],["iPad","IPAD"],["Mac","MAC"],["Watch","APPLE WATCH"],["AirPods","AIRPODS"]] as const;return <><Card className="m238m-hero compact"><span>Weekly Sales • {weekly.labelB}</span><strong>{compact(cur)}</strong><p>{growth>=0?"+":""}{pct(growth)} vs {weekly.labelA}</p><MiniLine/></Card>{summary?<div className="m238m-grid"><Metric label="Traffic" value={num.format(summary.summary.traffic)}/><Metric label="CVR" value={pct(summary.summary.cvr)}/><Metric label="Transaction" value={num.format(summary.summary.transaction)}/><Metric label="UPT" value={summary.summary.upt.toFixed(1)}/></div>:null}<div className="m238m-section-head"><h2>LOB Performance</h2></div><Card><div className="m238m-lob-list">{lobs.map(([name,key])=>{const current=Object.values(weekly.b.lob?.[key]||{}).reduce((a,x)=>a+x.qty,0),target=weekly.targets?.lob?.[key]||0,a=target?current/target*100:0;return <div key={key}><div><strong>{name}</strong><span>{pct(a)}</span></div><Progress value={a}/><small>{current} / {target||"—"} unit</small></div>})}</div></Card><div className="m238m-section-head"><h2>Reason & Action Plan</h2></div>{Object.entries(weekly.analysis||{}).map(([k,v])=><Card key={k} className="m238m-copy-card"><strong>{k==="APPLE WATCH"?"Apple Watch":k.charAt(0)+k.slice(1).toLowerCase()}</strong><p>{v.review}</p><small>Action Plan</small><p>{v.actionPlan}</p></Card>)}</>}
function MiniLine(){return <svg className="m238m-chart" viewBox="0 0 320 82" preserveAspectRatio="none" aria-hidden="true"><path d="M4 64 C40 54 58 66 91 45 S149 48 180 31 S239 44 316 14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>}
function FeedbackView({data,staff}:{data:Feedback;staff:Staff[]}){
 const[rows,setRows]=useState(data.rows),[staffId,setStaffId]=useState(staff[0]?.id||""),[category,setCategory]=useState("external"),[text,setText]=useState(""),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 useEffect(()=>setRows(data.rows),[data]);
 const submit=async()=>{const person=staff.find(x=>x.id===staffId);if(!person||!text.trim())return;setBusy(true);setMsg("");try{const r=await fetch("/api/feedback",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({date:today(),staffId,name:person.name,category,feedback:text.trim()})}),j=await r.json();if(!r.ok)throw new Error(j.error||"Gagal menyimpan feedback");setRows(v=>[...v,{date:j.date,staffId:j.staffId,name:j.name,category:j.category,raw:j.raw,professional:j.professional}]);setText("");setMsg("Feedback tersimpan.")}catch(e){setMsg(e instanceof Error?e.message:"Gagal menyimpan feedback")}finally{setBusy(false)}};
 return <><Card className="m238m-form-card"><strong>Tambah Feedback</strong><select value={staffId} onChange={e=>setStaffId(e.target.value)}>{staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><select value={category} onChange={e=>setCategory(e.target.value)}><option value="external">Faktor eksternal</option><option value="promo">Promo</option><option value="bnpl">BNPL</option><option value="performance">Performa staff</option><option value="stock">Ketersediaan stok</option></select><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Tuliskan reason / kondisi di floor…"/><button className="m238m-primary" disabled={busy||!text.trim()} onClick={()=>void submit()}>{busy?"Menyimpan…":"Simpan Feedback"}</button>{msg?<small>{msg}</small>:null}</Card><div className="m238m-section-head"><h2>Feedback Team</h2><span>{rows.length} data</span></div><div className="m238m-list">{rows.length?rows.slice().reverse().map((r,i)=><Card key={`${r.date}-${r.staffId}-${i}`} className="m238m-copy-card"><div className="m238m-copy-head"><strong>{r.name}</strong><span>{r.date}</span></div><p>{r.professional||r.raw}</p></Card>):<Card>Belum ada feedback pada periode ini.</Card>}</div></>
}
function CxView({data,staff}:{data:Cx;staff:Staff[]}){
 const[rows,setRows]=useState(data.rows),[staffId,setStaffId]=useState(staff[0]?.id||""),[cxInput,setCxInput]=useState(""),[memberInput,setMemberInput]=useState("");
 useEffect(()=>setRows(data.rows),[data]);
 const cx=rows.reduce((a,r)=>a+r.cx,0),member=rows.reduce((a,r)=>a+r.member,0);
 const save=async()=>{const person=staff.find(x=>x.id===staffId);if(!person)return;const r=await fetch("/api/cx-member",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({date:today(),staffId,name:person.name,cx:Number(cxInput)||0,member:Number(memberInput)||0})}),j=await r.json();if(r.ok){setRows(v=>[...v,{date:j.date,staffId:j.staffId,name:j.name,cx:j.cx,member:j.member}]);setCxInput("");setMemberInput("")}};
 return <><div className="m238m-grid"><Metric label="CX" value={num.format(cx)}/><Metric label="New Member" value={num.format(member)}/></div><Card className="m238m-form-card"><strong>Input CX & Member</strong><select value={staffId} onChange={e=>setStaffId(e.target.value)}>{staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><div className="m238m-form-grid"><input inputMode="numeric" value={cxInput} onChange={e=>setCxInput(e.target.value)} placeholder="CX"/><input inputMode="numeric" value={memberInput} onChange={e=>setMemberInput(e.target.value)} placeholder="New Member"/></div><button className="m238m-primary" onClick={()=>void save()}>Simpan</button></Card><div className="m238m-list">{rows.slice().reverse().map((r,i)=><Card key={`${r.date}-${r.staffId}-${i}`} className="m238m-copy-card"><div className="m238m-copy-head"><strong>{r.name}</strong><span>{r.date}</span></div><p>CX {num.format(r.cx)} • New Member {num.format(r.member)}</p></Card>)}</div></>
}

function MoreScreen({dark,toggleDark,onAction}:{dark:boolean;toggleDark:()=>void;onAction:(action:string)=>void}){
 const groups=[["Performance",[[WalletCards,"Incentive","incentive"],[CreditCard,"BNPL","bnpl"],[Target,"Target & Program","target"]]],["Operational",[[ClipboardCheck,"Checklist Store","checklist"],[Activity,"NPS / CX & Member","cx"],[TrendingUp,"Aktivitas Toko","activity"]]],["Appearance",[[dark?Sun:Moon,dark?"Light Mode":"Dark Mode","theme"]]],["Account",[[Settings,"Settings","settings"],[LogOut,"Logout","logout"]]]] as const;
 return <div className="m238m-more">{groups.map(([title,items])=><section key={title}><h3>{title}</h3><div>{items.map(([Icon,label,action])=><button key={label} onClick={()=>{if(action==="theme")toggleDark();else if(action==="logout")void fetch("/api/auth/logout",{method:"POST"}).finally(()=>{window.location.href="/login"});else onAction(action)}}><span><i><Icon size={18}/></i>{label}</span><ChevronRight size={17}/></button>)}</div></section>)}</div>
}

function MoreDetail({kind,data}:{kind:string;data:any}){
 if(kind==="checklist")return <div className="m238m-action-list"><button onClick={()=>window.open("https://forms.cloud.microsoft/pages/responsepage.aspx?id=iAw5Rakbn0eYpYaKADRxVqklIyFb72JDrV7GtVMqEcNUMUdNM1Q1VU4zTU9PTlpVTERHVUpZUk9BQS4u&route=shorturl","_blank")}><ClipboardCheck/>Checklist SPV</button><button onClick={()=>window.open("https://forms.cloud.microsoft/pages/responsepage.aspx?id=iAw5Rakbn0eYpYaKADRxVqklIyFb72JDrV7GtVMqEcNUQVpVV1hBVTdHTDVDWVlMRkE0V0lRVDQySS4u&route=shorturl","_blank")}><ClipboardCheck/>Checklist Staff</button></div>;
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
.m238m-bottom{position:fixed;z-index:40;left:0;right:0;bottom:0;display:grid;grid-template-columns:repeat(5,1fr);padding:7px 8px calc(7px + env(safe-area-inset-bottom));background:color-mix(in srgb,var(--m-surface) 90%,transparent);backdrop-filter:blur(22px);border-top:1px solid var(--m-line)}.m238m-bottom button{height:48px;border:0;background:transparent;color:var(--m-secondary);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border-radius:12px;font-size:10px;font-weight:700}.m238m-bottom button.active{color:var(--m-blue)}.m238m-bottom button:active{transform:scale(.96);transition:transform var(--motion-fast)}
.m238m-sheet-layer{position:fixed;z-index:100;inset:0;background:rgba(0,0,0,.28);backdrop-filter:blur(3px);display:flex;align-items:flex-end}.m238m-sheet{width:100%;max-height:86dvh;overflow:auto;background:var(--m-bg);color:var(--m-text);border-radius:24px 24px 0 0;padding:8px 16px calc(16px + env(safe-area-inset-bottom));animation:m238mSheet var(--motion-slow) cubic-bezier(.22,1,.36,1)}.m238m-handle{width:38px;height:5px;border-radius:999px;background:rgba(127,127,127,.35);margin:0 auto 6px}.m238m-sheet-head{display:flex;justify-content:space-between;align-items:center;padding:7px 2px 12px}.m238m-sheet-head h3{font-size:19px;margin:0}.m238m-sheet-head button{border:0;background:var(--m-surface2);color:var(--m-text);width:32px;height:32px;border-radius:50%;display:grid;place-items:center}
.m238m-form-card{display:flex;flex-direction:column;gap:10px}.m238m-form-card select,.m238m-form-card textarea,.m238m-form-card input{width:100%;border:0;background:var(--m-surface2);color:var(--m-text);border-radius:12px;padding:12px;font:inherit;outline:none}.m238m-form-card textarea{min-height:104px;resize:vertical}.m238m-form-card small{color:var(--m-secondary)}.m238m-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.m238m-sheet-list{background:var(--m-surface);border-radius:16px;overflow:hidden;margin:12px 0}.m238m-sheet-list button{display:flex;justify-content:space-between;width:100%;padding:14px;border:0;border-bottom:1px solid var(--m-line);background:transparent;color:var(--m-text);font-weight:700;text-align:left}.m238m-sheet-list button.selected{color:var(--m-blue)}.m238m-primary,.m238m-cancel{width:100%;border:0;border-radius:14px;padding:14px;font-size:15px;font-weight:850}.m238m-primary{background:var(--m-blue);color:white}.m238m-cancel{background:var(--m-surface);color:var(--m-text);margin-top:10px}.m238m-action-list{background:var(--m-surface);border-radius:16px;overflow:hidden}.m238m-action-list button{width:100%;height:54px;display:flex;align-items:center;gap:12px;border:0;border-bottom:1px solid var(--m-line);background:transparent;color:var(--m-text);font-size:14px;font-weight:750;padding:0 15px}.m238m-action-list button svg{width:19px;color:var(--m-blue)}
.m238m-skeleton{background:linear-gradient(90deg,var(--m-surface2),color-mix(in srgb,var(--m-surface) 75%,var(--m-surface2)),var(--m-surface2));background-size:200% 100%;animation:m238mShimmer 1.2s infinite;border-radius:18px}.m238m-skeleton.hero{height:190px;border-radius:22px}.m238m-skeleton.tile{height:92px}.m238m-skeleton.list{height:70px}.m238m-refreshing{display:flex;align-items:center;gap:6px;justify-content:center;font-size:11px;color:var(--m-secondary);padding-bottom:7px}.m238m-error{color:#ff453a;font-size:13px}.spin{animation:m238mSpin .8s linear infinite}.m238m-enter{animation:m238mEnter var(--motion-normal) cubic-bezier(.22,1,.36,1)}
@keyframes m238mEnter{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}@keyframes m238mSheet{from{transform:translateY(100%)}to{transform:none}}@keyframes m238mShimmer{to{background-position:-200% 0}}@keyframes m238mSpin{to{transform:rotate(360deg)}}
@media(min-width:769px){.m238m-app{display:none!important}}
`;

