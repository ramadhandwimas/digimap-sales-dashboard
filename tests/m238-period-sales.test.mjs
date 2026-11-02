import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const module={exports:{}};
const code=ts.transpileModule(fs.readFileSync(new URL('../lib/m238-sales-sanitize.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('module','exports',code)(module,module.exports);
const {salesRowsForPeriod}=module.exports;
const row=(date,amount,invoice)=>({date,amount,invoice,id:'1',name:'Staff',article:'A',description:'Item',type:'',qty:1,category:'',brand:'',core:'',scheme:'DEVICES',vendor:'',store:'M238'});

test('current active dates use clean RAW rows instead of gross Data Copas rows',()=>{
 const gross=[row('2026-11-01',1200227500,'gross')],clean=[row('2026-11-01',1196013500,'clean')];
 const result=salesRowsForPeriod(gross,clean,['2026-11-01'],'2026-11');
 assert.equal(result.length,1);
 assert.equal(result[0].invoice,'clean');
 assert.equal(result.reduce((sum,item)=>sum+item.amount,0),1196013500);
});

test('fully exchanged active date cannot fall back to gross Data Copas',()=>{
 const result=salesRowsForPeriod([row('2026-11-01',2899000,'exchange')],[],['2026-11-01'],'2026-11');
 assert.deepEqual(result,[]);
});

test('historical dates remain from Data Copas while active dates come from RAW',()=>{
 const dataCopas=[row('2026-10-31',100,'old'),row('2026-11-01',200,'gross')],raw=[row('2026-11-01',150,'clean')];
 assert.deepEqual(salesRowsForPeriod(dataCopas,raw,['2026-11-01'],'2026-10').map(item=>item.invoice),['old']);
 assert.deepEqual(salesRowsForPeriod(dataCopas,raw,['2026-11-01'],'2026-11').map(item=>item.invoice),['clean']);
});
