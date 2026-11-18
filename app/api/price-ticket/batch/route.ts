import {NextRequest,NextResponse} from "next/server";
import {PDFDocument} from "pdf-lib";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {readPromoSnapshots} from "@/lib/promo-board-store";
import {PRICE_TICKETS,resolvePriceTickets} from "@/lib/price-ticket";
import {PriceTicketPdfError,renderPriceTicketPdf} from "@/lib/price-ticket-pdf";

export const runtime="nodejs";

export async function GET(request:NextRequest){
  if(!verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value))return NextResponse.json({error:"Sesi login berakhir."},{status:401});
  const ids=[...new Set((request.nextUrl.searchParams.get("ids")||"").split(",").map(item=>item.trim()).filter(Boolean))];
  if(!ids.length)return NextResponse.json({error:"Pilih minimal satu Price Ticket."},{status:400});
  if(ids.length>PRICE_TICKETS.length)return NextResponse.json({error:"Jumlah Price Ticket tidak valid."},{status:400});
  const tickets=ids.map(id=>PRICE_TICKETS.find(item=>item.id===id));
  if(tickets.some(item=>!item))return NextResponse.json({error:"Ada master Price Ticket yang tidak ditemukan."},{status:404});
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
  if(!email||!key)return NextResponse.json({error:"Koneksi pricelist belum tersedia."},{status:503});
  try{
    const [active]=await readPromoSnapshots({email,key},1,{fresh:false});
    if(!active)return NextResponse.json({error:"Belum ada Pricelist Device aktif."},{status:409});
    const resolvedById=new Map(resolvePriceTickets(active.products).map(item=>[item.id,item]));
    const merged=await PDFDocument.create();
    for(const ticket of tickets){
      if(!ticket)continue;
      const resolved=resolvedById.get(ticket.id);
      if(!resolved)throw new PriceTicketPdfError(`Sinkronisasi ${ticket.title} tidak ditemukan.`,404);
      const source=await PDFDocument.load(await renderPriceTicketPdf(ticket,resolved));
      const pages=await merged.copyPages(source,source.getPageIndices());
      for(const page of pages)merged.addPage(page);
    }
    const bytes=await merged.save({useObjectStreams:false});
    return new NextResponse(Buffer.from(bytes),{headers:{"content-type":"application/pdf","content-disposition":"inline; filename=price-ticket-multiple.pdf","cache-control":"no-store"}});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Gabungan Price Ticket gagal dibuat."},{status:error instanceof PriceTicketPdfError?error.status:500});
  }
}
