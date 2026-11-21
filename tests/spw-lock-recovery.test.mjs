import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';

const nativeRequire=createRequire(import.meta.url);
function load(mock){
 const code=ts.transpileModule(fs.readFileSync(new URL('../lib/spw-store.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const module={exports:{}};
 new Function('require','module','exports',code)(id=>id==='./google-sheets'?mock:nativeRequire(id),module,module.exports);
 return module.exports;
}
const credentials={email:'test@example.com',key:'test'};
const reply=(ok,status=200,value)=>({ok,status,json:async()=>value});

test('an old lock is replaced atomically and only its owner can release it',async()=>{
 const previous=`${Date.now()-20*60_000}:old`;
 const calls=[];
 const store=load({
  sheetRequestOnce:async(_id,_suffix,_email,_key,init)=>{
   const requests=JSON.parse(init.body).requests;
   calls.push(requests);
   return reply(requests.length===1&&requests[0].createDeveloperMetadata&&calls.length===1?false:true,400);
  },
  sheetReadRequest:async()=>reply(true,200,{metadataKey:'m238_m996_spw_lock',metadataValue:previous}),
 });
 const owned=await store.acquireSpwLock(credentials);
 assert.equal(calls[1][0].deleteDeveloperMetadata.dataFilter.developerMetadataLookup.metadataValue,previous);
 assert.equal(calls[1][1].createDeveloperMetadata.developerMetadata.metadataValue,owned);
 await store.releaseSpwLock(credentials,owned);
 assert.equal(calls[2][0].deleteDeveloperMetadata.dataFilter.developerMetadataLookup.metadataValue,owned);
});

test('a recent lock is preserved and an unrelated API failure is not called contention',async()=>{
 const current=`${Date.now()-30_000}:active`;
 let reads=0;
 const busy=load({sheetRequestOnce:async()=>reply(false,400),sheetReadRequest:async()=>{reads++;return reply(true,200,{metadataKey:'m238_m996_spw_lock',metadataValue:current})}});
 await assert.rejects(busy.acquireSpwLock(credentials),error=>error.status===409&&/sedang diproses/.test(error.message));
 assert.equal(reads,1);
 const unavailable=load({sheetRequestOnce:async()=>reply(false,403),sheetReadRequest:async()=>{throw Error('unexpected read')}});
 await assert.rejects(unavailable.acquireSpwLock(credentials),error=>error.status===503&&/403/.test(error.message));
});
