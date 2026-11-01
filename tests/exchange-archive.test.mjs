import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function load(path,mocks={}){const code=ts.transpileModule(fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};new Function('require','module','exports',code)(id=>mocks[id]??require(id),module,module.exports);return module.exports}
const model=load('lib/exchange-archive.ts',{'./m238-sales-sanitize':load('lib/m238-sales-sanitize.ts')});
const sale=(date,invoice)=>[date,'staff','Name',invoice];
test('archive only October invoices, keep pending, November and cross-month invoices',()=>{
 const p=model.planExchangeArchive('2026-10',[['100000149'],['100000149'],['100000156'],['100000169'],['100000200'],['100000300']], [sale('30-10-2026','100000149'),sale('2026-10-31','100000156'),sale('2026-11-01','100000156'),sale('2026-11-01','100000200')],[]);
 assert.deepEqual(p.invoices,['100000149','100000156']);assert.deepEqual(p.clearRows,[2,3]);assert.deepEqual(p.pending,['100000169','100000300']);assert.deepEqual(p.kept,['100000156','100000200']);assert.equal(p.newInvoices.length,2);
});
test('repeated archiving does not duplicate entries; stale column produces a different plan',()=>{
 const evidence=[sale('2026-10-30','100000149')],history=[['2026-10','100000149','now','actor']];
 const p=model.planExchangeArchive('2026-10',[['100000149']],evidence,history);
 assert.deepEqual(p.newInvoices,[]);assert.deepEqual(p.clearRows,[2]);
 assert.notEqual(p.planId,model.planExchangeArchive('2026-10',[['100000149'],['100000999']],evidence,history).planId);
});
test('archived October invoice remains excluded after Y reset but same number in November counts',()=>{
 const excluded=model.archiveExclusions([['2026-10','100000149']]);
 assert.equal(excluded('2026-10-30','100000149'),true);assert.equal(excluded('2026-11-01','100000149'),false);assert.equal(excluded('2026-10-30','100000150'),false);
});
test('archive and Y clear are sent as one non-retrying atomic batch',async()=>{
 const calls=[];const store=load('lib/exchange-archive-store.ts',{'./google-sheets':{sheetRequestOnce:async(...args)=>{calls.push(args);return {ok:true}}},'./copas-invoice-store':{COPAS_ID:'source'},'./exchange-archive':model});
 await store.applyExchangeArchive({email:'test',key:'test'},{sheets:[{sheetId:1}],archive:{sheetId:2,gridProperties:{rowCount:1000}},raw:{sheetId:1},history:[],plan:{period:'2026-10',newInvoices:['100000149'],clearRows:[2,5]}},'actor');
 assert.equal(calls.length,1);const {requests}=JSON.parse(calls[0][4].body);assert.equal(requests.length,3);
 assert.equal(requests[0].updateCells.rows[0].values[1].userEnteredValue.stringValue,'100000149');
 for(const r of requests.slice(1)){assert.equal(r.updateCells.range.startColumnIndex,24);assert.equal(r.updateCells.range.endColumnIndex,25);assert.equal(r.updateCells.fields,'userEnteredValue');assert.deepEqual(r.updateCells.rows,[])}
});
test('compile shows complete monthly history after archived invoices have been cleared from Y',()=>{
 const p=model.planExchangeArchive('2026-10',[['100052025']],[],[['2026-10','100051953'],['2026-10','100052009'],['2026-09','100050001']]);
 assert.deepEqual(p.invoices,['100051953','100052009']);assert.equal(p.alreadyArchived,2);assert.deepEqual(p.pending,['100052025']);
});
test('confirmed October numbers missing from sales can be archived; proven November numbers stay in Y',()=>{
 const y=[['100052025'],['100051954'],['100052531'],['100052577']],evidence=[sale('2026-11-01','100052531'),sale('2026-11-01','100052577')];
 const p=model.planExchangeArchive('2026-10',y,evidence,[['2026-10','100051953']],true);
 assert.deepEqual(p.newInvoices,['100051954','100052025']);assert.deepEqual(p.clearRows,[2,3]);assert.deepEqual(p.kept,['100052531','100052577']);
 assert.notEqual(p.planId,model.planExchangeArchive('2026-10',y,evidence,[['2026-10','100051953']],false).planId);
});
