import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";

const require=createRequire(import.meta.url);
const source=fs.readFileSync(new URL("../lib/m238-sales-sanitize.ts",import.meta.url),"utf8");
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const compiledModule={exports:{}};
new Function("require","module","exports",code)(require,compiledModule,compiledModule.exports);
const {aggregateSales,isValidSale,parseSalesRow,productKey,saleKind,vasKey}=compiledModule.exports;

function row({date="30-09-2026",id="23010001",name="Tester",invoice="INV1",article="ART1",description="",type="",qty=1,amount=1000000,category="",brand="APPLE",core="APPLE",scheme="DEVICES",vendor="",store="M238"}={}){
 return [date,id,name,invoice,article,description,type,qty,amount,category,brand,core,scheme,vendor,"Week 13 Q4",store,"Digimap"];
}

test("voucher excluded from valid sales and totals",()=>{
 const voucher=parseSalesRow(row({article:"EVOUCHER",description:"Gift Voucher",category:"VOUCHER",scheme:"ACCESSORIES",amount:500000}));
 assert.equal(isValidSale(voucher),false);
 assert.equal(aggregateSales([voucher]).amount,0);
});

test("AirPods is Accessories and AirPods LOB",()=>{
 const sale=parseSalesRow(row({article:"APP-AIRPODS4",description:"AirPods 4",category:"AIRPODS",brand:"APPLE",scheme:"ACCESSORIES",amount:2399000}));
 assert.equal(saleKind(sale),"accessories");
 assert.equal(productKey(sale),"airpods");
 const total=aggregateSales([sale]);
 assert.equal(total.accessories,2399000);
 assert.equal(total.lob.airpods,1);
});

test("Halo and TSL map to Telkomsel VAS",()=>{
 for(const sample of [
  row({article:"HALO001",description:"Halo iPhone",category:"PROVIDER",brand:"TELKOMSEL",scheme:"",vendor:"TELKOMSEL"}),
  row({article:"TSL001",description:"Provider",category:"PROVIDER",brand:"TSL",scheme:"VAS",vendor:"TSL"}),
 ]){
  const sale=parseSalesRow(sample);
  assert.equal(saleKind(sale),"vas");
  assert.equal(vasKey(sale),"telkomsel");
 }
});

test("KLA maps Qoala, IDT maps Indosat, XL and XXL map XL",()=>{
 const cases=[
  [row({article:"KLA001",description:"Protection",brand:"QOALA",scheme:"VAS"}),"qoala"],
  [row({article:"IDT001",description:"Provider",brand:"INDOSAT",scheme:"VAS"}),"indosat"],
  [row({article:"XL001",description:"XL Provider",brand:"XL",scheme:"VAS"}),"xl"],
  [row({article:"XXL001",description:"Provider",brand:"XXL",scheme:"VAS"}),"xl"],
 ];
 for(const [sample,expected] of cases)assert.equal(vasKey(parseSalesRow(sample)),expected);
});

test("Apple device families map consistently",()=>{
 const cases=[
  [row({description:"iPhone 17 Pro",category:"IPHONE"}),"iphone"],
  [row({description:"MacBook Air M5",category:"MAC"}),"mac"],
  [row({description:"iPad 11",category:"IPAD"}),"ipad"],
  [row({description:"Apple Watch S11",category:"APPLE WATCH"}),"watch"],
 ];
 for(const [sample,expected] of cases){const sale=parseSalesRow(sample);assert.equal(saleKind(sale),"device");assert.equal(productKey(sale),expected)}
});

test("store total reconciles visible staff plus unassigned",()=>{
 const visible=[
  parseSalesRow(row({id:"A1",invoice:"I1",amount:1000000,description:"iPhone",category:"IPHONE"})),
  parseSalesRow(row({id:"A2",invoice:"I2",amount:500000,description:"Case",category:"CASE",brand:"THIRD PARTY",scheme:"ACCESSORIES"})),
 ];
 const unassigned=[parseSalesRow(row({id:"OFFROSTER",invoice:"I3",amount:300000,description:"Qoala",brand:"QOALA",scheme:"VAS"}))];
 const store=aggregateSales([...visible,...unassigned]),staff=aggregateSales(visible),other=aggregateSales(unassigned);
 assert.equal(store.amount,staff.amount+other.amount);
 assert.equal(store.qty,staff.qty+other.qty);
});
