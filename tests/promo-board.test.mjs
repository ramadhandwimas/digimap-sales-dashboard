import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";
import * as XLSX from "xlsx";

const require=createRequire(import.meta.url);

function load(file,overrides={}){
  const source=fs.readFileSync(new URL(`../${file}`,import.meta.url),"utf8");
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const sandboxExports={exports:{}};
  new Function("require","module","exports",code)(name=>name in overrides?overrides[name]:require(name),sandboxExports,sandboxExports.exports);
  return sandboxExports.exports;
}

const parser=load("lib/promo-board-parser.ts");
const insights=load("lib/promo-board-insights.ts");
const catalogApi=load("lib/promo-board-catalog.ts");

function workbook(products,{date="27 September 2026",header=true,sheet="PRICE LIST APPLE DEVICE"}={}){
  const rows=[[`PRICE LIST APPLE DEVICE ${date}`]];
  if(header)rows.push(["SAP Article","SAPDescription","Category","Normal Price","Promotion Price","Remarks"]);
  rows.push(...products.map(product=>[
    product.sap,product.description||"iPhone 17 256GB Black","DEVICE",product.normal,product.promo,product.remarks||"Further Notice",
  ]));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),sheet);
  return XLSX.write(wb,{type:"array",bookType:"xlsx"});
}

function parse(products,now="2026-09-27T05:00:00.000Z"){
  return parser.parsePromoWorkbook(workbook(products),"audit.xlsx",new Date(now));
}

test("future promo remains UPCOMING while latest Price List promo price stays authoritative",()=>{
  const result=parse([{sap:"FUTURE1",normal:14999000,promo:12999000,remarks:"1 - 31 Oktober 2026"}]);
  assert.equal(result.products[0].promoStatus,"UPCOMING");
  assert.equal(insights.activePromoPrice(result.products[0]),12999000);
});

test("expired promo keeps latest Price List promo price authoritative",()=>{
  const result=parse([{sap:"EXPIRED1",normal:12999000,promo:9999000,remarks:"1 - 20 September 2026"}]);
  assert.equal(insights.activePromoPrice(result.products[0]),9999000);
});

test("stored promo status is recalculated while latest Price List price stays authoritative",()=>{
  const uploaded=parse([{sap:"STALE1",normal:12999000,promo:9999000,remarks:"1 - 30 September 2026"}],"2026-09-20T05:00:00.000Z").products[0];
  assert.equal(uploaded.promoStatus,"ACTIVE");
  const refreshed=parser.refreshPromoStatus(uploaded,new Date("2026-10-01T05:00:00.000Z"));
  assert.equal(refreshed.promoStatus,"EXPIRED");
  assert.equal(insights.activePromoPrice(refreshed),9999000);
});

test("Indonesian text prices are parsed without dropping the SKU",()=>{
  const result=parse([{sap:"DOTTED1",normal:"Rp10.499.000",promo:"8.999.000",remarks:"Further Notice"}]);
  assert.equal(result.totalSku,1);
  assert.equal(result.products[0].normalPrice,10499000);
  assert.equal(result.products[0].promotionPrice,8999000);
});

test("identical pricelist content is recognized despite a different filename",()=>{
  const first=parse([{sap:"SAME1",normal:10499000,promo:8999000}]);
  const second={...parse([{sap:"SAME1",normal:10499000,promo:8999000}]),fileName:"renamed.xlsx"};
  assert.equal(insights.samePromoPriceList(first,second),true);
});

test("conflicting duplicate SAP blocks activation and does not silently keep the first row",()=>{
  const result=parse([
    {sap:"DUP1",normal:9999000,promo:7999000},
    {sap:"DUP1",normal:9999000,promo:6999000},
  ]);
  assert.equal(result.blockingErrors,1);
  assert.equal(result.products.some(product=>product.sapArticle==="DUP1"),false);
  assert.equal(result.issues[0].severity,"BLOCKING");
});

test("promo inside its date range is ACTIVE",()=>{
  const result=parse([{sap:"ACTIVE1",normal:14999000,promo:12999000,remarks:"1 September - 31 Oktober 2026"}]);
  assert.equal(result.products[0].promoStatus,"ACTIVE");
});

test("promo ending today stays valid with zero days remaining",()=>{
  const result=parse([{sap:"TODAY1",normal:14999000,promo:12999000,remarks:"1 - 27 September 2026"}]);
  assert.equal(result.products[0].promoStatus,"ENDING_SOON");
  assert.equal(result.products[0].daysRemaining,0);
});

