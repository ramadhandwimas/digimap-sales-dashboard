import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const mod={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync(new URL('../lib/login-activity.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod,mod.exports);
test('daily login history counts each successful login per NIK and shows timestamps newest first',()=>{
 const d=mod.exports.summarizeLoginActivity([['2026-11-09T02:00:00Z','2026-11-09','1','Andhea'],['2026-11-09T05:00:00Z','2026-11-09','1','Andhea Fitri'],['2026-11-09T03:00:00Z','2026-11-09','2','Bagas'],['2026-11-08T03:00:00Z','2026-11-08','1','Andhea'],['invalid','2026-11-09','1','Andhea']],'2026-11-09');
 assert.equal(d.totalUsers,2);assert.equal(d.totalLogins,3);assert.equal(d.rows[0].count,2);assert.equal(d.rows[0].name,'Andhea Fitri');assert.deepEqual(d.rows[0].loginTimes,['2026-11-09T05:00:00Z','2026-11-09T02:00:00Z']);
});
test('history includes dates beyond the previous 5000-entry cap',()=>{
 const raw=Array.from({length:5001},(_,i)=>['2026-11-09T02:00:00Z',i===5000?'2026-11-09':'2026-11-08','1','Andhea']);assert.equal(mod.exports.summarizeLoginActivity(raw,'2026-11-09').totalLogins,1);assert.equal(mod.exports.summarizeLoginActivity(raw,'2026-11-10').totalLogins,0);
});
