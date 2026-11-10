import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
function load(path,require,Clock=Date){const m={exports:{}};new Function('require','module','exports','Date',ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(require,m,m.exports,Clock);return m.exports}
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
test('MTD API reads config and schedule in two batches instead of invoking ten daily routes',async()=>{
 const plan=load('../lib/daily-target-plan.ts',()=>{}),schedule=load('../lib/weekly-schedule-reader.ts',()=>{}),allocated=load('../lib/staff-report-targets.ts',id=>id==='./daily-target-plan'?plan:id==='./weekly-schedule-reader'?schedule:sales);
 const config=Array.from({length:55},()=>[]);config[1][16]='Januari 2026';config[1][17]=3100;config[1][18]=2170;config[1][19]=620;config[1][20]=310;['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'].forEach((day,i)=>{config[i+2][22]=day;config[i+2][23]=100;config[i+2][24]=20;config[i+2][25]=10});config[27][7]='M238';config[27][8]='1';config[27][9]='Andhea';config[27][10]='Sales Assistant';config[27][11]=1;
 const weekly=[['Desember','','',29,30,31,1,2,3,4],['NIK','Name','Rank'],['1','Andhea','Sales Assistant',...Array(7).fill('D047')],['FULL'],['Januari','','',5,6,7,8,9,10,11],['NIK','Name','Rank'],['1','Andhea','Sales Assistant',...Array(7).fill('D047')]];
 const calls=[];class Request{constructor(url){this.url=String(url);this.nextUrl=new URL(url);this.cookies={get:()=>({value:'fixture'})}}}
 let actualSales=[];const resolve=id=>{
  if(id==='next/server')return{NextRequest:Request,NextResponse:{json:(body,options)=>({body,status:options?.status||200})}};
  if(id==='@/lib/auth-session')return{SESSION_COOKIE:'fixture',verifySessionToken:()=>({nik:'1'})};
  if(id==='@/lib/google-sheets')return{getSheetRanges:async(id,ranges)=>{calls.push(ranges);return ranges.length===1?[config]:[weekly,[]]}};
  if(id==='@/lib/m238-sales-source-cache')return{getCachedSalesSource:async()=>({activeDates:[],dataCopas:actualSales})};
  if(id==='@/lib/staff-achievement-report')return report;
  if(id==='@/lib/staff-report-targets')return allocated;
  if(id==='@/lib/target-recovery')return load('../lib/target-recovery.ts',key=>key==='./daily-target-plan'?plan:sales);
  throw Error('Unexpected dependency '+id);
 };const api=load('../app/api/staff-achievement-report/route.ts',resolve);
 const oldEmail=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,oldKey=process.env.GOOGLE_PRIVATE_KEY;process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL='fixture';process.env.GOOGLE_PRIVATE_KEY='fixture';
 try{const result=await api.GET(new Request('https://fixture.test/api/staff-achievement-report?mode=daily&from=2026-01-01&to=2026-01-10'));assert.equal(result.status,200);assert.equal(calls.length,2);assert.equal(result.body.total.targets.device,700);assert.equal(result.body.total.actual.device,0);assert.deepEqual(result.body.warnings,[]);const invalid=await api.GET(new Request('https://fixture.test/api/staff-achievement-report?mode=daily&from=2026-01-10&to=2026-01-10'));assert.equal(invalid.status,400);
 class Clock extends Date{constructor(...args){super(...(args.length?args:['2026-01-10T04:00:00Z']))}static now(){return Date.parse('2026-01-10T04:00:00Z')}}
 actualSales=[{id:'1',name:'Andhea',date:'2026-01-09',store:'M238',scheme:'DEVICES',amount:400,qty:1,description:'',category:'',type:''}];
 const currentApi=load('../app/api/staff-achievement-report/route.ts',resolve,Clock),current=await currentApi.GET(new Request('https://fixture.test/api/staff-achievement-report?mode=daily&from=2026-01-01&to=2026-01-10'));
 assert.equal(current.status,200);assert.equal(current.body.recovery.status,'READY');assert.equal(current.body.total.targets.device,700);assert.equal(current.body.total.actual.device,400);assert.equal(current.body.recoveryStaff.length,1);assert.equal(current.body.recoveryStaff[0].base.amount,100);assert.equal(current.body.recoveryStaff[0].target.amount,current.body.recovery.days[0].target.amount);assert.ok(current.body.recoveryStaff[0].target.amount>100);
 }finally{if(oldEmail===undefined)delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;else process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=oldEmail;if(oldKey===undefined)delete process.env.GOOGLE_PRIVATE_KEY;else process.env.GOOGLE_PRIVATE_KEY=oldKey}
});
