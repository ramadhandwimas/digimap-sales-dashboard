import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const SHEET_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const n=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/[^0-9.-]/g,""))||0;
const s=(v:unknown)=>String(v??"").trim();
const up=(v:unknown)=>s(v).toUpperCase();
function iso(v:unknown){
 const x=s(v);
 if(/^\d{2}-\d{2}-\d{4}$/.test(x)){const[d,m,y]=x.split("-");return`${y}-${m}-${d}`}
 if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);
 if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);
 return"";
}
function jakartaToday(){return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function daysInMonth(period:string){const[y,m]=period.split("-").map(Number);return new Date(y,m,0).getDate()}
function prevPeriod(period:string){const d=new Date(`${period}-01T00:00:00Z`);d.setUTCMonth(d.getUTCMonth()-1);return d.toISOString().slice(0,7)}
function lastYearPeriod(period:string){const[y,m]=period.split("-");return`${Number(y)-1}-${m}`}
function growth(current:number,base:number){return base?((current-base)/base)*100:0}

export async function GET(req:NextRequest){
 const period=req.nextUrl.searchParams.get("period")||jakartaToday().slice(0,7);
 if(!/^\d{4}-\d{2}$/.test(period))return NextResponse.json({error:"Period tidak valid"},{status:400});
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({period,cutoffDay:1,current:0,mtm:0,lfl:0,mtmGrowth:0,lflGrowth:0});
 const today=jakartaToday(),currentPeriod=today.slice(0,7),cutoffDay=period===currentPeriod?Math.max(1,Number(today.slice(8,10))-1):daysInMonth(period),previous=prevPeriod(period),lastYear=lastYearPeriod(period);
 const [d26,a26,s26,d25,a25,s25]=await getSheetRanges(SHEET_ID,["'Data Copas'!A2:A50000","'Data Copas'!I2:I50000","'Data Copas'!S2:S50000","'Data Copas Archive 2025'!A2:A32755","'Data Copas Archive 2025'!I2:I32755","'Data Copas Archive 2025'!M2:M32755"],email,key);
 let current=0,mtm=0,lfl=0;
 for(let i=0;i<d26.length;i++){
  const date=iso(d26[i]?.[0]),scheme=up(s26[i]?.[0]);
  if(!date||scheme==="VOUCHER"||Number(date.slice(8,10))>cutoffDay)continue;
  const value=n(a26[i]?.[0]);
  if(date.startsWith(period))current+=value;
  if(date.startsWith(previous))mtm+=value;
 }
 for(let i=0;i<d25.length;i++){
  const date=iso(d25[i]?.[0]),scheme=up(s25[i]?.[0]);
  if(!date||scheme==="VOUCHER"||Number(date.slice(8,10))>cutoffDay)continue;
  if(date.startsWith(lastYear))lfl+=n(a25[i]?.[0]);
 }
 return NextResponse.json({period,cutoffDay,current,mtm,lfl,mtmGrowth:growth(current,mtm),lflGrowth:growth(current,lfl),previousPeriod:previous,lastYearPeriod:lastYear},{headers:{"Cache-Control":"no-store"}});
}
