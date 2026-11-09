import {createHash} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {appendSheetValues,batchWriteRanges,ensureSheet,getSheetRanges,getSheetRangesFresh} from "@/lib/google-sheets";
import {presenceDevice,summarizePresence} from "@/lib/dashboard-presence";
const MASTER="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk",TAB="Dashboard Online Presence",RANGE=`'${TAB}'!A2:H`;
let readyUntil=0;
async function ensure(email:string,key:string){if(Date.now()<readyUntil)return;await ensureSheet(MASTER,TAB,["Session ID","NIK","Name","Last Seen","Visible","Device","Browser","Page"],email,key);readyUntil=Date.now()+10*60*1000}
const credentials=()=>({email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key:process.env.GOOGLE_PRIVATE_KEY});
export async function GET(req:NextRequest){
 if(!verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value))return NextResponse.json({error:"Sesi login berakhir."},{status:401});
 const {email,key}=credentials();if(!email||!key)return NextResponse.json({error:"Status online belum tersedia."},{status:503});
 try{await ensure(email,key);const [rows]=await getSheetRanges(MASTER,[RANGE],email,key);return NextResponse.json(summarizePresence(rows),{headers:{"cache-control":"no-store"}})}catch{return NextResponse.json({error:"Status online belum dapat diperbarui."},{status:503})}
}
export async function POST(req:NextRequest){
 const origin=req.headers.get("origin");if(origin&&origin!==req.nextUrl.origin)return NextResponse.json({error:"Origin tidak valid."},{status:403});
 const session=verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);if(!session)return NextResponse.json({error:"Sesi login berakhir."},{status:401});
 const body=await req.json().catch(()=>null),clientId=String(body?.clientId||"");if(!/^[a-zA-Z0-9-]{16,80}$/.test(clientId)||typeof body?.visible!=="boolean")return NextResponse.json({error:"Status tidak valid."},{status:400});
 const {email,key}=credentials();if(!email||!key)return NextResponse.json({error:"Pencatatan belum tersedia."},{status:503});
 try{
  await ensure(email,key);const [rows]=await getSheetRangesFresh(MASTER,[RANGE],email,key),id=createHash("sha256").update(`${session.nik}:${clientId}`).digest("hex"),index=rows.findIndex(r=>String(r[0])===id),{device,browser}=presenceDevice(req.headers.get("user-agent")||""),page=String(body.page||"/").split(/[?#]/)[0].slice(0,100),values=[id,session.nik,session.name,new Date().toISOString(),body.visible,device,browser,page.startsWith("/")?page:"/"];
  if(index>=0)await batchWriteRanges(MASTER,[{range:`'${TAB}'!A${index+2}:H${index+2}`,values:[values]}],email,key,"RAW");
  else{const reusable=rows.findIndex(r=>!r[0]||Date.now()-Date.parse(String(r[3]))>86400000);if(reusable>=0)await batchWriteRanges(MASTER,[{range:`'${TAB}'!A${reusable+2}:H${reusable+2}`,values:[values]}],email,key,"RAW");else await appendSheetValues(MASTER,`'${TAB}'!A:H`,[values],email,key,"RAW")}
  return NextResponse.json({ok:true},{headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({error:"Status online belum berhasil disimpan."},{status:503})}
}
