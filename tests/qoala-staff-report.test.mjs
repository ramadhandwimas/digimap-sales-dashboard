import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(file,mocks={}){const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>{if(!(id in mocks))throw Error(id);return mocks[id]},mod,mod.exports);return mod.exports}
const sales=load('lib/m238-sales-sanitize.ts');
const {buildQoalaStaffReport}=load('lib/qoala-staff-report.ts',{'@/lib/m238-sales-sanitize':sales});
const config=[['M238','1','Andhea','Sales Assistant',.1],['M238','2','Sekar','Cashier',0],['M238','3','Zero Staff','Sales Assistant',0],['M238','4','Supervisor','SPV',.1],['M996','5','Other store','Sales Assistant',.1]];
const row=(id,qty,scheme='DEVICES',description='iPhone',date='2026-11-05',store='M238')=>({date,id,name:id,invoice:'INV',article:'A',description,type:description,qty,amount:100,category:description.toUpperCase(),brand:scheme==='VAS'?'QOALA':'APPLE',core:'',scheme,vendor:'',store});
test('report includes zero-share and zero-sales staff, excludes SPV and other stores, and uses weighted total AR',()=>{
 const data=buildQoalaStaffReport(config,[row('1',10),row('1',2,'VAS','Qoala'),row('2',2,'DEVICES','Mac mini'),row('2',1,'VAS','Qoala'),row('4',50),row('4',20,'VAS','Qoala'),row('1',9,'ACCESSORIES','AirPods'),row('1',100,'DEVICES','iPhone','2026-10-05'),row('1',100,'DEVICES','iPhone','2026-11-05','M996')],'2026-11-01','2026-11-30');
 assert.equal(data.staff.length,3);assert.ok(data.staff.some(p=>p.id==='3'&&p.deviceQty===0&&p.ar===null));
 assert.equal(data.staff.find(p=>p.id==='1').ar,20);assert.equal(data.staff.find(p=>p.id==='2').ar,50);
 assert.deepEqual(data.total,{deviceQty:12,qoalaQty:3,qoalaValue:200,ar:25});
 assert.equal(data.staff.find(p=>p.id==='3').qoalaValue,0);
});
test('Qoala value sums line amounts, including corrections, without multiplying by qty',()=>{
 const data=buildQoalaStaffReport(config,[{...row('1',2,'VAS','Qoala'),amount:2645000},{...row('1',-1,'VAS','Qoala'),amount:-700000},{...row('1',2,'VAS','Telkomsel'),brand:'TELKOMSEL'}],'2026-11-01','2026-11-30');
 assert.equal(data.total.qoalaValue,1945000);assert.equal(data.total.qoalaQty,1);
});
test('Qoala with no device uses an undefined AR and report honors week boundaries',()=>{
 const d=buildQoalaStaffReport(config,[row('1',1,'VAS','Qoala'),row('1',3,'DEVICES','iPhone','2026-11-08')],'2026-11-01','2026-11-07');
 assert.equal(d.staff.find(p=>p.id==='1').qoalaQty,1);assert.equal(d.total.ar,null);
});
for(const provider of ['telkomsel','xl','indosat'])test(`${provider} report keeps quantities and value isolated from other providers`,()=>{
 const providerRow=(name,qty,amount)=>({...row('1',qty,'VAS',name),brand:name.toUpperCase(),amount});
 const data=buildQoalaStaffReport(config,[row('1',10),providerRow('Qoala',7,700),providerRow('Telkomsel',2,200),providerRow('XL',3,300),providerRow('Indosat',4,400)],'2026-11-01','2026-11-30',provider);
 const qty={telkomsel:2,xl:3,indosat:4}[provider];
 assert.deepEqual(data.total,{deviceQty:10,qoalaQty:qty,qoalaValue:qty*100,ar:qty*10});assert.equal(data.staff.length,3);
});
