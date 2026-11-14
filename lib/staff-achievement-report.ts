import {saleKind,type SalesRow} from "./m238-sales-sanitize";
import type {TargetRecovery,RecoveryStaff} from "./target-recovery";
export const REPORT_CATEGORIES=["device","accessories","vas"] as const;
export const REPORT_LABELS={device:"Device",accessories:"ACC",vas:"VAS"};
export type ReportCategory=typeof REPORT_CATEGORIES[number];
type Values=Record<ReportCategory,number>;
export type AchievementPerson={id:string;name:string;actual:Values;targets:Values};
// "daily" retains the existing MTD API contract; "day" is one selected date.
export type StaffAchievementMode="day"|"daily"|"weekly";
export function staffAchievementRange(mode:StaffAchievementMode,date:string,today:string){
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date)))return{from:"",to:""};
 if(mode==="day")return{from:date,to:date};
 if(mode==="daily")return{from:`${date.slice(0,7)}-01`,to:date};
 const stamp=Date.parse(date),from=new Date(stamp-new Date(stamp).getUTCDay()*86400000).toISOString().slice(0,10),end=new Date(Date.parse(from)+6*86400000).toISOString().slice(0,10);return{from,to:end<today?end:today};
}
export const staffAchievementModeLabel=(mode:StaffAchievementMode)=>mode==="day"?"Harian":mode==="daily"?"MTD":"Mingguan";
export type AchievementReport={from:string;to:string;mode:StaffAchievementMode;staff:AchievementPerson[];total:AchievementPerson;warnings:string[];source:string;generatedAt:string;recovery?:TargetRecovery;recoveryStaff?:RecoveryStaff[]};
export type DailyAchievementInput={date:string;staff:{id:string;name:string;position?:string;amount:number;device?:number;accessories:number;vas:number;targets?:{amount?:number;device?:number;accessories?:number;vas?:number}}[]};
const empty=():Values=>({device:0,accessories:0,vas:0});
const excluded=(name:string,position="")=>/SUPERVISOR|\bSPV\b|ONLINE|digimap\.co\.id/i.test(`${name} ${position}`);
export function buildStaffAchievementReport(roster:{id:string;name:string;position:string}[],days:DailyAchievementInput[],mode:StaffAchievementMode,compiledSales?:SalesRow[]){
 const people=new Map<string,AchievementPerson>(),blocked=new Set(roster.filter(p=>excluded(p.name,p.position)).map(p=>p.id));
 const person=(id:string,name:string)=>{let p=people.get(id);if(!p){p={id,name,actual:empty(),targets:empty()};people.set(id,p)}return p};
 for(const p of roster)if(!excluded(p.name,p.position))person(p.id,p.name);
 for(const day of days)for(const row of day.staff){
  if(!row.id||blocked.has(row.id)||excluded(row.name,row.position))continue;
  const p=person(row.id,row.name),t=row.targets;
  p.targets.device+=t?.device??Math.max(0,Number(t?.amount||0)-Number(t?.accessories||0)-Number(t?.vas||0));
  p.targets.accessories+=Number(t?.accessories||0);p.targets.vas+=Number(t?.vas||0);
  if(mode!=="weekly"&&!compiledSales){p.actual.device+=row.device??(row.amount-row.accessories-row.vas);p.actual.accessories+=row.accessories;p.actual.vas+=row.vas}
 }
 for(const row of compiledSales||[]){if(row.store!=="M238"||blocked.has(row.id)||excluded(row.name))continue;const kind=saleKind(row);if(kind==="other")continue;person(row.id,row.name).actual[kind]+=row.amount}
 const staff=[...people.values()].sort((a,b)=>Object.values(b.actual).reduce((s,n)=>s+n,0)-Object.values(a.actual).reduce((s,n)=>s+n,0)||a.name.localeCompare(b.name));
 const total:AchievementPerson={id:"TOTAL",name:"TOTAL STAFF",actual:empty(),targets:empty()};for(const p of staff)for(const key of REPORT_CATEGORIES){total.actual[key]+=p.actual[key];total.targets[key]+=p.targets[key]}
 return {staff,total};
}
const money=(n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
export function achievementText(p:AchievementPerson,key:ReportCategory){const target=p.targets[key],actual=p.actual[key];return {actual:money(actual),target:target>0?money(target):"Tanpa target",achievement:target>0?`${new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(actual/target*100)}%`:"—",gap:target>0?money(Math.max(0,target-actual)):"—"}}
export function staffAchievementText(data:AchievementReport,category:ReportCategory|"all",content:"achievement"|"recovery"="achievement"){
 const keys=category==="all"?REPORT_CATEGORIES:[category];
 const person=(p:AchievementPerson)=>`*${p.name}*\n`+keys.map(key=>{const v=achievementText(p,key);return `${REPORT_LABELS[key]}: ${v.actual}\nTarget ${v.target} · Ach ${v.achievement}\nGap ${v.gap}`}).join("\n");
 const recovery:string[]=[],next=data.recovery?.days[0];
 if(data.recovery){recovery.push(`*Rencana Pengejaran*\nCutoff ${data.recovery.cutoff||"belum tersedia"}`);if(data.recovery.status==="READY"&&next){recovery.push(`Berlaku ${next.date}`, ...keys.map(key=>`${REPORT_LABELS[key]} toko: awal ${money(next.base[key])} · Penyesuaian ${money(next.adjustment[key])} · Target baru ${money(next.target[key])}`));for(const p of data.recoveryStaff||[])recovery.push(`*${p.name} · Target ${next.date}*\n`+keys.map(key=>`${REPORT_LABELS[key]}: awal ${money(p.base[key])} · Penyesuaian ${money(p.target[key]-p.base[key])} · Baru ${money(p.target[key])}`).join("\n"))}else recovery.push(data.recovery.message)}
 return [`*M238 · DIGIMAP PIM 2*`,content==="achievement"?`*Pencapaian Staff ${staffAchievementModeLabel(data.mode)}*`:"*Target Staff Berikutnya*",data.mode==="day"?data.to:`${data.from} s.d. ${data.to}`,category==="all"?"Device · ACC · VAS":REPORT_LABELS[category],...(content==="achievement"?[...data.staff.map(person),person(data.total)]:recovery.length?recovery:["Rencana target berikutnya belum tersedia."]),...data.warnings.map(w=>`Catatan: ${w}`),data.source,"Target periode lalu tetap memakai rencana awal. Pengejaran hanya untuk sisa hari bulan yang sama; tidak menambah target bulanan."].join("\n\n");
}
