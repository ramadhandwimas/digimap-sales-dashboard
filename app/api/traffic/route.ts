import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const s=(v:unknown)=>String(v??"").trim();
const n=(v:unknown)=>typeof v==="number"?v:Number(s(v).replace(/[^0-9.-]/g,""))||0;
function iso(v:unknown){
 if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);
 const x=s(v);if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);
 if(/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(x)){const[d,m,y]=x.split(/[/-]/);return`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`}
 return"";
}
async function readTraffic(email:string,key:string){
 let lastError:unknown;
 for(let attempt=0;attempt<2;attempt++){
  try{return await getSheetRanges(MASTER_ID,["'Traffic'!A2:B1000"],email,key)}
  catch(error){lastError=error;if(attempt===0)await new Promise(resolve=>setTimeout(resolve,250))}
 }
 throw lastError;
}
export async function GET(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 const from=req.nextUrl.searchParams.get("from")||"0000-00-00",to=req.nextUrl.searchParams.get("to")||"9999-12-31";
 if(!email||!key)return NextResponse.json({from,to,total:0,daily:[],degraded:true,error:"Google Sheets belum dikonfigurasi"},{status:200,headers:{"cache-control":"no-store"}});
 try{
  const[rows]=await readTraffic(email,key);
  const daily=rows.map(r=>({date:iso(r[0]),traffic:n(r[1])})).filter(r=>r.date&&r.date>=from&&r.date<=to);
  const total=daily.reduce((a,r)=>a+r.traffic,0);
  return NextResponse.json({from,to,total,daily,degraded:false},{headers:{"cache-control":"no-store"}});
 }catch(e){
  return NextResponse.json({from,to,total:0,daily:[],degraded:true,error:e instanceof Error?e.message:"Gagal membaca traffic"},{status:200,headers:{"cache-control":"no-store"}})
 }
}
