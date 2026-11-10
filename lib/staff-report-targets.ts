import {allocateRupiah,monthlyDailyTargets} from "./daily-target-plan";
import {readWeeklySchedule,scheduleUnavailable} from "./weekly-schedule-reader";
import {isoDate} from "./m238-sales-sanitize";
import type {DailyAchievementInput} from "./staff-achievement-report";
type Roster={id:string;name:string;position:string;share:number};
export function allocatedReportTargets(config:unknown[][],weekly:unknown[][],snapshots:unknown[][],dates:string[]){
 const roster:Roster[]=config.slice(27,55).filter(r=>String(r[7]).trim().toUpperCase()==="M238"&&r[8]&&r[9]).map(r=>{const v=Number(r[11])||0;return{id:String(r[8]).trim(),name:String(r[9]).trim(),position:String(r[10]||""),share:v>1?v/100:Math.max(0,v)}});
 const shares=new Map(roster.map(p=>[p.id,p.share])),plans=new Map<string,ReturnType<typeof monthlyDailyTargets>>(),warnings:string[]=[],days:DailyAchievementInput[]=[];
 for(const date of dates){
  const period=date.slice(0,7);if(!plans.has(period)){const plan=monthlyDailyTargets(config,period);plans.set(period,plan);if(!plan.configured)warnings.push(`Target bulanan ${period} belum diisi; target sementara mengikuti nominal harian Config.`)}
  const target=plans.get(period)!.days.find(p=>p.date===date)!;
  let scheduled=readWeeklySchedule(weekly,date,roster);if(!scheduled.length)scheduled=snapshots.filter(r=>isoDate(r[0])===date).map(r=>({id:String(r[1]),name:String(r[2]),position:String(r[3]),status:String(r[5]||"IN")}));
  const active=scheduled.filter(p=>!scheduleUnavailable(p.status)&&!/SUPERVISOR|\bSPV\b|ONLINE/i.test(p.position));
  if(!active.length){warnings.push(`${date}: Jadwal staff aktif belum tersedia; target staff tanggal ini belum dialokasikan.`);days.push({date,staff:[]});continue}
  const configured=active.map(p=>shares.get(p.id)||0).filter(v=>v>0),fallback=configured.length?configured.reduce((a,b)=>a+b,0)/configured.length:1,weights=active.map(p=>shares.get(p.id)||fallback);
  const device=allocateRupiah(target.device,weights),acc=allocateRupiah(target.accessories,weights),vas=allocateRupiah(target.vas,weights);
  days.push({date,staff:active.map((p,i)=>({...p,amount:0,accessories:0,vas:0,targets:{amount:device[i]+acc[i]+vas[i],device:device[i],accessories:acc[i],vas:vas[i]}}))});
 }
 return{roster,days,warnings};
}
