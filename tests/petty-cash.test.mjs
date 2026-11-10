import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(path,require){const module={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(require,module,module.exports);return module.exports}
const cash=load('../lib/petty-cash.ts',()=>{});
test('new form contains no sample transactions or money and calculates categories exactly',()=>{
 const data=cash.emptyPettyCash();assert.equal(data.rows.length,14);assert.ok(data.rows.every(row=>Object.values(row).every(value=>value==='')));assert.equal(data.fund,'500000');assert.equal(data.inProcess,'');assert.equal(data.pcrs,'');assert.equal(cash.cashTotals(data).grandTotal,0);
 data.rows[0].stationery='181.544';data.rows[1].stationery='130958';data.rows[2].sundries='46.500';data.fund='500.000';data.inProcess='10.000';
 const totals=cash.cashTotals(data);assert.equal(totals.grandTotal,359002);assert.equal(totals.categories.stationery,312502);assert.equal(totals.balance,140998);
 data.payment='359.000';assert.equal(cash.cashTotals(data).payment,359000);assert.equal(cash.cashTotals(data).balance,141000);
});
test('invalid money and impossible dates cannot be saved, while incomplete drafts can',()=>{
 const data=cash.emptyPettyCash();assert.deepEqual(cash.validatePettyCash(data),data);
 for(const value of ['-100','12abc','1.50','1,5','Infinity','1000000000001'])assert.throws(()=>cash.cashAmount(value));
 data.rows[0].date='2026-02-30';assert.throws(()=>cash.validatePettyCash(data),/Tanggal/);
});
test('history reopens the latest saved version of each form without losing other forms',()=>{
 const data={...cash.emptyPettyCash(),fund:'900000',inProcess:'100000'},later={...data,pcrs:'02'};
 const records=cash.latestCashRecords([['a','v1','2026-11-09','SPV',JSON.stringify(data)],['b','v2','2026-11-10','SPV',JSON.stringify(data)],['a','v3','2026-11-11','SPV',JSON.stringify(later)]]);
 assert.equal(records.length,2);assert.equal(records[0].id,'a');assert.equal(records[0].data.pcrs,'02');assert.equal(records[1].id,'b');assert.equal(records[0].data.fund,'500000');assert.equal(records[0].data.inProcess,'');assert.equal(cash.cashTotals(records[0].data).balance,500000);
});
function apiFixture({session={nik:'spv',name:'SPV'},allowed=true,rows=[]}={}){
 const calls=[],sheets={ensureSheet:async()=>calls.push('ensure'),getSheetRangesFresh:async()=>[rows],sheetRequestOnce:async(...args)=>{calls.push(JSON.parse(args[4].body));return {ok:true}}};
 const api=load('../app/api/spv/petty-cash/route.ts',id=>id==='next/server'?{NextResponse:{json:(data,options)=>({data,status:options?.status||200})}}:id==='@/lib/auth-session'?{SESSION_COOKIE:'session',verifySessionToken:()=>session}:id==='@/lib/google-sheets'?sheets:id==='@/lib/spv-access'?{isStoreSpv:async()=>allowed}:cash);
 const req=(body,query='')=>({cookies:{get:()=>({value:'test'})},headers:new Map(),nextUrl:new URL('https://dashboard.test/api/spv/petty-cash'+query),json:async()=>body});
 return {api,calls,req};
}
test('SPV API blocks anonymous and non-SPV users before reading or writing petty cash',async()=>{
 process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL='fixture';process.env.GOOGLE_PRIVATE_KEY='fixture';
 for(const [options,status] of [[{session:null},401],[{allowed:false},403]]){const f=apiFixture(options);assert.equal((await f.api.GET(f.req())).status,status);assert.equal((await f.api.POST(f.req({}))).status,status);assert.deepEqual(f.calls,[])}
 const f=apiFixture();assert.equal((await f.api.GET(f.req(null,'?access=1'))).status,200);assert.deepEqual(f.calls,[]);
});
test('draft saves validated data, retries idempotently, and rejects stale revisions',async()=>{
 const data=cash.emptyPettyCash(),body={id:'draft-123456789',revision:'revision-123456789',baseRevision:'',data},f=apiFixture();
 const saved=await f.api.POST(f.req(body));assert.equal(saved.status,200);assert.equal(f.calls.filter(v=>typeof v==='object').length,1);assert.equal(f.calls[1].values[0][4],JSON.stringify(data));
 const rows=[[body.id,body.revision,'2026-11-10','SPV',JSON.stringify(data)]],retry=apiFixture({rows});assert.equal((await retry.api.POST(retry.req(body))).status,200);assert.equal(retry.calls.filter(v=>typeof v==='object').length,0);
 const conflict=await retry.api.POST(retry.req({...body,revision:'revision-987654321'}));assert.equal(conflict.status,409);assert.equal(conflict.data.conflict,true);
 const invalid=await f.api.POST(f.req({...body,data:{...data,payment:'-100'}}));assert.equal(invalid.status,400);
});
