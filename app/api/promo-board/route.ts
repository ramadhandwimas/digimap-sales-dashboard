import {NextRequest,NextResponse} from "next/server";
import {createHash} from "node:crypto";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {parsePromoWorkbook} from "@/lib/promo-board-parser";
import {comparePromoPriceLists} from "@/lib/promo-board-insights";
import {readPromoSnapshots,savePromoSnapshot} from "@/lib/promo-board-store";

export const runtime="nodejs";
export const maxDuration=60;
const MAX_BYTES=8*1024*1024;
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"cache-control":"no-store"}});

function snapshotKey(snapshot:{products:Array<Record<string,unknown>>}){
  const rows=snapshot.products.map(product=>({
    sapArticle:product.sapArticle,sapDescription:product.sapDescription,category:product.category,section:product.section,
    normalPrice:product.normalPrice,promotionPrice:product.promotionPrice,remarks:product.remarks,
    promotionInstallmentBundling:product.promotionInstallmentBundling,promotionCashBundling:product.promotionCashBundling,
    brZout:product.brZout,eolStatus:product.eolStatus,promoStartDate:product.promoStartDate,promoEndDate:product.promoEndDate,promoPeriodType:product.promoPeriodType,
  })).sort((left,right)=>String(left.sapArticle).localeCompare(String(right.sapArticle)));
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

function credentials(){
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
  return email&&key?{email,key}:null;
}

function authorized(request:NextRequest){
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function GET(request:NextRequest){
  if(!authorized(request))return json({error:"Sesi login berakhir. Silakan login kembali."},401);
  const auth=credentials();
  if(!auth)return json({error:"Koneksi Google Sheets belum dikonfigurasi."},503);
  try{
    const snapshots=await readPromoSnapshots(auth,6);
    return json({ok:true,active:snapshots[0]??null,history:snapshots.slice(1)});
  }catch(error){
    console.error("Promo Board read failed",error);
    return json({error:error instanceof Error?error.message:"Promo Board gagal dibaca."},500);
  }
}

export async function POST(request:NextRequest){
  if(!authorized(request))return json({error:"Sesi login berakhir. Silakan login kembali."},401);
  const origin=request.headers.get("origin");
  if(origin&&origin!==request.nextUrl.origin)return json({error:"Asal permintaan tidak valid."},403);
  if(Number(request.headers.get("content-length"))>MAX_BYTES+65536)return json({error:"Ukuran file maksimal 8 MB."},413);
  const auth=credentials();
  if(!auth)return json({error:"Koneksi Google Sheets belum dikonfigurasi."},503);

  try{
    const form=await request.formData();
    const file=form.get("file"),mode=form.get("mode");
    if(!(file instanceof File)||!file.size||!/\.xlsx?$/i.test(file.name))return json({error:"Pilih file Pricelist Digimap .xlsx atau .xls."},400);
    if(file.size>MAX_BYTES)return json({error:"Ukuran file maksimal 8 MB."},413);
    if(mode!=="preview"&&mode!=="activate")return json({error:"Mode Promo Board tidak valid."},400);

    let parsed;
    try{parsed=parsePromoWorkbook(await file.arrayBuffer(),file.name)}catch(error){return json({error:error instanceof Error?error.message:"File Pricelist tidak valid."},422)}
    if(!parsed.totalSku)return json({error:"Tidak ditemukan SKU device yang valid."},422);

    const snapshots=await readPromoSnapshots(auth,2);
    const active=snapshots[0]??null;
    const comparison=comparePromoPriceLists(active,parsed);
    const planId=snapshotKey(parsed);
    const duplicate=Boolean(active&&snapshotKey(active)===planId);
    if(mode==="preview")return json({ok:true,preview:parsed,comparison,planId,duplicate});

    if(String(form.get("planId")??"")!==planId)return json({error:"Pricelist berubah setelah preview. Silakan preview ulang sebelum mengaktifkan."},409);
    if(duplicate)return json({ok:true,duplicate:true,message:"Pricelist ini sama dengan Pricelist aktif. Tidak ada data atau riwayat baru yang ditambahkan.",active,comparison});

    const saved=await savePromoSnapshot(auth,parsed);
    return json({ok:true,message:`Pricelist ${parsed.fileName} berhasil dijadikan aktif.`,saved,active:{...parsed,...saved},previous:active,comparison});
  }catch(error){
    console.error("Promo Board upload failed",error);
    return json({error:error instanceof Error?error.message:"Pricelist gagal diproses."},500);
  }
}
