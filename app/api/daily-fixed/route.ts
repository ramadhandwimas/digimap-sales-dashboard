import {NextRequest,NextResponse} from "next/server";
import {GET as originalGET} from "@/app/api/daily/route";
import {aggregateSales} from "@/lib/m238-sales-sanitize";
import {getCachedSalesSource} from "@/lib/m238-sales-source-cache";

const TTL=60_000;
const responseCache=new Map<string,{at:number;data:any}>();
const baseHeaders={"cache-control":"private, max-age=20, stale-while-revalidate=60"};
const outHeaders=(cache:string,started:number)=>({...baseHeaders,"x-m238-cache":cache,"x-m238-total-ms":String(Date.now()-started),"server-timing":`m238;dur=${Date.now()-started}`});

export async function GET(req:NextRequest){
 const started=Date.now();
 const force=req.nextUrl.searchParams.get("refresh")==="1";
 const requestedDate=req.nextUrl.searchParams.get("date")||"";
 const cacheKey=`daily:${requestedDate}`;
 const hit=responseCache.get(cacheKey);
 if(!force&&hit&&Date.now()-hit.at<TTL)return NextResponse.json(hit.data,{headers:outHeaders("HIT",started)});

 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 const sourcePromise=email&&key?getCachedSalesSource(email,key,force).catch(()=>null):Promise.resolve(null);
 const [original,source]=await Promise.all([originalGET(req),sourcePromise]);
 if(!original.ok)return original;
 const data:any=await original.json();
 if(!source)return NextResponse.json(data,{headers:outHeaders("BASE",started)});
 const date=requestedDate||data.date;
 try{
  const rows=source.dataCopas.filter(r=>r.date===date);
  const byId=new Map<string,ReturnType<typeof aggregateSales>>();
  for(const id of new Set(rows.map(r=>r.id).filter(Boolean)))byId.set(id,aggregateSales(rows.filter(r=>r.id===id)));
  data.staff=(data.staff||[]).map((st:any)=>{
   const a=byId.get(String(st.id));if(!a)return{...st,amount:0,device:0,accessories:0,vas:0,qty:0,invoices:0,upt:0,atv:0,lob:{iphone:0,mac:0,ipad:0,watch:0,airpods:0},vasDetail:{qoala:{qty:0,value:0},telkomsel:{qty:0,value:0},xl:{qty:0,value:0},indosat:{qty:0,value:0}}};
   return{...st,amount:a.amount,device:a.device,accessories:a.accessories,vas:a.vas,qty:a.qty,invoices:a.invoices,upt:a.upt,atv:a.atv,lob:a.lob,vasDetail:a.vasDetail};
  });
  const total=aggregateSales(rows);
  data.total={...data.total,amount:total.amount,accessories:total.accessories,vas:total.vas,qty:total.qty,invoices:total.invoices,upt:total.upt};

  const visibleIds=new Set((data.staff||[]).map((st:any)=>String(st.id||"")).filter(Boolean));
  const visibleRows=rows.filter(r=>visibleIds.has(String(r.id||"")));
  const unassignedRows=rows.filter(r=>!visibleIds.has(String(r.id||"")));
  const staffTotal=aggregateSales(visibleRows);
  const unassigned=aggregateSales(unassignedRows);
  const unassignedStaff=[...new Map(unassignedRows.filter(r=>r.id).map(r=>[String(r.id),{id:String(r.id),name:r.name||String(r.id)}])).values()];
  data.reconciliation={
   balanced:Math.abs(total.amount-(staffTotal.amount+unassigned.amount))<1&&total.qty===staffTotal.qty+unassigned.qty,
   store:{amount:total.amount,device:total.device,accessories:total.accessories,vas:total.vas,qty:total.qty,invoices:total.invoices},
   visibleStaff:{amount:staffTotal.amount,device:staffTotal.device,accessories:staffTotal.accessories,vas:staffTotal.vas,qty:staffTotal.qty,invoices:staffTotal.invoices},
   unassigned:{amount:unassigned.amount,device:unassigned.device,accessories:unassigned.accessories,vas:unassigned.vas,qty:unassigned.qty,invoices:unassigned.invoices,staffCount:unassignedStaff.length,staff:unassignedStaff},
   formula:"store = visibleStaff + unassigned",
   source:"Data Copas live source + roster visible staff"
  };
  data.fastSource="Data Copas • voucher excluded • AirPods fixed • cached";
  data.fastUpdatedAt=new Date().toISOString();
  responseCache.set(cacheKey,{at:Date.now(),data});
  if(responseCache.size>14){const oldest=[...responseCache.entries()].sort((a,b)=>a[1].at-b[1].at)[0]?.[0];if(oldest)responseCache.delete(oldest)}
  return NextResponse.json(data,{headers:outHeaders("MISS",started)});
 }catch{return NextResponse.json(data,{headers:outHeaders("FALLBACK",started)})}
}
