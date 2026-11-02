import {NextRequest,NextResponse} from "next/server";
import {GET as originalGET} from "@/app/api/data/route";
import {aggregateSales,vasKey,saleKind,salesRowsForPeriod} from "@/lib/m238-sales-sanitize";
import {getCachedSalesSource} from "@/lib/m238-sales-source-cache";

const TTL=120_000;
const responseCache=new Map<string,{at:number;data:any}>();
const baseHeaders={"cache-control":"private, max-age=30, stale-while-revalidate=120"};
const outHeaders=(cache:string,started:number)=>({...baseHeaders,"x-m238-cache":cache,"x-m238-total-ms":String(Date.now()-started),"server-timing":`m238;dur=${Date.now()-started}`});

export async function GET(req:NextRequest){
 const started=Date.now();
 const force=req.nextUrl.searchParams.get("refresh")==="1";
 const requestedPeriod=req.nextUrl.searchParams.get("period")||"";
 const cacheKey=`data:${requestedPeriod}`;
 const hit=responseCache.get(cacheKey);
 if(!force&&hit&&Date.now()-hit.at<TTL)return NextResponse.json(hit.data,{headers:outHeaders("HIT",started)});

 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 const sourcePromise=email&&key?getCachedSalesSource(email,key,force).catch(()=>null):Promise.resolve(null);
 const [original,source]=await Promise.all([originalGET(req),sourcePromise]);
 if(!original.ok)return original;
 const data:any=await original.json();
 if(!source)return NextResponse.json({error:"Data exchange belum dapat diverifikasi. Muat ulang dashboard."},{status:503,headers:{"cache-control":"no-store"}});
 const period=requestedPeriod||data.period;
 try{
  const rowsFor=(selectedPeriod:string)=>salesRowsForPeriod(source.dataCopas,source.rawSales,source.activeDates,selectedPeriod);
  const monthRows=rowsFor(period);
  const latestDate=data.latestDate||monthRows.map(r=>r.date).sort().at(-1)||`${period}-01`;
  const todayRowsRaw=source.rawSales.filter(r=>r.date===latestDate);
  const todayRows=todayRowsRaw.length?todayRowsRaw:monthRows.filter(r=>r.date===latestDate);
  const byId=(rows:any[])=>{const m=new Map<string,ReturnType<typeof aggregateSales>>();for(const id of new Set(rows.map(r=>r.id).filter(Boolean)))m.set(id,aggregateSales(rows.filter(r=>r.id===id)));return m};
  const monthById=byId(monthRows),todayById=byId(todayRows);
  const patchStaff=(st:any,a:ReturnType<typeof aggregateSales>|undefined)=>!a?{...st,amount:0,device:0,accessories:0,vas:0,qty:0,invoices:0,upt:0,atv:0,lob:{iphone:0,mac:0,ipad:0,watch:0,airpods:0},vasDetail:{qoala:{qty:0,value:0},telkomsel:{qty:0,value:0},xl:{qty:0,value:0},indosat:{qty:0,value:0}}}:{...st,amount:a.amount,device:a.device,accessories:a.accessories,vas:a.vas,qty:a.qty,invoices:a.invoices,upt:a.upt,atv:a.atv,lob:a.lob,vasDetail:a.vasDetail};
  data.monthlyStaff=(data.monthlyStaff||[]).map((st:any)=>patchStaff(st,monthById.get(String(st.id))));
  data.dailyStaff=(data.dailyStaff||[]).map((st:any)=>patchStaff(st,todayById.get(String(st.id))));
  const dateSet=[...new Set(monthRows.map(r=>r.date))].sort();
  data.daily=dateSet.map(date=>{const day=monthRows.filter(r=>r.date===date),a=aggregateSales(day),vas=(provider:string)=>day.filter(r=>saleKind(r)==="vas"&&vasKey(r)===provider).reduce((x,r)=>x+r.amount,0);return{date,amount:a.amount,device:a.device,accessories:a.accessories,vas:a.vas,invoices:a.invoices,qty:a.qty,upt:a.upt,atv:a.atv,mac:a.lob.mac,ipad:a.lob.ipad,iphone:a.lob.iphone,watch:a.lob.watch,airpods:a.lob.airpods,qoala:vas("qoala"),telkomsel:vas("telkomsel"),indosat:vas("indosat"),xl:vas("xl")}});
  const total=aggregateSales(monthRows),lastDay=Math.max(1,...dateSet.map(d=>Number(d.slice(8,10))||1)),dim=new Date(Number(period.slice(0,4)),Number(period.slice(5,7)),0).getDate(),target=data.target||{};
  const point=Math.min(target.device?total.device/target.device*60:0,60)+Math.min(target.accessories?total.accessories/target.accessories*30:0,30)+Math.min(target.vas?total.vas/target.vas*10:0,10);
  data.summary={...data.summary,amount:total.amount,device:total.device,accessories:total.accessories,vas:total.vas,invoices:total.invoices,qty:total.qty,upt:total.upt,atv:total.atv,estimate:total.amount/lastDay*dim,point,timegone:lastDay/dim*100};
  if(data.annual){
   data.annual.thisYear=(data.annual.thisYear||[]).map((m:any)=>({...m,amount:rowsFor(m.period).reduce((sum,r)=>sum+r.amount,0)}));
   data.annual.thisYearTotal=data.annual.thisYear.reduce((sum:number,m:any)=>sum+m.amount,0);
   const prevDate=new Date(`${period}-01T00:00:00Z`);prevDate.setUTCMonth(prevDate.getUTCMonth()-1);const prev=prevDate.toISOString().slice(0,7),day=Math.max(1,...monthRows.map(r=>Number(r.date.slice(8,10))));
   const through=(p:string)=>rowsFor(p).filter(r=>Number(r.date.slice(8,10))<=day).reduce((sum,r)=>sum+r.amount,0),current=through(period),previous=through(prev);
   data.annual.mtm={current,previous,growth:previous?(current-previous)/previous*100:0};
  }
  data.generatedAt=new Date().toISOString();data.mode="live";
  responseCache.set(cacheKey,{at:Date.now(),data});
  if(responseCache.size>18){const oldest=[...responseCache.entries()].sort((a,b)=>a[1].at-b[1].at)[0]?.[0];if(oldest)responseCache.delete(oldest)}
  return NextResponse.json(data,{headers:outHeaders("MISS",started)});
 }catch{return NextResponse.json(data,{headers:outHeaders("FALLBACK",started)})}
}
