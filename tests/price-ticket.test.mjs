import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import test from "node:test";
import ts from "typescript";

function load(){
 const source=fs.readFileSync(new URL("../lib/price-ticket.ts",import.meta.url),"utf8");
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const module={exports:{}};
 new Function("require","module","exports",code)(name=>{
  if(name==="@/lib/promo-board-catalog")return{parsePromoSku:product=>product.meta};
  throw new Error(`Unexpected import ${name}`);
 },module,module.exports);
 return module.exports;
}

const {PRICE_TICKETS,resolvePriceTickets}=load();
const hashes={
 "apple-watch.docx":"937c18c21d089898c9220b8069aa183b2a69e226e9b53470a4dd42caeeb01494",
 "apple-watch-se3-series12.docx":"50b9815db154c1f98afec6d31c62ddd10fbf7e7cd265bd7c9060848c64414139",
 "ipad-13.docx":"09d42f389715101c3a3f79528bcccabc84b27b2728f8a17642d272f67988743c",
 "ipad-11.docx":"1f446ac631039a9cb70b58080776b4d29074a92508eac6fcf027db1b47e49955",
 "iphone-16.docx":"2f919d5400e41cd4eacd0c7db0f65b8147846e807ddf217d6cacd4b0c838f03b",
 "iphone-17.docx":"1a57b16c99205dbe0d6b54e8f3803d9225a328750fdfe5368acac76ed99ce855",
 "iphone-15.docx":"1edfe9da5bc30d68576e8c517f701dcc2dd8813cc37f424aa14b684c47352a13",
 "iphone-17-pro-max.docx":"9e37f94c19cee5cee6c06666be2d5042a88b018e4099fe9674577fbb43ecd267",
 "iphone-17e.docx":"2db0bd4d814138e807434f429133006936b1dfd146c80bc714b9dfa766f19fbd",
 "iphone-18-pro.docx":"f7bbd3d6f2d5bb36dd6da6e62a73f80c2ec781e056428b16b238ba5be967c78b",
 "iphone-18-pro-max.docx":"8a0ff400cae137a102fd041d359dc2455abb5b31e48a0864e590522b1ec1bd94",
 "iphone-air.docx":"c4fa557e5a24cebb2cef42d0935d7bc8b23a16d3314971cbb1910cba389894d1",
 "iphone-duo.docx":"3bf714b417b534840cee93c1d4ea00347337dbecfe834f06b0c8622f751bff4a",
 "mac-mini-studio-display.docx":"aaa5eedca58929da51e26c9181174611a170f2cb1d086c486ea48ea6e46bbd9f",
 "macbook-air-13-m5.docx":"2d49741a7136fe7b46f837866bf5e66f4d3dc0f22058c8be5e7fcf3441c446c1",
 "macbook-air-15-m5.docx":"fdd7bbdcfb4a38adecaf61b37579dfd280b14d29ff3351e60cdca2b5f3316a5f",
 "macbook-neo.docx":"a456c02cef99c51d56c472f1ca297929e525fdaf922e5bfc7a49dd16aab03052",
 "macbook-pro-14-m5.docx":"52a8531a24fecc6b413e33f39a5f5527aaf12feb7bd8bf3f2b663cdc757a469e",
 "macbook-pro-16-m5.docx":"c87340702e99af0cbaa59fb6fb6894d5284179fda2a87a004a5d5f2d015e02c0",
};

test("all nineteen approved DOCX masters are fixed and tracked",()=>{
 assert.equal(PRICE_TICKETS.length,19);
 for(const [file,expected] of Object.entries(hashes)){
  const bytes=fs.readFileSync(new URL(`../public/price-tickets/master/${file}`,import.meta.url));
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),expected,file);
 }
});

test("inactive wording is replaced without leaving stale labels",async()=>{
 const JSZip=(await import("jszip")).default;
 const affected=new Set(["iphone-17e.docx","iphone-air.docx","iphone-18-pro.docx","iphone-18-pro-max.docx"]);
 for(const file of Object.keys(hashes)){
  const bytes=fs.readFileSync(new URL(`../public/price-tickets/master/${file}`,import.meta.url));
  const archive=await JSZip.loadAsync(bytes);
  const xml=await archive.file("word/document.xml").async("string");
  const text=xml.replace(/<[^>]+>/g,"");
  assert.doesNotMatch(text,/Belum diaktifkan/,file);
  if(affected.has(file))assert.match(text,/Mulai dari/,file);
 }
});

