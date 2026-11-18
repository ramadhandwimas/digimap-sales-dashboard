import {readFile} from "node:fs/promises";
import path from "node:path";
import {NextRequest,NextResponse} from "next/server";
import {PDFDocument,StandardFonts,rgb} from "pdf-lib";
import placementsSource from "@/lib/price-ticket-placements.json";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {readPromoSnapshots} from "@/lib/promo-board-store";
import {monthly,resolvePriceTickets,ticketById} from "@/lib/price-ticket";

export const runtime="nodejs";
type Placement={text:string;x:number;y:number;width:number;height:number};
const placements=placementsSource as Record<string,Placement[]>;
const numberKey=(value:string)=>Number(value.match(/\d[\d.]*/)?.[0].replaceAll(".","")||0);
const digits=(value:number)=>new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(value);
const replaceNumber=(source:string,value:number)=>source.replace(/\d[\d.]*/,digits(value));

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  if(!verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value))return NextResponse.json({error:"Sesi login berakhir."},{status:401});
  const {id}=await params,ticket=ticketById(id);
  if(!ticket)return NextResponse.json({error:"Master Price Ticket tidak ditemukan."},{status:404});
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
  if(!email||!key)return NextResponse.json({error:"Koneksi pricelist belum tersedia."},{status:503});
  try{
    const [active]=await readPromoSnapshots({email,key},1,{fresh:false});
    if(!active)return NextResponse.json({error:"Belum ada Pricelist Device aktif."},{status:409});
    const resolved=resolvePriceTickets(active.products).find(item=>item.id===id);
    if(!resolved||resolved.status==="BLOCKED")return NextResponse.json({error:"PDF diblokir karena ada SKU yang belum ditemukan atau memiliki harga konflik. Periksa status sinkronisasi lebih dulu."},{status:409});
    const sourcePath=path.join(process.cwd(),"public","price-tickets","pdf",ticket.pdfFile);
    const original=await readFile(sourcePath);
    const disposition=request.nextUrl.searchParams.get("download")==="1"?"attachment":"inline";
    if(!resolved.changedCount)return new NextResponse(original,{headers:{"content-type":"application/pdf","content-disposition":`${disposition}; filename="${ticket.id}.pdf"`,"cache-control":"no-store"}});

    const replacements=new Map<number,number>();
    for(const item of resolved.slots){
      if(item.status!=="CHANGED"||!item.currentFullPrice)continue;
      const pairs:[[number,number],[number,number]]=[[item.oldFullPrice,item.currentFullPrice],[monthly(item.oldFullPrice),monthly(item.currentFullPrice)]];
      for(const [before,after] of pairs){
        const existing=replacements.get(before);
        if(existing!=null&&existing!==after)return NextResponse.json({error:"Perubahan harga menghasilkan nominal yang ambigu. PDF tidak diterbitkan."},{status:409});
        replacements.set(before,after);
      }
    }
    const document=await PDFDocument.load(original),page=document.getPages()[0];
    const regular=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold);
    for(const placement of placements[id]??[]){
      const before=numberKey(placement.text),after=replacements.get(before);
      if(after==null)continue;
      const originalDigits=digits(before),nextDigits=digits(after);
      if(nextDigits.length>originalDigits.length)return NextResponse.json({error:`Harga ${nextDigits} lebih panjang dari ruang master. PDF diblokir agar layout tidak terpotong.`},{status:409});
      const text=replaceNumber(placement.text,after),font=placement.height>=13?bold:regular,fontSize=Math.max(5,placement.height*.86);
      const measured=font.widthOfTextAtSize(text,fontSize);
      if(measured>placement.width+3)return NextResponse.json({error:`Nominal ${text} berisiko menggeser layout. PDF diblokir.`},{status:409});
      const y=page.getHeight()-placement.y-placement.height;
      page.drawRectangle({x:placement.x-1,y:y-1,width:Math.max(placement.width,measured)+2,height:placement.height+2,color:rgb(1,1,1)});
      page.drawText(text,{x:placement.x,y:y+(placement.height-fontSize)*.35,size:fontSize,font,color:rgb(0,0,0)});
    }
    const bytes=await document.save({useObjectStreams:false});
    return new NextResponse(Buffer.from(bytes),{headers:{"content-type":"application/pdf","content-disposition":`${disposition}; filename="${ticket.id}-update.pdf"`,"cache-control":"no-store"}});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"PDF Price Ticket gagal dibuat."},{status:500});
  }
}
