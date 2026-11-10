import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(path,resolve){const module={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(resolve,module,module.exports);return module.exports}
const cash=load('../lib/petty-cash.ts',require),pdf=load('../lib/petty-cash-pdf.ts',id=>id==='./petty-cash'?cash:require(id)),{jsPDF}=require('jspdf');
test('PDF budget checks final bytes and returns only files at most 2,000,000 bytes',async()=>{
 const attempts=[],out=await pdf.fitPdfBudget(async(edge,quality)=>{attempts.push([edge,quality]);return new Blob([new Uint8Array(attempts.length===1?2_000_001:1_999_999)])});
 assert.equal(out.size,1_999_999);assert.equal(attempts.length,2);assert.ok(attempts[1][0]<attempts[0][0]);
 assert.equal((await pdf.fitPdfBudget(async()=>new Blob([new Uint8Array(2_000_000)]))).size,2_000_000);
});
test('oversized PDFs are rejected after bounded compression attempts',async()=>{
 let attempts=0;await assert.rejects(pdf.fitPdfBudget(async()=>{attempts++;return new Blob([new Uint8Array(2_000_001)])}),/melebihi 2 MB/);assert.equal(attempts,6);
});
test('summary preserves all expense rows across pages and PDF starts with a landscape cover',()=>{
 const data=cash.emptyPettyCash();data.rows[0].description='Tinta printer';data.rows[0].stationery='181.544';
 const doc=pdf.drawPettyCashPdf(new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:false}),data,[]);
 assert.match(doc.output(),/Rp500.000/);assert.match(doc.output(),/Rp318.456/);assert.equal(doc.getNumberOfPages(),1);assert.ok(doc.getPageWidth()>doc.getPageHeight());assert.ok(doc.output('arraybuffer').byteLength<2_000_000);
 const many={...data,rows:Array.from({length:40},(_,i)=>({...cash.emptyCashRow(),description:`Biaya nomor ${i+1} `+'rincian '.repeat(12),stationery:'10.000'}))};
 const multi=pdf.drawPettyCashPdf(new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),many,[]),text=multi.output();
 assert.ok(multi.getNumberOfPages()>1);assert.match(text,/Biaya nomor 40/);assert.match(text,/Rp400.000/);
});
test('photo picker refuses PDFs rather than silently omitting unsupported attachments',async()=>{
 await assert.rejects(pdf.prepareReceipt(new File(['pdf'],'receipt.pdf',{type:'application/pdf'})),/pilih file foto/);
});
