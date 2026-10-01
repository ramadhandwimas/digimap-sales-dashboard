import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";

const nodeRequire=createRequire(import.meta.url);
const source=fs.readFileSync(new URL("../app/api/data-upload-ops/route.ts",import.meta.url),"utf8");
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;

function sale({date="30-09-2026",id="25011589",name="Rifo Arvian Ario",invoice="INV-1",article="APP001",description="iPhone",qty=1,amount=1000000}={}){
 return [date,id,name,invoice,article,description,"",qty,amount,"IPHONE","APPLE","APPLE","DEVICES","","Week 13 Q4","M238","Digimap"];
}

function loadRoute(state){
 const compiledModule={exports:{}};
 const next={NextResponse:{json:(body,init={})=>({body,status:init.status??200,headers:init.headers??{},json:async()=>body})}};
 const sheets={
  getSheetRangesFresh:async()=>[state.source,state.destination],
  getSheetRanges:async()=>[[],[]],
  appendSheetValues:async(...args)=>{state.appended.push(args);return{}},
  batchWriteRanges:async()=>{},
  clearAndWrite:async()=>{},
 };
 const summary={buildSummaryFromRawValues:async()=>[],refreshDailySummaryPeriods:async()=>{},upsertDailySummaryRows:async()=>{}};
 const repair={buildDataCopasRepairWrites:()=>[],planDataCopasRepair:()=>({checkedRows:0,rowsWithNA:0,naRepairRows:0,vendorRows:0,candidates:[],changedCells:0,unresolvedNARows:0,issues:[]})};
 const customRequire=(id)=>{
  if(id==="next/server")return next;
  if(id==="@/lib/google-sheets")return sheets;
  if(id==="@/lib/m238-daily-summary-cache")return summary;
  if(id==="@/lib/data-copas-repair")return repair;
  return nodeRequire(id);
 };
 const oldEmail=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,oldKey=process.env.GOOGLE_PRIVATE_KEY;
 process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL="test@example.com";
 process.env.GOOGLE_PRIVATE_KEY="test-key";
 new Function("require","module","exports",code)(customRequire,compiledModule,compiledModule.exports);
 const restore=()=>{if(oldEmail===undefined)delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;else process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=oldEmail;if(oldKey===undefined)delete process.env.GOOGLE_PRIVATE_KEY;else process.env.GOOGLE_PRIVATE_KEY=oldKey};
 return{POST:compiledModule.exports.POST,restore};
}

async function cutoff(POST,{dryRun=true,planId=""}={}){
 const req={json:async()=>({action:"cutoff",mode:"date",value:"2026-09-30",dryRun,planId})};
 return POST(req);
}

test("Cut Off protects existing duplicate occurrences while preserving legitimate duplicates",async()=>{
 const duplicate=sale(),state={source:[duplicate,duplicate],destination:[duplicate],appended:[]},route=loadRoute(state);
 try{
  const res=await cutoff(route.POST);
  assert.equal(res.status,200);
  assert.equal(res.body.sourceCount,2);
  assert.equal(res.body.skippedCount,1);
  assert.equal(res.body.newCount,1);
 }finally{route.restore()}
});

test("Cut Off preview is incremental-only",async()=>{
 const existing=sale({invoice:"INV-1"}),fresh=sale({invoice:"INV-2",article:"APP002",amount:2000000}),state={source:[existing,fresh],destination:[existing],appended:[]},route=loadRoute(state);
 try{
  const res=await cutoff(route.POST);
  assert.equal(res.body.sourceCount,2);
  assert.equal(res.body.currentCount,1);
  assert.equal(res.body.newCount,1);
  assert.equal(res.body.skippedCount,1);
  assert.equal(res.body.newAmount,2000000);
 }finally{route.restore()}
});

test("Cut Off re-reads latest Data Copas state on every preview",async()=>{
 const row=sale(),state={source:[row],destination:[],appended:[]},route=loadRoute(state);
 try{
  const first=await cutoff(route.POST);
  assert.equal(first.body.newCount,1);
  state.destination=[row];
  const second=await cutoff(route.POST);
  assert.equal(second.body.newCount,0);
  assert.equal(second.body.skippedCount,1);
  assert.equal(second.body.isBalanced,true);
 }finally{route.restore()}
});
