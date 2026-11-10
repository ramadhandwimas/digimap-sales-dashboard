import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source=fs.readFileSync(new URL('../app/api/daily-fast/route.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const planModule={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync(new URL('../lib/daily-target-plan.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(planModule,planModule.exports);
const date='2026-11-05';
const schedule=[['NOVEMBER','','',1,2,3,4,5,6,7],['NIK','NAME','POSITION'],
 ['100001','Active','Sales Assistant','D047','D047','D047','D047','D047'],
 ['100002','Sekar','Sales Assistant','OFF','OFF','OFF','OFF','OFF'],
 ['100003','Training seller','Sales Assistant','TRAINING','TRAINING','TRAINING','TRAINING','TRAINING'],
 ['100004','Bagas','Sales Assistant','OFF','OFF','OFF','OFF','OFF']];
function sale(id,name,amount){return {date,id,name,store:'M238',amount,qty:1,invoices:1,iphone:1,validation:'MATCH'}}
async function run({fresh=false,weekly=schedule}={}){
 const fast=[sale('100001','Active',100),sale('100002','Sekar',200),sale('100003','Training seller',300),sale('100005','Outside roster',400)];
 const config=Array.from({length:31},()=>[]);config[0][22]='kamis';config[0][23]=1000;
 config[27]=[,,,,,,,'M238','100001','Active','Sales Assistant',1];
 const fixed=fast.map(r=>({...r,position:'Sales Assistant',status:'EXTRA',share:0,targets:{amount:0,accessories:0,vas:0}}));
 const next={NextRequest:class{constructor(url){this.nextUrl=url}},NextResponse:{json:(body,init={})=>({body,status:init.status||200,json:async()=>body})}};
 const loaded={exports:{}},mocks={
  '@/lib/daily-target-plan':planModule.exports,
  '@/lib/target-recovery':{},
  '@/lib/m238-sales-source-cache':{},
  'next/server':next,
  '@/lib/exchange-detail-store':{readExchangeState:async()=>({details:[],legacy:[]})},
  '@/lib/google-sheets':{getSheetRanges:async(_id,ranges)=>ranges[0].includes('Schedule weekly')?[weekly]:ranges[0].includes('Config!')?[config]:[fast]},
  '@/lib/m238-fast-sales':{cacheFromValues:r=>r},
  '@/app/api/daily-fixed/route':{GET:async()=>next.NextResponse.json({date,staff:fixed,total:{amount:1000}})}
 };
 new Function('require','module','exports',code)(id=>{if(!(id in mocks))throw Error(id);return mocks[id]},loaded,loaded.exports);
 const oldEmail=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,oldKey=process.env.GOOGLE_PRIVATE_KEY;
 process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL='fixture';process.env.GOOGLE_PRIVATE_KEY='fixture';
 const url=new URL(`https://example.test/api/daily-fast?date=${date}${fresh?'&fresh=1':''}`);url.clone=()=>new URL(url);
 try{return (await loaded.exports.GET({nextUrl:url})).body}
 finally{if(oldEmail===undefined)delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;else process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=oldEmail;if(oldKey===undefined)delete process.env.GOOGLE_PRIVATE_KEY;else process.env.GOOGLE_PRIVATE_KEY=oldKey}
}
for(const fresh of [false,true])test(`daily ${fresh?'live fallback':'cache'} includes off/training sellers without allocating a target`,async()=>{
 const data=await run({fresh}),byId=new Map(data.staff.map(p=>[p.id,p]));
 assert.deepEqual([...byId.keys()],['100001','100002','100003','100005']);
 assert.equal(byId.get('100002').amount,200);assert.equal(byId.get('100002').status,'OFF');
 assert.equal(byId.get('100003').amount,300);assert.equal(byId.get('100003').status,'TRAINING');
 for(const id of ['100002','100003','100005']){assert.equal(byId.get(id).targets.amount,0);assert.equal(byId.get(id).share,0)}
 assert.equal(data.staff.reduce((sum,p)=>sum+p.amount,0),data.total.amount);
 if(!fresh){assert.equal(byId.get('100001').targets.amount,1000);assert.equal(data.reconciliation.unassigned.staffCount,0)}
});
test('missing schedule still displays sellers with zero target',async()=>{
 const data=await run({fresh:true,weekly:[]});assert.equal(data.staff.length,4);assert.equal(data.staff.reduce((sum,p)=>sum+p.amount,0),1000);assert.ok(data.staff.every(p=>p.targets.amount===0));
});
