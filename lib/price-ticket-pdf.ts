import {readFile} from "node:fs/promises";
import path from "node:path";
import {PDFDocument,StandardFonts,rgb} from "pdf-lib";
import placementsSource from "@/lib/price-ticket-placements.json";
import {monthly,ticketMonthly,type PriceTicketTemplate,type TicketSyncResult} from "@/lib/price-ticket";

type Placement={text:string;x:number;y:number;width:number;height:number};
const placements=placementsSource as Record<string,Placement[]>;
const numberKey=(value:string)=>Number(value.match(/\d[\d.]*/)?.[0].replaceAll(".","")||0);
const digits=(value:number)=>new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(value);
const replaceNumber=(source:string,value:number)=>source.replace(/\d[\d.]*/,digits(value));

export class PriceTicketPdfError extends Error{
  constructor(message:string,public status=409){super(message)}
}

export async function renderPriceTicketPdf(ticket:PriceTicketTemplate,resolved:TicketSyncResult){
  if(resolved.status==="BLOCKED")throw new PriceTicketPdfError("PDF diblokir karena ada SKU yang belum ditemukan atau memiliki harga konflik. Periksa status sinkronisasi lebih dulu.");
  const sourcePath=path.join(process.cwd(),"public","price-tickets","pdf",ticket.pdfFile);
  const original=await readFile(sourcePath);
  if(!resolved.changedCount)return original;
  const replacements=new Map<number,number>();
  for(const item of resolved.slots){
    if(item.status!=="CHANGED"||!item.currentFullPrice)continue;
    const pairs:[[number,number],[number,number]]=[[item.oldFullPrice,item.currentFullPrice],[item.oldMonthlyPrice??monthly(item.oldFullPrice),ticketMonthly(ticket,item.currentFullPrice)]];
    for(const [before,after] of pairs){
      const existing=replacements.get(before);
      if(existing!=null&&existing!==after)throw new PriceTicketPdfError("Perubahan harga menghasilkan nominal yang ambigu. PDF tidak diterbitkan.");
      replacements.set(before,after);
    }
  }
  const document=await PDFDocument.load(original),page=document.getPages()[0];
  const regular=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold);
  for(const placement of placements[ticket.id]??[]){
    const before=numberKey(placement.text),after=replacements.get(before);
    if(after==null)continue;
    const originalDigits=digits(before),nextDigits=digits(after);
    if(nextDigits.length>originalDigits.length)throw new PriceTicketPdfError(`Harga ${nextDigits} lebih panjang dari ruang master. PDF diblokir agar layout tidak terpotong.`);
    const text=replaceNumber(placement.text,after),font=placement.height>=13?bold:regular,fontSize=Math.max(5,placement.height*.86);
    const measured=font.widthOfTextAtSize(text,fontSize);
    if(measured>placement.width+3)throw new PriceTicketPdfError(`Nominal ${text} berisiko menggeser layout. PDF diblokir.`);
    const y=page.getHeight()-placement.y-placement.height;
    page.drawRectangle({x:placement.x-1,y:y-1,width:Math.max(placement.width,measured)+2,height:placement.height+2,color:rgb(1,1,1)});
    page.drawText(text,{x:placement.x,y:y+(placement.height-fontSize)*.35,size:fontSize,font,color:rgb(0,0,0)});
  }
  return Buffer.from(await document.save({useObjectStreams:false}));
}
