import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";

const require=createRequire(import.meta.url);
function load(file,overrides={}){
 const source=fs.readFileSync(new URL(`../${file}`,import.meta.url),"utf8");
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const module={exports:{}};
 new Function("require","module","exports",code)(name=>name in overrides?overrides[name]:require(name),module,module.exports);
 return module.exports;
}
const parser=load("lib/accessory-pricelist.ts");
const repair=load("lib/accessory-master-repair.ts",{"./accessory-pricelist":parser});
const header=["Brand","SAP Article","SAP Description","Product Category","Type","Product Group","Core"];
const suppliers=[["Vendor Code","PT Name","Brand Code","Brand Name"],["1","Supplier","AMN","A.ELEMENTS"]];
const sample=["A.ELEMENTS","AMN0001","Charger","CHARGER","","ACCESSORIES","APPLE"];
const master=[header,sample];
const item=(article,extra={})=>({sheet:"Sheet1",row:6,brand:"Adam Elements",article,description:"New Charger",category:"Charger",...extra});

test("cleans invisible spaces, matches SAP rather than descriptions, and ignores existing codes",()=>{
 const plan=parser.planPricelist([item(" AMN\u200b0001 "),item(" AMN 0002 ",{description:" New\u00a0 Charger\n "}),item("AMN0002")],master,suppliers);
 assert.equal(plan.existing,1);assert.equal(plan.duplicates,1);assert.equal(plan.review.length,0);
 assert.deepEqual(plan.rows,[["A.ELEMENTS","AMN0002","New Charger","CHARGER","","ACCESSORIES","APPLE"]]);
});
test("repeated upload adds zero; deleting the row from live Master makes it eligible again",()=>{
 const items=[item("AMN0002")];
 const first=parser.planPricelist(items,master,suppliers);
 assert.equal(parser.planPricelist(items,[...master,...first.rows],suppliers).rows.length,0);
 assert.equal(parser.planPricelist(items,master,suppliers).rows.length,1);
});
test("unknown brand, non-AppleCare VAS and first-party AirPods model are held for review",()=>{
 const plan=parser.planPricelist([item("NEW0001",{brand:"Unknown"}),item("KLA001",{brand:"QOALA",category:"Proteksi"}),item("APP001",{brand:"APPLE",description:"AirPods Pro"})],master,suppliers);
 assert.equal(plan.rows.length,0);assert.equal(plan.review.length,3);
});
test("AppleCare Proteksi follows the existing Protection accessory format",()=>{
 const appleCare=[...master,["Apple Care Plus","APPOLD","AC Plus iPhone","Protection","","ACCESSORIES","APPLE"]];
 const plan=parser.planPricelist([item("APPNEW",{brand:"Apple Care Plus",description:"AppleCare iPhone",category:"Proteksi"})],appleCare,suppliers);
 assert.deepEqual(plan.rows,[["Apple Care Plus","APPNEW","AppleCare iPhone","PROTECTION","","ACCESSORIES","APPLE"]]);
});
test("falls back to an exact existing Master brand when supplier I–L has no row",()=>{
 const kora=[...master,["KORA","KOAOLD","Old screen","FRONT SCREEN","","ACCESSORIES","APPLE"]];
 const plan=parser.planPricelist([item("KOANEW",{brand:"KORA",description:"Screen MacBook",category:"Front screen"})],kora,suppliers);
 assert.deepEqual(plan.rows,[["KORA","KOANEW","Screen MacBook","FRONT SCREEN","","ACCESSORIES","APPLE"]]);
});
test("listed brands with new categories use the standard Apple accessory format",()=>{
 const plan=parser.planPricelist([item("AMN0002",{category:"IOT",description:"Tracker Card"})],master,suppliers);
 assert.deepEqual(plan.rows,[["A.ELEMENTS","AMN0002","Tracker Card","IOT","","ACCESSORIES","APPLE"]]);
 assert.equal(plan.review.length,0);
});
test("conflicting Core rules are resolved from Apple or Android product wording",()=>{
 const vendor=[...suppliers,["2","Supplier","NKN","Nilkin"]];
 const mixed=[...master,["Nilkin","NKNOLD1","iPad Case","CASE","","ACCESSORIES","APPLE"],["Nilkin","NKNOLD2","Samsung Case","CASE","CASE","ACCESSORIES","ANDROID"]];
 const plan=parser.planPricelist([
  item("NKNNEW1",{brand:"Nilkin",description:"Samsung Galaxy S26 Case",category:"Case"}),
  item("NKNNEW2",{brand:"Nilkin",description:"Keyboard Case for iPad Air 11",category:"Case"}),
 ],mixed,vendor);
 assert.deepEqual(plan.rows,[
  ["Nilkin","NKNNEW1","Samsung Galaxy S26 Case","CASE","","ACCESSORIES","ANDROID"],
  ["Nilkin","NKNNEW2","Keyboard Case for iPad Air 11","CASE","","ACCESSORIES","APPLE"],
 ]);
 assert.equal(plan.review.length,0);
});
test("conflicting duplicate SAP codes are never silently imported",()=>{
 const plan=parser.planPricelist([item("AMN0002"),item("AMN0002",{description:"Different"})],master,suppliers);
 assert.equal(plan.rows.length,0);assert.match(plan.review[0].reason,/informasi berbeda/);
});
test("header changes fail closed",()=>{
 assert.throws(()=>parser.planPricelist([],[["wrong"]],suppliers),/Format Master/);
 assert.throws(()=>parser.planPricelist([],master,[["wrong"]]),/supplier/);
});
test("Master repair only proposes deterministic supplier, group and Core corrections",()=>{
 const source=[header,["Wrong Brand"," AMN 9001 ","iPhone Charger","Charger","","VAS",""]];
 const plan=repair.planMasterRepairs(source,suppliers);
 assert.equal(plan.checked,1);assert.equal(plan.candidates.length,1);assert.equal(plan.review.length,0);
 assert.deepEqual(plan.candidates[0].proposed,["A.ELEMENTS","AMN9001","iPhone Charger","Charger","","ACCESSORIES","APPLE"]);
 assert.deepEqual(plan.candidates[0].changes.map(change=>change.field),["Brand","SAP Article","Product Group","Core"]);
});
test("Master repair classifies AppleCare as accessory and holds duplicate SAP rows for manual review",()=>{
 const source=[header,["Apple Care Plus","APPCARE1","AppleCare iPhone","Proteksi","","VAS",""],["A.ELEMENTS","AMNDUP","One","CASE","","ACCESSORIES","APPLE"],["A.ELEMENTS","AMNDUP","Two","CASE","","ACCESSORIES","APPLE"]];
 const plan=repair.planMasterRepairs(source,suppliers);
 assert.deepEqual(plan.candidates[0].proposed,["Apple Care Plus","APPCARE1","AppleCare iPhone","PROTECTION","","ACCESSORIES","APPLE"]);
 assert.equal(plan.review.filter(item=>item.article==="AMNDUP").length,2);
});
test("parser reads the supplied Excel, including its row-5 header and empty tabs",{skip:!process.env.PRICELIST_FIXTURE},()=>{
 const buffer=fs.readFileSync(process.env.PRICELIST_FIXTURE);
 const parsed=parser.parsePricelist(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));
 assert.equal(parsed.items.length,3835);assert.equal(parsed.items[0].article,"APPMHY24FE/A");
 assert.equal(parsed.items[0].row,6);
});

