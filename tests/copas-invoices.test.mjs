import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(path,mocks={}){const code=ts.transpileModule(fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const loaded={exports:{}};new Function('require','module','exports',code)(id=>mocks[id]??require(id),loaded,loaded.exports);return loaded.exports}
const model=load('lib/copas-invoices.ts');
const row=(invoice='10005011',article='APP001')=>['18-10-2026','123','Staff',invoice,article,'iPhone','iPhone',1,20000000,'IPHONE','APPLE','APPLE','DEVICES','','Week 4 Q1','M238','Digimap','FORMULA R','FORMULA S'];
const credentials={email:'test@example.com',key:'test'};
function harness(){
 const state={sheets:[{sheetId:11,title:'Data Copas',gridProperties:{rowCount:100,columnCount:26}},{sheetId:12,title:'RAW SalesPerson',gridProperties:{rowCount:100,columnCount:26}}],values:{11:[['Date','Sales ID','Sales Name','Invoice'],row(),row('10005012'),row()],12:[['RAW'],[...Array(24).fill(''),'10005011'],[...Array(24).fill(''),'10005011'],[...Array(24).fill(''),'10005099']]},locks:new Set(),batches:[],reject:false,cache:[]};
 const response=(body={},status=200)=>({ok:status<400,status,json:async()=>body,text:async()=>JSON.stringify(body)});
 const sheets={
  getSheetRangesFresh:async(_id,ranges)=>ranges.map(range=>{
   const match=range.match(/^'(.+)'!([A-Z]+)(\d+):([A-Z]+)(\d+)$/),sheet=state.sheets.find(sheet=>sheet.title===match[1]);
   const col=value=>[...value].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;
   return(state.values[sheet.sheetId]||[]).slice(Number(match[3])-1,Number(match[5])).map(row=>row.slice(col(match[2]),col(match[4])+1));
  }),
  sheetRequestOnce:async(_id,suffix,_email,_key,options={})=>{
   if(suffix.startsWith('?fields='))return response({sheets:state.sheets.map(properties=>({properties}))});
   const {requests}=JSON.parse(options.body);state.batches.push(requests);
   if(requests[0]?.createDeveloperMetadata){const id=requests[0].createDeveloperMetadata.developerMetadata.metadataId;if(state.locks.has(id))return response({},400);state.locks.add(id);return response()}
   if(state.reject&&requests.some(request=>(request.updateCells?.range.sheetId===11||request.deleteRange?.range.sheetId===11)))return response({},403);
   for(const request of requests){
    if(request.addSheet){const properties=request.addSheet.properties;state.sheets.push(properties);state.values[properties.sheetId]=[]}
    if(request.appendDimension){state.sheets.find(sheet=>sheet.sheetId===request.appendDimension.sheetId).gridProperties.rowCount+=request.appendDimension.length}
    if(request.updateCells){const {range,rows}=request.updateCells,target=state.values[range.sheetId];for(let r=range.startRowIndex;r<range.endRowIndex;r++){target[r]??=[];for(let c=range.startColumnIndex;c<range.endColumnIndex;c++){const value=rows[r-range.startRowIndex]?.values[c-range.startColumnIndex]?.userEnteredValue;target[r][c]=value?.numberValue??value?.stringValue??''}}}
    if(request.deleteRange){const {range,shiftDimension}=request.deleteRange;assert.equal(shiftDimension,'ROWS');const target=state.values[range.sheetId],count=range.endRowIndex-range.startRowIndex;for(let r=range.startRowIndex;r<target.length;r++){const moved=target[r+count]?.slice(range.startColumnIndex,range.endColumnIndex)||[];for(let c=range.startColumnIndex;c<range.endColumnIndex;c++)target[r][c]=moved[c-range.startColumnIndex]??''}}
    if(request.deleteDeveloperMetadata)state.locks.delete(request.deleteDeveloperMetadata.dataFilter.developerMetadataLookup.metadataId);
   }
   return response();
  },
 };
 const store=load('lib/copas-invoice-store.ts',{'./google-sheets':sheets,'./copas-invoices':model});
 const route=load('app/api/copas-invoices/route.ts',{'next/server':{NextResponse:{json:(body,init={})=>({body,status:init.status??200})}},'@/lib/auth-session':{SESSION_COOKIE:'session',verifySessionToken:token=>token==='valid'?{nik:'123',name:'Admin'}:null},'@/lib/copas-invoices':model,'@/lib/copas-invoice-store':store,'@/lib/m238-daily-summary-cache':{refreshDailySummaryPeriods:async periods=>state.cache.push(periods)}});
 const post=(body,token='valid',origin='https://example.com')=>route.POST({cookies:{get:()=>({value:token})},headers:new Headers({origin}),nextUrl:new URL('https://example.com/api/copas-invoices'),json:async()=>body});
 const ops=load('app/api/data-upload-ops/route.ts',{'next/server':{NextResponse:{json:(body,init={})=>({body,status:init.status??200})}},'@/lib/google-sheets':sheets,'@/lib/copas-invoices':model,'@/lib/copas-invoice-store':store,'@/lib/data-copas-repair':{},'@/lib/m238-daily-summary-cache':{}});
 const postExchange=body=>ops.POST({json:async()=>body});
 return{state,store,post,postExchange};
}

test('invoice matching is exact, keeps leading zeros, and reviews duplicate line occurrences independently',()=>{
 const plan=model.findCopasInvoice([row('0012'),row('12'),row('112'),row('12')],'12');
 assert.deepEqual(plan.items.map(item=>item.row),[3,5]);assert.notEqual(plan.items[0].id,plan.items[1].id);
 assert.equal(model.findCopasInvoice([row('0012')],'12').items.length,0);
 assert.throws(()=>model.selectCopasInvoice(plan,[]));assert.throws(()=>model.selectCopasInvoice(plan,[plan.items[0].id,plan.items[0].id]));
 const selected=model.selectCopasInvoice(plan,[plan.items[1].id]);assert.equal(selected[0].row,5);
 const key=model.invoiceFingerprint(row('12'));
 assert.equal(model.excludeRemovedInvoices([row('12'),row('12'),row('112')],[key]).rows.length,2);
 const modified=row('12');modified[6]='Updated Type';modified[13]='Updated Vendor';assert.equal(model.invoiceFingerprint(modified),key);
 const otherStore=row('12');otherStore[15]='M996';assert.notEqual(model.invoiceFingerprint(otherStore),key);
});

test('removal archives and shifts only selected A:Q cells in one atomic batch, preserving formulas and other invoices',async()=>{
 const {store,state}=harness(),before=structuredClone(state.values[11]),snapshot=await store.readCopasInvoiceSnapshot(credentials),plan=model.findCopasInvoice(snapshot.rows,'10005011');
 assert.equal(state.batches.length,0);
 await store.acquireCopasLock(credentials);
 await store.removeCopasInvoice(credentials,snapshot,[plan.items[1]],'123 Admin','cancel');
 const changes=state.batches[1],clear=changes.find(request=>request.deleteRange).deleteRange;
 assert.deepEqual(clear.range,{sheetId:11,startRowIndex:3,endRowIndex:4,startColumnIndex:0,endColumnIndex:17});
 assert.equal(changes.at(-1).deleteDeveloperMetadata.dataFilter.developerMetadataLookup.metadataId,238190126);
 assert.deepEqual(state.values[11].slice(0,3),before.slice(0,3));assert.ok(state.values[11][3].slice(0,17).every(value=>value===''));assert.deepEqual(state.values[11][3].slice(17),before[3].slice(17));
 assert.equal(state.locks.size,0);
 const log=state.sheets.find(sheet=>sheet.title==='Data Copas Exchange Log');assert.equal(log.hidden,true);
 assert.equal(state.values[log.sheetId][1][3],'cancel');assert.equal(state.values[log.sheetId][1][4],4);
 assert.deepEqual(state.values[log.sheetId][1].slice(6),before[3].slice(0,17));
 assert.deepEqual(await store.readRemovedInvoiceFingerprints(credentials),[model.invoiceFingerprint(before[3])]);
 const fresh=await store.readCopasInvoiceSnapshot(credentials);const remaining=model.findCopasInvoice(fresh.rows,'10005011');
 await store.acquireCopasLock(credentials);await store.removeCopasInvoice(credentials,fresh,remaining.items,'123 Admin','exchange');
 assert.equal(state.values[log.sheetId].length,3);assert.equal((await store.readRemovedInvoiceFingerprints(credentials)).length,2);
});

test('permission failure does not clear or archive any transaction',async()=>{
 const {store,state}=harness(),snapshot=await store.readCopasInvoiceSnapshot(credentials),before=structuredClone(state.values);
 await store.acquireCopasLock(credentials);state.reject=true;
 await assert.rejects(store.removeCopasInvoice(credentials,snapshot,model.findCopasInvoice(snapshot.rows,'10005011').items,'123','cancel'),error=>error.safeToUnlock===true);
 assert.deepEqual(state.values,before);await store.releaseCopasLock(credentials);assert.equal(state.locks.size,0);
});

test('API requires login, same origin, reviewed plan and selected rows; stale plans do not mutate transactions',async()=>{
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=credentials.email;process.env.GOOGLE_PRIVATE_KEY=credentials.key;
 try{
  const {state,post}=harness();assert.equal((await post({action:'check',invoice:'10005011'},'invalid')).status,401);assert.equal((await post({action:'check',invoice:'10005011'},'valid','https://other.example')).status,403);assert.equal(state.batches.length,0);
  const preview=await post({action:'check',invoice:'10005011'});assert.equal(preview.status,200);assert.equal(preview.body.groups[0].items.length,2);assert.equal(preview.body.groups[0].items[0].values,undefined);assert.equal(state.batches.length,0);assert.equal(preview.body.sourceInvoiceCount,2);assert.equal(preview.body.foundInvoiceCount,1);assert.equal(preview.body.notFoundInvoiceCount,1);assert.deepEqual(preview.body.groups[0].sourceRows,[2,3]);
  const unlistedId=model.findCopasInvoice(state.values[11].slice(1),'10005012').items[0].id;
  const unlisted=await post({action:'delete',planId:preview.body.planId,selectedIds:[unlistedId],reason:'exchange'});assert.equal(unlisted.status,400);assert.equal(state.values[11][2][3],'10005012');
  const invalid=await post({action:'delete',invoice:'10005011',planId:preview.body.planId,selectedIds:[],reason:'cancel'});assert.equal(invalid.status,400);assert.equal(state.locks.size,0);
  state.values[12][1][24]='10005012';
  const changedY=await post({action:'delete',planId:preview.body.planId,selectedIds:[preview.body.groups[0].items[0].id],reason:'exchange'});assert.equal(changedY.status,409);
  state.values[12][1][24]='10005011';state.values[11][1][8]=1;
  const stale=await post({action:'delete',invoice:'10005011',planId:preview.body.planId,selectedIds:[preview.body.groups[0].items[0].id],reason:'cancel'});assert.equal(stale.status,409);assert.equal(state.locks.size,0);assert.equal(state.values[11][1][3],'10005011');
  const current=await post({action:'check',invoice:'10005011'}),deleted=await post({action:'delete',invoice:'10005011',planId:current.body.planId,selectedIds:[current.body.groups[0].items[0].id],reason:'exchange'});
  assert.equal(deleted.status,200);assert.equal(deleted.body.deletedRows,1);assert.deepEqual(state.cache,[['2026-10']]);assert.equal(state.values[11][1][3],'10005012');assert.equal(state.values[11][2][3],'10005011');assert.equal(state.values[11][3][3],'');
  const repeated=await post({action:'delete',invoice:'10005011',planId:current.body.planId,selectedIds:[current.body.groups[0].items[0].id],reason:'exchange'});assert.equal(repeated.status,409);
 }finally{if(email===undefined)delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;else process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=email;if(key===undefined)delete process.env.GOOGLE_PRIVATE_KEY;else process.env.GOOGLE_PRIVATE_KEY=key}
});

test('column Y drives the check, deduplicates invoices and never infers an invoice from RAW helper row alignment',()=>{
 const copas=[row('0012'),row('12'),row('112'),row('12')];
 const checked=model.checkRawExchangeInvoices(copas,[[12],['0012'],[12],[''],['N/A'],['-'],['missing']]);
 assert.equal(checked.sourceInvoiceCount,3);assert.equal(checked.foundInvoiceCount,2);assert.equal(checked.notFoundInvoiceCount,1);
 assert.deepEqual(checked.groups.map(group=>group.invoice),['12','0012','missing']);
 assert.deepEqual(checked.groups[0].sourceRows,[2,4]);assert.equal(checked.groups[0].items.length,2);
 assert.deepEqual(checked.items.map(item=>item.row),[3,5,2]);assert.ok(checked.items.every(item=>item.invoice!=='112'));
 const changed=model.checkRawExchangeInvoices(copas,[[12],['0012'],['missing']]);assert.notEqual(changed.planId,checked.planId);
 const empty=model.checkRawExchangeInvoices(copas,[]);assert.equal(empty.items.length,0);assert.equal(empty.sourceInvoiceCount,0);
});

test('pending exchange invoices save directly in an empty Y cell without an existing transaction and without changing adjacent columns',async()=>{
 const {store,state}=harness();
 state.sheets=state.sheets.filter(sheet=>sheet.sheetId!==11); // No Data Copas sheet is required to record a pending invoice.
 state.values[12][4]=Array.from({length:26},(_,i)=>i===24?'':`keep-${i}`);
 const before=structuredClone(state.values);
 await store.acquireCopasLock(credentials);
 const saved=await store.saveRawExchangeInvoice(credentials,'00100051953');
 assert.equal(saved.added,true);assert.equal(saved.rowNumber,5);assert.equal(state.values[12][4][24],'00100051953');assert.equal(state.locks.size,0);
 const expected=structuredClone(before);expected[12][4][24]='00100051953';assert.deepEqual(state.values,expected);
 const writes=state.batches.flatMap(batch=>batch.filter(request=>request.updateCells));
 assert.equal(writes.length,1);assert.equal(writes[0].updateCells.range.startColumnIndex,24);assert.equal(writes[0].updateCells.range.endColumnIndex,25);
 await store.acquireCopasLock(credentials);
 const repeated=await store.saveRawExchangeInvoice(credentials,' 00100051953 ');assert.equal(repeated.added,false);assert.equal(repeated.rowNumber,5);
 await store.releaseCopasLock(credentials);assert.deepEqual(state.values,expected);
});

test('direct exchange API accepts only the exchange number, skips duplicates and validates empty input',async()=>{
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=credentials.email;process.env.GOOGLE_PRIVATE_KEY=credentials.key;
 try{
  const {postExchange,state}=harness();
  const empty=await postExchange({action:'exchange',noExchange:'  '});assert.equal(empty.status,400);assert.equal(state.batches.length,0);
  const saved=await postExchange({action:'exchange',noExchange:'100051953'});
  assert.equal(saved.status,200);assert.equal(saved.body.added,true);assert.equal(saved.body.noExchange,'100051953');assert.equal(state.locks.size,0);
  const again=await postExchange({action:'exchange',noExchange:'100051953'});assert.equal(again.status,200);assert.equal(again.body.added,false);assert.equal(state.locks.size,0);
  assert.equal(state.values[12].filter(row=>row[24]==='100051953').length,1);
  assert.equal(state.values[11][1][3],'10005011');
 }finally{if(email===undefined)delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;else process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=email;if(key===undefined)delete process.env.GOOGLE_PRIVATE_KEY;else process.env.GOOGLE_PRIVATE_KEY=key}
});

test('exchange entry validation preserves leading zeros and uses the first blank Y slot',()=>{
 assert.deepEqual(model.planRawExchangeEntry([['existing'],[],['later']],' 00123 '),{invoice:'00123',rowNumber:3,added:true});
 assert.deepEqual(model.planRawExchangeEntry([['Inv-1']],'inv-1'),{invoice:'inv-1',rowNumber:2,added:false});
 assert.equal(model.planRawExchangeEntry([[123]],'00123').added,true);
 for(const value of ['',null,{},'a'.repeat(101),'123\n456'])assert.throws(()=>model.planRawExchangeEntry([],value));
});


test('deletion compacts old gaps and disjoint selections bottom-up, preserving transaction order, header and R onward',async()=>{
 const {store,state}=harness();
 state.values[11]=[['header'],row('keep1'),[],row('remove'),row('remove'),row('keep2'),[],row('remove'),row('keep3')];
 state.values[11].forEach((value,index)=>{value[17]=`=R${index+1}`});
 const before=structuredClone(state.values[11]),snapshot=await store.readCopasInvoiceSnapshot(credentials),items=model.findCopasInvoice(snapshot.rows,'remove').items;
 await store.acquireCopasLock(credentials);await store.removeCopasInvoice(credentials,snapshot,items,'Admin','exchange');
 assert.deepEqual(state.values[11].slice(1,4).map(value=>value[3]),['keep1','keep2','keep3']);
 assert.deepEqual(state.values[11].map(value=>value[17]),before.map(value=>value[17]));assert.deepEqual(state.values[11][0],before[0]);
 assert.deepEqual(state.batches[1].filter(value=>value.deleteRange).map(value=>[value.deleteRange.range.startRowIndex,value.deleteRange.range.endRowIndex]),[[6,8],[2,5]]);
 const log=state.sheets.find(sheet=>sheet.title==='Data Copas Exchange Log');
 assert.deepEqual(state.values[log.sheetId].slice(1).map(value=>value[4]),[4,5,8]);
 assert.equal(state.values[11].length,before.length);assert.equal(state.locks.size,0);
});

test('standalone compact repairs existing gaps without a column Y match or archiving transactions',async()=>{
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=credentials.email;process.env.GOOGLE_PRIVATE_KEY=credentials.key;
 try{
  const {state,post}=harness();state.values[11]=[['header'],[],row('keep'),[],row('keep2')];state.values[12]=[['RAW']];
  const result=await post({action:'compact'});assert.equal(result.status,200);assert.equal(result.body.compactedRows,2);
  assert.deepEqual(state.values[11].slice(1,3).map(value=>value[3]),['keep','keep2']);assert.equal(state.sheets.length,2);assert.equal(state.locks.size,0);
  const again=await post({action:'compact'});assert.equal(again.status,200);assert.equal(again.body.compactedRows,0);
 }finally{if(email===undefined)delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;else process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=email;if(key===undefined)delete process.env.GOOGLE_PRIVATE_KEY;else process.env.GOOGLE_PRIVATE_KEY=key}
});
