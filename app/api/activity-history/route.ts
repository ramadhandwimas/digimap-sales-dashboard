import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {appendSheetValues,ensureSheets,getSheetRanges} from "@/lib/google-sheets";

const DASHBOARD_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const SHEET="DASHBOARD ACTIVITY LOG";
const HEADERS=["Timestamp","Type","Title","Detail","Count","Actor","Status"];
const text=(value:unknown)=>String(value??"").trim();
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"cache-control":"no-store"}});
function credentials(){const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;return email&&key?{email,key}:null}

export async function GET(request:NextRequest){
 if(!verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value))return json({error:"Sesi login berakhir."},401);
 const auth=credentials();if(!auth)return json({error:"Koneksi Google Sheets belum dikonfigurasi."},503);
 try{
  await ensureSheets(DASHBOARD_ID,[{title:SHEET,headers:HEADERS}],auth.email,auth.key);
  const[[rows],[deviceMeta,accessoryMeta]]=await Promise.all([
   getSheetRanges(DASHBOARD_ID,[`'${SHEET}'!A2:G2000`],auth.email,auth.key),
   getSheetRanges(SOURCE_ID,["'Promo Price Lists'!A2:G1000","'Promo ACC Price Lists'!A2:I1000"],auth.email,auth.key),
  ]);
  const activity=(rows||[]).filter(row=>text(row[0])).map(row=>({timestamp:text(row[0]),type:text(row[1]),title:text(row[2]),detail:text(row[3]),count:Number(row[4])||0,actor:text(row[5])||"Dashboard User",status:text(row[6])||"SUCCESS"}));
  const historic=[
   ...(deviceMeta||[]).filter(row=>text(row[0])).map(row=>({timestamp:text(row[3]),type:"PRICELIST_DEVICE",title:"Aktivasi Pricelist Device",detail:text(row[1]),count:Number(row[5])||0,actor:"System",status:"SUCCESS"})),
   ...(accessoryMeta||[]).filter(row=>text(row[0])).map(row=>({timestamp:text(row[3]),type:"PRICELIST_ACCESSORY",title:"Aktivasi Pricelist Accessories",detail:text(row[1]),count:Number(row[5])||0,actor:"System",status:"SUCCESS"})),
  ];
  const seen=new Set<string>(),items=[...activity,...historic].sort((a,b)=>b.timestamp.localeCompare(a.timestamp)).filter(item=>{const key=`${item.timestamp}|${item.title}|${item.detail}`;if(seen.has(key))return false;seen.add(key);return true}).slice(0,60);
  return json({items,total:items.length,generatedAt:new Date().toISOString()});
 }catch(error){return json({error:error instanceof Error?error.message:"Riwayat aktivitas gagal dibaca."},500)}
}

export async function POST(request:NextRequest){
 const session=verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);if(!session)return json({error:"Sesi login berakhir."},401);
 const origin=request.headers.get("origin");if(origin&&origin!==request.nextUrl.origin)return json({error:"Asal permintaan tidak valid."},403);
 const auth=credentials();if(!auth)return json({error:"Koneksi Google Sheets belum dikonfigurasi."},503);
 try{
  const body=await request.json(),title=text(body.title||body.label).slice(0,100),detail=text(body.detail).slice(0,300),type=text(body.type||title).toUpperCase().replace(/[^A-Z0-9]+/g,"_").slice(0,60),count=Math.max(0,Number(body.count)||0);
  if(!title)return json({error:"Aktivitas tidak valid."},400);
  await ensureSheets(DASHBOARD_ID,[{title:SHEET,headers:HEADERS}],auth.email,auth.key);
  await appendSheetValues(DASHBOARD_ID,`'${SHEET}'!A:G`,[[new Date().toISOString(),type,title,detail,count,`${session.nik} · ${session.name}`,"SUCCESS"]],auth.email,auth.key,"RAW");
  return json({ok:true});
 }catch(error){return json({error:error instanceof Error?error.message:"Aktivitas gagal dicatat."},500)}
}
