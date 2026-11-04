import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const module={exports:{}},code=ts.transpileModule(fs.readFileSync(new URL("../lib/qoala-24.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;new Function("module","exports",code)(module,module.exports);
const {QOALA_24_TIERS,qoala24Quote}=module.exports;
test("regular 24-month tier boundaries select exactly one tier without promotion pricing",()=>{for(const tier of QOALA_24_TIERS){assert.equal(qoala24Quote(tier.min).name,tier.name);assert.equal(qoala24Quote(tier.max).premium,tier.premium)}assert.equal(qoala24Quote(3000000).name,"Bronze");assert.equal(qoala24Quote(3000001).name,"Silver");assert.equal(qoala24Quote(35000001).name,"Titanium");for(const p of [0,-1,NaN,Infinity,799999,65000001,115000000])assert.equal(qoala24Quote(p),null)});
test("selected device price drives total and combined installments, including a capacity change",()=>{const q=qoala24Quote(29499000);assert.equal(q.name,"Platinum");assert.equal(q.premium,2645000);assert.equal(q.total,32144000);assert.equal(q.monthly12,2678667);assert.equal(q.monthly24,1339333);assert.equal(qoala24Quote(44999000).premium,3735000)});
