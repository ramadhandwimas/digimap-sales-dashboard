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

test("repairs only N/A classification and fills a known blank vendor",()=>{
 const plan=planDataCopasRepair(master,[copas("SDXE10-500G-G25")]);
 assert.equal(plan.rowsWithNA,1);
 assert.equal(plan.candidates.length,1);
 assert.equal(plan.changedCells,5);
 assert.deepEqual(plan.candidates[0].changes,[
  {column:"J",field:"Product Category",from:"N/A",to:"MEMORY"},
  {column:"K",field:"Brand Name",from:"N/A",to:"SANDISK"},
  {column:"L",field:"Core Product",from:"N/A",to:"APPLE"},
  {column:"M",field:"Product Scheme",from:"N/A",to:"ACCESSORIES"},
  {column:"N",field:"Vendor",from:"",to:"DATASCRIP PT"},
 ]);
});

test("ignores existing manual values even when they differ from Master",()=>{
 const row=copas("KLA001",{6:"Manual Type",9:"PROTEKSI",10:"Manual Brand",11:"APPLE",12:"ACCESSORIES",13:"Manual Vendor"});
 const plan=planDataCopasRepair(master,[row]);
 assert.equal(plan.rowsWithNA,0);
 assert.equal(plan.candidates.length,0);
 assert.equal(plan.changedCells,0);
});

test("lists N/A rows whose SAP Article is absent from Master",()=>{
 const plan=planDataCopasRepair(master,[copas("UNKNOWN")]);
 assert.equal(plan.candidates.length,0);
 assert.equal(plan.unresolvedNARows,1);
 assert.equal(plan.issues[0].reason,"missing-master");
});

test("blocks an article when duplicate Master rows have conflicting classifications",()=>{
 const duplicate=[...master,["OTHER","SDXE10-500G-G25","Duplicate","CASE","CASE","VAS","ANDROID","","999","OTHER PT","OTH","OTHER"]];
 const plan=planDataCopasRepair(duplicate,[copas("SDXE10-500G-G25")]);
 assert.equal(plan.candidates.length,0);
 assert.equal(plan.issues[0].reason,"conflicting-master");
});

test("accepts duplicate Master rows when their classifications are identical",()=>{
 const duplicate=[...master,["SANDISK","SDXE10-500G-G25","Duplicate","MEMORY","","ACCESSORIES","APPLE"]];
 const plan=planDataCopasRepair(duplicate,[copas("SDXE10-500G-G25")]);
 assert.equal(plan.candidates.length,1);
});

test("writes only classification columns and never includes Qty or Amount",()=>{
 const plan=planDataCopasRepair(master,[copas("SDXE10-500G-G25"),copas("SDXE10-500G-G25")]);
 const writes=buildDataCopasRepairWrites(plan.candidates,"Data Copas",500);
 assert.deepEqual(writes.map(write=>write.range),[
  "'Data Copas'!J2:J3",
  "'Data Copas'!K2:K3",
  "'Data Copas'!L2:L3",
  "'Data Copas'!M2:M3",
  "'Data Copas'!N2:N3",
 ]);
 assert.ok(writes.every(write=>!/[HI]\d/.test(write.range)));
});

test("splits long consecutive writes at the requested row limit",()=>{
 const plan=planDataCopasRepair(master,Array.from({length:5},()=>copas("SDXE10-500G-G25")));
 const writes=buildDataCopasRepairWrites(plan.candidates,"Data Copas",2).filter(write=>write.range.includes("!J"));
 assert.deepEqual(writes.map(write=>write.range),["'Data Copas'!J2:J3","'Data Copas'!J4:J5","'Data Copas'!J6:J6"]);
});
