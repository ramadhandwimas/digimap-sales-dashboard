import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";

const require=createRequire(import.meta.url);
const source=fs.readFileSync(new URL("../lib/data-copas-repair.ts",import.meta.url),"utf8");
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const loaded={exports:{}};
new Function("require","module","exports",code)(require,loaded,loaded.exports);
const {buildDataCopasRepairWrites,planDataCopasRepair}=loaded.exports;

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

test("updates an outdated Vendor while preserving existing classifications",()=>{
 const row=copas("KLA001",{6:"Manual Type",9:"PROTEKSI",10:"Manual Brand",11:"APPLE",12:"VAS",13:"Old Vendor"});
 const plan=planDataCopasRepair(master,[row]);
 assert.equal(plan.rowsWithNA,0);
 assert.equal(plan.vendorRows,1);
 assert.deepEqual(plan.candidates[0].changes,[{column:"N",field:"Vendor",from:"Old Vendor",to:"MITRA JASA PRATAMA PT"}]);
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


const appleDevice=["APPLE","APPMJRP4ID/A","IPHONE 18 PRO 256GB BLACK","IPHONE","IPHONE 18 PRO","DEVICES","APPLE"];
const deviceRow=()=>copas("APPMJRP4ID/A",{5:"IPHONE 18 PRO 256GB BLACK",6:"",9:"IPHONE",10:"APPLE",11:"APPLE",12:"DEVICES",13:""});

test("fills the screenshot's blank iPhone 18 Type from Master without requiring or adding Vendor",()=>{
 const plan=planDataCopasRepair([...master,appleDevice],[deviceRow()]);
 assert.equal(plan.rowsWithNA,0);assert.equal(plan.rowsWithBlankType,1);assert.equal(plan.typeRows,1);assert.equal(plan.vendorRows,0);
 assert.deepEqual(plan.candidates[0].changes,[{column:"G",field:"Type",from:"",to:"IPHONE 18 PRO"}]);
 assert.deepEqual(buildDataCopasRepairWrites(plan.candidates),[{range:"'Data Copas'!G2:G2",values:[["IPHONE 18 PRO"]]}]);
});

test("Apple supplier ambiguity does not block a device Type repair",()=>{
 const refs=[...master,appleDevice,["","","","","","","","","1","APPLE SUPPLIER A","APP","APPLE"],["","","","","","","","","2","APPLE SUPPLIER B","APP","APPLE"]];
 const plan=planDataCopasRepair(refs,[deviceRow()]);assert.equal(plan.typeRows,1);assert.equal(plan.unresolvedNARows,0);assert.equal(plan.vendorRows,0);
});

test("3PP uses supplier PT Name as Vendor, never as Type, and writes an N/A Vendor once",()=>{
 const row=copas("SDXE10-500G-G25",{6:"N/A",9:"MEMORY",10:"SANDISK",11:"APPLE",12:"ACCESSORIES",13:"N/A"});
 const plan=planDataCopasRepair(master,[row]);
 assert.deepEqual(plan.candidates[0].changes,[{column:"G",field:"Type",from:"N/A",to:""},{column:"N",field:"Vendor",from:"N/A",to:"DATASCRIP PT"}]);
 assert.equal(plan.typeRows,0);assert.equal(plan.vendorRows,1);assert.equal(plan.candidates[0].changes.filter(c=>c.column==="N").length,1);
});

test("preserves model-specific AirPods Type and leaves Apple accessory Vendor blank",()=>{
 const airpods=["APPLE","APPAIRPODS","AIRPODS PRO 3","AIRPODS","AirPods Pro Gen3","ACCESSORIES","APPLE"];
 const plan=planDataCopasRepair([...master,airpods],[copas("APPAIRPODS",{6:"",9:"AIRPODS",10:"APPLE",11:"APPLE",12:"ACCESSORIES",13:""})]);
 assert.deepEqual(plan.candidates[0].changes,[{column:"G",field:"Type",from:"",to:"AirPods Pro Gen3"}]);assert.equal(plan.vendorRows,0);
});

test("missing Master Type or SAP is reported rather than declaring a blank device Type clean",()=>{
 const noType=[...appleDevice];noType[4]="";
 assert.equal(planDataCopasRepair([...master,noType],[deviceRow()]).issues[0].reason,"incomplete-master");
 assert.equal(planDataCopasRepair(master,[deviceRow()]).issues[0].reason,"missing-master");
});

test("repeated repair is a no-op and never writes sales, units, invoice or dates",()=>{
 const row=deviceRow(),m=[...master,appleDevice];
 const first=planDataCopasRepair(m,[row]);row[6]=first.candidates[0].changes[0].to;
 assert.equal(planDataCopasRepair(m,[row]).candidates.length,0);
 assert.ok(buildDataCopasRepairWrites(first.candidates).every(w=>/!G[0-9]/.test(w.range)));
});

test("an inapplicable device Vendor N/A does not block Type and is cleared as a placeholder",()=>{
 const row=deviceRow();row[13]="#N/A";
 const plan=planDataCopasRepair([...master,appleDevice],[row]);
 assert.equal(plan.typeRows,1);assert.equal(plan.vendorRows,0);assert.equal(plan.unresolvedNARows,0);
 assert.ok(plan.candidates[0].changes.some(c=>c.column==="G"&&c.to==="IPHONE 18 PRO"));
 assert.ok(plan.candidates[0].changes.some(c=>c.column==="N"&&c.to===""));
});

test("a blank 3PP Vendor without a supplier reference stays in manual review",()=>{
 const product=["NEWBRAND","NEW001","Case","CASE","","ACCESSORIES","APPLE"];
 const row=copas("NEW001",{6:"",9:"CASE",10:"NEWBRAND",11:"APPLE",12:"ACCESSORIES",13:""});
 const plan=planDataCopasRepair([...master,product],[row]);
 assert.equal(plan.candidates.length,0);assert.equal(plan.issues[0].reason,"incomplete-master");
});
