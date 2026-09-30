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

const {activePromoPrice,groupPromoProducts}=load("lib/promo-board-insights.ts");

test("latest Price List promotion price stays authoritative after promo expiry",()=>{
  assert.equal(activePromoPrice({normalPrice:32999000,promotionPrice:29999000,promoStatus:"EXPIRED"}),29999000);
});

test("latest Price List promotion price is authoritative regardless of date status",()=>{
  assert.equal(activePromoPrice({normalPrice:32999000,promotionPrice:29999000,promoStatus:"UPCOMING"}),29999000);
  assert.equal(activePromoPrice({normalPrice:32999000,promotionPrice:29999000,promoStatus:"UNKNOWN"}),29999000);
});

test("expired discount remains display-active so strike-through and savings stay visible",()=>{
  const product={
    sapArticle:"TEST-EXPIRED",
    sapDescription:"iPhone 17 Pro Max 256GB Cosmic Orange",
    category:"iPhone",
    normalPrice:25799000,
    promotionPrice:24999000,
    savingAmount:800000,
    discountPercentage:(800000/25799000)*100,
    promoStartDate:"2026-09-01",
    promoEndDate:"2026-09-29",
    promoPeriodType:"DATE_RANGE",
    promoStatus:"EXPIRED",
    daysRemaining:-1,
    remarks:"1 - 29 September 2026",
    promotionInstallmentBundling:0,
    promotionCashBundling:0,
    brZout:"",
    eolStatus:"",
  };
  const [group]=groupPromoProducts([product]);
  assert.equal(group.promoStatus,"ACTIVE");
  assert.equal(group.savingAmount,800000);
  assert.ok(group.discountPercentage>0);
});

test("normal price is used when Price List no longer contains a real discount",()=>{
  assert.equal(activePromoPrice({normalPrice:32999000,promotionPrice:0,promoStatus:"EXPIRED"}),32999000);
  assert.equal(activePromoPrice({normalPrice:32999000,promotionPrice:32999000,promoStatus:"ACTIVE"}),32999000);
});
