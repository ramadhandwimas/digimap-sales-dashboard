import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";

const require=createRequire(import.meta.url);

function transpileFunction(fileUrl,prefix,name,prelude=""){
 const source=fs.readFileSync(fileUrl,"utf8");
 const line=source.split("\n").find(value=>value.startsWith(prefix));
 assert.ok(line,`${name} harus tersedia di source`);
 const exported=line.replace(`function ${name}`,`export function ${name}`);
 const code=ts.transpileModule(`${prelude}\n${exported}`,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 new Function("require","module","exports",code)(require,module,module.exports);
 return module.exports[name];
}

const scheduleIndex=transpileFunction(new URL("../app/api/daily-fast/route.ts",import.meta.url),"function scheduleIndex","scheduleIndex");
const buildWeekEntries=transpileFunction(
 new URL("../app/api/weekly/route.ts",import.meta.url),
 "function buildWeekEntries",
 "buildWeekEntries",
 'const s=(v)=>String(v??"").trim(); const isValidSale=(row)=>Boolean(row?.date&&row?.store==="M238");',
);

test("Schedule weekly resolves September to October rollover",()=>{
 const days=[28,29,30,1,2,3,4];
 assert.equal(scheduleIndex("2026-09-30",9,days),2);
 assert.equal(scheduleIndex("2026-10-01",9,days),3);
 assert.equal(scheduleIndex("2026-10-04",9,days),6);
});

test("Schedule weekly resolves December to January rollover",()=>{
 const days=[28,29,30,31,1,2,3];
 assert.equal(scheduleIndex("2026-12-31",12,days),3);
 assert.equal(scheduleIndex("2027-01-01",12,days),4);
 assert.equal(scheduleIndex("2027-01-03",12,days),6);
});

test("Weekly entries keep Q4 to Q1 chronological order across years",()=>{
 const item=(date,label)=>({raw:[date,null,null,null,null,null,null,null,null,null,null,null,null,null,label,"M238"],row:{date,store:"M238"}});
 const entries=buildWeekEntries([
  item("2026-12-27","Week 13 Q4"),
  item("2027-01-03","Week 1 Q1"),
  item("2027-01-10","Week 2 Q1"),
 ]);
 assert.deepEqual(entries.map(entry=>`${entry.year}:${entry.label}`),[
  "2026:Week 13 Q4",
  "2027:Week 1 Q1",
  "2027:Week 2 Q1",
 ]);
});
