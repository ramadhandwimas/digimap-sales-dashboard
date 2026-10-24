import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";

const require=createRequire(import.meta.url);
const source=fs.readFileSync(new URL("../lib/m238-focus-products.ts",import.meta.url),"utf8");
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const loaded={exports:{}};
new Function("require","module","exports",code)(require,loaded,loaded.exports);
const {M238_FOCUS_PRODUCTS,m238FocusProductName}=loaded.exports;

test("current iPhone 18 families are available in Unit Fokus in business order",()=>{
  assert.deepEqual(M238_FOCUS_PRODUCTS.slice(0,5),[
    "iPhone 18 Pro Max","iPhone 18 Pro","iPhone Duo","iPhone 18","iPhone Air",
  ]);
});

test("iPhone 18 sales are grouped into the matching focus unit",()=>{
  const rows=[
    ["IPHONE 18 PRO MAX","IPHONE 18 PRO MAX 512GB GLACIER","iPhone 18 Pro Max"],
    ["IPHONE 18 PRO","IPHONE 18 PRO 256GB BURGUNDY","iPhone 18 Pro"],
    ["IPHONE DUO","IPHONE DUO 1TB NIGHT SKY","iPhone Duo"],
    ["IPHONE 18","IPHONE 18 256GB BLACK","iPhone 18"],
  ];
  for(const[type,description,expected]of rows)assert.equal(m238FocusProductName(type,description,"IPHONE"),expected);
});

test("Duo never inherits iPhone 18 from a broad section label",()=>{
  assert.equal(m238FocusProductName("IPHONE DUO","DUO 512GB STAR WHITE","IPHONE 18"),"iPhone Duo");
});