test("Further Notice has no artificial end date",()=>{
  const result=parse([{sap:"FN1",normal:14999000,promo:12999000,remarks:"26 September 2026 - Further Notice"}]);
  assert.equal(result.products[0].promoStatus,"FURTHER_NOTICE");
  assert.equal(result.products[0].promoEndDate,null);
});

test("unknown period is reviewable but not blocking",()=>{
  const result=parse([{sap:"UNKNOWN1",normal:14999000,promo:12999000,remarks:"Sampai pemberitahuan toko"}]);
  assert.equal(result.products[0].promoStatus,"UNKNOWN");
  assert.equal(result.blockingErrors,0);
  assert.equal(result.issues[0].severity,"WARNING");
});

test("invalid calendar date is blocking instead of rolling into another month",()=>{
  const result=parse([{sap:"DATEBAD1",normal:14999000,promo:12999000,remarks:"31 Februari 2026"}]);
  assert.equal(result.blockingErrors,1);
  assert.equal(result.products[0].promoStatus,"UNKNOWN");
});

test("cross-month Indonesian and English dates are parsed",()=>{
  const id=parse([{sap:"CROSS1",normal:14999000,promo:12999000,remarks:"26 September - 3 Oktober 2026"}]);
  const en=parse([{sap:"CROSS2",normal:14999000,promo:12999000,remarks:"26 September - 3 Oct 2026"}]);
  assert.equal(id.products[0].promoEndDate,"2026-10-03");
  assert.equal(en.products[0].promoEndDate,"2026-10-03");
});

test("cross-year period preserves both years",()=>{
  const result=parse([{sap:"YEAR1",normal:14999000,promo:12999000,remarks:"20 Desember 2026 - 5 Januari 2027"}]);
  assert.equal(result.products[0].promoStartDate,"2026-12-20");
  assert.equal(result.products[0].promoEndDate,"2027-01-05");
  assert.equal(result.products[0].promoStatus,"UPCOMING");
});

test("start date after end date blocks activation",()=>{
  const result=parse([{sap:"REVERSE1",normal:14999000,promo:12999000,remarks:"20 Oktober - 5 Oktober 2026"}]);
  assert.equal(result.blockingErrors,1);
  assert.match(result.issues[0].reason,/melewati/);
});

for(const [label,normal,promo] of [
  ["numeric",10499000,8999000],
  ["comma","10,499,000","8,999,000"],
  ["rupiah","Rp 10.499.000","Rp8.999.000"],
  ["hidden whitespace","Rp\u00a010\u200b.499.000","8 999 000"],
])test(`price parser accepts ${label} values`,()=>{
  const result=parse([{sap:`PRICE-${label}`,normal,promo}]);
  assert.equal(result.products[0].normalPrice,10499000);
  assert.equal(result.products[0].promotionPrice,8999000);
});

test("identical duplicate SAP is merged with an informational issue",()=>{
  const result=parse([{sap:"DUP-SAME",normal:9999000,promo:7999000},{sap:"DUP-SAME",normal:9999000,promo:7999000}]);
  assert.equal(result.products.length,1);
  assert.equal(result.blockingErrors,0);
  assert.equal(result.issues[0].severity,"INFO");
});

test("same filename with changed content is a real update",()=>{
  const first=parse([{sap:"CHANGE1",normal:10499000,promo:8999000}]);
  const second=parse([{sap:"CHANGE1",normal:10499000,promo:7999000}]);
  assert.equal(insights.samePromoPriceList(first,second),false);
});

test("SOH missing remains unknown instead of becoming zero",()=>{
  const result=parse([{sap:"SOH-MISSING",normal:10499000,promo:8999000}]);
  const item=catalogApi.buildPromoCatalog(result.products,[])[0];
  assert.equal(item.totalSoh,null);
  assert.equal(item.stockStatus,"UNKNOWN");
});

test("SOH matching uses the exact normalized SAP and never another SKU",()=>{
  const result=parse([{sap:"APP-001/A",normal:10499000,promo:8999000},{sap:"APP-001/B",normal:10499000,promo:8999000,description:"iPhone 17 256GB White"}]);
  const items=catalogApi.buildPromoCatalog(result.products,[{article:"APP-001/A",description:"Black",qty:3,soldQty:0,category:"IPHONE"}]);
  const variants=items.flatMap(item=>item.stockVariants);
  assert.equal(variants.find(item=>item.product.sapArticle==="APP-001/A").soh,3);
  assert.equal(variants.find(item=>item.product.sapArticle==="APP-001/B").soh,null);
});

