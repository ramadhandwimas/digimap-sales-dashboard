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
test("unknown brand, VAS, AirPods model and ambiguous Core are held for review",()=>{
 const conflicting=[...master,[...sample.slice(0,6),"ANDROID"]];
 const plan=parser.planPricelist([item("AMN0002"),item("NEW0001",{brand:"Unknown"}),item("APPCARE",{brand:"Apple Care Plus",category:"Proteksi"}),item("APP001",{brand:"APPLE",description:"AirPods Pro"})],conflicting,suppliers);
 assert.equal(plan.rows.length,0);assert.equal(plan.review.length,4);
});
test("conflicting duplicate SAP codes are never silently imported",()=>{
 const plan=parser.planPricelist([item("AMN0002"),item("AMN0002",{description:"Different"})],master,suppliers);
 assert.equal(plan.rows.length,0);assert.match(plan.review[0].reason,/informasi berbeda/);
});
test("header changes fail closed",()=>{
 assert.throws(()=>parser.planPricelist([],[["wrong"]],suppliers),/Format Master/);
 assert.throws(()=>parser.planPricelist([],master,[["wrong"]]),/supplier/);
});
test("parser reads the supplied Excel, including its row-5 header and empty tabs",{skip:!process.env.PRICELIST_FIXTURE},()=>{
 const buffer=fs.readFileSync(process.env.PRICELIST_FIXTURE);
 const parsed=parser.parsePricelist(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));
 assert.equal(parsed.items.length,3835);assert.equal(parsed.items[0].article,"APPMHY24FE/A");
 assert.equal(parsed.items[0].row,6);
});

function mockStore(){
 let metadata,reads=0,rows=structuredClone(master),batches=[];
 const creds={email:"test",key:"test"};
 const transport={
  getSheetRangesFresh:async()=>{reads++;return[structuredClone(rows),structuredClone(suppliers)]},
  sheetRequestOnce:async(_id,suffix,_email,_key,init)=>{
   if(suffix.startsWith("?"))return Response.json({sheets:[{properties:{sheetId:1515173456,title:"Master",gridProperties:{rowCount:3,columnCount:26}}}]});
   if(suffix.startsWith("/developerMetadata/"))return metadata?Response.json(metadata):new Response("",{status:404});
   const requests=JSON.parse(init.body).requests;
   if(requests[0].createDeveloperMetadata){
    if(metadata)return new Response("duplicate",{status:400});
    metadata=requests[0].createDeveloperMetadata.developerMetadata;
   }else{
    batches.push(requests);
    for(const request of requests){
     if(request.updateCells)rows.push(...request.updateCells.rows.map(row=>row.values.map(v=>v.userEnteredValue.stringValue)));
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
test("writes only new A–G cells, preserves formatting and stores formula-looking descriptions as literal text",async()=>{
 const m=mockStore(),owner=await m.api.acquireImportLock(m.creds),snap=await m.api.readMaster(m.creds);
 const plan=parser.planPricelist([item("AMN0002",{description:'=HYPERLINK("https://example.com")'}),item("AMN0003")],snap.master,snap.suppliers);
 const before=structuredClone(m.getRows());
 await m.api.commitMaster(m.creds,snap,plan.rows,owner);
 assert.deepEqual(m.getRows().slice(0,before.length),before);
 const batch=m.getBatches()[0],write=batch.find(r=>r.updateCells).updateCells;
 assert.deepEqual(write.range,{sheetId:1515173456,startRowIndex:2,endRowIndex:4,startColumnIndex:0,endColumnIndex:7});
 assert.equal(batch.find(r=>r.copyPaste).copyPaste.pasteType,"PASTE_FORMAT");
 assert.equal(write.rows[0].values[2].userEnteredValue.stringValue,'=HYPERLINK("https://example.com")');
 assert.equal(batch[0].appendDimension.length,1);
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

// Optional local comparison; never writes the supplied spreadsheet.
if(process.env.MASTER_FIXTURE){
 const buffer=fs.readFileSync(process.env.PRICELIST_FIXTURE),source=JSON.parse(fs.readFileSync(process.env.MASTER_FIXTURE,"utf8"));
 const parsed=parser.parsePricelist(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));
 const plan=parser.planPricelist(parsed.items,source.master,source.suppliers,parsed.ignored);
 console.log("Live-reference dry run",{total:plan.total,new:plan.rows.length,existing:plan.existing,duplicates:plan.duplicates,review:plan.review.length,reasons:plan.review.reduce((a,r)=>(a[r.reason]=(a[r.reason]||0)+1,a),{})});
 if(process.env.REVIEW_OUTPUT)fs.writeFileSync(process.env.REVIEW_OUTPUT,JSON.stringify(plan,null,2));
}
