import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),JSZip=require('jszip'),XLSX=require('xlsx'),{DOMParser}=require('@xmldom/xmldom'),loaded=new Map();
function load(file){if(loaded.has(file))return loaded.get(file);const mod={exports:{}},resolve=name=>name.startsWith('./')?load(`lib/${name.slice(2)}.ts`):require(name),source=fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;new Function('require','module','exports',code)(resolve,mod,mod.exports);loaded.set(file,mod.exports);return mod.exports}
const {m238ReviewPresentationBytes}=load('lib/m238-template-presentation.ts'),{referenceContext}=load('lib/presentation-reference-source.ts'),{parseSalesRow}=load('lib/m238-sales-sanitize.ts');
const sale=(date,amount,id='01')=>parseSalesRow([date,id,'Preview Staff '+id,'INV'+date,'APPLE1','iPhone 17','iPhone',1,amount,'IPHONE','APPLE','','DEVICES','','Week 1 Q1','M238']);
const a={scheme:{DEVICE:{qty:2,amount:1000000000}},vas:{},lob:{IPHONE:{'iPhone 17':{qty:2,amount:1000000000}}}},b={scheme:{DEVICE:{qty:3,amount:2000000000}},vas:{},lob:{IPHONE:{'iPhone 17':{qty:3,amount:2000000000}}}};
const reference=referenceContext([sale('2026-08-31',15000000000),sale('2026-09-30',12000000000),sale('2026-10-31',16000000000),...Array.from({length:10},(_,i)=>sale('2026-11-04',200000000,i.toString()))],null,'2026-11-07');reference.staff.forEach(p=>p.job='SALES');
const data={labelA:'Week 1 Q1',labelB:'Week 2 Q1',periodA:{start:'2026-10-25',end:'2026-10-31'},periodB:{start:'2026-11-01',end:'2026-11-07'},a,b,reference,notes:{issues:'Stok iPhone 17 kosong. Penjualan turun dan ada customer menunda pembelian.\nAccessories dan VAS perlu ditingkatkan.',actionPlan:'Accessories | Bundling setiap transaksi | PIC seluruh sales, evaluasi harian\nVAS | Tawarkan Qoala dan provider | Follow up customer',support:'Support stok iPhone 17 dan materi promo PWP.'},report:{cutoff:'2026-11-04',dailyA:[{date:'2026-10-25',sales:400000000},{date:'2026-10-31',sales:600000000}],daily:[{date:'2026-11-01',sales:800000000},{date:'2026-11-04',sales:1200000000}],feedback:[]}};
const A='http://schemas.openxmlformats.org/drawingml/2006/main',P='http://schemas.openxmlformats.org/presentationml/2006/main',C='http://schemas.openxmlformats.org/drawingml/2006/chart';
const parse=s=>new DOMParser().parseFromString(s,'application/xml'),els=(d,ns,n)=>Array.from(d.getElementsByTagNameNS(ns,n));
test('native template preserves original geometry and assets while replacing all report data',async()=>{
 const template=await JSZip.loadAsync(fs.readFileSync('assets/m238-review-template.pptx')),bytes=await m238ReviewPresentationBytes(data),zip=await JSZip.loadAsync(bytes),slides=Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p));assert.equal(slides.length,11);
 for(const name of Object.keys(template.files).filter(n=>n.startsWith('ppt/media/')||n.startsWith('ppt/slideMasters/')||n.startsWith('ppt/theme/'))){assert.deepEqual(await zip.file(name)?.async('uint8array'),await template.file(name)?.async('uint8array'),name)}
 let all='';
 for(const name of slides){const original=parse(await template.file(name).async('string')),xml=await zip.file(name).async('string'),doc=parse(xml);all+=xml;
  assert.deepEqual(els(doc,P,'xfrm').map(n=>n.toString()),els(original,P,'xfrm').map(n=>n.toString()),name+' positions');
  assert.deepEqual(els(doc,A,'tbl').map(t=>els(t,A,'tr').reduce((s,r)=>s+Number(r.getAttribute('h')),0)),els(original,A,'tbl').map(t=>els(t,A,'tr').reduce((s,r)=>s+Number(r.getAttribute('h')),0)),name+' table heights');
 }
 for(const value of ['Preview Staff 0','SALES','Week 2 Q1','Stok iPhone 17 kosong','PIC seluruh sales','Support stok iPhone','iPhone 17','2.000.000.000'])assert.ok(all.includes(value),value);
 assert.ok(!all.includes('DESEMBER 2025'));assert.ok(!all.includes('NPI'));
 const chart=parse(await zip.file('ppt/charts/chart1.xml').async('string')),series=els(chart,C,'ser'),current=els(els(series[1],C,'numCache')[0],C,'v').map(v=>Number(v.textContent));assert.equal(current[0],800000000);assert.equal(current[3],1200000000);assert.equal(current[7],500000000);
 const workbook=XLSX.read(await zip.file('ppt/embeddings/Microsoft_Excel_Worksheet.xlsx').async('nodebuffer'),{type:'buffer'});assert.equal(workbook.Sheets.Sheet1.C1.v,'Week 2 Q1');assert.equal(workbook.Sheets.Sheet1.C9.v,500000000);
 if(process.env.SPV_PPT_PREVIEW)fs.writeFileSync(process.env.SPV_PPT_PREVIEW,bytes);
});
test('shared layout template contains no source employee financial data or workbook values',async()=>{
 const zip=await JSZip.loadAsync(fs.readFileSync('assets/m238-review-template.pptx'));for(const name of Object.keys(zip.files).filter(n=>n.endsWith('.xml'))){const xml=await zip.file(name).async('string');for(const privateValue of ['Rusli Siregar','Kamelia','1.866.805.682'])assert.ok(!xml.includes(privateValue),name)}
 const workbook=XLSX.read(await zip.file('ppt/embeddings/Microsoft_Excel_Worksheet.xlsx').async('nodebuffer'),{type:'buffer'});for(const row of XLSX.utils.sheet_to_json(workbook.Sheets.Sheet1,{header:1}).slice(1))assert.deepEqual(row.slice(1),[0,0]);
});
