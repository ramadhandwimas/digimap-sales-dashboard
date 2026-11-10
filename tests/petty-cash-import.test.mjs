import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const module={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync(new URL('../lib/petty-cash-import.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(()=>({prepareReceipt:async()=>new Blob(['photo'])}),module,module.exports);
const importer=module.exports;
test('mixed photo/PDF selection recognises PDF with missing MIME and rejects unrelated files',()=>{
 assert.equal(importer.receiptKind({name:'bukti.PDF',type:''}),'pdf');
 assert.equal(importer.receiptKind({name:'bukti',type:'application/pdf'}),'pdf');
 assert.equal(importer.receiptKind({name:'bukti.jpg',type:'image/jpeg'}),'image');
 assert.throws(()=>importer.receiptKind({name:'bukti.docx',type:'application/zip'}),/foto atau PDF/);
});
test('page limit counts every page instead of treating a multipage PDF as one receipt',()=>{
 assert.doesNotThrow(()=>importer.checkReceiptPages(24,24));assert.doesNotThrow(()=>importer.checkReceiptPages(2,2));
 assert.throws(()=>importer.checkReceiptPages(3,2),/3 halaman.*tersisa 2/);assert.throws(()=>importer.checkReceiptPages(25,24),/belum ditambahkan/);assert.throws(()=>importer.checkReceiptPages(0,24),/tidak memiliki halaman/);
});
test('renamed non-PDF files fail header validation rather than generating empty pages',async()=>{
 await assert.rejects(importer.prepareReceiptFile(new File(['not PDF'],'fake.pdf',{type:'application/pdf'}),24),/bukan PDF yang valid/);
 const pages=await importer.prepareReceiptFile(new File(['photo'],'bukti.jpg',{type:'image/jpeg'}),24);assert.equal(pages.length,1);assert.equal(pages[0].name,'bukti.jpg');assert.equal(await pages[0].blob.text(),'photo');
});
