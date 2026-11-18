import {readFile} from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import {monthly,ticketMonthly,type PriceTicketTemplate,type TicketSyncResult} from "@/lib/price-ticket";

export class PriceTicketDocxError extends Error{
  constructor(message:string,public status=409){super(message)}
}

const digits=(value:number)=>new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(value);

function replaceAcrossTextRuns(paragraph:string,before:string,after:string){
  if(before.length!==after.length)throw new PriceTicketDocxError(`Nominal ${after} memiliki panjang berbeda dari master Word. Hasil diblokir agar format tidak bergeser.`);
  const pattern=/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  const matches=[...paragraph.matchAll(pattern)];
  if(!matches.length)return{xml:paragraph,count:0};
  const values=matches.map(match=>match[1]);
  const joined=values.join("");
  const offsets:number[]=[];
  let offset=0;
  for(const value of values){offsets.push(offset);offset+=value.length}
  let count=0,from=0,found=joined.indexOf(before,from);
  while(found>=0){
    for(let index=0;index<before.length;index++){
      const absolute=found+index;
      const node=offsets.findLastIndex(start=>start<=absolute);
      const local=absolute-offsets[node];
      values[node]=`${values[node].slice(0,local)}${after[index]}${values[node].slice(local+1)}`;
    }
    count++;from=found+before.length;found=joined.indexOf(before,from);
  }
  let node=0;
  return{xml:paragraph.replace(pattern,match=>match.replace(/(<w:t(?:\s[^>]*)?>)[\s\S]*?(<\/w:t>)/,`$1${values[node++]}$2`)),count};
}

export async function renderPriceTicketDocx(ticket:PriceTicketTemplate,resolved:TicketSyncResult){
  if(resolved.status==="BLOCKED")throw new PriceTicketDocxError("Word diblokir karena ada SKU yang belum ditemukan atau memiliki harga konflik. Periksa status sinkronisasi lebih dulu.");
  const source=await readFile(path.join(process.cwd(),"public","price-tickets","master",ticket.masterFile));
  if(!resolved.changedCount)return source;
  const replacements=new Map<number,number>();
  for(const item of resolved.slots){
    if(item.status!=="CHANGED"||!item.currentFullPrice)continue;
    const pairs:[[number,number],[number,number]]=[[item.oldFullPrice,item.currentFullPrice],[item.oldMonthlyPrice??monthly(item.oldFullPrice),ticketMonthly(ticket,item.currentFullPrice)]];
    for(const [before,after] of pairs){
      const existing=replacements.get(before);
      if(existing!=null&&existing!==after)throw new PriceTicketDocxError("Perubahan harga menghasilkan nominal yang ambigu. Word tidak diterbitkan.");
      replacements.set(before,after);
    }
  }
  const archive=await JSZip.loadAsync(source);
  const document=archive.file("word/document.xml");
  if(!document)throw new PriceTicketDocxError("Struktur master Word tidak valid.",500);
  let xml=await document.async("string");
  for(const [beforeValue,afterValue] of replacements){
    const before=digits(beforeValue),after=digits(afterValue);
    let count=0;
    xml=xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g,paragraph=>{
      const result=replaceAcrossTextRuns(paragraph,before,after);
      count+=result.count;
      return result.xml;
    });
    if(!count)throw new PriceTicketDocxError(`Nominal lama ${before} tidak ditemukan pada master Word. File tidak diterbitkan agar format tetap aman.`);
  }
  archive.file("word/document.xml",xml);
  return Buffer.from(await archive.generateAsync({type:"uint8array",compression:"DEFLATE",compressionOptions:{level:6}}));
}
