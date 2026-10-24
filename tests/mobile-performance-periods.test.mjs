import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const mobile=fs.readFileSync(new URL("../components/mobile-dashboard-app.tsx",import.meta.url),"utf8");
const overview=fs.readFileSync(new URL("../app/api/overview/route.ts",import.meta.url),"utf8");
const staff=fs.readFileSync(new URL("../app/api/staff-performance-month/route.ts",import.meta.url),"utf8");
const mobileCss=fs.readFileSync(new URL("../app/mobile-dashboard.css",import.meta.url),"utf8");

test("mobile period picker exposes 2026 and archived 2025",()=>{
 assert.match(mobile,/const periodYears=\[2026,2025\]/);
 assert.match(mobile,/monthsByYear\[year\]/);
 assert.match(overview,/\^202\[56\]-\\d\{2\}\$/);
 assert.match(overview,/Data Copas Archive 2025/);
 assert.match(staff,/Data Copas Archive 2025/);
 assert.match(mobileCss,/\.m238m-period-year\{padding:/);
 assert.doesNotMatch(mobileCss,/\.m238m-period-year\{position:sticky/);
});

test("mobile initial and daily loading use lightweight paths",()=>{
 assert.match(mobile,/return await overviewPromise/);
 assert.doesNotMatch(mobile,/Promise\.all\(\[overviewPromise,trafficPromise/);
 assert.match(mobile,/\/api\/daily-fast\?date=/);
 assert.doesNotMatch(mobile,/legacyUrl=`\/api\/data\?period=/);
 assert.match(mobile,/if\(periodMode==="week"&&!weekly\)void loadWeekly\(\)/);
});
