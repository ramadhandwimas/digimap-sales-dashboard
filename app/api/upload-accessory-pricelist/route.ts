import {createHash} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {MAX_PRICELIST_BYTES,parsePricelist,planPricelist,type ImportPlan} from "@/lib/accessory-pricelist";
import {acquireImportLock,commitMaster,ImportError,readMaster,releaseImportLock} from "@/lib/accessory-pricelist-store";

export const runtime="nodejs";
export const maxDuration=60;
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"cache-control":"no-store"}});
const digest=(plan:ImportPlan)=>createHash("sha256").update(JSON.stringify(plan.rows)).digest("hex");
function summary(plan:ImportPlan){
 return{total:plan.total,newCount:plan.rows.length,existing:plan.existing,duplicates:plan.duplicates,ignored:plan.ignored,
  reviewCount:plan.review.length,preview:plan.rows.slice(0,50),review:plan.review.slice(0,100),planId:digest(plan)};
}

export async function POST(request:NextRequest){
 if(!verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value))return json({error:"Sesi login berakhir. Silakan login kembali."},401);
 const origin=request.headers.get("origin");
 if(origin&&origin!==request.nextUrl.origin)return json({error:"Asal permintaan tidak valid."},403);
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return json({error:"Koneksi Google Sheets belum dikonfigurasi."},503);
 if(Number(request.headers.get("content-length"))>MAX_PRICELIST_BYTES+65536)return json({error:"Ukuran file maksimal 4 MB."},413);
 const credentials={email,key};
 let lock:string|undefined,commitAttempted=false;
 try{
  const form=await request.formData(),file=form.get("file"),mode=form.get("mode");
  if(!(file instanceof File)||!file.size||! /\.xlsx?$/i.test(file.name))return json({error:"Pilih file pricelist Excel .xlsx atau .xls."},400);
  if(file.size>MAX_PRICELIST_BYTES)return json({error:"Ukuran file maksimal 4 MB."},413);
  if(mode!=="preview"&&mode!=="import")return json({error:"Mode upload tidak valid."},400);
  let parsed:ReturnType<typeof parsePricelist>;
  try{parsed=parsePricelist(await file.arrayBuffer())}catch(error){return json({error:error instanceof Error?error.message:"File tidak valid."},422)}
  if(mode==="import")lock=await acquireImportLock(credentials);
  const snapshot=await readMaster(credentials);
  const plan=planPricelist(parsed.items,snapshot.master,snapshot.suppliers,parsed.ignored);
  const result=summary(plan);
  if(mode==="preview")return json({ok:true,...result});
  if(form.get("planId")!==result.planId)return json({error:"Isi Master berubah sejak pengecekan. Periksa hasil terbaru lalu simpan kembali.",...result},409);
  if(!plan.rows.length)return json({ok:true,imported:0,...result,message:"Tidak ada aksesoris baru yang siap ditambahkan."});
  commitAttempted=true;
  await commitMaster(credentials,snapshot,plan.rows,lock!);
  lock=undefined;
  return json({ok:true,...result,imported:plan.rows.length,message:`${plan.rows.length} aksesoris baru berhasil ditambahkan ke Master.`});
 }catch(error){
  if(error instanceof ImportError&&error.safeToUnlock)commitAttempted=false;
  return json({error:error instanceof ImportError?error.message:commitAttempted?"Hasil simpan belum terkonfirmasi. Cek pricelist ulang sebelum mencoba lagi.":error instanceof Error?error.message:"Pricelist gagal diproses."},error instanceof ImportError?error.status:500);
 }finally{
  // After an ambiguous write, retain the lock instead of racing a still-running
  // Google request. A successful batch releases it atomically with the rows.
  if(lock&&!commitAttempted)await releaseImportLock(credentials,lock).catch(()=>console.error("Pricelist import lock cleanup failed"));
 }
}
