import {NextRequest,NextResponse} from "next/server";
import {getGoogleSheetRequestCount} from "@/lib/google-sheets";
import {getDailySummaryRange} from "@/lib/m238-daily-summary-cache";
import {getDailySummaryFocus} from "@/lib/m238-daily-summary-focus";

const validDate=(v:string)=>/^20\d{2}-\d{2}-\d{2}$/.test(v);
const zeroVas={qoalaQty:0,qoalaValue:0,telkomselQty:0,telkomselValue:0,xlQty:0,xlValue:0,indosatQty:0,indosatValue:0};

export async function GET(request:NextRequest){
 const started=Date.now(),apiStarted=getGoogleSheetRequestCount(),email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY,from=request.nextUrl.searchParams.get("from")??"",to=request.nextUrl.searchParams.get("to")??"",refresh=request.nextUrl.searchParams.get("refresh")==="1";
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 if(!validDate(from)||!validDate(to)||from>to)return NextResponse.json({error:"Range tanggal tidak valid"},{status:400});
 try{
  const base=await getDailySummaryRange(from,to,{email,key},refresh);
  const focus=await getDailySummaryFocus(from,to,{email,key});
  const dailyRows=base.dailyRows.map(row=>{const vas=focus.data.vasByDate[row.date]||zeroVas;return{date:row.date,day:new Intl.DateTimeFormat("id-ID",{weekday:"short",timeZone:"Asia/Jakarta"}).format(new Date(`${row.date}T00:00:00Z`)),totalSales:row.amount,target:row.target,achievementPct:row.achievement,transaction:row.invoices,invoice:row.invoices,qty:row.qty,upt:row.upt,atv:row.atv,traffic:row.traffic,cvr:row.cvr,breakdown:{device:row.device,accessories:row.accessories,vas:row.vas},lob:{iphoneQty:row.iphone,macbookQty:row.mac,ipadQty:row.ipad,appleWatchQty:row.watch,airpodsQty:row.airpods},vas}});
  const s=base.summary,summary={totalSales:s.amount,target:s.target,achievementPct:s.target?s.amount/s.target*100:0,transaction:s.invoices,invoice:s.invoices,qty:s.qty,upt:s.upt,atv:s.atv,traffic:s.traffic,cvr:s.cvr,bestDay:s.bestDay,lowestDay:s.lowestDay,previousTotal:s.previousTotal,growthPct:s.comparisonPercent};
  const body={from,to,summary,previous:{totalSales:s.previousTotal,growthPct:s.comparisonPercent},breakdown:{device:s.device,accessories:s.accessories,vas:s.vas,lob:{iphone:s.iphone,macbook:s.mac,ipad:s.ipad,appleWatch:s.watch,airpods:s.airpods}},lobFocus:focus.data,dailyRows,generatedAt:new Date().toISOString(),source:"DAILY SUMMARY CACHE",cache:{summary:base.cacheStatus,focus:focus.data.cache},performance:{...base.timing,...focus.timing,googleSheetRequests:0,rawRowsFetched:base.timing.rawRowsFetched+focus.data.sourceRows,rowsReturned:dailyRows.length,payloadBytes:0,apiResponse:0,totalLoad:0}};
  const responseStarted=Date.now();let serialized=JSON.stringify(body);body.performance.googleSheetRequests=getGoogleSheetRequestCount()-apiStarted;body.performance.apiResponse=Date.now()-responseStarted;body.performance.totalLoad=Date.now()-started;body.performance.payloadBytes=Buffer.byteLength(serialized,"utf8");serialized=JSON.stringify(body);body.performance.payloadBytes=Buffer.byteLength(serialized,"utf8");serialized=JSON.stringify(body);
  console.info("M238_PERF",{op:"daily-summary-v3",from,to,cache:body.cache,rows:dailyRows.length,payloadBytes:body.performance.payloadBytes,timing:body.performance});
  return new NextResponse(serialized,{headers:{"content-type":"application/json; charset=utf-8","cache-control":refresh?"no-store":"private, max-age=60, stale-while-revalidate=300","server-timing":`total;dur=${body.performance.totalLoad},focus;dur=${body.performance.focusTotal||0}`,"x-daily-summary-rows":String(dailyRows.length),"x-daily-summary-bytes":String(body.performance.payloadBytes)}})
 }catch(error){const duration=Date.now()-started;console.warn("M238_PERF",{op:"daily-summary-v3",from,to,total:duration,apiRequests:getGoogleSheetRequestCount()-apiStarted,error:error instanceof Error?error.message:"Unknown error"});return NextResponse.json({error:"Daily Summary belum berhasil diperbarui."},{status:500,headers:{"cache-control":"no-store"}})}
}
