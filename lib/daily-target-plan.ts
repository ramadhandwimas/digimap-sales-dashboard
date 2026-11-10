export type PlannedTarget={amount:number;device:number;accessories:number;vas:number};
const n=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/[^0-9.-]/g,""))||0;
const dayName=(date:string)=>new Intl.DateTimeFormat("id-ID",{weekday:"long",timeZone:"UTC"}).format(new Date(`${date}T00:00:00Z`)).toLowerCase();
export function allocateRupiah(total:number,weights:number[]){
 const sum=weights.reduce((a,b)=>a+Math.max(0,b),0),effective=sum?weights.map(x=>Math.max(0,x)):weights.map(()=>1),denominator=sum||weights.length;
 const exact=effective.map(w=>Math.round(total)*w/denominator),rounded=exact.map(Math.floor),order=exact.map((x,i)=>({i,f:x-rounded[i]})).sort((a,b)=>b.f-a.f||a.i-b.i);
 for(let left=Math.round(total)-rounded.reduce((a,b)=>a+b,0),i=0;i<left;i++)rounded[order[i%order.length].i]++;
 return rounded;
}
export function monthlyDailyTargets(config:unknown[][],period:string){
 const label=new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(`${period}-01T00:00:00Z`)).toLowerCase(),row=config.find(r=>String(r[16]||"").trim().toLowerCase()===label);
 const monthly={amount:n(row?.[17]),device:n(row?.[18]),accessories:n(row?.[19]),vas:n(row?.[20])};
 const count=new Date(Date.UTC(Number(period.slice(0,4)),Number(period.slice(5,7)),0)).getUTCDate(),dates=Array.from({length:count},(_,i)=>`${period}-${String(i+1).padStart(2,"0")}`);
 const raw=dates.map(date=>{const r=config.find(r=>String(r[22]||"").trim().toLowerCase()===dayName(date));return{amount:Math.max(0,n(r?.[23])),accessories:Math.max(0,n(r?.[24])),vas:Math.max(0,n(r?.[25]))}});
 if(monthly.amount<=0)return{configured:false,monthly,days:dates.map((date,i)=>({date,...raw[i],device:Math.max(0,raw[i].amount-raw[i].accessories-raw[i].vas)}))};
 if(monthly.accessories+monthly.vas>monthly.amount)throw Error(`Target ACC + VAS ${period} melebihi target Value bulanan.`);
 const amounts=allocateRupiah(monthly.amount,raw.map(r=>r.amount)),acc=allocateRupiah(monthly.accessories,raw.map(r=>r.accessories||r.amount)),vas=allocateRupiah(monthly.vas,raw.map(r=>r.vas||r.amount));
 const days=dates.map((date,i)=>({date,amount:amounts[i],accessories:acc[i],vas:vas[i],device:amounts[i]-acc[i]-vas[i]}));
 if(days.some(d=>d.device<0))throw Error(`Bobot harian ACC/VAS ${period} tidak sesuai dengan bobot Value. Periksa Config W:Z.`);
 return{configured:true,monthly:{...monthly,device:monthly.amount-monthly.accessories-monthly.vas},days};
}
export function dailyTargetFromConfig(config:unknown[][],date:string):PlannedTarget{
 const plan=monthlyDailyTargets(config,date.slice(0,7));return plan.days.find(d=>d.date===date)||{amount:0,device:0,accessories:0,vas:0};
}
