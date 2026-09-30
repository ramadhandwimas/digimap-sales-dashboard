import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const dailyFixed=fs.readFileSync(new URL("../app/api/daily-fixed/route.ts",import.meta.url),"utf8");
const dailyFast=fs.readFileSync(new URL("../app/api/daily-fast/route.ts",import.meta.url),"utf8");

test("Daily fixed exposes store = visibleStaff + unassigned reconciliation",()=>{
 assert.match(dailyFixed,/data\.reconciliation/);
 assert.match(dailyFixed,/store = visibleStaff \+ unassigned/);
 assert.match(dailyFixed,/unassignedStaff/);
});

test("Daily fast exposes reconciliation and falls back to daily-fixed",()=>{
 assert.match(dailyFast,/fixedDailyGET/);
 assert.doesNotMatch(dailyFast,/legacyDailyGET/);
 assert.match(dailyFast,/reconciliation/);
 assert.match(dailyFast,/store = visibleStaff \+ unassigned/);
});
