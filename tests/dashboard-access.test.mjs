import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync(new URL('../app/api/dashboard-access/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
async function run({authenticated=true,saved=[],fail=false}={}){
 const writes=[],mod={exports:{}},mocks={
 'next/server':{NextResponse:{json:(body,init={})=>({body,status:init.status||200})}},
 '@/lib/auth-session':{SESSION_COOKIE:'session',verifySessionToken:()=>authenticated?{nik:'verified-id',name:'Verified Staff'}:null},
 '@/lib/google-sheets':{ensureSheet:async()=>{},getSheetRangesFresh:async()=>[saved],appendSheetValues:async(...args)=>{if(fail)throw Error('Unavailable');writes.push(args)}}};
 new Function('require','module','exports',code)(id=>mocks[id],mod,mod.exports);
 const oldEmail=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,oldKey=process.env.GOOGLE_PRIVATE_KEY;process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL='fixture';process.env.GOOGLE_PRIVATE_KEY='fixture';
 try{const result=await mod.exports.POST({headers:new Headers({origin:'https://example.test'}),nextUrl:new URL('https://example.test/api/dashboard-access'),cookies:{get:()=>({value:'signed-session'})},json:async()=>({eventId:'test-event-123456789',nik:'forged-id',name:'Forged Name'})});return{...result,writes}}
 finally{if(oldEmail===undefined)delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;else process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=oldEmail;if(oldKey===undefined)delete process.env.GOOGLE_PRIVATE_KEY;else process.env.GOOGLE_PRIVATE_KEY=oldKey}
}
test('access events use verified session identity and write dates as RAW',async()=>{const r=await run();assert.equal(r.status,200);assert.equal(r.writes.length,1);assert.equal(r.writes[0][2][0][2],'verified-id');assert.equal(r.writes[0][2][0][3],'Verified Staff');assert.equal(r.writes[0][5],'RAW')});
test('anonymous users cannot record access',async()=>{const r=await run({authenticated:false});assert.equal(r.status,401);assert.equal(r.writes.length,0)});
test('a recent access is not counted again',async()=>{const r=await run({saved:[[new Date().toISOString(),'2026-11-09','verified-id','Verified Staff','older-event']]});assert.equal(r.body.recorded,false);assert.equal(r.writes.length,0)});
test('failed persistence is returned as an error rather than recorded success',async()=>{const r=await run({fail:true});assert.equal(r.status,503);assert.notEqual(r.body.ok,true)});
