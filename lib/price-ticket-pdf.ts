import {readFile} from "node:fs/promises";
import path from "node:path";
import type {PriceTicketTemplate,TicketSyncResult} from "@/lib/price-ticket";
import {renderPriceTicketDocx} from "@/lib/price-ticket-docx";
import {CloudConvertError,convertDocxToPdf} from "@/lib/cloudconvert-docx";

export class PriceTicketPdfError extends Error{
  constructor(message:string,public status=409){super(message)}
}

export async function renderPriceTicketPdf(ticket:PriceTicketTemplate,resolved:TicketSyncResult){
  if(resolved.status==="BLOCKED")throw new PriceTicketPdfError("PDF diblokir karena ada SKU yang belum ditemukan atau memiliki harga konflik. Periksa status sinkronisasi lebih dulu.");
  const sourcePath=path.join(process.cwd(),"public","price-tickets","pdf",ticket.pdfFile);
  const original=await readFile(sourcePath);
  if(!resolved.changedCount)return original;
  try{
    const docx=await renderPriceTicketDocx(ticket,resolved);
    return await convertDocxToPdf(docx,`${ticket.id}.docx`);
  }catch(error){
    if(error instanceof CloudConvertError)throw new PriceTicketPdfError(error.message,error.status);
    throw error;
  }
}
