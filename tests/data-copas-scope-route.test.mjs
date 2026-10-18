import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(path,mocks={}){
 const code=ts.transpileModule(fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const loaded={exports:{}};new Function('require','module','exports',code)(id=>mocks[id]??require(id),loaded,loaded.exports);return loaded.exports;
}
const repair=load('lib/data-copas-repair.ts');
const master=[['Brand','SAP Article'],['APPLE','APP18','IPHONE 18','IPHONE','IPHONE 18','DEVICES','APPLE'],['XL','XXLAPPLE-PLT24','MPD APPLE PLATINUM 24M','PROTECTION','','VAS','APPLE']];
const row=(article,group)=>['18-10-2026','1','Staff','INV',article,'Product','',1,1000,'N/A','N/A','N/A',group,''];
function harness(){
 const state={reads:0,writes:[]};
 const route=load('app/api/data-upload-ops/route.ts',{
  'next/server':{NextResponse:{json:(body,init={})=>({body,status:init.status??200})}},
  '@/lib/google-sheets':{getSheetRangesFresh:async()=>{state.reads++;return[master,[row('XXLAPPLE-PLT24','VAS'),row('APP18','DEVICES')]]},batchWriteRanges:async(_id,writes)=>state.writes.push(...writes)},
  '@/lib/data-copas-repair':repair,
  '@/lib/copas-invoices':{},'@/lib/copas-invoice-store':{acquireCopasLock:async()=>{},releaseCopasLock:async()=>{}},
  '@/lib/m238-daily-summary-cache':{refreshDailySummaryPeriods:async()=>{}},
 });
 const post=body=>route.POST({json:async()=>({action:'repair-copas',...body})});
 return{state,post};
}
test('repair API enforces scope for preview and persisted sheet ranges, and binds approval to scope',async()=>{
 const oldEmail=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,oldKey=process.env.GOOGLE_PRIVATE_KEY;
 process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL='test@example.com';process.env.GOOGLE_PRIVATE_KEY='test';
 try{
  const {state,post}=harness();
  const invalid=await post({scope:'invalid',dryRun:true});assert.equal(invalid.status,400);assert.equal(state.reads,0);
  const preview=await post({scope:'device',dryRun:true});
  assert.equal(preview.status,200);assert.equal(preview.body.checkedRows,1);assert.equal(preview.body.scope,'device');assert.equal(preview.body.issues.length,0);assert.equal(state.writes.length,0);
  const crossed=await post({scope:'all',planId:preview.body.planId});assert.equal(crossed.status,409);assert.equal(state.writes.length,0);
  const saved=await post({scope:'device',planId:preview.body.planId});assert.equal(saved.status,200);
  assert.ok(state.writes.length>0);assert.ok(state.writes.every(write=>/![GJKLMN]3:[GJKLMN]3$/.test(write.range)));
  const accessory=await post({scope:'accessory-vas',dryRun:true});assert.equal(accessory.body.checkedRows,1);assert.equal(accessory.body.issues.length,0);assert.equal(accessory.body.repairItems.some(item=>item.changes.some(change=>change.column==='N')),false);
  const general=await post({dryRun:true});assert.equal(general.body.scope,'all');assert.equal(general.body.checkedRows,2);
 }finally{
  if(oldEmail===undefined)delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;else process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=oldEmail;
  if(oldKey===undefined)delete process.env.GOOGLE_PRIVATE_KEY;else process.env.GOOGLE_PRIVATE_KEY=oldKey;
 }
});
