import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
function load(path,require){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(require,m,m.exports);return m.exports}
const sales=load('../lib/m238-sales-sanitize.ts',()=>{}),report=load('../lib/staff-achievement-report.ts',()=>sales);
const roster=[{id:'1',name:'Andhea',position:'Sales Assistant'},{id:'2',name:'Bagas',position:'MT'},{id:'3',name:'Dwimas',position:'SPV'}];
const person=(id,name,amount,acc,vas,targets)=>({id,name,amount,accessories:acc,vas,targets});
test('daily report derives device target from allocated value and includes zero-sales staff',()=>{
 const out=report.buildStaffAchievementReport(roster,[{date:'2026-11-10',staff:[person('1','Andhea',100,20,10,{amount:200,accessories:40,vas:20})]}],'daily');
 assert.equal(out.staff.length,2);assert.deepEqual(out.staff.find(p=>p.id==='1').actual,{device:70,accessories:20,vas:10});assert.deepEqual(out.total.targets,{device:140,accessories:40,vas:20});assert.equal(out.staff.find(p=>p.id==='2').actual.device,0);
});
test('weekly targets sum daily allocations while actuals only use compiled sales',()=>{
 const days=[{date:'2026-11-08',staff:[person('1','Andhea',9999,0,0,{amount:100,accessories:20,vas:10})]},{date:'2026-11-09',staff:[person('1','Andhea',9999,0,0,{amount:200,accessories:40,vas:20}),person('2','Bagas',50,0,0,{amount:0,accessories:0,vas:0})]}];
 const sale=(id,scheme,amount,store='M238')=>({id,name:id==='1'?'Andhea':'Bagas',date:'2026-11-08',scheme,amount,qty:1,store,description:'',category:'',type:'',brand:''});
 const out=report.buildStaffAchievementReport(roster,days,'weekly',[sale('1','DEVICES',150),sale('1','ACCESSORIES',25),sale('2','VAS',10),sale('1','DEVICES',1000,'M996'),sale('3','DEVICES',1000)]);
 assert.deepEqual(out.total.actual,{device:150,accessories:25,vas:10});assert.deepEqual(out.total.targets,{device:210,accessories:60,vas:30});assert.equal(report.achievementText(out.staff.find(p=>p.id==='2'),'vas').achievement,'—');
});
test('achieved target has zero gap and explicit device targets take precedence',()=>{
 const out=report.buildStaffAchievementReport(roster,[{date:'2026-11-10',staff:[person('1','Andhea',200,0,0,{amount:500,device:100})]}],'daily');
 const v=report.achievementText(out.staff.find(p=>p.id==='1'),'device');assert.equal(v.achievement,'200%');assert.match(v.gap,/0$/);
});
test('text export uses exact report period and requested category',()=>{
 const base=report.buildStaffAchievementReport(roster,[],'daily'),text=report.staffAchievementText({...base,from:'2026-11-10',to:'2026-11-10',mode:'daily',warnings:[],source:'Daily Sales',generatedAt:''},'accessories');assert.match(text,/2026-11-10 s.d. 2026-11-10/);assert.match(text,/\*Andhea\*/);assert.match(text,/ACC:/);assert.doesNotMatch(text,/Device:/);assert.doesNotMatch(text,/\*Dwimas\*/);
});
test('MTD totals use cutoff sales and sum daily staff allocations from the first day',()=>{
 const days=Array.from({length:10},(_,i)=>({date:`2026-01-${String(i+1).padStart(2,'0')}`,staff:[person('1','Andhea',9999,0,0,{amount:100,accessories:20,vas:10})]}));
 const out=report.buildStaffAchievementReport(roster,days,'daily',[{id:'1',name:'Andhea',store:'M238',scheme:'DEVICES',amount:250,qty:1,description:'',type:'',category:''}]);
 assert.deepEqual(out.total.targets,{device:700,accessories:200,vas:100});assert.equal(out.total.actual.device,250);assert.equal(out.total.actual.accessories,0);
});
test('API accepts month-to-date and rejects a single day that does not begin on the first',async()=>{
 const calls=[];class Request{constructor(url){this.url=String(url);this.nextUrl=new URL(url);this.cookies={get:()=>({value:'fixture'})}}}
 const api=load('../app/api/staff-achievement-report/route.ts',id=>{
  if(id==='next/server')return{NextRequest:Request,NextResponse:{json:(body,options)=>({body,status:options?.status||200})}};
  if(id==='@/lib/auth-session')return{SESSION_COOKIE:'fixture',verifySessionToken:()=>({nik:'1'})};
  if(id==='@/lib/google-sheets')return{getSheetRanges:async()=>[[['M238','1','Andhea','Sales Assistant',1]]]};
  if(id==='@/lib/m238-sales-source-cache')return{getCachedSalesSource:async()=>({activeDates:[],dataCopas:[]})};
  if(id==='@/lib/staff-achievement-report')return report;
  if(id==='@/app/api/daily-fast/route')return{GET:async req=>{calls.push(req.nextUrl.searchParams.get('date'));return{ok:true,json:async()=>({staff:[person('1','Andhea',999,0,0,{amount:100,accessories:20,vas:10})]})}}};
  throw Error(id);
 });
 const oldEmail=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,oldKey=process.env.GOOGLE_PRIVATE_KEY;process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL='fixture';process.env.GOOGLE_PRIVATE_KEY='fixture';
 try{const result=await api.GET(new Request('https://fixture.test/api/staff-achievement-report?mode=daily&from=2026-01-01&to=2026-01-10'));assert.equal(result.status,200);assert.equal(calls.length,10);assert.equal(calls[0],'2026-01-01');assert.equal(calls.at(-1),'2026-01-10');assert.equal(result.body.total.targets.device,700);assert.equal(result.body.total.actual.device,0);const invalid=await api.GET(new Request('https://fixture.test/api/staff-achievement-report?mode=daily&from=2026-01-10&to=2026-01-10'));assert.equal(invalid.status,400)}finally{if(oldEmail===undefined)delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;else process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=oldEmail;if(oldKey===undefined)delete process.env.GOOGLE_PRIVATE_KEY;else process.env.GOOGLE_PRIVATE_KEY=oldKey}
});
