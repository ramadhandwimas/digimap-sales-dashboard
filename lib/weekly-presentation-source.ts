import {referenceContext} from "./presentation-reference-source";
import {getSheetRanges} from "@/lib/google-sheets";
import {readExchangeState} from "@/lib/exchange-detail-store";
import {adjustExchangeSales} from "@/lib/exchange-detail";
import {parseSalesRow,isValidSale,saleKind,isoDate,type SalesRow} from "@/lib/m238-sales-sanitize";
import type {WeeklyPresentationData,PresentationMetrics} from "@/lib/weekly-presentation";

const ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0",MASTER="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const text=(v:unknown)=>String(v??"").trim();
const known=(r:SalesRow)=>r.store==="M238"&&isValidSale(r)&&saleKind(r)!=="other";
export function presentationMetrics(rows:SalesRow[],traffic:number|null):PresentationMetrics {
 const invoices=new Set(rows.map(r=>r.invoice).filter(Boolean)),sales=rows.reduce((s,r)=>s+r.amount,0),qty=rows.reduce((s,r)=>s+r.qty,0),transactions=invoices.size;
 return {sales,qty,transactions,traffic,cvr:traffic&&traffic>0?transactions/traffic*100:null,upt:transactions?qty/transactions:null,atv:transactions?sales/transactions:null};
}
export async function enrichWeeklyPresentation(data:WeeklyPresentationData,options?:{period?:string}):Promise<WeeklyPresentationData>{
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)throw new Error("Google Sheets belum dikonfigurasi.");
 const now=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta"}).format(new Date());
 const cutoff=data.periodB.end<now?data.periodB.end:now;
 const [[raw,feedback,positions=[]],trafficResult,exchange]=await Promise.all([
  getSheetRanges(ID,["'Data Copas'!A2:S50000","'Dashboard Feedback'!A2:G5000","Config!H28:L60"],email,key),
  getSheetRanges(MASTER,["'Traffic'!A2:B1000"],email,key).catch(()=>null),readExchangeState({email,key})
 ]);
 const all=adjustExchangeSales(raw.map(parseSalesRow),exchange).filter(known);
 const range=(start:string,end:string)=>all.filter(r=>r.date>=start&&r.date<=end);
 const traffic=(start:string,end:string)=>{if(!trafficResult)return null;const matching=trafficResult[0].filter(r=>isoDate(r[0])>=start&&isoDate(r[0])<=end),days=new Set(matching.map(r=>isoDate(r[0])));if(all.some(r=>r.date>=start&&r.date<=end&&!days.has(r.date)))return null;return matching.length?matching.reduce((s,r)=>s+(Number(r[1])||0),0):null};
 const a=range(data.periodA.start,data.periodA.end),b=range(data.periodB.start,cutoff);
 for(const [rows,side] of [[a,data.a],[b,data.b]] as const){const expected=Object.values(side.scheme).reduce((s,r)=>s+r.amount,0),actual=rows.reduce((s,r)=>s+r.amount,0);if(Math.abs(expected-actual)>1)throw new Error("Total sumber weekly berubah. Perbarui report lalu unduh kembali.")}
 const staff=[...new Set([...a,...b].map(r=>r.id))].map(id=>{const aa=a.filter(r=>r.id===id),bb=b.filter(r=>r.id===id),current=bb.length?bb:aa;return{id,name:current[0]?.name||id,previous:presentationMetrics(aa,null),current:presentationMetrics(bb,null),device:bb.filter(r=>saleKind(r)==="device").reduce((s,r)=>s+r.amount,0),accessories:bb.filter(r=>saleKind(r)==="accessories").reduce((s,r)=>s+r.amount,0),vas:bb.filter(r=>saleKind(r)==="vas").reduce((s,r)=>s+r.amount,0)}}).sort((a,b)=>b.current.sales-a.current.sales);
 const daily=[...new Set(b.map(r=>r.date))].sort().map(date=>({date,...presentationMetrics(b.filter(r=>r.date===date),traffic(date,date))}));
 const dailyA=[...new Set(a.map(r=>r.date))].sort().map(date=>({date,...presentationMetrics(a.filter(r=>r.date===date),traffic(date,date))}));
 const feedbackRows=feedback.filter(r=>isoDate(r[1])>=data.periodB.start&&isoDate(r[1])<=cutoff).map(r=>text(r[5])).filter(Boolean);
 const selectedPeriod=options?.period||cutoff.slice(0,7),[selectedYear,selectedMonth]=selectedPeriod.split("-").map(Number),selectedEnd=new Date(Date.UTC(selectedYear,selectedMonth,0)).toISOString().slice(0,10),monthlyCutoff=cutoff<`${selectedPeriod}-01`?`${selectedPeriod}-01`:cutoff>selectedEnd?selectedEnd:cutoff;
 const currentPeriod=monthlyCutoff.slice(0,7),[year,month]=currentPeriod.split("-").map(Number),prior=new Date(Date.UTC(year,month-2,1)).toISOString().slice(0,7),lflPeriod=`${year-1}-${String(month).padStart(2,"0")}`,day=Number(monthlyCutoff.slice(8));
 const monthEnd=(period:string)=>{const[y,m]=period.split("-").map(Number);return `${period}-${String(Math.min(day,new Date(Date.UTC(y,m,0)).getUTCDate())).padStart(2,"0")}`};
 let archive:SalesRow[]|null=null;
 if(lflPeriod.startsWith("2025"))try{const [saved]=await getSheetRanges(ID,["'Data Copas Archive 2025'!A2:S32755"],email,key);const hasStore=saved.some(r=>text(r[15])==="M238");archive=saved.map(r=>{const row=parseSalesRow(r);return hasStore?row:{...row,store:"M238"}}).filter(known)}catch{archive=null}
 const monthly=(period:string,rows:SalesRow[])=>{const matched=rows.filter(r=>r.date>=`${period}-01`&&r.date<=monthEnd(period));return {period,device:matched.filter(r=>saleKind(r)==="device").reduce((s,r)=>s+r.amount,0),accessories:matched.filter(r=>saleKind(r)==="accessories").reduce((s,r)=>s+r.amount,0),vas:matched.filter(r=>saleKind(r)==="vas").reduce((s,r)=>s+r.amount,0)}};
 const reference=referenceContext(all,archive,monthlyCutoff),jobs=new Map(positions.filter(r=>text(r[0]).toUpperCase()==="M238").map(r=>[text(r[1]),text(r[3])]));
 reference.staff=reference.staff.map(person=>({...person,job:jobs.get(person.id)||""}));
 return {...data,reference,report:{cutoff,generatedAt:new Date().toISOString(),metricsA:presentationMetrics(a,traffic(data.periodA.start,data.periodA.end)),metricsB:presentationMetrics(b,traffic(data.periodB.start,cutoff)),staff,daily,dailyA,feedback:[...new Set(feedbackRows)],monthly:{cutoff:monthlyCutoff,current:monthly(currentPeriod,all),mtm:monthly(prior,all),lfl:archive?.some(r=>r.date.startsWith(lflPeriod))?monthly(lflPeriod,archive):null}}};
}
