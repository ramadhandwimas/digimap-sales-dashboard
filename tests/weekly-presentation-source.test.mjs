import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
function load(file,resolver=require){const module={exports:{}},code=ts.transpileModule(fs.readFileSync(new URL(`../${file}`,import.meta.url),"utf8"),{compilerOptions:{esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function("require","module","exports",code)(resolver,module,module.exports);return module.exports}
const sanitize=load("lib/m238-sales-sanitize.ts");
test("presentation source reconciles clean sales, staff and invoices and leaves incomplete traffic unavailable",async()=>{
 const row=(date,invoice,amount,store="M238")=>[date,"001","Dwimas",invoice,"ART","iPhone","iPhone",1,amount,"IPHONE","APPLE","","DEVICES","",date.startsWith("2020-01")?"Week 1 Q1":"Week 2 Q1",store];
 const raw=[row("2020-01-05","A",1000),row("2020-01-12","B",500),row("2020-01-13","B",1500),row("2020-01-12","EX",900),row("2020-01-12","OTHER",900,"M996")];
 const source=load("lib/weekly-presentation-source.ts",name=>{
  if(name==="@/lib/google-sheets")return {getSheetRanges:async(id,ranges)=>ranges[0].includes("Traffic")?[[["2020-01-05",100],["2020-01-12",100]]]:[raw,[["","2020-01-12","","","","Customer mencari iPhone"]]]};
  if(name==="@/lib/exchange-detail-store")return {readExchangeState:async()=>({})};
  if(name==="@/lib/exchange-detail")return {adjustExchangeSales:rows=>rows.filter(r=>r.invoice!=="EX")};
  if(name==="@/lib/m238-sales-sanitize")return sanitize;
  return require(name);
 });
 const originalEmail=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,originalKey=process.env.GOOGLE_PRIVATE_KEY;
 process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL="fixture";process.env.GOOGLE_PRIVATE_KEY="fixture";
 const side=amount=>({scheme:{DEVICE:{qty:1,amount}},vas:{},lob:{}});
 const data={labelA:"Week 1 Q1",labelB:"Week 2 Q1",periodA:{start:"2020-01-05",end:"2020-01-11"},periodB:{start:"2020-01-12",end:"2020-01-18"},a:side(1000),b:side(2000)};
 try{
  const {report}=await source.enrichWeeklyPresentation(data);
  assert.equal(report.metricsB.sales,2000);assert.equal(report.metricsB.transactions,1);assert.equal(report.metricsB.qty,2);assert.equal(report.metricsB.traffic,null);assert.equal(report.metricsB.cvr,null);
  assert.equal(report.staff.reduce((s,r)=>s+r.current.sales,0),2000);assert.equal(report.daily.reduce((s,r)=>s+r.sales,0),2000);assert.equal(report.feedback.length,1);
  await assert.rejects(source.enrichWeeklyPresentation({...data,b:side(9999)}),/Total sumber weekly berubah/);
 }finally{if(originalEmail===undefined)delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;else process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=originalEmail;if(originalKey===undefined)delete process.env.GOOGLE_PRIVATE_KEY;else process.env.GOOGLE_PRIVATE_KEY=originalKey}
});