function mockStore(initialRows=master,supplierRows=suppliers){
 let metadata,reads=0,rows=structuredClone(initialRows),batches=[];
 const creds={email:"test",key:"test"};
 const transport={
  getSheetRangesFresh:async()=>{reads++;return[structuredClone(rows),structuredClone(supplierRows)]},
  sheetRequestOnce:async(_id,suffix,_email,_key,init)=>{
   if(suffix.startsWith("?"))return Response.json({sheets:[{properties:{sheetId:1515173456,title:"Master",gridProperties:{rowCount:Math.max(3,rows.length+1),columnCount:26}}}]});
   if(suffix.startsWith("/developerMetadata/"))return metadata?Response.json(metadata):new Response("",{status:404});
   const requests=JSON.parse(init.body).requests;
   if(requests[0].createDeveloperMetadata){
    if(metadata)return new Response("duplicate",{status:400});
    metadata=requests[0].createDeveloperMetadata.developerMetadata;
   }else{
    batches.push(requests);
    for(const request of requests){
     if(request.updateCells){
      const incoming=request.updateCells.rows.map(row=>row.values.map(v=>v.userEnteredValue.stringValue)),start=request.updateCells.range.startRowIndex,startColumn=request.updateCells.range.startColumnIndex;
      incoming.forEach((row,index)=>{const at=start+index;if(at<rows.length){const next=[...rows[at]];row.forEach((value,column)=>next[startColumn+column]=value);rows[at]=next}else{const next=Array(startColumn).fill("");next.push(...row);rows.push(next)}});
     }
     if(request.deleteDeveloperMetadata){
      const lookup=request.deleteDeveloperMetadata.dataFilter.developerMetadataLookup;
      if(metadata?.metadataId===lookup.metadataId)metadata=undefined;
     }
    }
   }
   return Response.json({});
  }
 };
 const api=load("lib/accessory-pricelist-store.ts",{"./google-sheets":transport,"./accessory-pricelist":parser});
 return{api,creds,getRows:()=>rows,getReads:()=>reads,getBatches:()=>batches,transport};
}
test("two server instances share a lock; fresh Master is reread after the first commit",async()=>{
 const m=mockStore();
 const first=await m.api.acquireImportLock(m.creds);
 const secondInstance=load("lib/accessory-pricelist-store.ts",{"./google-sheets":m.transport,"./accessory-pricelist":parser});
 await assert.rejects(secondInstance.acquireImportLock(m.creds),/upload pricelist lain/);
 const snap=await m.api.readMaster(m.creds),plan=parser.planPricelist([item("AMN0002")],snap.master,snap.suppliers);
 await m.api.commitMaster(m.creds,snap,plan.rows,first);
 const second=await secondInstance.acquireImportLock(m.creds);
 const fresh=await secondInstance.readMaster(m.creds);
 assert.equal(parser.planPricelist([item("AMN0002")],fresh.master,fresh.suppliers).rows.length,0);
 assert.equal(m.getReads(),2);
 await secondInstance.releaseImportLock(m.creds,second);
});
test("writes only new A–G values into preformatted rows and stores formula-looking descriptions as literal text",async()=>{
 const m=mockStore(),owner=await m.api.acquireImportLock(m.creds),snap=await m.api.readMaster(m.creds);
 const plan=parser.planPricelist([item("AMN0002",{description:'=HYPERLINK("https://example.com")'}),item("AMN0003")],snap.master,snap.suppliers);
 const before=structuredClone(m.getRows());
 await m.api.commitMaster(m.creds,snap,plan.rows,owner);
 assert.deepEqual(m.getRows().slice(0,before.length),before);
 const batch=m.getBatches()[0],write=batch.find(r=>r.updateCells).updateCells;
 assert.deepEqual(write.range,{sheetId:1515173456,startRowIndex:2,endRowIndex:4,startColumnIndex:0,endColumnIndex:7});
 assert.equal(batch.some(r=>r.copyPaste),false);
 assert.equal(write.rows[0].values[2].userEnteredValue.stringValue,'=HYPERLINK("https://example.com")');
 assert.equal(batch[0].appendDimension.length,1);
 assert.deepEqual(batch.at(-1),{deleteDeveloperMetadata:{dataFilter:{developerMetadataLookup:{metadataId:238150926}}}});
});
test("repair writes exact existing rows and releases the shared lock atomically",async()=>{
 const m=mockStore(),owner=await m.api.acquireImportLock(m.creds);
 const candidate={row:2,current:["Wrong"," AMN0001 ","Fixed","CHARGER","","VAS",""],proposed:["A.ELEMENTS","AMN0001","Fixed","CHARGER","","ACCESSORIES","APPLE"]};
 const batch=m.api.buildRepairWrite({sheetId:1515173456},[candidate],owner);
 assert.deepEqual(batch[0].updateCells.range,{sheetId:1515173456,startRowIndex:1,endRowIndex:2,startColumnIndex:0,endColumnIndex:2});
 assert.deepEqual(batch[1].updateCells.range,{sheetId:1515173456,startRowIndex:1,endRowIndex:2,startColumnIndex:5,endColumnIndex:7});
 assert.deepEqual(batch.at(-1),{deleteDeveloperMetadata:{dataFilter:{developerMetadataLookup:{metadataId:238150926}}}});
});

