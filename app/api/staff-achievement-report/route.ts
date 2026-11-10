import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {getSheetRanges} from "@/lib/google-sheets";
import {getCachedSalesSource} from "@/lib/m238-sales-source-cache";
import {buildStaffAchievementReport,type AchievementReport} from "@/lib/staff-achievement-report";
import {allocatedReportTargets} from "@/lib/staff-report-targets";
const SOURCE="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const cache=new Map<string,{at:number;data:AchievementReport}>();
const valid=(v:string)=>/^202[56]-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export async function GET(req:NextRequest){
 if(!verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value))return NextResponse.json({error:"Sesi login berakhir."},{status:401});
 const from=req.nextUrl.searchParams.get("from")||"",to=req.nextUrl.searchParams.get("to")||"",mode=req.nextUrl.searchParams.get("mode")||"daily",today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta"}).format(new Date());
 const count=(Date.parse(to)-Date.parse(from))/86400000+1;
 if(!valid(from)||!valid(to)||from>to||to>today||!["daily","weekly"].includes(mode)||(mode==="weekly"&&count>7)||(mode==="daily"&&(count>31||from!==`${to.slice(0,7)}-01`)))return NextResponse.json({error:"Harian memakai tanggal 1 sampai tanggal pilihan; mingguan maksimal 7 hari, sampai hari ini."},{status:400});
 const cacheKey=`${mode}:${from}:${to}`,hit=cache.get(cacheKey);if(hit&&Date.now()-hit.at<30000)return NextResponse.json(hit.data,{headers:{"cache-control":"no-store"}});
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({error:"Koneksi data belum tersedia."},{status:503});
 try{
  const dates=Array.from({length:count},(_,i)=>new Date(Date.parse(from)+i*86400000).toISOString().slice(0,10));
  const [[config],[weekly,snapshots],source]=await Promise.all([getSheetRanges(SOURCE,["Config!A1:AG120"],email,key),getSheetRanges("1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk",["'Schedule weekly'!A1:J3000","'Dashboard Schedule Snapshot'!A2:G5000"],email,key),getCachedSalesSource(email,key)]);
  const {roster,days,warnings}=allocatedReportTargets(config,weekly,snapshots,dates);
  const sales=source?.dataCopas.filter(r=>r.date>=from&&r.date<=to)||[];
  if(source){const compiledDates=new Set(sales.map(r=>r.date));for(const date of dates)if(source.activeDates.includes(date)&&!compiledDates.has(date))warnings.push(`${date}: Data live belum tersedia di Data Copas; belum disertakan dalam penjualan report.`)}
  const data:AchievementReport={from,to,mode:mode as "daily"|"weekly",...buildStaffAchievementReport(roster,days,mode as "daily"|"weekly",sales),warnings,source:"Penjualan: Data Copas bersih setelah cutoff · Target: rencana harian dari target bulanan Config, dibagi sesuai bobot dan schedule staff.",generatedAt:new Date().toISOString()};
  cache.set(cacheKey,{at:Date.now(),data});if(cache.size>30)cache.delete(cache.keys().next().value!);
  return NextResponse.json(data,{headers:{"cache-control":"no-store"}});
 }catch(e){console.warn("staff-achievement-report",e instanceof Error?e.message:"Report gagal");return NextResponse.json({error:e instanceof Error?e.message:"Report belum dapat dimuat."},{status:503})}
}
