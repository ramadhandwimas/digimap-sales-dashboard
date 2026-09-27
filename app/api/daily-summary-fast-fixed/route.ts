import {NextRequest,NextResponse} from "next/server";
import {GET as originalGET} from "@/app/api/daily-summary-fast/route";
import {aggregateSales,vasKey,saleKind} from "@/lib/m238-sales-sanitize";
import {getCachedSalesSource} from "@/lib/m238-sales-source-cache";

const TTL=120_000;
const responseCache=new Map<string,{at:number;data:any}>();
const headers={"cache-control":"private, max-age=30, stale-while-revalidate=120"};

export async function GET(req:NextRequest){
 const force=req.nextUrl.searchParams.get("refresh")==="1";
 const requestedFrom=req.nextUrl.searchParams.get("from")||"",requestedTo=req.nextUrl.searchParams.get("to")||"",mode=req.nextUrl.searchParams.get("mode")||"range";
 const cacheKey=`summary:${requestedFrom}:${requestedTo}:${mode}`;
 const hit=responseCache.get(cacheKey);
 if(!force&&hit&&Date.now()-hit.at<TTL)return NextResponse.json(hit.data,{headers:{...headers,"x-m238-cache":"HIT"}});

 const original=await originalGET(req);
 if(!original.ok)return original;
 const data:any=await original.json();
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 const from=requestedFrom||data.from,to=requestedTo||data.to;
 if(!email||!key||!from||!to)return NextResponse.json(data,{headers});
 try{
  const source=await getCachedSalesSource(email,key,force);
  const rows=source.dataCopas.filter(r=>r.date>=from&&r.date<=to);
  const existingByDate=new Map((data.dailyRows||[]).map((r:any)=>[r.date,r]));
  const dates=[...new Set([...rows.map(r=>r.date),...(data.dailyRows||[]).map((r:any)=>r.date)])].filter(Boolean).sort();
  data.dailyRows=dates.map(date=>{
    const prev:any=existingByDate.get(date)||{};const day=rows.filter(r=>r.date===date);const a=aggregateSales(day);
    const vas=(provider:string)=>day.filter(r=>saleKind(r)==="vas"&&vasKey(r)===provider).reduce((x,r)=>({qty:x.qty+r.qty,value:x.value+r.amount}),{qty:0,value:0});
    const q=vas("qoala"),t=vas("telkomsel"),x=vas("xl"),i=vas("indosat");
    const traffic=Number(prev.traffic||0),target=Number(prev.target||0),cvr=traffic?a.invoices/traffic*100:0;
    return{...prev,date,totalSales:a.amount,target,achievementPct:target?a.amount/target*100:0,transaction:a.invoices,invoice:a.invoices,qty:a.qty,upt:a.upt,atv:a.atv,cvr,breakdown:{device:a.device,accessories:a.accessories,vas:a.vas},lob:{iphoneQty:a.lob.iphone,macbookQty:a.lob.mac,ipadQty:a.lob.ipad,appleWatchQty:a.lob.watch,airpodsQty:a.lob.airpods},vas:{qoalaQty:q.qty,qoalaValue:q.value,telkomselQty:t.qty,telkomselValue:t.value,xlQty:x.qty,xlValue:x.value,indosatQty:i.qty,indosatValue:i.value}};
  });
  const all=aggregateSales(rows),traffic=(data.dailyRows||[]).reduce((a:number,r:any)=>a+Number(r.traffic||0),0),target=Number(data.summary?.target||0),cvr=traffic?all.invoices/traffic*100:0;
  data.summary={...data.summary,totalSales:all.amount,achievementPct:target?all.amount/target*100:0,transaction:all.invoices,invoice:all.invoices,qty:all.qty,upt:all.upt,atv:all.atv,traffic,cvr};
  data.breakdown={device:all.device,accessories:all.accessories,vas:all.vas,lob:{iphone:all.lob.iphone,macbook:all.lob.mac,ipad:all.lob.ipad,appleWatch:all.lob.watch,airpods:all.lob.airpods}};
  if(data.lobFocus?.lob){if(data.lobFocus.lob.iphone)data.lobFocus.lob.iphone.achievement=all.lob.iphone;if(data.lobFocus.lob.macbook)data.lobFocus.lob.macbook.achievement=all.lob.mac;if(data.lobFocus.lob.ipad)data.lobFocus.lob.ipad.achievement=all.lob.ipad;if(data.lobFocus.lob.appleWatch)data.lobFocus.lob.appleWatch.achievement=all.lob.watch;}
  data.source="Data Copas • voucher excluded • AirPods fixed • cached";data.generatedAt=new Date().toISOString();
  responseCache.set(cacheKey,{at:Date.now(),data});
  if(responseCache.size>20){const oldest=[...responseCache.entries()].sort((a,b)=>a[1].at-b[1].at)[0]?.[0];if(oldest)responseCache.delete(oldest)}
  return NextResponse.json(data,{headers:{...headers,"x-m238-cache":"MISS"}});
 }catch{return NextResponse.json(data,{headers})}
}
