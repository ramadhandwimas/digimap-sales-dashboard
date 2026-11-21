import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';

const require=createRequire(import.meta.url);
function loadRoute(mocks){
 const code=ts.transpileModule(fs.readFileSync(new URL('../app/api/data-tools/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const loaded={exports:{}};
 new Function('require','module','exports',code)(id=>mocks[id]??require(id),loaded,loaded.exports);
 return loaded.exports;
}

test('Admin Clear denies missing session, other origin, and unauthorized role before any sheet mutation',async()=>{
 const oldEmail=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,oldKey=process.env.GOOGLE_PRIVATE_KEY;
 process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL='test-email';process.env.GOOGLE_PRIVATE_KEY='test-key';
 let session=null,allowed=false,mutations=0;
 const denyMutation=async()=>{mutations++};
 const route=loadRoute({
  'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status??200})}},
  '@/lib/auth-session':{SESSION_COOKIE:'session',verifySessionToken:()=>session},
  '@/lib/spv-access':{isStoreClearOperator:async()=>allowed},
  '@/lib/google-sheets':{batchClearRanges:denyMutation,batchWriteRanges:denyMutation,ensureSheets:denyMutation,getGoogleSheetRequestCount:()=>0},
  '@/lib/spw-store':{acquireSpwLock:denyMutation,releaseSpwLock:denyMutation,replaceSpwRanges:denyMutation,SpwWriteError:class extends Error{}},
  '@/lib/m238-fast-sales':{cacheHeaders:[],normalizedHeaders:[]},
  '@/lib/m238-fast-soh':{sohFastHeaders:[]},
  '@/lib/m238-daily-summary-cache':{clearActiveSpwSummaryRows:denyMutation},
 });
 const request=origin=>({cookies:{get:()=>({value:'session'})},headers:{get:()=>origin},nextUrl:new URL('https://m238.netlify.app/api/data-tools'),json:async()=>({action:'clear-spw'})});
 try{
  assert.equal((await route.POST(request(null))).status,401);
  session={nik:'123'};
  assert.equal((await route.POST(request('https://elsewhere.example'))).status,403);
  assert.equal((await route.POST(request('https://m238.netlify.app'))).status,403);
  assert.equal(mutations,0);
  allowed=true;
  assert.equal((await route.POST({...request('https://m238.netlify.app'),json:async()=>({action:'unknown'})})).status,400);
  assert.equal(mutations,0);
 }finally{
  if(oldEmail===undefined)delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;else process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=oldEmail;
  if(oldKey===undefined)delete process.env.GOOGLE_PRIVATE_KEY;else process.env.GOOGLE_PRIVATE_KEY=oldKey;
 }
});
