import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";

const require=createRequire(import.meta.url);
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL="test@example.com";
process.env.GOOGLE_PRIVATE_KEY="test-key";
delete process.env.VERCEL_ENV;
function loadRoute(sheets){
 const source=fs.readFileSync(new URL("../app/api/accessory-barcode-map/route.ts",import.meta.url),"utf8");
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const loadedModule={exports:{}};
 const mocks={
  "next/server":{NextResponse:{json:(body,options={})=>({body,...options})}},
  "@/lib/auth-session":{SESSION_COOKIE:"session",verifySessionToken:()=>({name:"Dwimas",nik:"22008157"})},
  "@/lib/accessory-pricelist-store":{MASTER_ID:"master"},
  "@/lib/google-sheets":sheets,
 };
 new Function("require","module","exports",code)(name=>name in mocks?mocks[name]:require(name),loadedModule,loadedModule.exports);
 return loadedModule.exports;
}
const request=(body,origin=null)=>({cookies:{get:()=>({value:"ok"})},headers:{get:()=>origin},nextUrl:{origin:"https://preview.example"},json:async()=>body});

test("preview barcode map reads the latest UPC mapping",async()=>{
 let ensured="";
 const route=loadRoute({ensureSheet:async(_id,tab)=>{ensured=tab},getSheetRangesFresh:async()=>[[["840171753325","KTSKS057336"],["840171753325","KTSKS057337"]]],appendSheetValues:async()=>{}});
 const result=await route.GET(request(null));
 assert.equal(ensured,"ACC Barcode Map Preview");
 assert.equal(result.body.map["840171753325"],"KTSKS057337");
 assert.equal(result.body.isolated,true);
});

test("a learned UPC is appended without guessing another article",async()=>{
 let written;
 const route=loadRoute({ensureSheet:async()=>{},getSheetRangesFresh:async()=>[[]],appendSheetValues:async(...args)=>{written=args}});
 const result=await route.POST(request({barcode:"8 401717 53325",sapArticle:"KTSKS057336"}));
 assert.equal(result.body.barcode,"840171753325");
 assert.deepEqual(written[2][0].slice(0,2),["840171753325","KTSKS057336"]);
});

test("non-numeric labels cannot be stored as UPC mappings",async()=>{
 const route=loadRoute({ensureSheet:async()=>{},getSheetRangesFresh:async()=>[[]],appendSheetValues:async()=>{throw Error("must not write")}});
 const result=await route.POST(request({barcode:"JBLXTREME4BLKAS",sapArticle:"JBL50036398282"}));
 assert.equal(result.status,400);
});
