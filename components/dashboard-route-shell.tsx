"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {ChartNoAxesCombined,ClipboardList,Cloud,CreditCard,LayoutDashboard,PackageSearch,Settings,TrendingUp,Users,WalletCards} from "lucide-react";

const dashboardItems=[
 {href:"/",label:"Overview",icon:LayoutDashboard},
 {href:"/?view=daily",label:"Daily Sales",icon:TrendingUp},
 {href:"/daily-summary",label:"Daily Summary",icon:ClipboardList},
 {href:"/?view=staff",label:"Staff Performance",icon:Users},
 {href:"/?view=incentive",label:"Est. Incentive",icon:WalletCards},
 {href:"/bnpl",label:"BNPL & Trade-In",icon:CreditCard},
 {href:"/soh",label:"SOH",icon:PackageSearch},
];
const reportingItems=[
 {href:"/?view=feedback",label:"Feedback",icon:Users},
 {href:"/cx",label:"NPS/CX & Member",icon:Cloud},
 {href:"/weekly",label:"Weekly Report",icon:ChartNoAxesCombined},
];

export default function DashboardRouteShell({children}:{children:React.ReactNode}){
 const path=usePathname();
 const item=(x:{href:string;label:string;icon:any})=>{const Icon=x.icon,active=x.href!=="/"&&path.startsWith(x.href);return <Link key={x.label} href={x.href} prefetch className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold ${active?"bg-white/20 text-white":"text-white/80 hover:bg-white/10"}`}><Icon className="size-3.5"/>{x.label}</Link>};
 return <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-900 dark:text-slate-100 lg:grid lg:grid-cols-[236px_minmax(0,1fr)]">
  <aside className="border-b bg-gradient-to-b from-slate-800 to-blue-900 text-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0">
   <div className="p-5"><div className="flex items-center gap-3 border-b border-white/15 pb-5"><div className="grid size-11 place-items-center rounded-xl bg-white/15 font-black">M238</div><div><p className="font-extrabold">Digimap PIM 2</p><p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/70">Performance Hub</p></div></div></div>
   <nav className="space-y-3 px-3 pb-4">
    <div className="rounded-xl bg-white/5 p-1"><div className="flex items-center gap-2 px-3 py-3 text-sm font-black"><LayoutDashboard className="size-4"/>Dashboard</div><div className="space-y-1 lg:pl-3">{dashboardItems.map(item)}</div></div>
    <div className="rounded-xl bg-white/5 p-1"><div className="flex items-center gap-2 px-3 py-3 text-sm font-black"><ChartNoAxesCombined className="size-4"/>Reporting</div><div className="space-y-1 lg:pl-3">{reportingItems.map(item)}</div></div>
    <Link href="/?view=settings" className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm font-black hover:bg-white/10"><Settings className="size-4"/>System</Link>
   </nav>
  </aside>
  <main className="min-w-0">
   <header className="sticky top-0 z-30 border-b bg-white/90 px-4 py-3 backdrop-blur-xl dark:bg-slate-950/90 sm:px-7"><div className="flex items-center gap-2 text-sm"><span className="text-slate-400">M238</span><span>›</span><b>{path==="/bnpl"?"BNPL & Trade-In":path==="/soh"?"SOH":path==="/weekly"?"Weekly Report":path==="/cx"?"NPS/CX & Member":"Daily Summary"}</b></div></header>
   <div className="[&>main>a:first-child]:hidden [&>main]:min-h-0 [&>main]:bg-transparent [&>main]:pt-5">{children}</div>
  </main>
 </div>
}
