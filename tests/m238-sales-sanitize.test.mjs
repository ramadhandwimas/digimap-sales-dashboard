import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";

const require=createRequire(import.meta.url);
const source=fs.readFileSync(new URL("../lib/m238-sales-sanitize.ts",import.meta.url),"utf8");
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};
new Function("require","module","exports",code)(require,module,module.exports);
const {aggregateSales,isValidSale,parseSalesRow,productKey,saleKind,vasKey}=module.exports;

function row({date="30-09-2026",id="23010001",name="Tester",invoice="INV1",article="ART1",description="",type="",qty=1,amount=1000000,category="",brand="APPLE",core="APPLE",scheme="DEVICES",vendor="",store="M238"}={}){
 return [date,id,name,invoice,article,description,type,qty,amount,category,brand,core,scheme,vendor,"Week 1 Q1",store,"Digimap"];
}

test("voucher rows are excluded from valid sales and totals",()=>{
 const voucher=parseSalesRow(row({article:"EVOUCHER",description:"Gift Voucher",category:"VOUCHER",scheme:"ACCESSORIES",amount:500000}));
 assert.equal(isValidSale(voucher),false);
 assert.equal(aggregateSales([voucher]).amount,0);
});

test("Halo iPhone is classified as VAS Telkomsel even without VAS scheme",()=>{
 const halo=parseSalesRow(row({article:"HALO001",description:"Halo iPhone 18",category:"PROVIDER",brand:"TELKOMSEL",scheme:"",vendor:"TELKOMSEL",amount:250000}));
 assert.equal(saleKind(halo),"vas");
 assert.equal(vasKey(halo),"telkomsel");
});

test("AirPods remains accessories while also mapping to AirPods LOB",()=>{
 const airpods=parseSalesRow(row({article:"APP-AIRPODS4",description:"AirPods 4",category:"AIRPODS",brand:"APPLE",scheme:"ACCESSORIES",amount:2399000}));
 assert.equal(saleKind(airpods),"accessories");
 assert.equal(productKey(airpods),"airpods");
 const total=aggregateSales([airpods]);
 assert.equal(total.accessories,2399000);
 assert.equal(total.lob.airpods,1);
});

test("Apple device mappings stay consistent",()=>{
 const iphone=parseSalesRow(row({description:"iPhone 17 Pro",category:"IPHONE"}));
 const mac=parseSalesRow(row({description:"MacBook Air M5",category:"MAC"}));
 const ipad=parseSalesRow(row({description:"iPad 11",category:"IPAD"}));
 const watch=parseSalesRow(row({description:"Apple Watch S11",category:"APPLE WATCH"}));
 assert.equal(productKey(iphone),"iphone");
 assert.equal(productKey(mac),"mac");
 assert.equal(productKey(ipad),"ipad");
 assert.equal(productKey(watch),"watch");
});

test("aggregate keeps device accessories and VAS separated",()=>{
 const rows=[
  parseSalesRow(row({invoice:"A",description:"iPhone 17",category:"IPHONE",amount:15000000})),
  parseSalesRow(row({invoice:"A",article:"CASE1",description:"Case",category:"CASE",brand:"THIRD PARTY",scheme:"ACCESSORIES",amount:500000})),
  parseSalesRow(row({invoice:"A",article:"KLA001",description:"Qoala Proteksi",category:"PROTEKSI",brand:"QOALA",scheme:"VAS",amount:300000})),
 ];
 const total=aggregateSales(rows);
 assert.equal(total.device,15000000);
 assert.equal(total.accessories,500000);
 assert.equal(total.vas,300000);
 assert.equal(total.invoices,1);
 assert.equal(total.qty,3);
 assert.equal(total.vasDetail.qoala.qty,1);
});
