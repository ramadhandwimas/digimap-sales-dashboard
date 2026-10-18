import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const nativeRequire=createRequire(import.meta.url);
function load(path,mocks={}){
 const code=ts.transpileModule(fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const module={exports:{}};new Function('require','module','exports',code)(id=>mocks[id]??nativeRequire(id),module,module.exports);return module.exports;
}
const fast=load('lib/m238-fast-sales.ts');
const stores=load('lib/spw-stores.ts',{'./m238-fast-sales':fast});
function report(amount=100,invoice='INV-1',date='18-10-2026'){
 return [[date],['12345678 / TEST STAFF'],['iPhone 18','APP001'],[1,invoice,amount]];
}

test('M238 and M996 combine staff, keep POS source and count equal invoice numbers separately',()=>{
 const result=stores.combineSpw({M238:report(100),M996:report(200)},new Map());
 const [daily]=fast.aggregateDaily(result.rows);
 assert.equal(daily.amount,300);assert.equal(daily.qty,2);assert.equal(daily.invoices,2);assert.equal(daily.upt,1);assert.equal(daily.atv,150);
 assert.equal(daily.store,'M238');assert.deepEqual(result.rows.map(r=>r.key.split('|')[0]),['M238','M996']);
});

test('replacing one snapshot preserves other POS and repeated uploads are idempotent',()=>{
 const snapshots={M238:report(100),M996:report(200)};
 snapshots.M238=report(400);
 const first=stores.combineSpw(snapshots,new Map());
 snapshots.M238=report(400);
 const second=stores.combineSpw(snapshots,new Map());
 assert.deepEqual(first,second);assert.equal(first.sources[1].amount,200);
 assert.equal(fast.aggregateDaily(first.rows)[0].amount,600);
});

test('different dates stay separate and a missing source does not create phantom sales',()=>{
 const result=stores.combineSpw({M238:report(100),M996:report(200,'INV-2','17-10-2026')},new Map());
 assert.equal(fast.aggregateDaily(result.rows).length,2);
 assert.equal(stores.combineSpw({M238:[],M996:report(200)},new Map()).rows.length,1);
});

function uploadHarness(){
 const state={snapshots:{M238:[],M996:[]},legacy:report(100),writes:[],locked:false,fail:false};
 const sheet={getGoogleSheetRequestCount:()=>0,ensureSheets:async()=>{},getSheetRangesFresh:async()=>[state.snapshots.M238,state.snapshots.M996,state.legacy],getSheetRanges:async(_id,ranges)=>ranges[0].includes('CLASSIFICATION')?[[]]:[[],[]]};
 const persistence={SpwWriteError:class extends Error{},acquireSpwLock:async()=>{assert.equal(state.locked,false);state.locked=true},releaseSpwLock:async()=>{state.locked=false},replaceSpwRanges:async(_c,writes)=>{if(state.fail)throw new Error('simulated write failure');state.writes.push(writes);for(const store of ['M238','M996'])state.snapshots[store]=writes.find(w=>w.title===`SPW ${store}`).values;state.legacy=writes.find(w=>w.title==='SPW').values}};
 const route=load('app/api/upload-spw/route.ts',{'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status??200})}},'@/lib/google-sheets':sheet,'@/lib/spw-stores':stores,'@/lib/spw-store':persistence,'@/lib/spw-upload':{parseSpwWorkbook:buffer=>({rows:JSON.parse(new TextDecoder().decode(buffer)),sheetName:'SPW',detailTotal:0})},'@/lib/m238-fast-sales':fast,'@/lib/m238-daily-summary-cache':{buildSummaryFromFastSales:async()=>[],upsertDailySummaryRows:async()=>{}}});
 return{state,send:async(store,rows)=>{const form=new FormData();form.set('store',store);form.set('file',new File([JSON.stringify(rows)],'sales.xlsx'));return route.POST({formData:async()=>form})}};
}
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL='test@example.com';process.env.GOOGLE_PRIVATE_KEY='test';

test('upload migrates existing M238 before first M996 upload and subsequent replacements keep both stores',async()=>{
 const h=uploadHarness();
 let res=await h.send('M996',report(200));assert.equal(res.status,200);assert.equal(res.body.combinedAmount,300);assert.equal(h.state.locked,false);
 res=await h.send('M996',report(300));assert.equal(res.body.combinedAmount,400);
 res=await h.send('M238',report(400));assert.equal(res.body.combinedAmount,700);assert.equal(res.body.combinedRows,2);
});

test('invalid source and failed writes preserve existing snapshots and release upload lock',async()=>{
 const h=uploadHarness();let res=await h.send('M132',report());assert.equal(res.status,400);assert.equal(h.state.writes.length,0);
 h.state.fail=true;res=await h.send('M996',report());assert.equal(res.status,500);assert.equal(h.state.writes.length,0);assert.equal(h.state.locked,false);
});

test('empty upload after clear does not restore a previous snapshot',async()=>{
 const h=uploadHarness();h.state.legacy=[];
 const res=await h.send('M996',report(200));assert.equal(res.body.combinedAmount,200);assert.equal(h.state.snapshots.M238.length,0);
});

test('atomic replacement clears trailing rows and grows new sheets before writing',async()=>{
 const calls=[];const store=load('lib/spw-store.ts',{'./google-sheets':{sheetRequestOnce:async(_id,suffix,_e,_k,init)=>{calls.push({suffix,init});return{ok:true,json:async()=>({sheets:[{properties:{title:'SPW M996',sheetId:2,gridProperties:{rowCount:2,columnCount:3}}}]})}}}});
 await store.replaceSpwRanges({email:'a',key:'b'},[{title:'SPW M996',startRow:1,width:3,values:report(200)}]);
 const {requests}=JSON.parse(calls[1].init.body);
 assert.equal(requests[0].appendDimension.length,3);
 assert.equal(requests[1].updateCells.range.endRowIndex,5);
 assert.equal(requests[1].updateCells.fields,'userEnteredValue');
 assert.equal(requests[1].updateCells.rows[3].values[2].userEnteredValue.numberValue,200);
});
