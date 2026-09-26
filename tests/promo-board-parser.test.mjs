import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";

const require=createRequire(import.meta.url);
function loadTypescriptModule(relativePath,aliases={}){
 const source=fs.readFileSync(new URL(relativePath,import.meta.url),"utf8");
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const loaded={exports:{}};
 const localRequire=id=>aliases[id]||require(id);
 new Function("require","module","exports",code)(localRequire,loaded,loaded.exports);
 return loaded.exports;
}
const loadedModule={exports:loadTypescriptModule("../lib/promo-board-parser.ts")};
const{parsePromoWorkbook,resolvePromoTiming}=loadedModule.exports;
const insights=loadTypescriptModule("../lib/promo-board-insights.ts",{"@/lib/promo-board-parser":loadedModule.exports});
const catalogModule=loadTypescriptModule("../lib/promo-board-catalog.ts",{"@/lib/promo-board-parser":loadedModule.exports,"@/lib/promo-board-insights":insights});

test("promo timing distinguishes upcoming, active, ending, and expired in Jakarta",()=>{
 const now=new Date("2026-09-26T12:00:00Z");
 assert.deepEqual(resolvePromoTiming("2026-10-01","2026-10-31","DATE_RANGE",now),{status:"UPCOMING",daysRemaining:5});
 assert.deepEqual(resolvePromoTiming("2026-09-01","2026-10-31","DATE_RANGE",now),{status:"ACTIVE",daysRemaining:35});
 assert.deepEqual(resolvePromoTiming("2026-09-01","2026-09-30","DATE_RANGE",now),{status:"ENDING_SOON",daysRemaining:4});
 assert.deepEqual(resolvePromoTiming("2026-09-01","2026-09-25","DATE_RANGE",now),{status:"EXPIRED",daysRemaining:-1});
});

test("Further Notice remains upcoming until its start date",()=>{
 assert.deepEqual(resolvePromoTiming("2026-10-01",null,"FURTHER_NOTICE",new Date("2026-09-26T12:00:00Z")),{status:"UPCOMING",daysRemaining:5});
 assert.deepEqual(resolvePromoTiming("2026-09-01",null,"FURTHER_NOTICE",new Date("2026-09-26T12:00:00Z")),{status:"FURTHER_NOTICE",daysRemaining:null});
});

test("parser recognizes the date wording used by the current Digimap pricelist",()=>{
 const XLSX=require("xlsx");
 const rows=[
  ["SAP Article","SAPDescription","Normal Price","Promotion Price","Remarks","Category"],
  ["A1","iPhone 17 256GB",100,90,"Repricing 10 Juli - 26 September 2026","iPhone"],
  ["A2","iPhone 17 512GB",100,90,"26 September - 3 Oct 2026","iPhone"],
  ["A3","iPad Air",100,90,"Promo 28 des 2025 - Further","iPad"],
  ["A4","iPad Pro",100,90,"Repricing NAIK 22 maret 2026 - Fyrther","iPad"],
  ["A5","Apple Watch",100,90,"Promo 1 Oktober 2026 - 24 Oktober 2026","Watch"],
 ];
 const workbook=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet(rows),"PRICE LIST APPLE DEVICE");
 const buffer=XLSX.write(workbook,{type:"array",bookType:"xlsx"});
 const parsed=parsePromoWorkbook(buffer,"price-list.xlsx",new Date("2026-09-26T12:00:00Z"));
 assert.deepEqual(parsed.products.map(product=>product.promoStatus),["ENDING_SOON","ENDING_SOON","FURTHER_NOTICE","FURTHER_NOTICE","UPCOMING"]);
 assert.deepEqual(parsed.products.map(product=>product.promoEndDate),["2026-09-26","2026-10-03",null,null,"2026-10-24"]);
});

test("catalog groups color and PRODUCT variants while preserving capacity",()=>{
 const base={category:"iPhone",section:"iPhone",normalPrice:100,promotionPrice:90,savingAmount:10,discountPercentage:10,remarks:"Promo - Further",promotionInstallmentBundling:null,promotionCashBundling:null,brZout:"",eolStatus:"",promoStartDate:"2026-09-01",promoEndDate:null,promoPeriodType:"FURTHER_NOTICE",promoStatus:"FURTHER_NOTICE",daysRemaining:null};
 const products=[
  {...base,sapArticle:"A1",sapDescription:"IPHONE 12 128GB BLUE"},
  {...base,sapArticle:"A2",sapDescription:"IPHONE 12 128GB BLACK"},
  {...base,sapArticle:"A3",sapDescription:"IPHONE 12 128GB (PRODUCT)"},
  {...base,sapArticle:"A4",sapDescription:"IPHONE 12 256GB BLUE"},
  {...base,sapArticle:"A5",sapDescription:"IPHONE 12 128GB PURPLE",promotionPrice:95,savingAmount:5,discountPercentage:5},
 ];
 const catalog=catalogModule.buildPromoCatalog(products,[]);
 assert.equal(catalog.length,2);
 assert.deepEqual(catalog.map(item=>item.capacity).sort(),["128GB","256GB"]);
 const grouped128=catalog.find(item=>item.capacity==="128GB");
 assert.equal(grouped128.group.variants.length,4);
 assert.equal(grouped128.promoPriceMin,90);
 assert.equal(grouped128.promoPriceMax,95);
});
