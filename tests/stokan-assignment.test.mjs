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
const assignment=load('lib/stokan-assignment.ts');
const context=load('lib/stokan-context.ts');
const headers=['No','Stocker','Brand','Artikel','Description','S/N','Qty','Backroom','Dropbox','Floor','StockDate','Period','UploadID','UploadedAt'];
const batch='STK-20261018-ABC12345';
const stock=(no,stocker,id=batch)=>[no,stocker,'BRAND',`SAP${no}`,'Description','SN',no,'Counted','Box','Floor','2026-10-18','Week 3 Q1',id,'2026-10-18T00:00:00Z'];
const requestRows=rows=>rows.map((row,index)=>({rowNumber:index+2,expectedStocker:row[1],stocker:'Alice',article:row[3],serial:row[5],totalStock:row[6]}));

test('768 articles are split evenly over only 7 selected staff with row order and stock values intact',()=>{
 const rows=Array.from({length:768},(_,i)=>({article:`SAP${i}`,qty:i,serial:`SN${i}`}));
 const before=structuredClone(rows),names=['A','B','C','D','E','F','G'];
 const out=assignment.distributeStokanRows(rows,names);
 assert.equal(out.length,768);assert.deepEqual(rows,before);
 assert.deepEqual(out.map(({article,qty,serial})=>({article,qty,serial})),rows);
 const counts=names.map(name=>out.filter(row=>row.stocker===name).length);
 assert.equal(Math.min(...counts),109);assert.equal(Math.max(...counts),110);
 assert.deepEqual(assignment.stokanDistribution(768,7),{min:109,max:110});
 assert.deepEqual(assignment.distributeStokanRows(rows,[]),[]);
 assert.equal(assignment.distributeStokanRows(rows,['A','A']).length,768);
});

test('reassignment changes only Stocker cells and rejects missing, duplicate, stale or excluded assignments',()=>{
 const rows=[stock(1,'Alice'),stock(2,'Bob'),stock(3,'Bob','STK-20261018-OTHER')],input=requestRows(rows.slice(0,2));
 const plan=assignment.planStokanReassignment(rows,input,['Alice'],['Alice','Bob'],batch);
 assert.deepEqual(plan.writes,[{range:"'STOKAN'!B3:B3",values:[['Alice']]}]);
 for(const invalid of [input.slice(1),[input[0],input[0]],[input[0],{...input[1],expectedStocker:'Wrong'}],[input[0],{...input[1],stocker:'Bob'}],[input[0],{...input[1],article:'CHANGED'}]]){
  assert.throws(()=>assignment.planStokanReassignment(rows,invalid,['Alice'],['Alice','Bob'],batch));
 }
 assert.throws(()=>assignment.planStokanReassignment(rows,input,[],['Alice','Bob'],batch));
 assert.throws(()=>assignment.planStokanReassignment(rows,input,['Unknown'],['Alice','Bob'],batch));
});

