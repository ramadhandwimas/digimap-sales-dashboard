import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {compareAccessoryPriceLists,mapAccessorySuppliers,parseAccessoryPriceWorkbook,parseSupplierReferences,sameAccessoryPriceList} from "@/lib/promo-board-accessory";
import {readAccessorySnapshots,readAccessorySupplierRows,saveAccessorySnapshot} from "@/lib/promo-board-accessory-store";

export const runtime="nodejs";export const maxDuration=60;const MAX_BYTES=8*1024*1024;
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"cache-control":"no-store"}});
const auth=()=>{const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;return email&&key?{email,key}:null};
const authorized=(r:NextRequest)=>verifySessionToken(r.cookies.get(SESSION_COOKIE)?.value);
export async function GET(request:NextRequest){
 if(!authorized(request))return json({error:"Sesi login berakhir. Silakan login kembali."},401);const credentials=auth();if(!credentials)return json({error:"Koneksi Google Sheets belum dikonfigurasi."},503);
 try{const snapshots=await readAccessorySnapshots(credentials,6),active=snapshots[0]??null,previous=snapshots[1]??null;const history=snapshots.slice(1).map(s=>({id:s.id,uploadedAt:s.uploadedAt,fileName:s.fileName,priceListDate:s.priceListDate,totalRows:s.totalRows,totalSku:s.totalSku,totalBrand:s.totalBrand,totalCategory:s.totalCategory,warnings:s.warnings}));return json({ok:true,active,history,comparison:compareAccessoryPriceLists(previous,active)})}catch(e){console.error("Accessory Promo Board read failed",e);return json({error:e instanceof Error?e.message:"Pricelist ACC gagal dibaca."},500)}
}
export async function POST(request:NextRequest){
 if(!authorized(request))return json({error:"Sesi login berakhir. Silakan login kembali."},401);const origin=request.headers.get("origin");if(origin&&origin!==request.nextUrl.origin)return json({error:"Asal permintaan tidak valid."},403);if(Number(request.headers.get("content-length"))>MAX_BYTES+65536)return json({error:"Ukuran file maksimal 8 MB."},413);
 const credentials=auth();if(!credentials)return json({error:"Koneksi Google Sheets belum dikonfigurasi."},503);
 try{const form=await request.formData(),file=form.get("file"),mode=form.get("mode");if(!(file instanceof File)||!file.size||!/\.xlsx?$/i.test(file.name))return json({error:"Pilih file Pricelist ACC .xlsx atau .xls."},400);if(file.size>MAX_BYTES)return json({error:"Ukuran file maksimal 8 MB."},413);if(mode!=="preview"&&mode!=="activate")return json({error:"Mode Pricelist ACC tidak valid."},400);
  let parsed;try{parsed=parseAccessoryPriceWorkbook(await file.arrayBuffer(),file.name)}catch(e){return json({error:e instanceof Error?e.message:"File Pricelist ACC tidak valid."},422)}
  const supplierRows=await readAccessorySupplierRows(credentials);parsed={...parsed,products:mapAccessorySuppliers(parsed.products,parseSupplierReferences(supplierRows))};
  const snapshots=await readAccessorySnapshots(credentials,2),active=snapshots[0]??null,comparison=compareAccessoryPriceLists(active,parsed),identicalToActive=sameAccessoryPriceList(active,parsed);
  if(mode==="preview")return json({ok:true,preview:parsed,comparison,identicalToActive});if(parsed.blockingErrors)return json({error:`Aktivasi diblokir karena ${parsed.blockingErrors} masalah perlu diperiksa.`,preview:parsed,comparison},409);if(identicalToActive)return json({ok:true,noChange:true,message:"Pricelist ACC ini sama dengan data aktif. Tidak ada perubahan yang perlu disimpan.",active});
  const saved=await saveAccessorySnapshot(credentials,parsed);return json({ok:true,message:`Pricelist ACC ${parsed.fileName} berhasil dijadikan aktif.`,saved,active:{...parsed,...saved},previous:active,comparison});
 }catch(e){console.error("Accessory Promo Board upload failed",e);return json({error:e instanceof Error?e.message:"Pricelist ACC gagal diproses."},500)}
}
