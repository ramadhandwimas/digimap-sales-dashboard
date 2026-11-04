import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
function load(file,overrides={}){const module={exports:{}},code=ts.transpileModule(fs.readFileSync(new URL(`../${file}`,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;new Function("require","module","exports",code)(name=>overrides[name]||require(name),module,module.exports);return module.exports}
const ranges=load("lib/promo-snapshot-ranges.ts");
test("snapshot reads include only committed selected IDs even with orphaned uploads and gaps",async()=>{
 const calls=[],ids=[["old"],["old"],["orphan"],["latest"],["latest"],[],["latest"]];
 assert.deepEqual(ranges.promoSnapshotRanges(ids,new Set(["latest"]),"Promo Products","S"),["'Promo Products'!A5:S6","'Promo Products'!A8:S8"]);
 const read=async(_id,rr)=>{calls.push(rr);if(rr[0].includes("Price Lists"))return [[["old","old.xlsx","2026-10-01","2026-10-01",2,2,"[]"],["latest","new.xlsx","2026-11-01","2026-11-01",3,3,"[]"]]];if(rr[0].includes("A100000"))return [ids];return rr.map((_,i)=>Array.from({length:i?1:2},(__,j)=>["latest",`SKU${i}-${j}`,"iPhone","DEVICE","iPhone",100,100]))};
 const store=load("lib/promo-board-store.ts",{"@/lib/google-sheets":{getSheetRanges:read,getSheetRangesFresh:read},"@/lib/promo-snapshot-ranges":ranges,"@/lib/promo-board-parser":{refreshPromoStatus:p=>p},"@/lib/accessory-pricelist-store":{MASTER_ID:"fixture"}});
 const snapshots=await store.readPromoSnapshots({email:"x",key:"x"},1,{fresh:false});
 assert.equal(snapshots.length,1);assert.equal(snapshots[0].id,"latest");assert.equal(snapshots[0].products.length,3);
 assert.deepEqual(calls[2],["'Promo Products'!A5:S6","'Promo Products'!A8:S8"]);
 assert.ok(!calls.flat().includes("'Promo Products'!A2:S"));
});
test("quote cache deduplicates reads and an old response cannot replace prices after activation",async()=>{
 const {promoJson,peekPromo,clearPromoCache}=load("lib/promo-board-client.ts"),original=globalThis.fetch;let finish,calls=0;
 globalThis.fetch=async()=>{const call=++calls;if(call===1)await new Promise(r=>{finish=r});return{ok:true,json:async()=>({price:call===1?100:200})}};
 try{
  const first=promoJson("/fixture"),duplicate=promoJson("/fixture");assert.equal(calls,1);
  clearPromoCache();await promoJson("/fixture");finish();await Promise.all([first,duplicate]);assert.equal(calls,2);assert.equal(peekPromo("/fixture").price,200);
 }finally{globalThis.fetch=original;clearPromoCache()}
});