test("MacBook Neo color codes are not confused with the -IND region suffix",()=>{
  const result=parse([
    {sap:"APPMHFA4ID/A",description:"MBN 13 SLV/8GB/256GB-IND",normal:13499000,promo:12999000},
    {sap:"APPMHFD4ID/A",description:"MBN 13 CIT/8GB/256GB-IND",normal:13499000,promo:12999000},
    {sap:"APPMHFF4ID/A",description:"MBN 13 IND/8GB/256GB-IND",normal:13499000,promo:12999000},
    {sap:"APPMHFH4ID/A",description:"MBN 13 BLS/8GB/256GB-IND",normal:13499000,promo:12999000},
  ]);
  const colors=catalogApi.buildPromoCatalog(result.products,[])
    .flatMap(item=>item.stockVariants.map(variant=>variant.color));
  assert.deepEqual(colors,["Silver","Citrus","Indigo","Blush"]);
});

test("mobile form fields keep a 16px font to prevent iOS focus zoom",()=>{
  const css=fs.readFileSync(new URL("../app/globals.css",import.meta.url),"utf8");
  assert.match(css,/input:not\(\[type=["']?file["']?\]\)[\s\S]*font-size:\s*16px\s*!important/);
});

test("mobile Promo Board explains incomplete and unread SOH without hiding content behind navigation",()=>{
  const board=fs.readFileSync(new URL("../components/promo-board-v9.tsx",import.meta.url),"utf8");
  const panel=fs.readFileSync(new URL("../components/mobile-promo-panel.tsx",import.meta.url),"utf8");
  assert.match(board,/Stok Belum Lengkap/);
  assert.match(board,/SOH belum terbaca/);
  assert.match(board,/dari \{item\.totalVariants\} varian terbaca/);
  assert.match(panel,/padding-bottom:calc\(120px \+ env\(safe-area-inset-bottom\)\)/);
});

test("missing required header fails closed",()=>{
  assert.throws(()=>parser.parsePromoWorkbook(workbook([{sap:"NOHEADER",normal:1,promo:1}],{header:false}),"bad.xlsx"),/Header/);
});

function routeWith({authenticated=true,snapshots=[],save=async()=>({id:"saved",uploadedAt:"now"})}={}){
  return load("app/api/promo-board/route.ts",{
    "next/server":{NextResponse:{json:(body,options={})=>({body,status:options.status??200,headers:options.headers})}},
    "@/lib/auth-session":{SESSION_COOKIE:"session",verifySessionToken:()=>authenticated?{nik:"test"}:null},
    "@/lib/promo-board-parser":parser,
    "@/lib/promo-board-insights":insights,
    "@/lib/promo-board-store":{readPromoSnapshots:async()=>snapshots,savePromoSnapshot:save},
  });
}

function promoRequest({mode="preview",file,origin="https://m238.test",contentLength}={}){
  const headers=new Headers({origin});
  if(contentLength!=null)headers.set("content-length",String(contentLength));
  return{
    cookies:{get:()=>({value:"session"})},headers,nextUrl:{origin:"https://m238.test"},
    formData:async()=>{const form=new FormData();if(file)form.set("file",file);form.set("mode",mode);return form;},
  };
}

function excelFile(products,name="prices.xlsx"){
  return new File([workbook(products)],name,{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}

async function withCredentials(run){
  const oldEmail=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,oldKey=process.env.GOOGLE_PRIVATE_KEY;
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL="test";process.env.GOOGLE_PRIVATE_KEY="test";
  try{return await run()}finally{
    if(oldEmail===undefined)delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;else process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL=oldEmail;
    if(oldKey===undefined)delete process.env.GOOGLE_PRIVATE_KEY;else process.env.GOOGLE_PRIVATE_KEY=oldKey;
  }
}

test("preview is read-only",async()=>withCredentials(async()=>{
  let saves=0;const route=routeWith({save:async()=>{saves++;return{id:"saved",uploadedAt:"now"}}});
  const response=await route.POST(promoRequest({file:excelFile([{sap:"PREVIEW1",normal:10499000,promo:8999000}])}));
  assert.equal(response.status,200);assert.equal(response.body.preview.totalSku,1);assert.equal(saves,0);
}));

test("GET returns compact history summaries while keeping server-side comparison",async()=>withCredentials(async()=>{
  const previous={...parse([{sap:"HISTORY1",normal:10499000,promo:8999000}]),id:"old",uploadedAt:"2026-09-26T00:00:00.000Z"};
  const active={...parse([{sap:"HISTORY1",normal:10499000,promo:7999000}]),id:"new",uploadedAt:"2026-09-27T00:00:00.000Z"};
  const route=routeWith({snapshots:[active,previous]});
  const response=await route.GET({cookies:{get:()=>({value:"session"})}});
  assert.equal(response.status,200);
  assert.equal(response.body.history[0].products,undefined);
  assert.equal(response.body.comparison.counts.PROMO_PRICE_DOWN,1);
}));

test("identical activation is a no-op and does not create a snapshot",async()=>withCredentials(async()=>{
  const active=parse([{sap:"IDENTICAL1",normal:10499000,promo:8999000}]);let saves=0;
  const route=routeWith({snapshots:[active],save:async()=>{saves++;return{id:"saved",uploadedAt:"now"}}});
  const response=await route.POST(promoRequest({mode:"activate",file:excelFile([{sap:"IDENTICAL1",normal:10499000,promo:8999000}],"renamed.xlsx")}));
  assert.equal(response.status,200);assert.equal(response.body.noChange,true);assert.equal(saves,0);
}));

test("activation with a blocking conflict is rejected without writing",async()=>withCredentials(async()=>{
  let saves=0;const route=routeWith({save:async()=>{saves++;return{id:"saved",uploadedAt:"now"}}});
  const file=excelFile([{sap:"BLOCK1",normal:10499000,promo:8999000},{sap:"BLOCK1",normal:10499000,promo:7999000}]);
  const response=await route.POST(promoRequest({mode:"activate",file}));
  assert.equal(response.status,409);assert.equal(response.body.preview.blockingErrors,1);assert.equal(saves,0);
}));

test("product rows written without metadata never become a visible active snapshot",async()=>{
  const calls=[];
  const store=load("lib/promo-board-store.ts",{
    "@/lib/google-sheets":{ensureSheets:async()=>{},getSheetRangesFresh:async()=>[[],[]],appendSheetValues:async(_id,range)=>{calls.push(range);if(range.includes("Promo Price Lists"))throw new Error("metadata failed")}},
    "@/lib/promo-board-parser":parser,
    "@/lib/accessory-pricelist-store":{MASTER_ID:"master"},
  });
  const parsed=parse([{sap:"COMMIT1",normal:10499000,promo:8999000}]);
  await assert.rejects(store.savePromoSnapshot({email:"e",key:"k"},parsed),/metadata failed/);
  assert.ok(calls[0].includes("Promo Products"));assert.ok(calls.at(-1).includes("Promo Price Lists"));
  assert.deepEqual(await store.readPromoSnapshots({email:"e",key:"k"}),[]);
});

test("non-Excel upload is rejected",async()=>withCredentials(async()=>{
  const route=routeWith();
  const response=await route.POST(promoRequest({file:new File(["text"],"prices.txt")}));
  assert.equal(response.status,400);
}));

test("upload larger than 8 MB is rejected before parsing",async()=>withCredentials(async()=>{
  const route=routeWith();
  const response=await route.POST(promoRequest({file:new File([new Uint8Array(8*1024*1024+1)],"large.xlsx")}));
  assert.equal(response.status,413);
}));

test("unauthenticated request is rejected before reading the upload",async()=>withCredentials(async()=>{
  const route=routeWith({authenticated:false});
  const response=await route.POST({cookies:{get:()=>undefined}});
  assert.equal(response.status,401);
}));

test("cross-origin upload is rejected",async()=>withCredentials(async()=>{
  const route=routeWith();
  const response=await route.POST(promoRequest({origin:"https://evil.test",file:excelFile([{sap:"ORIGIN1",normal:1,promo:1}])}));
  assert.equal(response.status,403);
}));

test("supplied real pricelist fixture parses read-only without blocking errors",{skip:!process.env.PROMO_BOARD_FIXTURE},()=>{
  const bytes=fs.readFileSync(process.env.PROMO_BOARD_FIXTURE);
  const result=parser.parsePromoWorkbook(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),"fixture.xlsx",new Date("2026-09-27T05:00:00.000Z"));
  assert.equal(result.sheetName,"PRICE LIST APPLE DEVICE");
  assert.equal(result.priceListDate,"2026-09-26");
  assert.equal(result.totalSku,1034);
  assert.equal(result.blockingErrors,0);
});
