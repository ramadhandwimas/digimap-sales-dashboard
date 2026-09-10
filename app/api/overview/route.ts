import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const STORE="M238";
const n=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/[^0-9.-]/g,""))||0;
const s=(v:unknown)=>String(v??"").trim();
const up=(v:unknown)=>s(v).toUpperCase();
function iso(v:unknown){if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);const x=s(v);if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);const m=x.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:""}
function jakartaToday(){return new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date())}
function monthLabel(period:string){return new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric",timeZone:"Asia/Jakarta"}).format(new Date(`${period}-01T00:00:00Z`))}
function valid(r:unknown[]){return up(r[12])!=="VOUCHER"&&!up(r[5]).includes("VOUCHER")}
function kind(r:unknown[]){const scheme=up(r[12]),text=`${up(r[6])} ${up(r[9])} ${up(r[5])}`;if(scheme==="VAS")return"vas";if(scheme==="ACCESSORIES")return"accessories";if(scheme==="DEVICES")return"device";if(/IPHONE|IPAD|MAC|APPLE WATCH|AIRPODS/.test(text))return"device";return"other"}
function scoped(rows:unknown[][],period?:string){return rows.filter(r=>{const d=iso(r[0]);if(!d||!valid(r))return false;if(period&&!d.startsWith(period))return false;return up(r[15])===STORE})}
function archiveScoped(rows:unknown[][]){const hasStore=rows.some(r=>up(r[15])===STORE);return rows.filter(r=>{const d=iso(r[0]);if(!d||!d.startsWith("2025-")||!valid(r))return false;return hasStore?up(r[15])===STORE:true})}
function sumByKind(rows:unknown[][],k:string){return rows.filter(r=>kind(r)===k).reduce((a,r)=>a+n(r[8]),0)}
function sumAmount(rows:unknown[][]){return rows.reduce((a,r)=>a+n(r[8]),0)}
function monthSeries(rows:unknown[][],year:number){const map=new Map<string,number>();for(const r of rows){const d=iso(r[0]);if(!d.startsWith(`${year}-`))continue;const p=d.slice(0,7);map.set(p,(map.get(p)||0)+n(r[8]))}return Array.from({length:12},(_,i)=>{const period=`${year}-${String(i+1).padStart(2,"0")}`;return{period,amount:map.get(period)||0}})}

export async function GET(req:NextRequest){
 const period=req.nextUrl.searchParams.get("period")||jakartaToday().slice(0,7);
 if(!/^2026-\d{2}$/.test(period))return NextResponse.json({error:"Period harus format YYYY-MM"},{status:400});
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const[rows2026,rows2025,config]=await getSheetRanges(ID,["'Data Copas'!A2:S50000","'Data Copas Archive 2025'!A2:S32755","Config!A1:AZ120"],email,key);
  const monthRows=scoped(rows2026||[],period),all2026=scoped(rows2026||[]),all2025=archiveScoped(rows2025||[]);
  const label=monthLabel(period).toLowerCase(),targetRow=(config||[]).find(r=>s(r[16]).toLowerCase()===label),target={amount:n(targetRow?.[17]),device:n(targetRow?.[18]),accessories:n(targetRow?.[19]),vas:n(targetRow?.[20])};
  const shareById=new Map<string,number>();for(const r of (config||[]).slice(27,55)){const id=s(r[8]);if(id)shareById.set(id,n(r[11]))}
  const byStaff=new Map<string,unknown[][]>();for(const r of monthRows){const id=s(r[1]);if(!id)continue;const arr=byStaff.get(id)||[];arr.push(r);byStaff.set(id,arr)}
  const staff=[...byStaff.entries()].map(([id,rr])=>{const names=rr.map(r=>s(r[2])).filter(Boolean),name=names.at(-1)||id,invoices=new Set(rr.map(r=>s(r[3])).filter(Boolean)),qty=rr.reduce((a,r)=>a+n(r[7]),0),amount=sumAmount(rr),device=sumByKind(rr,"device"),accessories=sumByKind(rr,"accessories"),vas=sumByKind(rr,"vas"),share=Math.max(0,shareById.get(id)||0),staffTarget=target.amount*share,achievement=staffTarget?amount/staffTarget*100:null;let status="Productive";if(achievement!==null)status=achievement>=100?"Productive":achievement>=80?"Need Push":"Low Activity";return{id,name,amount,device,accessories,vas,qty,invoices:invoices.size,upt:invoices.size?qty/invoices.size:0,atv:invoices.size?amount/invoices.size:0,target:staffTarget,achievement,gap:staffTarget?Math.max(0,staffTarget-amount):0,status}}).sort((a,b)=>b.amount-a.amount);
  const invoices=new Set(monthRows.map(r=>s(r[3])).filter(Boolean)),qty=monthRows.reduce((a,r)=>a+n(r[7]),0),amount=sumAmount(monthRows),device=sumByKind(monthRows,"device"),accessories=sumByKind(monthRows,"accessories"),vas=sumByKind(monthRows,"vas");
  const dates=[...new Set(monthRows.map(r=>iso(r[0])).filter(Boolean))].sort(),daily=dates.map(date=>({date,amount:sumAmount(monthRows.filter(r=>iso(r[0])===date))}));
  const today=jakartaToday(),current=today.slice(0,7),dim=new Date(Number(period.slice(0,4)),Number(period.slice(5,7)),0).getDate(),elapsed=period<current?dim:period>current?0:Math.min(Number(today.slice(8,10)),dim),pace=dim?elapsed/dim*100:0,achievement=target.amount?amount/target.amount*100:0,gap=Math.max(0,target.amount-amount),status=target.amount?(achievement>=100?"Achieve":achievement>=pace?"On Track":"Need Push"):"Target belum ada";
  const series2025=monthSeries(all2025,2025),series2026=monthSeries(all2026,2026),currentMonth=Number(current.slice(5,7)),compare=series2025.map((x,i)=>{const y=series2026[i],started=i+1<=currentMonth||y.amount>0,diff=started?y.amount-x.amount:null,growth=started&&x.amount?((y.amount-x.amount)/x.amount)*100:null;return{month:i+1,period2025:x.period,period2026:y.period,amount2025:x.amount,amount2026:started?y.amount:null,diff,growth,started}}),ytd2025=compare.filter(x=>x.month<=currentMonth).reduce((a,x)=>a+x.amount2025,0),ytd2026=compare.filter(x=>x.month<=currentMonth).reduce((a,x)=>a+(x.amount2026||0),0),ytdGrowth=ytd2025?(ytd2026-ytd2025)/ytd2025*100:0;
  const selectedMonth=Number(period.slice(5,7)),lfl=compare[selectedMonth-1]||null;
  return NextResponse.json({period,label:monthLabel(period),target,summary:{amount,device,accessories,vas,invoices:invoices.size,qty,upt:invoices.size?qty/invoices.size:0,atv:invoices.size?amount/invoices.size:0,achievement,gap,pace,status},staff,daily,team:{total:staff.length,productive:staff.filter(x=>x.status==="Productive").length,needPush:staff.filter(x=>x.status!=="Productive").length,totalTransactions:invoices.size,avgUpt:invoices.size?qty/invoices.size:0,avgAtv:invoices.size?amount/invoices.size:0},lfl,compare,ytd:{amount2025:ytd2025,amount2026:ytd2026,diff:ytd2026-ytd2025,growth:ytdGrowth,throughMonth:currentMonth}},{headers:{"cache-control":"no-store"}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca Overview"},{status:500})}
}
