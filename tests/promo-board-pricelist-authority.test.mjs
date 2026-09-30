import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";

const require=createRequire(import.meta.url);
function load(file){
  const source=fs.readFileSync(new URL(`../${file}`,import.meta.url),"utf8");
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const module={exports:{}};
  new Function("require","module","exports",code)(name=>name.startsWith("@/lib/promo-board-parser")?{}:require(name),module,module.exports);
  return module.exports;
}

const {activePromoPrice}=load("lib/promo-board-insights.ts");

test("latest Price List promotion price stays authoritative after promo expiry",()=>{
  assert.equal(activePromoPrice({normalPrice:32999000,promotionPrice:29999000,promoStatus:"EXPIRED"}),29999000);
});

test("latest Price List promotion price is authoritative regardless of date status",()=>{
  assert.equal(activePromoPrice({normalPrice:32999000,promotionPrice:29999000,promoStatus:"UPCOMING"}),29999000);
  assert.equal(activePromoPrice({normalPrice:32999000,promotionPrice:29999000,promoStatus:"UNKNOWN"}),29999000);
});

test("normal price is used when Price List no longer contains a real discount",()=>{
  assert.equal(activePromoPrice({normalPrice:32999000,promotionPrice:0,promoStatus:"EXPIRED"}),32999000);
  assert.equal(activePromoPrice({normalPrice:32999000,promotionPrice:32999000,promoStatus:"ACTIVE"}),32999000);
});
