import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
function load(path){const module={exports:{}},code=ts.transpileModule(fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8"),{compilerOptions:{esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function("require","module","exports",code)(require,module,module.exports);return module.exports}
const {weeklyPresentationModel,presentationTypeRows,buildWeeklyPresentation}=load("lib/weekly-presentation.ts");
const agg=(qty,amount)=>({qty,amount});
const data={labelA:"Week 5 Q1",labelB:"Week 6 Q1",periodA:{start:"2026-10-25",end:"2026-10-31"},periodB:{start:"2026-11-01",end:"2026-11-07"},a:{scheme:{DEVICES:agg(10,1000),ACCESSORIES:agg(5,500),VAS:agg(2,200)},vas:{},lob:{IPHONE:{A:agg(5,500)},MAC:{A:agg(2,200)},IPAD:{A:agg(1,100)},"APPLE WATCH":{A:agg(1,100)},AIRPODS:{A:agg(1,100)}}},b:{scheme:{DEVICES:agg(12,1300),ACCESSORIES:agg(4,400),VAS:agg(3,300)},vas:{},lob:{IPHONE:{A:agg(7,700)},MAC:{A:agg(1,100)},IPAD:{A:agg(1,100)},"APPLE WATCH":{A:agg(1,100)},AIRPODS:{A:agg(2,300)}}}};

test("weekly PowerPoint model reconciles total sales and marks increases or decreases",()=>{const model=weeklyPresentationModel(data);assert.equal(model.overall.previous.amount,1700);assert.equal(model.overall.current.amount,2000);assert.match(model.overall.amountMovement.text,/Naik 17,6%/);assert.equal(model.categories.find(x=>x.name==="ACC").qtyMovement.text,"Turun 20%");assert.equal(model.lobs.find(x=>x.name==="MacBook").qtyMovement.text,"Turun 50%");});

test("complete weekly deck preserves all model rows, paginates tables, and includes KPI, staff and feedback",async()=>{
 const example=structuredClone(data);
 for(let i=0;i<19;i++){example.a.lob.IPHONE[`iPhone model ${i}`]=agg(i,20000000*i);example.b.lob.IPHONE[`iPhone model ${i}`]=agg(i+1,21000000*(i+1))}
 example.b.lob.IPHONE["Model baru"]=agg(2,20000000);
 const metrics={sales:2000,qty:19,transactions:9,traffic:null,cvr:null,upt:19/9,atv:2000/9};
 example.report={cutoff:"2026-11-04",generatedAt:"2026-11-04",metricsA:metrics,metricsB:metrics,daily:[{date:"2026-11-01",...metrics}],staff:[{id:"1",name:"Dwimas Ramadhan",previous:metrics,current:metrics,device:1300,accessories:400,vas:300}],feedback:["Customer mencari iPhone Pro, warna yang dicari belum tersedia."]};
 const types=presentationTypeRows(example,"IPHONE");assert.equal(types.length,21);assert.equal(types.find(x=>x.name==="Model baru").qtyMovement.text,"Baru");
 const deck=buildWeeklyPresentation(example),JSZip=require("jszip"),zip=await JSZip.loadAsync(await deck.write({outputType:"nodebuffer",compression:true}));
 const files=Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p)),slides=await Promise.all(files.map(p=>zip.file(p).async("string"))),xml=slides.join("\n");
 for(const title of ["Traffic &amp; Conversion","Penjualan Harian","Compare VAS","Performa Staff","Feedback Team","Usulan Action Plan","Concern &amp; Kebutuhan Support"])assert.ok(xml.includes(title),title);
 assert.ok(slides.filter(s=>s.includes("iPhone / Detail Model")).length>=3);
 for(let i=0;i<19;i++)assert.ok(xml.includes(`iPhone model ${i}`));
 assert.ok(xml.includes("Belum tersedia"));assert.ok(xml.includes("Dwimas Ramadhan"));assert.ok(Object.keys(zip.files).some(p=>/^ppt\/charts\/chart\d+\.xml$/.test(p)));
 if(process.env.PPT_REVIEW_PATH)await deck.writeFile({fileName:process.env.PPT_REVIEW_PATH,compression:true});
});

test("weekly export menu exposes PowerPoint only when the report supplies it",()=>{const menu=fs.readFileSync(new URL("../components/export-menu.tsx",import.meta.url),"utf8"),page=fs.readFileSync(new URL("../components/operations-page.tsx",import.meta.url),"utf8"),client=fs.readFileSync(new URL("../lib/weekly-presentation-client.ts",import.meta.url),"utf8"),route=fs.readFileSync(new URL("../app/api/weekly-presentation/route.ts",import.meta.url),"utf8");assert.match(menu,/label:"PowerPoint"/);assert.match(menu,/onPpt\?/);assert.match(page,/onPpt=\{\(\) =>/);assert.match(page,/exportWeeklyPresentation\(data, exportName\)/);assert.match(client,/fetch\("\/api\/weekly-presentation"/);assert.match(route,/application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation/);});
