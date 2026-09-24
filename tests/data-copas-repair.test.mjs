import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";

const require=createRequire(import.meta.url);
const source=fs.readFileSync(new URL("../lib/data-copas-repair.ts",import.meta.url),"utf8");
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};
new Function("require","module","exports",code)(require,module,module.exports);
const {buildDataCopasRepairWrites,planDataCopasRepair}=module.exports;

const master=[
 ["Brand","SAP Article","SAP Description","Product Category","Type","Product Group","Core","","Vendor Code","PT Name","Brand Code","Brand Name"],
 ["SANDISK","SDXE10-500G-G25","Portable Drive","MEMORY","","ACCESSORIES","APPLE","","103961","DATASCRIP PT","SDX","SANDISK"],
 ["QOALA","KLA001","Protection","PROTEKSI","","VAS","APPLE","","105000","MITRA JASA PRATAMA PT","KLA","QOALA"],
];

function copas(article,overrides={}){
 const row=["20-09-2026","23014336","Nadiva","100050888",article,"Portable Drive","",1,2589000,"N/A","N/A","N/A","N/A","","Week 13 Q4","M238","Digimap"];
 for(const [column,value] of Object.entries(overrides))row[Number(column)]=value;
 return row;
}

test("repairs N/A classification from Master while preserving Qty and Amount",()=>{
 const plan=planDataCopasRepair(master,[copas("SDXE10-500G-G25")]);
 assert.equal(plan.candidates.length,1);
 assert.equal(plan.naRows,1);
 assert.deepEqual(plan.candidates[0].values,["",1,2589000,"MEMORY","SANDISK","APPLE","ACCESSORIES","DATASCRIP PT"]);
 assert.deepEqual(plan.candidates[0].changes.map(change=>change.column),["J","K","L","M","N"]);
});

test("corrects manual classification differences and keeps transaction columns out of the write",()=>{
 const plan=planDataCopasRepair(master,[copas("KLA001",{5:"Protection",6:"Wrong type",9:"PROTEKSI",10:"Wrong Brand",11:"APPLE",12:"ACCESSORIES",13:"Wrong Vendor"})]);
 assert.equal(plan.naRows,0);
 assert.equal(plan.correctedRows,1);
 assert.deepEqual(plan.candidates[0].values,["",1,2589000,"PROTEKSI","QOALA","APPLE","VAS","MITRA JASA PRATAMA PT"]);
 assert.deepEqual(plan.candidates[0].changes.map(change=>change.column),["G","K","M","N"]);
});

test("reports N/A rows whose SAP Article is still absent from Master",()=>{
 const plan=planDataCopasRepair(master,[copas("UNKNOWN")]);
 assert.equal(plan.candidates.length,0);
 assert.equal(plan.unresolvedNARows,1);
 assert.deepEqual(plan.unresolvedSamples,[{row:2,article:"UNKNOWN",description:"Portable Drive"}]);
});

test("uses the first Master and supplier match like XLOOKUP",()=>{
 const duplicate=[...master,["OTHER","SDXE10-500G-G25","Duplicate","CASE","CASE","VAS","ANDROID","","999","OTHER PT","OTH","SANDISK"]];
 const plan=planDataCopasRepair(duplicate,[copas("sdxe10-500g-g25")]);
 assert.equal(plan.candidates[0].values[3],"MEMORY");
 assert.equal(plan.candidates[0].values[7],"DATASCRIP PT");
});

test("combines consecutive repairs into compact batch ranges",()=>{
 const candidates=[
  {row:2,values:["",1,100,"CASE","A","APPLE","ACCESSORIES",""]},
  {row:3,values:["",1,200,"CASE","A","APPLE","ACCESSORIES",""]},
  {row:7,values:["",1,300,"CASE","B","APPLE","ACCESSORIES",""]},
 ];
 assert.deepEqual(buildDataCopasRepairWrites(candidates,"Data Copas",500),[
  {range:"'Data Copas'!G2:N3",values:[candidates[0].values,candidates[1].values]},
  {range:"'Data Copas'!G7:N7",values:[candidates[2].values]},
 ]);
});

test("splits long consecutive repairs at the requested row limit",()=>{
 const candidates=Array.from({length:5},(_,index)=>({row:index+10,values:["",1,index,"CASE","A","APPLE","ACCESSORIES",""]}));
 assert.deepEqual(buildDataCopasRepairWrites(candidates,"Data Copas",2).map(write=>write.range),["'Data Copas'!G10:N11","'Data Copas'!G12:N13","'Data Copas'!G14:N14"]);
});
