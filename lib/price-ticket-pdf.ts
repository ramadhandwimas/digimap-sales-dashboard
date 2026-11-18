import {readFile} from "node:fs/promises";
import path from "node:path";
import type {PriceTicketTemplate,TicketSyncResult} from "@/lib/price-ticket";

export class PriceTicketPdfError extends Error{
  constructor(message:string,public status=409){super(message)}
}

export async function renderPriceTicketPdf(ticket:PriceTicketTemplate,resolved:TicketSyncResult){
  if(resolved.status==="BLOCKED")throw new PriceTicketPdfError("PDF diblokir karena ada SKU yang belum ditemukan atau memiliki harga konflik. Periksa status sinkronisasi lebih dulu.");
  const sourcePath=path.join(process.cwd(),"public","price-tickets","pdf",ticket.pdfFile);
  const original=await readFile(sourcePath);
  if(!resolved.changedCount)return original;
  throw new PriceTicketPdfError("Harga berubah. Gunakan file Word hasil sinkronisasi agar font, garis, dan format master tetap persis. PDF tidak diterbitkan dari metode gambar ulang.");
}
