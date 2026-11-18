import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {readPromoSnapshots} from "@/lib/promo-board-store";
import {resolvePriceTickets} from "@/lib/price-ticket";

export const runtime="nodejs";
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"cache-control":"no-store"}});

export async function GET(request:NextRequest){
  if(!verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value))return json({error:"Sesi login berakhir. Silakan login kembali."},401);
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
  if(!email||!key)return json({error:"Koneksi pricelist belum tersedia."},503);
  try{
    const [active]=await readPromoSnapshots({email,key},1,{fresh:false});
    if(!active)return json({error:"Belum ada Pricelist Device aktif.",tickets:[]},409);
    return json({ok:true,source:{fileName:active.fileName,priceListDate:active.priceListDate,uploadedAt:active.uploadedAt},tickets:resolvePriceTickets(active.products)});
  }catch(error){
    return json({error:error instanceof Error?error.message:"Price Ticket gagal disinkronkan."},500);
  }
}