test("route rejects unauthenticated calls before reading any upload",async()=>{
 const route=load("app/api/upload-accessory-pricelist/route.ts",{
  "next/server":{NextResponse:{json:(body,options)=>({body,...options})}},
  "@/lib/auth-session":{SESSION_COOKIE:"session",verifySessionToken:()=>null},
  "@/lib/accessory-pricelist":parser,"@/lib/accessory-pricelist-store":{},
 });
 const result=await route.POST({cookies:{get:()=>undefined}});
 assert.equal(result.status,401);
});

test("preview is read-only; import requires current preview and repeated import is harmless",async()=>{
 const m=mockStore();
 const route=load("app/api/upload-accessory-pricelist/route.ts",{
  "next/server":{NextResponse:{json:(body,options)=>({body,...options})}},
  "@/lib/auth-session":{SESSION_COOKIE:"session",verifySessionToken:()=>({nik:"test"})},
  "@/lib/accessory-pricelist":{...parser,parsePricelist:()=>({items:[item("AMN0002")],ignored:0})},
  "@/lib/accessory-pricelist-store":m.api,
 });
 const oldEmail=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,oldKey=process.env.GOOGLE_PRIVATE_KEY;
 process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL="test";process.env.GOOGLE_PRIVATE_KEY="test";
 const request=(mode,planId)=>({cookies:{get:()=>({value:"test"})},headers:new Headers({origin:"https://example.com"}),nextUrl:{origin:"https://example.com"},formData:async()=>{
  const form=new FormData();form.set("file",new File(["fixture"],"prices.xlsx"));form.set("mode",mode);if(planId)form.set("planId",planId);return form;
 }});
 try{
  const preview=await route.POST(request("preview"));
  assert.equal(preview.status,200);assert.equal(preview.body.newCount,1);assert.equal(m.getRows().length,2);assert.equal(m.getBatches().length,0);
  const stale=await route.POST(request("import","old-preview"));
  assert.equal(stale.status,409);assert.equal(m.getRows().length,2);
  const imported=await route.POST(request("import",preview.body.planId));
  assert.equal(imported.status,200);assert.equal(imported.body.imported,1);assert.equal(m.getRows().length,3);
  const repeatPreview=await route.POST(request("preview"));
  assert.equal(repeatPreview.body.newCount,0);
  const repeat=await route.POST(request("import",repeatPreview.body.planId));
  assert.equal(repeat.body.imported,0);assert.equal(m.getRows().length,3);
 }finally{
  if(oldEmail===undefined)delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;else process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=oldEmail;
  if(oldKey===undefined)delete process.env.GOOGLE_PRIVATE_KEY;else process.env.GOOGLE_PRIVATE_KEY=oldKey;
 }
});

