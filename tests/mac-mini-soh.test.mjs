import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const mod={exports:{}};
new Function('module','exports',ts.transpileModule(fs.readFileSync(new URL('../lib/m238-fast-soh.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod,mod.exports);
const {parseSohFast,missingMacMiniStock}=mod.exports;
const row=(article,description,type,qty=2,scheme='DEVICES',brand='APPLE')=>[brand,'',scheme,type,`${article} / ${description}`,'',100,qty,200];
test('Mac mini joins MacBook stock for desktop labels and description fallback',()=>{
 const raw=[row('MINI1','Mac mini M4 256GB','DESKTOPS'),row('MINI2','Mac Mini M4 512GB','COMPUTERS'),row('MBA1','MacBook Air M5','LAPTOPS')];
 assert.deepEqual(parseSohFast(raw).rows.map(r=>[r.article,r.category]),[['MINI1','MACBOOK'],['MINI2','MACBOOK'],['MBA1','MACBOOK']]);
 assert.deepEqual(missingMacMiniStock(raw,[{article:'mini1'}]).map(r=>r.article),['MINI2']);
});
test('Mac mini excludes demo, accessory, other brand and zero stock',()=>{
 const raw=[row('DEMO1','Mac mini demo','DESKTOP'),row('ACC1','Mac mini case','COMPUTERS',2,'ACCESSORIES'),row('OTHER1','Mac mini','DESKTOP',2,'DEVICES','OTHER'),row('ZERO1','Mac mini','DESKTOP',0)];
 assert.deepEqual(missingMacMiniStock(raw,[]),[]);
});
