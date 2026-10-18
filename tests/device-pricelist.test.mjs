import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(file,mocks={}){const source=fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),loaded={exports:{}};const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;new Function('require','module','exports',code)(id=>mocks[id]??require(id),loaded,loaded.exports);return loaded.exports}
const accessory=load('lib/accessory-pricelist.ts');
const catalog=load('lib/promo-board-catalog.ts');
const device=load('lib/device-pricelist.ts',{'./accessory-pricelist':accessory,'./promo-board-catalog':catalog});
const fast=load('lib/m238-fast-sales.ts');
const XLSX=require('xlsx');
const header=['Brand','SAP Article','SAP Description','Product Category','Type','Product Group','Core'];
const master=[header,['APPLE','APPOLD','iPhone 17 Pro Max 256GB','IPHONE','IPHONE 17 PRO MAX','DEVICES','APPLE']];
const item=(article,description,extra={})=>({article,description,brand:'APPLE',category:'',section:'',type:'',sheet:'PRICE LIST APPLE DEVICE',row:6,...extra});

test('reads device workbook with SAPDescription, title rows, sections and no Brand column',()=>{
 const ws=XLSX.utils.aoa_to_sheet([['Pricelist Oktober'],[],['SAP Article','SAPDescription','Normal Price'],['iPhone 18'],['APP18','iPhone 18 Pro Max 256GB',25000000]]);
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'PRICE LIST APPLE DEVICE');
 const parsed=device.parseDevicePricelist(XLSX.write(wb,{type:'array',bookType:'xlsx'}));
 assert.equal(parsed.items.length,1);assert.equal(parsed.items[0].section,'iPhone 18');assert.equal(parsed.items[0].brand,'APPLE');
 assert.deepEqual(device.planDevicePricelist(parsed.items,master,[]).rows[0],['APPLE','APP18','iPhone 18 Pro Max 256GB','IPHONE','IPHONE 18 PRO MAX','DEVICES','APPLE']);
});
test('classifies iPhone, iPad, Mac, Watch and AirPods with the existing product model parser',()=>{
 const plan=device.planDevicePricelist([item('APP1','iPhone 18 Pro 256GB Orange'),item('APP2','iPad Pro 11 M4 256GB'),item('APP3','MacBook Air 13 M4 256GB'),item('APP4','Apple Watch Series 11 42mm'),item('APP5','AirPods Pro 3')],master,[]);
 assert.equal(plan.rows.length,5);assert.equal(plan.review.length,0);
 assert.deepEqual(plan.rows.map(r=>r[3]),['IPHONE','IPAD','MAC','APPLE WATCH','AIRPODS']);
 assert.deepEqual(plan.rows.map(r=>r[5]),['DEVICES','DEVICES','DEVICES','DEVICES','ACCESSORIES']);
 assert.ok(plan.rows.every(r=>r[4]&&r[6]==='APPLE'));
});
test('keeps known Master spelling, skips existing SAP and repeated imports add nothing',()=>{
 const items=[item('APPOLD','iPhone 17 Pro Max 256GB'),item('APPNEW','iPhone 17 Pro Max 512GB')];
 const plan=device.planDevicePricelist(items,master,[]);assert.equal(plan.existing,1);assert.equal(plan.rows[0][4],'IPHONE 17 PRO MAX');
 assert.equal(device.planDevicePricelist(items,[...master,...plan.rows],[]).rows.length,0);
});
test('conflicting duplicates, unknown models and accessories require review',()=>{
 const plan=device.planDevicePricelist([item('APP1','iPhone 18 256GB'),item('APP1','iPhone 18 512GB'),item('APP2','Unknown Device'),item('APP3','Case iPhone 18'),item('APP4','iPhone 18',{brand:'SAMSUNG'})],master,[]);
 assert.equal(plan.rows.length,0);assert.equal(plan.review.length,4);assert.equal(plan.duplicates,1);
});
test('changed Master headers and absent workbook SAP headers fail closed',()=>{
 assert.throws(()=>device.planDevicePricelist([],[],[]),/Format Master/);
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Code','Description'],['APP','iPhone 18']]),'Sheet1');
 assert.throws(()=>device.parseDevicePricelist(XLSX.write(wb,{type:'array',bookType:'xlsx'})),/Header SAP/);
});
test('fresh Master replaces cached N/A and becomes the normalized model after SPW upload',()=>{
 const mapping=new Map([['APP18',{type:'N/A',category:'N/A',brand:'N/A',scheme:'N/A',core:'N/A',vendor:'',week:'',store:'M238'}]]);
 fast.mergeMasterClassifications(mapping,[header,['APPLE','APP18','iPhone 18 Pro Max 256GB','IPHONE','IPHONE 18 PRO MAX','DEVICES','APPLE']]);
 const result=fast.parseSpwToNormalized([['18-10-2026'],['12345678 / TEST'],['iPhone 18 Pro Max','APP18'],[1,'INV-1',25000000]],mapping);
 assert.equal(result.rows[0].type,'IPHONE 18 PRO MAX');assert.equal(result.rows[0].scheme,'DEVICES');
});

function routeHarness(){
 const state={master:[...master],commits:0,locked:false};
 const route=load('app/api/upload-device-pricelist/route.ts',{'next/server':{NextResponse:{json:(body,opts={})=>({body,status:opts.status??200})}},'@/lib/auth-session':{SESSION_COOKIE:'session',verifySessionToken:token=>token==='valid'},'@/lib/accessory-pricelist':accessory,'@/lib/device-pricelist':device,'@/lib/accessory-pricelist-store':{ImportError:class extends Error{},readMaster:async()=>({master:state.master,suppliers:[]}),acquireImportLock:async()=>{state.locked=true;return 'owner'},releaseImportLock:async()=>{state.locked=false},commitMaster:async(_c,_snapshot,rows)=>{state.commits++;state.master.push(...rows);state.locked=false}}});
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['SAP Article','SAP Description'],['APP18','iPhone 18 Pro Max 256GB']]),'Device');const data=XLSX.write(wb,{type:'array',bookType:'xlsx'});
 return{state,send:async(mode,planId='',auth=true)=>{const form=new FormData();form.set('file',new File([data],'device.xlsx'));form.set('mode',mode);form.set('planId',planId);return route.POST({cookies:{get:()=>({value:auth?'valid':''})},headers:new Headers(),nextUrl:new URL('https://preview.example'),formData:async()=>form})}};
}
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL='test@example.com';process.env.GOOGLE_PRIVATE_KEY='test';
test('device route previews without writes, imports once, and rejects stale preview or unauthenticated calls',async()=>{
 const h=routeHarness();assert.equal((await h.send('preview','',false)).status,401);
 const preview=await h.send('preview');assert.equal(preview.body.deviceCount,1);assert.equal(h.state.commits,0);
 const stale=await h.send('import','stale');assert.equal(stale.status,409);assert.equal(h.state.commits,0);assert.equal(h.state.locked,false);
 const imported=await h.send('import',preview.body.planId);assert.equal(imported.body.imported,1);assert.equal(h.state.commits,1);
 const again=await h.send('preview');assert.equal(again.body.newCount,0);
 assert.equal((await h.send('import',again.body.planId)).body.imported,0);assert.equal(h.state.commits,1);
});