test("Master repair preview is read-only and apply uses the current server plan",async()=>{
 const wrong=[header,["Wrong"," AMN 9001 ","iPhone Charger","Charger","","VAS",""]],m=mockStore(wrong);
 const route=load("app/api/accessory-master-repair/route.ts",{
  "next/server":{NextResponse:{json:(body,options)=>({body,...options})}},
  "@/lib/auth-session":{SESSION_COOKIE:"session",verifySessionToken:()=>({nik:"test"})},
  "@/lib/accessory-master-repair":repair,"@/lib/accessory-pricelist-store":m.api,
 });
 const oldEmail=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,oldKey=process.env.GOOGLE_PRIVATE_KEY;
 process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL="test";process.env.GOOGLE_PRIVATE_KEY="test";
 const request=body=>({cookies:{get:()=>({value:"test"})},headers:new Headers({origin:"https://example.com"}),nextUrl:{origin:"https://example.com"},json:async()=>body});
 try{
  const preview=await route.POST(request({mode:"preview"}));
  assert.equal(preview.status,200);assert.equal(preview.body.fixableCount,1);assert.equal(m.getBatches().length,0);
  const stale=await route.POST(request({mode:"apply",planId:"stale",selected:[preview.body.candidates[0].id]}));
  assert.equal(stale.status,409);assert.equal(m.getRows()[1][0],"Wrong");
  const fresh=await route.POST(request({mode:"preview"}));
  const applied=await route.POST(request({mode:"apply",planId:fresh.body.planId,selected:[fresh.body.candidates[0].id]}));
  assert.equal(applied.status,200);assert.equal(applied.body.applied,1);
  assert.deepEqual(m.getRows()[1],["A.ELEMENTS","AMN9001","iPhone Charger","Charger","","ACCESSORIES","APPLE"]);
 }finally{
  if(oldEmail===undefined)delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;else process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=oldEmail;
  if(oldKey===undefined)delete process.env.GOOGLE_PRIVATE_KEY;else process.env.GOOGLE_PRIVATE_KEY=oldKey;
 }
});

// Optional local comparison; never writes the supplied spreadsheet.
if(process.env.MASTER_FIXTURE){
 const buffer=fs.readFileSync(process.env.PRICELIST_FIXTURE),source=JSON.parse(fs.readFileSync(process.env.MASTER_FIXTURE,"utf8"));
 const parsed=parser.parsePricelist(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));
 const plan=parser.planPricelist(parsed.items,source.master,source.suppliers,parsed.ignored);
 console.log("Live-reference dry run",{total:plan.total,new:plan.rows.length,existing:plan.existing,duplicates:plan.duplicates,review:plan.review.length,reasons:plan.review.reduce((a,r)=>(a[r.reason]=(a[r.reason]||0)+1,a),{})});
 if(process.env.REVIEW_OUTPUT)fs.writeFileSync(process.env.REVIEW_OUTPUT,JSON.stringify(plan,null,2));
}
