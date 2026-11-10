import {allocateRupiah,monthlyDailyTargets,type PlannedTarget} from "./daily-target-plan";
import {saleKind,type SalesRow} from "./m238-sales-sanitize";
export type RecoveryDay={date:string;base:PlannedTarget;adjustment:PlannedTarget;target:PlannedTarget};
export type RecoveryStaff={id:string;name:string;base:PlannedTarget;target:PlannedTarget};
export type TargetRecovery={period:string;cutoff:string;startDate:string;status:"READY"|"WAITING_CUTOFF"|"CLOSED"|"NO_TARGET";message:string;goal:PlannedTarget;actual:PlannedTarget;gap:PlannedTarget;days:RecoveryDay[]};
const empty=():PlannedTarget=>({amount:0,device:0,accessories:0,vas:0});
const keys=["device","accessories","vas"] as const;
const total=(v:PlannedTarget)=>{v.amount=v.device+v.accessories+v.vas;return v};
const plusDay=(date:string,days:number)=>new Date(Date.parse(date)+days*86400000).toISOString().slice(0,10);
export function buildTargetRecovery(config:unknown[][],sales:SalesRow[],today:string):TargetRecovery{
 const period=today.slice(0,7),plan=monthlyDailyTargets(config,period),rows=sales.filter(r=>r.store==="M238"&&r.date.startsWith(period)&&r.date<=today),cutoff=rows.map(r=>r.date).sort().at(-1)||"",yesterday=plusDay(today,-1);
 const actual=empty();for(const row of rows){const key=saleKind(row);if(key!=="other")actual[key]+=row.amount}total(actual);
 const expected=empty();for(const day of plan.days.filter(d=>cutoff&&d.date<=cutoff))for(const key of keys)expected[key]+=day[key];total(expected);
 const gap=empty();for(const key of keys)gap[key]=expected[key]-actual[key];total(gap);
 const waiting=(!cutoff||cutoff<yesterday)&&today.slice(8)!=="01",startDate=cutoff&&cutoff>=today?plusDay(cutoff,1):today;
 const remaining=plan.days.filter(day=>day.date>=startDate),days:RecoveryDay[]=remaining.map(day=>({date:day.date,base:{amount:day.amount,device:day.device,accessories:day.accessories,vas:day.vas},adjustment:empty(),target:{amount:day.amount,device:day.device,accessories:day.accessories,vas:day.vas}}));
 const status=!plan.configured?"NO_TARGET":!remaining.length?"CLOSED":waiting?"WAITING_CUTOFF":"READY";
 if(status==="READY"){
  for(const key of keys){const need=Math.max(0,Math.round(plan.monthly[key]-actual[key])),allocated=allocateRupiah(need,remaining.map(day=>day[key]));days.forEach((day,i)=>{day.target[key]=allocated[i];day.adjustment[key]=allocated[i]-day.base[key]})}
  for(const day of days){total(day.target);total(day.adjustment)}
 }
 const message=status==="WAITING_CUTOFF"?`Menunggu cutoff sampai ${yesterday}. Target pengejaran belum diterapkan agar data yang belum masuk tidak dianggap sebagai kekurangan penjualan.`:status==="CLOSED"?"Periode bulan ini selesai. Gap tidak dipindahkan ke bulan berikutnya.":status==="NO_TARGET"?"Isi target bulanan di Config untuk menghitung pengejaran.":"Kekurangan atau surplus setelah cutoff dibagi ke sisa hari bulan ini mengikuti bobot hari. Target historis tetap memakai rencana awal.";
 return{period,cutoff,startDate,status,message,goal:plan.monthly,actual,gap,days};
}
