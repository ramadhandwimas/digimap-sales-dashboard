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
