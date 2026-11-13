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
test('native template scales source geometry to standard widescreen and replaces all report data',async()=>{
 const template=await JSZip.loadAsync(fs.readFileSync('assets/m238-review-template.pptx')),bytes=await m238ReviewPresentationBytes(data),zip=await JSZip.loadAsync(bytes),slides=Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p));assert.equal(slides.length,11);
 for(const name of Object.keys(template.files).filter(n=>n.startsWith('ppt/media/'))){assert.deepEqual(await zip.file(name)?.async('uint8array'),await template.file(name)?.async('uint8array'),name)}
 let all='';
 for(const name of slides){const original=parse(await template.file(name).async('string')),xml=await zip.file(name).async('string'),doc=parse(xml);all+=xml;
  const coords=d=>els(d,P,'xfrm').flatMap(n=>[...els(n,A,'off').flatMap(e=>['x','y'].map(a=>Number(e.getAttribute(a)))),...els(n,A,'ext').flatMap(e=>['cx','cy'].map(a=>Number(e.getAttribute(a))))]);assert.deepEqual(coords(doc),coords(original).map(n=>Math.round(n/2)),name+' positions');
  els(doc,A,'tbl').forEach((table,i)=>{const height=els(table,A,'tr').reduce((s,r)=>s+Number(r.getAttribute('h')),0),expected=els(els(original,A,'tbl')[i],A,'tr').reduce((s,r)=>s+Number(r.getAttribute('h')),0)/2;assert.ok(Math.abs(height-expected)<=30,name+' table heights')});
 }
 for(const value of ['Preview Staff 0','SALES','Week 2 Q1','Stok iPhone 17 kosong','PIC seluruh sales','Support stok iPhone','iPhone 17','2.000.000.000'])assert.ok(all.includes(value),value);
 assert.ok(!all.includes('DESEMBER 2025'));assert.ok(!all.includes('NPI'));
 const size=els(parse(await zip.file('ppt/presentation.xml').async('string')),P,'sldSz')[0];assert.equal(size.getAttribute('cx'),'12192000');assert.equal(size.getAttribute('cy'),'6858000');
 const core=parse(await zip.file('docProps/core.xml').async('string'));for(const field of ['created','modified'])assert.ok(Number.isFinite(Date.parse(els(core,'http://purl.org/dc/terms/',field)[0].textContent)));
 const app=parse(await zip.file('docProps/app.xml').async('string'));assert.equal(els(app,'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties','Slides')[0].textContent,'11');
 const chart=parse(await zip.file('ppt/charts/chart1.xml').async('string'));assert.equal(els(chart,C,'extLst').length,0);const series=els(chart,C,'ser'),current=els(els(series[1],C,'numCache')[0],C,'v').map(v=>Number(v.textContent));assert.equal(current[0],800000000);assert.equal(current[3],1200000000);assert.equal(current[7],500000000);
 const workbook=XLSX.read(await zip.file('ppt/embeddings/Microsoft_Excel_Worksheet.xlsx').async('nodebuffer'),{type:'buffer'});assert.equal(workbook.Sheets.Sheet1.C1.v,'Week 2 Q1');assert.equal(workbook.Sheets.Sheet1.C9.v,500000000);
 if(process.env.SPV_PPT_PREVIEW)fs.writeFileSync(process.env.SPV_PPT_PREVIEW,bytes);
});
test('shared layout template contains no source employee financial data or workbook values',async()=>{
 const zip=await JSZip.loadAsync(fs.readFileSync('assets/m238-review-template.pptx'));for(const name of Object.keys(zip.files).filter(n=>n.endsWith('.xml'))){const xml=await zip.file(name).async('string');for(const privateValue of ['Rusli Siregar','Kamelia','1.866.805.682'])assert.ok(!xml.includes(privateValue),name)}
 const workbook=XLSX.read(await zip.file('ppt/embeddings/Microsoft_Excel_Worksheet.xlsx').async('nodebuffer'),{type:'buffer'});for(const row of XLSX.utils.sheet_to_json(workbook.Sheets.Sheet1,{header:1}).slice(1))assert.deepEqual(row.slice(1),[0,0]);
});
test('dense product tables keep every row inside the slide with explicit fitted font sizes',async()=>{
 const models={AIRPODS:['AirPods 4','AIRPODS MAX 2 BLUE','AIRPODS MAX 2 MIDNIGHT','AIRPODS MAX 2 STARLIGHT','AirPods Pro Gen3'],'APPLE WATCH':['Apple Watch SE 3','Apple Watch Ultra 3'],IPAD:['iPad 11','iPad Air 11 M4','iPad Air 13 M4','iPad Pro 11 M5','iPad Pro 13 M5','iPad mini A17'],IPHONE:['iPhone 15','iPhone 16','iPhone 16 Pro Max','iPhone 17','iPhone 17 Pro','iPhone 17 Pro Max','iPhone 17e','IPHONE 18 PRO','IPHONE 18 PRO MAX','iPhone AIR','IPHONE DUO'],MAC:['iMac M4','MacBook Air 13 M4','MacBook Air 15 M4','MacBook Pro 14 M4','MacBook Pro 16 M4','MacBook Neo','MacBook Air 13 M5','MacBook Pro 14 M5','MacBook Pro 16 M5']},side={scheme:{DEVICE:{qty:33,amount:3300000000}},vas:{},lob:Object.fromEntries(Object.entries(models).map(([lob,names])=>[lob,Object.fromEntries(names.map(name=>[name,{qty:1,amount:100000000}]))]))};
 const zip=await JSZip.loadAsync(await m238ReviewPresentationBytes({...data,a:side,b:side})),doc=parse(await zip.file('ppt/slides/slide2.xml').async('string')),table=els(doc,A,'tbl')[0],rows=els(table,A,'tr');assert.equal(rows.length,40);assert.ok(els(doc,A,'t').some(t=>t.textContent==='MacBook Pro 16 M5'));
 for(const row of rows){assert.ok(Number(row.getAttribute('h'))>0);for(const cell of Array.from(row.childNodes).filter(n=>n.nodeType===1&&n.localName==='tc')){const props=els(cell,A,'bodyPr')[0];assert.equal(props.getAttribute('tIns'),'0');assert.equal(props.getAttribute('bIns'),'0');assert.equal(els(cell,A,'normAutofit').length,0);assert.ok(els(cell,A,'t').every(t=>t.textContent!==''),'empty table runs must preserve fitted paragraph size')}}
 if(process.env.SPV_PPT_STRESS)fs.writeFileSync(process.env.SPV_PPT_STRESS,await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
});
