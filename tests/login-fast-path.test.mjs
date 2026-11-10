import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);

const code = ts.transpileModule(
  fs.readFileSync(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

test("successful login returns before activity history is appended", async () => {
  const deferred = [], writes = [], mod = { exports: {} };
  class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.cookies = { set: (...args) => { this.cookie = args; } };
    }
    static json(body, init) { return new Response(body, init); }
  }
  const mocks = {
    "next/cache": { unstable_cache: (fn) => fn },
    "next/server": {
      after: (task) => deferred.push(task),
      NextResponse: Response,
    },
    "@/lib/google-sheets": {
      getSheetRanges: async () => [[
        ["M238", "12345", "Test Staff", "Sales Assistant"],
      ], []],
      appendSheetValues: async (...args) => { writes.push(args); },
    },
    "@/lib/auth-session": {
      createSessionToken: () => "signed-session",
      SESSION_COOKIE: "session",
      sessionCookieOptions: { httpOnly: true },
    },
  };
  new Function("require", "module", "exports", code)(id => mocks[id] || require(id), mod, mod.exports);
  const old = {
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY,
    password: process.env.DASHBOARD_LOGIN_PASSWORD,
  };
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "fixture";
  process.env.GOOGLE_PRIVATE_KEY = "fixture";
  process.env.DASHBOARD_LOGIN_PASSWORD = "secret";
  try {
    const result = await mod.exports.POST({
      headers: new Headers({ "user-agent": "test" }),
      json: async () => ({ nik: "12345", password: "secret" }),
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.cookie[0], "session");
    assert.equal(writes.length, 0);
    assert.equal(deferred.length, 1);
    await deferred[0]();
    assert.equal(writes.length, 1);
    assert.equal(writes[0][5], "RAW");
  } finally {
    for (const [key, value] of Object.entries(old)) {
      const env = key === "email" ? "GOOGLE_SERVICE_ACCOUNT_EMAIL" : key === "key" ? "GOOGLE_PRIVATE_KEY" : "DASHBOARD_LOGIN_PASSWORD";
      if (value === undefined) delete process.env[env]; else process.env[env] = value;
    }
  }
});

test("login warmup loads the cached staff list without exposing it", async () => {
  let reads = 0;
  const mod = { exports: {} };
  class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
    }
    static json(body, init) { return new Response(body, init); }
  }
  const mocks = {
    "next/cache": { unstable_cache: (fn) => fn },
    "next/server": { after: () => {}, NextResponse: Response },
    "@/lib/google-sheets": {
      getSheetRanges: async () => {
        reads += 1;
        return [[["M238", "12345", "Test Staff", "Sales Assistant"]], []];
      },
      appendSheetValues: async () => {},
    },
    "@/lib/auth-session": {
      createSessionToken: () => "signed-session",
      SESSION_COOKIE: "session",
      sessionCookieOptions: { httpOnly: true },
    },
  };
  new Function("require", "module", "exports", code)(id => mocks[id] || require(id), mod, mod.exports);
  const old = {
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY,
  };
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "fixture";
  process.env.GOOGLE_PRIVATE_KEY = "fixture";
  try {
    const result = await mod.exports.GET();
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { ok: true });
    assert.equal(reads, 1);
    assert.equal("rows" in result.body, false);
  } finally {
    if (old.email === undefined) delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    else process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = old.email;
    if (old.key === undefined) delete process.env.GOOGLE_PRIVATE_KEY;
    else process.env.GOOGLE_PRIVATE_KEY = old.key;
  }
});

test("login page does not add artificial success delays", () => {
  const source = fs.readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /elapsed\s*<\s*1450/);
  assert.match(source, /fetch\("\/api\/auth\/login"/);
  assert.match(source, /window\.setTimeout\(\(\) => window\.location\.replace\("\/"\), 120\)/);
});

test("Google service account token exchange uses the supported grant once", () => {
  const source = fs.readFileSync(new URL("../lib/google-sheets.ts", import.meta.url), "utf8");
  assert.match(source, /urn:ietf:params:oauth:grant-type:jwt-bearer/);
  assert.doesNotMatch(source, /urn:ietf:params:oauth2:token-exchange/);
});
