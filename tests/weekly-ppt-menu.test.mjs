import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("Weekly report no longer duplicates the SPV PowerPoint menu",async()=>{
  const source=await readFile(new URL("../components/mobile-dashboard-report.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(source,/Unduh PowerPoint|PowerPoint \(\.pptx\)|exportWeeklyPresentation/);
  assert.match(source,/Share \/ Export Weekly/);
});
