import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import {createHash} from 'node:crypto';
function load(file,mocks={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>mocks[id],m,m.exports);return m.exports}
const helpers=load('lib/dashboard-presence.ts'),now=Date.parse('2026-11-09T12:00:00Z');
const row=(id,nik,seconds,visible=true)=>[id,nik,`Staff ${nik}`,new Date(now-seconds*1000).toISOString(),visible,'iPhone','Safari','/'];
test('online means a visible dashboard with a recent heartbeat, not a login hours ago',()=>{
 const d=helpers.summarizePresence([row('a','1',10),row('b','2',151),row('c','3',10,false),row('d','4',13*3600)],now);
 assert.equal(d.totalOnline,1);assert.equal(d.staff.find(p=>p.nik==='1').online,true);assert.ok(d.staff.filter(p=>p.nik!=='1').every(p=>!p.online));
});
test('multiple tabs count one staff and an active tab wins over another hidden tab',()=>{
 const d=helpers.summarizePresence([row('a','1',30),row('b','1',5,false),row('c','1',15)],now);assert.equal(d.totalOnline,1);assert.equal(d.staff.length,1);assert.equal(d.staff[0].lastSeen,new Date(now-15000).toISOString());
});
test('device labels distinguish Safari, Chrome and Samsung Internet',()=>{
 assert.deepEqual(helpers.presenceDevice('Mozilla iPhone AppleWebKit Version/26 Safari/604.1'),{device:'iPhone',browser:'Safari'});
 assert.deepEqual(helpers.presenceDevice('Mozilla Android Chrome/130 SamsungBrowser/28'),{device:'Android',browser:'Samsung Internet'});
 assert.deepEqual(helpers.presenceDevice('Mozilla Macintosh Mobile Safari/604.1'),{device:'iPad',browser:'Safari'});
});
async function route({authenticated=true,saved=[],origin='https://example.test'}={}){
 const writes=[],mocks={
 'node:crypto':{createHash},'next/server':{NextResponse:{json:(body,init={})=>({body,status:init.status||200})}},
 '@/lib/auth-session':{SESSION_COOKIE:'session',verifySessionToken:()=>authenticated?{nik:'verified',name:'Verified Staff'}:null},
 '@/lib/dashboard-presence':helpers,
 '@/lib/google-sheets':{ensureSheet:async()=>{},getSheetRangesFresh:async()=>[saved],getSheetRanges:async()=>[saved],appendSheetValues:async(...x)=>writes.push({type:'append',args:x}),batchWriteRanges:async(...x)=>writes.push({type:'update',args:x})}
 };
 const endpoint=load('app/api/dashboard-presence/route.ts',mocks),email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL='fixture';process.env.GOOGLE_PRIVATE_KEY='fixture';
 try{const result=await endpoint.POST({headers:new Headers({origin,'user-agent':'iPhone Safari/604.1'}),cookies:{get:()=>({value:'signed'})},nextUrl:new URL('https://example.test/api/dashboard-presence'),json:async()=>({clientId:'test-client-123456789',visible:true,page:'/?private=discard',nik:'forged',name:'Forged Name'})});return{...result,writes}}
 finally{if(email===undefined)delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;else process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=email;if(key===undefined)delete process.env.GOOGLE_PRIVATE_KEY;else process.env.GOOGLE_PRIVATE_KEY=key}
}
test('heartbeat uses session identity, keeps no query string and updates a stable slot',async()=>{
 const id=createHash('sha256').update('verified:test-client-123456789').digest('hex'),d=await route({saved:[[id,'verified','Verified Staff',new Date(now).toISOString(),true,'iPhone','Safari','/']]});
 assert.equal(d.status,200);assert.equal(d.writes[0].type,'update');const saved=d.writes[0].args[1][0].values[0];assert.equal(saved[1],'verified');assert.equal(saved[2],'Verified Staff');assert.equal(saved[7],'/');
});
test('heartbeat rejects anonymous or cross-origin writes',async()=>{
 const a=await route({authenticated:false});assert.equal(a.status,401);assert.equal(a.writes.length,0);const b=await route({origin:'https://other.test'});assert.equal(b.status,403);assert.equal(b.writes.length,0);
});
