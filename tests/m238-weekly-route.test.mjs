import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const weekly=fs.readFileSync(new URL("../app/api/weekly/route.ts",import.meta.url),"utf8");

test("Weekly Report uses shared sales classifier",()=>{
 assert.match(weekly,/m238-sales-sanitize/);
 assert.match(weekly,/parseSalesRow/);
 assert.match(weekly,/saleKind/);
 assert.match(weekly,/productKey/);
 assert.match(weekly,/vasKey/);
 assert.match(weekly,/isValidSale/);
});

test("Weekly Report does not use legacy direct scheme classifier",()=>{
 assert.doesNotMatch(weekly,/scheme\s*===\s*["']DEVICES["']/);
 assert.doesNotMatch(weekly,/scheme\s*===\s*["']VAS["']/);
 assert.doesNotMatch(weekly,/scheme\s*===\s*["']ACCESSORIES["']/);
});
