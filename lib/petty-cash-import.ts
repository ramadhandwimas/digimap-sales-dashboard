import {prepareReceipt} from "./petty-cash-pdf";
export const MAX_RECEIPT_PAGES=24;
export type PreparedReceipt={name:string;blob:Blob};
export function receiptKind(file:Pick<File,"type"|"name">){
 if(file.type==="application/pdf"||/\.pdf$/i.test(file.name))return "pdf";
 if(/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type)||(!file.type&&/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)))return "image";
 throw Error(`${file.name}: pilih foto atau PDF bukti pembelian.`);
}
export function checkReceiptPages(count:number,remaining:number){
 if(!Number.isInteger(count)||count<1)throw Error("PDF tidak memiliki halaman yang dapat dilampirkan.");
 if(count>remaining)throw Error(`PDF berisi ${count} halaman, sedangkan tempat tersisa ${remaining}. Batas total ${MAX_RECEIPT_PAGES} halaman bukti; PDF ini belum ditambahkan.`);
}
export async function preparePdfReceipts(file:File,remaining:number,progress?:(text:string)=>void):Promise<PreparedReceipt[]>{
 if(file.size>30_000_000)throw Error(`${file.name}: ukuran PDF melebihi 30 MB.`);
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(!new TextDecoder().decode(bytes.subarray(0,1024)).includes("%PDF-"))throw Error(`${file.name}: isi file bukan PDF yang valid.`);
 const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs"),base=`/pdf-assets/${pdfjs.version}/`;
 pdfjs.GlobalWorkerOptions.workerSrc=`${base}pdf.worker.min.mjs`;
 const loading=pdfjs.getDocument({data:bytes,cMapUrl:`${base}cmaps/`,cMapPacked:true,standardFontDataUrl:`${base}standard_fonts/`,wasmUrl:`${base}wasm/`,iccUrl:`${base}iccs/`,enableXfa:false,stopAtErrors:true});
 try{
  const pdf=await loading.promise;checkReceiptPages(pdf.numPages,remaining);const result:PreparedReceipt[]=[];
  for(let number=1;number<=pdf.numPages;number++){
   progress?.(`${file.name} · halaman ${number}/${pdf.numPages}…`);
   const page=await pdf.getPage(number),original=page.getViewport({scale:1}),scale=Math.min(3,2200/Math.max(original.width,original.height)),viewport=page.getViewport({scale});
   const canvas=document.createElement("canvas");canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   try{
    const context=canvas.getContext("2d");if(!context)throw Error("Perangkat belum dapat memproses halaman PDF.");
    await page.render({canvas,canvasContext:context,viewport,background:"#ffffff",intent:"print"}).promise;
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error("Halaman PDF gagal dikonversi.")),"image/jpeg",.9));
    result.push({name:`${file.name} - halaman ${number}`,blob});
   }finally{canvas.width=1;canvas.height=1;page.cleanup()}
  }
  return result;
 }catch(error){
  if(error instanceof Error&&error.name==="PasswordException")throw Error(`${file.name}: PDF terkunci. Buka kunci/password file terlebih dahulu, lalu upload kembali.`);
  throw error instanceof Error?error:Error(`${file.name}: PDF gagal dibaca. Pilih file PDF lain.`);
 }finally{await loading.destroy()}
}
export async function prepareReceiptFile(file:File,remaining:number,progress?:(text:string)=>void):Promise<PreparedReceipt[]>{
 const kind=receiptKind(file);
 if(kind==="pdf")return preparePdfReceipts(file,remaining,progress);
 checkReceiptPages(1,remaining);return [{name:file.name,blob:await prepareReceipt(file)}];
}
