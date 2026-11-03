import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
function load(path){const module={exports:{}},code=ts.transpileModule(fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function("require","module","exports",code)(require,module,module.exports);return module.exports}
const {weeklyPresentationModel}=load("lib/weekly-presentation.ts");
const agg=(qty,amount)=>({qty,amount});
const data={labelA:"Week 5 Q1",labelB:"Week 6 Q1",periodA:{start:"2026-10-25",end:"2026-10-31"},periodB:{start:"2026-11-01",end:"2026-11-07"},a:{scheme:{DEVICES:agg(10,1000),ACCESSORIES:agg(5,500),VAS:agg(2,200)},vas:{},lob:{IPHONE:{A:agg(5,500)},MAC:{A:agg(2,200)},IPAD:{A:agg(1,100)},"APPLE WATCH":{A:agg(1,100)},AIRPODS:{A:agg(1,100)}}},b:{scheme:{DEVICES:agg(12,1300),ACCESSORIES:agg(4,400),VAS:agg(3,300)},vas:{},lob:{IPHONE:{A:agg(7,700)},MAC:{A:agg(1,100)},IPAD:{A:agg(1,100)},"APPLE WATCH":{A:agg(1,100)},AIRPODS:{A:agg(2,300)}}}};

test("weekly PowerPoint model reconciles total sales and marks increases or decreases",()=>{const model=weeklyPresentationModel(data);assert.equal(model.overall.previous.amount,1700);assert.equal(model.overall.current.amount,2000);assert.match(model.overall.amountMovement.text,/Naik 17,6%/);assert.equal(model.categories.find(x=>x.name==="ACC").qtyMovement.text,"Turun 20%");assert.equal(model.lobs.find(x=>x.name==="MacBook").qtyMovement.text,"Turun 50%");});

test("weekly export menu exposes PowerPoint only when the report supplies it",()=>{const menu=fs.readFileSync(new URL("../components/export-menu.tsx",import.meta.url),"utf8"),page=fs.readFileSync(new URL("../components/operations-page.tsx",import.meta.url),"utf8");assert.match(menu,/label:"PowerPoint"/);assert.match(menu,/onPpt\?/);assert.match(page,/onPpt=\{\(\) =>/);assert.match(page,/exportWeeklyPresentation\(data, exportName\)/);});
