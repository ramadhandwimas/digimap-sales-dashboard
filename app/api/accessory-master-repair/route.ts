import {createHash} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {planMasterRepairs,type RepairPlan} from "@/lib/accessory-master-repair";
import {acquireImportLock,commitMasterRepairs,ImportError,readMaster,releaseImportLock} from "@/lib/accessory-pricelist-store";

export const runtime="nodejs";
export const maxDuration=60;
const MAX_REPAIRS=200;
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"cache-control":"no-store"}});
const digest=(plan:RepairPlan)=>createHash("sha256").update(JSON.stringify(plan.candidates.map(item=>[item.id,item.current,item.proposed]))).digest("hex");
function summary(plan:RepairPlan){
 return{checked:plan.checked,fixableCount:plan.candidates.length,reviewCount:plan.review.length,
  candidates:plan.candidates.slice(0,MAX_REPAIRS),review:plan.review.slice(0,100),hasMore:plan.candidates.length>MAX_REPAIRS,planId:digest(plan)};
}

export async function POST(request:NextRequest){
 if(!verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value))return json({error:"Sesi login berakhir. Silakan login kembali."},401);
 const origin=request.headers.get("origin");
 if(origin&&origin!==request.nextUrl.origin)return json({error:"Asal permintaan tidak valid."},403);
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return json({error:"Koneksi Google Sheets belum dikonfigurasi."},503);
 let body:{mode?:unknown;planId?:unknown;selected?:unknown};
 try{body=await request.json()}catch{return json({error:"Permintaan perbaikan tidak valid."},400)}
 if(body.mode!=="preview"&&body.mode!=="apply")return json({error:"Mode perbaikan tidak valid."},400);
 const selected=Array.isArray(body.selected)?body.selected.filter((id):id is string=>typeof id==="string"):[];
 if(body.mode==="apply"&&(!selected.length||selected.length>MAX_REPAIRS))return json({error:`Pilih 1–${MAX_REPAIRS} baris untuk diperbaiki.`},400);
 const credentials={email,key};
 let lock:string|undefined,commitAttempted=false;
 try{
  if(body.mode==="apply")lock=await acquireImportLock(credentials);
  const snapshot=await readMaster(credentials),plan=planMasterRepairs(snapshot.master,snapshot.suppliers),result=summary(plan);
  if(body.mode==="preview")return json({ok:true,...result});
  if(body.planId!==result.planId)return json({error:"Isi Master berubah sejak pengecekan. Jalankan Cek & Perbaiki Master kembali.",...result},409);
  const chosen=new Set(selected),repairs=plan.candidates.filter(item=>chosen.has(item.id));
  if(repairs.length!==chosen.size)return json({error:"Pilihan perbaikan sudah tidak sesuai kondisi Master terbaru. Cek kembali.",...result},409);
  commitAttempted=true;
  await commitMasterRepairs(credentials,snapshot.sheet,repairs,lock!);
  lock=undefined;
  return json({ok:true,...result,applied:repairs.length,message:`${repairs.length} baris Master berhasil diperbaiki.`});
 }catch(error){
  if(error instanceof ImportError&&error.safeToUnlock)commitAttempted=false;
  return json({error:error instanceof ImportError?error.message:commitAttempted?"Hasil perbaikan belum terkonfirmasi. Cek Master sebelum mencoba lagi.":error instanceof Error?error.message:"Master gagal diperiksa."},error instanceof ImportError?error.status:500);
 }finally{
  if(lock&&!commitAttempted)await releaseImportLock(credentials,lock).catch(()=>console.error("Master repair lock cleanup failed"));
 }
}
