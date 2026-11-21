import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';

const require=createRequire(import.meta.url);
const code=ts.transpileModule(fs.readFileSync(new URL('../lib/spv-access.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const loaded={exports:{}};
new Function('require','module','exports',code)(id=>id==='./google-sheets'?{getSheetRanges:async()=>[]}:require(id),loaded,loaded.exports);
const {canClearStoreData}=loaded.exports;

test('Admin Clear accepts the four M238 operator roles and rejects sales and online accounts',()=>{
 for(const role of ['Store Supervisor','Store Trainer','Cashier','MT','SPV','ST'])assert.equal(canClearStoreData(role),true,role);
 for(const role of ['Sales Assistant','Online','Assistant Store Trainer','',null])assert.equal(canClearStoreData(role),false,String(role));
});
