import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("SPV menu can render from the signed session without a Google Sheet access wait",async()=>{
  const [page,workspace,session,login]=await Promise.all([
    read("app/spv/page.tsx"),read("components/spv-workspace.tsx"),read("lib/auth-session.ts"),read("app/api/auth/login/route.ts"),
  ]);
  assert.match(session,/isSpv\?: boolean/);
  assert.match(login,/createSessionToken\([\s\S]*member\[3\]/);
  assert.match(page,/initialAllowed=\{Boolean\(session\?\.isSpv\)\}/);
  assert.match(workspace,/if\(initialAllowed\).*return/s);
});

test("Pricelist loads prices before the heavier SOH request and caches the active catalog",async()=>{
  const [board,route,panel]=await Promise.all([
    read("components/promo-board-v9.tsx"),read("app/api/promo-board/route.ts"),read("components/mobile-promo-panel.tsx"),
  ]);
  const price=board.indexOf("await promoJson<PromoResponse>(DEVICE_URL)");
  const stock=board.indexOf("promoJson<SohResponse>(STOCK_URL)");
  assert.ok(price>=0&&stock>price,"SOH should start after the active pricelist resolves");
  assert.match(route,/unstable_cache/);
  assert.match(route,/revalidate:120/);
  assert.match(panel,/requestIdleCallback/);
});
