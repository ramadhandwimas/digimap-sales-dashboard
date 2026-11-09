import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {appendSheetValues,ensureSheet,getSheetRangesFresh} from "@/lib/google-sheets";
const MASTER="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk",TAB="Dashboard Access Activity";
export async function POST(req:NextRequest){
 const origin=req.headers.get("origin");if(origin&&origin!==req.nextUrl.origin)return NextResponse.json({error:"Origin tidak valid."},{status:403});
 const session=verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);if(!session)return NextResponse.json({error:"Sesi login berakhir."},{status:401});
 const body=await req.json().catch(()=>null),eventId=String(body?.eventId||"");if(!/^[a-zA-Z0-9-]{16,80}$/.test(eventId))return NextResponse.json({error:"Event tidak valid."},{status:400});
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({error:"Pencatatan belum tersedia."},{status:503});
 try{
  await ensureSheet(MASTER,TAB,["Timestamp","Date","NIK","Name","Event ID"],email,key);
  const [saved]=await getSheetRangesFresh(MASTER,[`'${TAB}'!A2:E`],email,key);
  const now=Date.now(),recent=saved.some(r=>String(r[2])===session.nik&&(String(r[4])===eventId||(now-Date.parse(String(r[0]))>=0&&now-Date.parse(String(r[0]))<15*60*1000)));
  if(!recent){const timestamp=new Date().toISOString(),date=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());await appendSheetValues(MASTER,`'${TAB}'!A:E`,[[timestamp,date,session.nik,session.name,eventId]],email,key,"RAW")}
  return NextResponse.json({ok:true,recorded:!recent},{headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"Aktivitas dashboard belum berhasil disimpan."},{status:503})}
}
