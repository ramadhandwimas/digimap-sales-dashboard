import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {PriceTicketDocxError,renderPriceTicketDocx} from "@/lib/price-ticket-docx";
import {readPromoSnapshots} from "@/lib/promo-board-store";
import {resolvePriceTickets,ticketById} from "@/lib/price-ticket";
import {applyPriceOverrides,parsePriceOverrides} from "@/lib/price-ticket-overrides";

export const runtime="nodejs";

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  if(!verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value))return NextResponse.json({error:"Sesi login berakhir."},{status:401});
  const {id}=await params,ticket=ticketById(id);
  if(!ticket)return NextResponse.json({error:"Master Price Ticket tidak ditemukan."},{status:404});
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
  if(!email||!key)return NextResponse.json({error:"Koneksi pricelist belum tersedia."},{status:503});
  try{
    const [active]=await readPromoSnapshots({email,key},1,{fresh:false});
    if(!active)return NextResponse.json({error:"Belum ada Pricelist Device aktif."},{status:409});
    const sourceResolved=resolvePriceTickets(active.products).find(item=>item.id===id);
    const resolved=sourceResolved?applyPriceOverrides(ticket,sourceResolved,parsePriceOverrides(request.nextUrl.searchParams.get("prices"))):null;
    if(!resolved)return NextResponse.json({error:"Hasil sinkronisasi Price Ticket tidak ditemukan."},{status:404});
    const bytes=await renderPriceTicketDocx(ticket,resolved);
    return new NextResponse(bytes,{headers:{
      "content-type":"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition":`attachment; filename="${ticket.id}${resolved.changedCount?"-update":""}.docx"`,
      "cache-control":"no-store",
    }});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Word Price Ticket gagal dibuat."},{status:error instanceof PriceTicketDocxError?error.status:500});
  }
}
