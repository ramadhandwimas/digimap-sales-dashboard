import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

function load(path){const module={exports:{}},code=ts.transpileModule(fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function("module","exports",code)(module,module.exports);return module.exports}
const {groupMadingSchedule}=load("lib/mading-schedule.ts");

test("Mading schedule groups shifts and unavailable staff without guessing O2O PIC",()=>{
 const staff=[{id:"1",name:"Bagas",position:"SA",status:"D047"},{id:"2",name:"Daffa",position:"SA",status:"D072"},{id:"3",name:"Dwimas",position:"SPV",status:"D093"},{id:"4",name:"Rifo",position:"SA",status:"OFF"},{id:"5",name:"Diva",position:"SA",status:"SAKIT"},{id:"6",name:"Asri",position:"SA",status:"TRAINING"}];
 const x=groupMadingSchedule("2026-11-03","Schedule weekly",staff);
 assert.deepEqual(x.shifts.pagi.map(p=>p.name),["Bagas"]);assert.deepEqual(x.shifts.middle.map(p=>p.name),["Daffa"]);assert.deepEqual(x.shifts.siang.map(p=>p.name),["Dwimas"]);assert.deepEqual(x.off.map(p=>p.name),["Rifo"]);assert.deepEqual(x.leaveSick.map(p=>p.name),["Diva"]);assert.deepEqual(x.training.map(p=>p.name),["Asri"]);assert.equal(x.o2o.length,0);
});
