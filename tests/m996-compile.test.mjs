import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source=fs.readFileSync(new URL("../lib/m996-compile.ts",import.meta.url),"utf8"),loaded={exports:{}};
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function("module","exports",code)(loaded,loaded.exports);
const{compileM996}=loaded.exports;
const row=({store="M996",date="2026-10-20",staff="Dimas",id="99601",invoice="INV-1",amount=1000000,qty=1,scheme="DEVICES",article="APP001",description="IPHONE 18 PRO 256GB BLACK",type="IPHONE 18 PRO",category="IPHONE",brand="APPLE",vendor=""}={})=>[date,id,staff,invoice,article,description,type,qty,amount,category,brand,"APPLE",scheme,vendor,"Week 4 Q1","M238",`${store}|${date}|${invoice}|${article}|${id}`];

test("Compile M996 never mixes M238 rows and keeps complete management detail",()=>{
 const result=compileM996([row(),row({invoice:"INV-4",article:"APP002",description:"IPHONE 18 PRO 512GB SILVER",amount:2000000,qty:2}),row({store:"M238",invoice:"M238-1",amount:9000000}),row({invoice:"INV-2",article:"ACC01",description:"20W USB-C POWER ADAPTER",amount:500000,qty:2,scheme:"ACCESSORIES",category:"CHARGER"}),row({invoice:"INV-3",article:"XXL01",description:"XL APPLE",type:"",category:"PROVIDER",brand:"APPLE",vendor:"XXL",amount:100000,scheme:"VAS"}),row({date:"2026-09-30",invoice:"SEP-1",amount:700000})],"2026-10");
 assert.equal(result.store,"M996");
 assert.equal(result.summary.amount,3600000);
 assert.equal(result.summary.qty,6);
 assert.equal(result.summary.invoices,4);
 assert.equal(result.rows.length,4);
 assert.ok(result.rows.every(item=>item.sourceKey.startsWith("M996|")));
 assert.deepEqual(result.availablePeriods,["2026-10","2026-09"]);
 assert.equal(result.staff[0].amount,3600000);
 assert.deepEqual(result.schemes.map(item=>item.name),["DEVICES","ACCESSORIES","VAS"]);
 assert.deepEqual(result.schemes.find(item=>item.name==="DEVICES").details.map(item=>[item.name,item.qty]),[["IPHONE 18 PRO",3]]);
 assert.deepEqual(result.schemes.find(item=>item.name==="ACCESSORIES").details.map(item=>[item.name,item.qty]),[["CHARGER",2]]);
 assert.deepEqual(result.schemes.find(item=>item.name==="VAS").details.map(item=>[item.name,item.qty]),[["XL",1]]);
 assert.deepEqual(result.schemes.find(item=>item.name==="DEVICES").details[0].items.map(item=>[item.name,item.article,item.qty]),[["IPHONE 18 PRO 512GB SILVER","APP002",2],["IPHONE 18 PRO 256GB BLACK","APP001",1]]);
 assert.deepEqual(result.schemes.find(item=>item.name==="ACCESSORIES").details[0].items.map(item=>[item.name,item.article,item.qty]),[["20W USB-C POWER ADAPTER","ACC01",2]]);
 assert.deepEqual(result.schemes.find(item=>item.name==="VAS").details[0].items.map(item=>[item.name,item.article,item.qty]),[["XL APPLE","XXL01",1]]);
});