function harness(){
 const state={fullWrites:[],rows:[stock(1,'Alice'),stock(2,'Bob'),stock(3,'Bob','STK-20261018-OTHER')],writes:[]};
 const read=async(_id,ranges)=>ranges.map(range=>range.startsWith('Config!')?[['M238','1','Alice','Sales Assistant'],['M238','2','Bob','Sales Assistant'],['M238','3','SPV','Supervisor'],['M238','4','Trainer','Store Trainer'],['M238','5','Trainee','MT'],['M238','6','Cashier','Cashier'],['M996','7','Other','MT']]:range.includes('A1:N1')?[headers]:state.rows.slice(Number(range.match(/A(\d+)/)?.[1]||2)-2,Number(range.match(/:N(\d+)/)?.[1]||20000)-1));
 const route=load('app/api/stokan/route.ts',{
  'next/server':{NextResponse:{json:(body,init={})=>({body,status:init.status??200})}},
  '@/lib/stokan-assignment':assignment,'@/lib/stokan-context':context,
  '@/lib/google-sheets':{getSheetRanges:read,getSheetRangesFresh:read,ensureSheet:async()=>{},clearAndWrite:async(_id,_clear,range,values)=>{state.fullWrites.push({range,values});const start=Number(range.match(/A(\d+)/)[1]);values.forEach((row,index)=>{state.rows[start-2+index]=row})},batchWriteRanges:async(_id,writes)=>{state.writes.push(...writes);for(const write of writes){const start=Number(write.range.match(/!B(\d+)/)[1]);write.values.forEach((row,index)=>{state.rows[start-2+index][1]=row[0]})}}},
 });
 const post=body=>route.POST({headers:new Headers({'content-type':'application/json'}),json:async()=>body});
 return{state,post,GET:route.GET};
}
test('API persists staff reassignment in the same batch without altering articles, notes, quantities or other history',async()=>{
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL='test@example.com';process.env.GOOGLE_PRIVATE_KEY='test';
 try{
  const {post,state}=harness(),before=structuredClone(state.rows),rows=requestRows(state.rows.slice(0,2));
  const rejected=await post({action:'reassign',uploadID:batch,selectedStaff:[],rows});assert.equal(rejected.status,409);assert.equal(state.writes.length,0);
  const excluded=await post({action:'commit',period:'Week 3 Q1',stockDate:'2026-10-18',selectedStaff:['Alice'],rows:[{article:'SAP',totalStock:1,stocker:'Bob'}]});assert.equal(excluded.status,400);
  const result=await post({action:'reassign',uploadID:batch,selectedStaff:['Alice'],rows});
  assert.equal(result.status,200);assert.equal(result.body.verified,true);assert.equal(result.body.uploadID,batch);
  assert.deepEqual(state.writes,[{range:"'STOKAN'!B3:B3",values:[['Alice']]}]);
  assert.deepEqual(state.rows.map(row=>row.filter((_,i)=>i!==1)),before.map(row=>row.filter((_,i)=>i!==1)));
  assert.deepEqual(state.rows[2],before[2]);assert.equal(state.fullWrites.length,0);
  const stale=await post({action:'reassign',uploadID:batch,selectedStaff:['Alice'],rows});assert.equal(stale.status,409);assert.equal(state.writes.length,1);
 }finally{if(email===undefined)delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;else process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=email;if(key===undefined)delete process.env.GOOGLE_PRIVATE_KEY;else process.env.GOOGLE_PRIVATE_KEY=key}
});

test('SA, Store Trainer and MT are available and a new commit uses current Jakarta date/week',async()=>{
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL='test@example.com';process.env.GOOGLE_PRIVATE_KEY='test';
 try{
  const {GET,post,state}=harness();
  const data=await GET({nextUrl:new URL('https://example.com/api/stokan')});
  assert.deepEqual(data.body.staff.map(person=>person.name),['Alice','Bob','Trainer','Trainee']);
  const result=await post({action:'commit',period:'OLD WEEK',stockDate:'2000-01-01',selectedStaff:['Trainer','Trainee'],rows:[{stocker:'Trainer',article:'NEW1',serial:'SN',totalStock:2},{stocker:'Trainee',article:'NEW2',serial:'SN2',totalStock:3}]});
  assert.equal(result.status,200);assert.equal(result.body.verified,true);
  const expected=context.currentStokanContext();
  assert.equal(state.fullWrites.length,1);
  assert.ok(state.fullWrites[0].values.every(row=>row[10]===expected.stockDate&&row[11]===expected.period));
  assert.deepEqual(state.fullWrites[0].values.map(row=>row[1]),['Trainer','Trainee']);
 }finally{if(email===undefined)delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;else process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=email;if(key===undefined)delete process.env.GOOGLE_PRIVATE_KEY;else process.env.GOOGLE_PRIVATE_KEY=key}
});

test('Jakarta clock follows Apple fiscal weeks, quarter rollover and the 53-week year',()=>{
 const current=instant=>context.currentStokanContext(new Date(instant));
 assert.equal(current('2026-10-18T16:59:59Z').stockDate,'2026-10-18');
 assert.equal(current('2026-10-18T17:00:00Z').stockDate,'2026-10-19');
 assert.equal(current('2026-10-18T17:00:00Z').period,'Week 4 Q1');
 assert.equal(current('2026-09-26T16:59:59Z').period,'Week 13 Q4');
 assert.equal(current('2026-09-26T17:00:00Z').period,'Week 1 Q1');
 assert.equal(current('2026-12-26T17:00:00Z').period,'Week 1 Q2');
 assert.equal(current('2022-12-24T17:00:00Z').period,'Week 14 Q1');
 assert.equal(current('2022-12-31T17:00:00Z').period,'Week 1 Q2');
 for(const role of ['Sales Assistant','SA','ST','Store Trainer','MT','Management Trainee'])assert.equal(context.isStokanPosition(role),true);
 for(const role of ['Supervisor','Store Supervisor','Cashier','Online',''])assert.equal(context.isStokanPosition(role),false);
});
