import type {jsPDF} from "jspdf";
import {CASH_CATEGORIES,CASH_LABELS,cashTotals,validatePettyCash,type PettyCash} from "./petty-cash";
export const PETTY_PDF_LIMIT=2_000_000;
export type ReceiptPhoto={id:string;name:string;pcv:string;blob:Blob;url:string};
export type PdfPhoto={data:Uint8Array;width:number;height:number;pcv:string;name:string};
const money=(value:number)=>`Rp${new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(value)}`;
const shortDate=(value:string)=>value?value.split("-").reverse().join("/"):"";
const paperDate=(value:string)=>value?new Date(`${value}T00:00:00Z`).toLocaleDateString("id-ID",{timeZone:"UTC",day:"2-digit",month:"long",year:"numeric"}):"";
export function drawPettyCashPdf(doc:jsPDF,input:PettyCash,photos:PdfPhoto[]){
 const data=validatePettyCash(input),totals=cashTotals(data),margin=12,width=273,columns=[22,14,82,31,31,31,31,31],x=[margin];
 for(const size of columns)x.push(x[x.length-1]+size);
 doc.setDrawColor(30);doc.setLineWidth(.2);doc.setTextColor(20);doc.setFont("helvetica","normal");
 const text=(value:string,left:number,top:number,size=8,bold=false)=>{doc.setFont("helvetica",bold?"bold":"normal");doc.setFontSize(size);doc.text(value,left,top)};
 const fit=(value:string,left:number,top:number,available:number,size=8,bold=false,align:"left"|"right"="left")=>{doc.setFont("helvetica",bold?"bold":"normal");let current=size;doc.setFontSize(current);while(doc.getTextWidth(value)>available&&current>4){current-=.25;doc.setFontSize(current)}doc.text(value,left,top,{align})};
 const header=(page:number)=>{
  doc.rect(margin,10,width,187);doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text("PETTY CASH REPLENISHMENT SUMMARY",148.5,17,{align:"center"});
  text("Store Name :",15,28);text("Digimap",69,28,8,true);text("Store Code :",15,37);text("M238",69,37,8,true);text("Location :",15,46);text("Pondok Indah Mall 2",69,46,8,true);
  text("PCRS No. :",188,27);fit(data.pcrs,221,27,60,8,true);text("Date :",188,35);fit(paperDate(data.date),221,35,60,8,true);
  doc.rect(185,39,100,13);text("Received by Cash Management",188,43,7,true);text(`Date : ${paperDate(data.receivedDate)}`,188,49,7);
  if(page>1)text(`Lanjutan ${page}`,15,53,6);
  const labels=["Date","PCV No.","Description",...CASH_CATEGORIES.map(key=>CASH_LABELS[key])];
  labels.forEach((label,i)=>{doc.rect(x[i],55,columns[i],8);fit(label,x[i]+2,60,columns[i]-4,7,true,"left");});
 };
 let page=1,y=63;header(page);
 for(const row of data.rows){
  doc.setFontSize(7);doc.setFont("helvetica","normal");const lines=doc.splitTextToSize(row.description,78) as string[],rowH=Math.max(6,lines.length*3+2);
  if(y+rowH>147){doc.addPage("a4","landscape");page++;header(page);y=63}
  columns.forEach((size,i)=>doc.rect(x[i],y,size,rowH));
  fit(shortDate(row.date),x[0]+1,y+4,20,7);fit(row.pcv,x[1]+1,y+4,12,7);doc.setFontSize(7);doc.text(lines,x[2]+2,y+4);
  CASH_CATEGORIES.forEach((key,i)=>{if(row[key])fit(money(Number(row[key].replace(/\./g,""))),x[i+4]-1,y+4,29,7,false,"right")});y+=rowH;
 }
 columns.forEach((size,i)=>doc.rect(x[i],y,size,7));text("Total per kategori",15,y+4.5,7,true);CASH_CATEGORIES.forEach((key,i)=>fit(money(totals.categories[key]),x[i+4]-1,y+4.5,29,7,true,"right"));y+=7;
 // The fixed footer leaves room for readable signatures on every final summary page.
 const footer=y,leftWidth=105,financeWidth=64,requestWidth=104;
 doc.rect(margin,footer,width,44);doc.line(margin+leftWidth,footer,margin+leftWidth,footer+44);
 const summary=[["Grand Total",money(totals.grandTotal)],["Payment (Round)",money(totals.payment)],["Petty Cash Fund",data.fund?money(Number(data.fund.replace(/\./g,""))):""],["PC in proses",data.inProcess?money(Number(data.inProcess.replace(/\./g,""))):""],["Sisa Saldo",money(totals.balance)]];
 summary.forEach(([label,value],i)=>{text(label,15,footer+4+i*5,7,true);fit(value,114,footer+4+i*5,63,7,true,"right");doc.line(12,footer+6+i*5,117,footer+6+i*5)});
 text("Distribution:",15,footer+32,6,true);text("1. Original: Attached to PCRS",15,footer+37,6);text("2. Copy: file",15,footer+41,6);
 const financeX=margin+leftWidth,requestX=financeX+financeWidth;
 doc.line(requestX,footer,requestX,footer+44);doc.line(financeX,footer+6,285,footer+6);doc.line(financeX,footer+35,285,footer+35);
 text("Cash Management Dept",financeX+7,footer+4,7,true);text("Requestor",requestX+36,footer+4,7,true);
 ["Checked & Coded","Approved"].forEach((label,i)=>{const start=financeX+i*financeWidth/2;if(i)doc.line(start,footer+6,start,footer+44);fit(label,start+2,footer+11,28,6,true);text("Finance Department",start+2,footer+41,5.5)});
 [["Prepared by",data.preparedBy,"PIC"],["Approved by",data.approvedBy,"OIC"],["Approved by",data.rh,"RH"]].forEach(([label,name,role],i)=>{const start=requestX+i*requestWidth/3;if(i)doc.line(start,footer+6,start,footer+44);text(label,start+2,footer+11,6.5,true);fit(name,start+2,footer+34,30,6.5);text(role,start+13,footer+41,6,true)});
 for(const photo of photos){
  doc.addPage("a4","portrait");text(`M238 - BUKTI PEMBELIAN${photo.pcv?` - PCV ${photo.pcv}`:""}`,12,12,9,true);
  fit(photo.name,12,18,186,7);const scale=Math.min(186/photo.width,258/photo.height),w=photo.width*scale,h=photo.height*scale;
  doc.addImage(photo.data,"JPEG",(210-w)/2,25+(258-h)/2,w,h,undefined,"FAST");
 }
 const total=doc.getNumberOfPages();for(let i=1;i<=total;i++){doc.setPage(i);text(`${i} / ${total}`,doc.internal.pageSize.getWidth()-23,doc.internal.pageSize.getHeight()-5,6)}
 return doc;
}
export async function imageFromBlob(blob:Blob){
 const url=URL.createObjectURL(blob);
 try{return await new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error("Foto tidak dapat dibaca. Gunakan JPG, PNG, atau WebP; untuk HEIC pilih ekspor JPG dari galeri."));image.src=url})}finally{URL.revokeObjectURL(url)}
}
async function compressImage(image:HTMLImageElement,longEdge:number,quality:number){
 const scale=Math.min(1,longEdge/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
 const context=canvas.getContext("2d");if(!context)throw Error("Perangkat belum dapat memproses foto.");context.fillStyle="#fff";context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error("Foto gagal dikompres.")),"image/jpeg",quality));canvas.width=1;canvas.height=1;
 return{blob,width:Math.max(1,Math.round(image.naturalWidth*scale)),height:Math.max(1,Math.round(image.naturalHeight*scale))};
}
export async function prepareReceipt(file:File){
 if(file.size>30_000_000)throw Error(`${file.name}: foto melebihi 30 MB.`);
 if(!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type)&&!(/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)&&!file.type))throw Error(`${file.name}: pilih file foto JPG, PNG, WebP, atau HEIC.`);
 const image=await imageFromBlob(file);try{return(await compressImage(image,2200,.9)).blob}finally{image.src=""}
}
export async function fitPdfBudget(render:(edge:number,quality:number)=>Promise<Blob>,progress?:(step:number)=>void){
 const presets=[[2000,.88],[1800,.78],[1600,.68],[1400,.58],[1200,.48],[1100,.42]];
 for(let index=0;index<presets.length;index++){progress?.(index+1);const blob=await render(presets[index][0],presets[index][1]);if(blob.size<=PETTY_PDF_LIMIT)return blob}
 throw Error("PDF masih melebihi 2 MB. Kurangi jumlah foto atau potong area kosong pada foto, lalu coba lagi. File belum diunduh.");
}
export async function exportPettyCashPdf(data:PettyCash,photos:ReceiptPhoto[],progress?:(text:string)=>void){
 validatePettyCash(data);const{jsPDF}=await import("jspdf");
 return fitPdfBudget(async(edge,quality)=>{
  const encoded:PdfPhoto[]=[];
  for(let i=0;i<photos.length;i++){progress?.(`Memproses bukti ${i+1}/${photos.length}…`);const photo=photos[i],image=await imageFromBlob(photo.blob);try{const compressed=await compressImage(image,edge,quality);encoded.push({data:new Uint8Array(await compressed.blob.arrayBuffer()),width:compressed.width,height:compressed.height,pcv:photo.pcv,name:photo.name})}finally{image.src=""}}
  const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4",compress:true});drawPettyCashPdf(doc,data,encoded);return doc.output("blob");
 },step=>progress?.(step===1?"Menyiapkan PDF…":`Mengompres agar maksimal 2 MB · tahap ${step}…`));
}
