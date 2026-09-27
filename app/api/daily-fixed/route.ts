import {NextRequest,NextResponse} from "next/server";
import {GET as originalGET} from "@/app/api/daily/route";
import {aggregateSales} from "@/lib/m238-sales-sanitize";
import {getCachedSalesSource} from "@/lib/m238-sales-source-cache";

const TTL=60_000;
const responseCache=new Map<string,{at:number;data:any}>();
const headers={"cache-control":"private, max-age=20, stale-while-revalidate=60"};

export async function GET(req:NextRequest){
 const force=req.nextUrl.searchParams.get("refresh")==="1";
 const requestedDate=req.nextUrl.searchParams.get("date")||"";
 const cacheKey=`daily:${requestedDate}`;
 const hit=responseCache.get(cacheKey);
 if(!force&&hit&&Date.now()-hit.at<TTL)return NextResponse.json(hit.data,{headers:{...headers,"x-m238-cache":"HIT"}});

 const original=await originalGET(req);
 if(!original.ok)return original;
 const data:any=await original.json();
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json(data,{headers});
 const date=requestedDate||data.date;
 try{
  const source=await getCachedSalesSource(email,key,force);
  const rows=source.dataCopas.filter(r=>r.date===date);
  const byId=new Map<string,ReturnType<typeof aggregateSales>>();
  for(const id of new Set(rows.map(r=>r.id).filter(Boolean)))byId.set(id,aggregateSales(rows.filter(r=>r.id===id)));
  data.staff=(data.staff||[]).map((st:any)=>{
   const a=byId.get(String(st.id));if(!a)return{...st,amount:0,device:0,accessories:0,vas:0,qty:0,invoices:0,upt:0,atv:0,lob:{iphone:0,mac:0,ipad:0,watch:0,airpods:0},vasDetail:{qoala:{qty:0,value:0},telkomsel:{qty:0,value:0},xl:{qty:0,value:0},indosat:{qty:0,value:0}}};
   return{...st,amount:a.amount,device:a.device,accessories:a.accessories,vas:a.vas,qty:a.qty,invoices:a.invoices,upt:a.upt,atv:a.atv,lob:a.lob,vasDetail:a.vasDetail};
  });
  const total=aggregateSales(rows);
  data.total={...data.total,amount:total.amount,accessories:total.accessories,vas:total.vas,qty:total.qty,invoices:total.invoices,upt:total.upt};
  data.fastSource="Data Copas • voucher excluded • AirPods fixed • cached";
  data.fastUpdatedAt=new Date().toISOString();
  responseCache.set(cacheKey,{at:Date.now(),data});
  if(responseCache.size>14){const oldest=[...responseCache.entries()].sort((a,b)=>a[1].at-b[1].at)[0]?.[0];if(oldest)responseCache.delete(oldest)}
  return NextResponse.json(data,{headers:{...headers,"x-m238-cache":"MISS"}});
 }catch{return NextResponse.json(data,{headers})}
}