test("price matching is strict, color variants may repeat only one identical price",()=>{
 const duo=PRICE_TICKETS.find(item=>item.id==="iphone-duo");
 const products=duo.slots.flatMap(slot=>["Star White","Night Sky"].map((color,index)=>({
  sapArticle:`${slot.id}-${index}`,normalPrice:slot.oldFullPrice,promotionPrice:slot.oldFullPrice,meta:{...slot.match,color},
 })));
 const result=resolvePriceTickets(products).find(item=>item.id==="iphone-duo");
 assert.equal(result.status,"CURRENT");assert.equal(result.warningCount,0);assert.equal(result.changedCount,0);
});

test("changed price is reported and conflicting prices block publication",()=>{
 const ticket=PRICE_TICKETS.find(item=>item.id==="iphone-17e"),[a,b]=ticket.slots;
 const changed=resolvePriceTickets([
  {sapArticle:"A",normalPrice:a.oldFullPrice+1_000_000,meta:a.match},
  {sapArticle:"B",normalPrice:b.oldFullPrice,meta:b.match},
 ]).find(item=>item.id==="iphone-17e");
 assert.equal(changed.status,"CHANGED");assert.equal(changed.changedCount,1);
 const blocked=resolvePriceTickets([
  {sapArticle:"A1",normalPrice:a.oldFullPrice,meta:a.match},
  {sapArticle:"A2",normalPrice:a.oldFullPrice+500_000,meta:a.match},
  {sapArticle:"B",normalPrice:b.oldFullPrice,meta:b.match},
 ]).find(item=>item.id==="iphone-17e");
 assert.equal(blocked.status,"BLOCKED");assert.equal(blocked.slots[0].status,"CONFLICT");
});

test("UI contains no create, template editor, or extra pricelist upload",()=>{
 const source=fs.readFileSync(new URL("../components/price-ticket-workspace.tsx",import.meta.url),"utf8");
 assert.doesNotMatch(source,/Create Price Ticket|Template Editor|Upload Pricelist/i);
 assert.match(source,/print tetap 100% Actual Size/);
 assert.match(source,/Print multiple/);
 assert.match(source,/price-ticket\/batch/);
 assert.doesNotMatch(source,/<iframe/);
});

test("changed prices update the original Word before PDF conversion, never redraw text",()=>{
 const pdf=fs.readFileSync(new URL("../lib/price-ticket-pdf.ts",import.meta.url),"utf8");
 const docx=fs.readFileSync(new URL("../lib/price-ticket-docx.ts",import.meta.url),"utf8");
 const ui=fs.readFileSync(new URL("../components/price-ticket-workspace.tsx",import.meta.url),"utf8");
 assert.doesNotMatch(pdf,/StandardFonts|drawText|drawRectangle|drawLine/);
 assert.match(pdf,/renderPriceTicketDocx/);
 assert.match(pdf,/convertDocxToPdf/);
 assert.match(docx,/word\/document\.xml/);
 assert.match(docx,/replaceAcrossTextRuns/);
 assert.match(docx,/panjang berbeda dari master Word/);
 assert.match(ui,/Word Format Asli/);
 assert.match(ui,/Edit harga manual/);
 assert.match(ui,/Terapkan ke preview/);
});

test("all print PDFs preserve one A4 page at actual physical size",async()=>{
 const {PDFDocument}=await import("pdf-lib");
 for(const ticket of PRICE_TICKETS){
  const bytes=fs.readFileSync(new URL(`../public/price-tickets/pdf/${ticket.pdfFile}`,import.meta.url));
  const pdf=await PDFDocument.load(bytes),pages=pdf.getPages();
  assert.equal(pages.length,1,ticket.pdfFile);
  const {width,height}=pages[0].getSize();
  assert.ok(Math.abs(width-595.304)<0.02,`${ticket.pdfFile} width ${width}`);
  assert.ok(Math.abs(height-841.89)<0.02,`${ticket.pdfFile} height ${height}`);
 }
});
