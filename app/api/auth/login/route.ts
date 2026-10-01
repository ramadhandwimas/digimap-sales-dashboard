import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { appendSheetValues, getSheetRanges } from "@/lib/google-sheets";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth-session";

const SHEET_ID = "160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const MASTER_ID = "1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const STORE = "M238",
  LOGIN_TAB = "Dashboard Login Activity";
const text = (v: unknown) => String(v ?? "").trim();
const jakartaDate = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
type Attempt = { count: number; firstAt: number };
const attempts = new Map<string, Attempt>();

function clientIp(request: NextRequest) {
  return text(
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
  )
    .split(",")[0]
    .trim() || "unknown";
}

function cleanupAttempts(now: number) {
  if (attempts.size < 200) return;
  for (const [key, value] of attempts) {
    if (now - value.firstAt >= WINDOW_MS) attempts.delete(key);
  }
}

function blocked(key: string, now = Date.now()) {
  const current = attempts.get(key);
  if (!current) return false;
  if (now - current.firstAt >= WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return current.count >= MAX_ATTEMPTS;
}

function registerFailure(key: string, now = Date.now()) {
  const current = attempts.get(key);
  if (!current || now - current.firstAt >= WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
  } else {
    current.count += 1;
  }
  cleanupAttempts(now);
}

function sameSecret(supplied: string, expected: string) {
  const left = createHash("sha256").update(supplied).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

function matchesStoredHash(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const suppliedHex = createHash("sha256")
    .update(`${salt}${password}`)
    .digest("hex");
  const left = Buffer.from(suppliedHex, "utf8");
  const right = Buffer.from(expectedHex, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

const unauthorized = () =>
  NextResponse.json(
    { error: "NIK atau password tidak sesuai." },
    { status: 401 },
  );

export async function POST(request: NextRequest) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key)
    return NextResponse.json(
      { error: "Koneksi data login belum tersedia." },
      { status: 503 },
    );

  const body = (await request.json().catch(() => ({}))) as {
      nik?: string;
      password?: string;
    },
    nik = text(body.nik).replace(/\s+/g, ""),
    password = text(body.password),
    ip = clientIp(request),
    rateKey = `${ip}:${nik || "unknown"}`;

  if (!nik || !password)
    return NextResponse.json(
      { error: "NIK dan password wajib diisi." },
      { status: 400 },
    );
  if (blocked(rateKey))
    return NextResponse.json(
      { error: "Terlalu banyak percobaan login. Silakan coba kembali beberapa saat lagi." },
      { status: 429, headers: { "retry-after": String(WINDOW_MS / 1000) } },
    );

  const [rows, authRows] = await getSheetRanges(
      SHEET_ID,
      ["Config!H28:L60", "Config!AG1000"],
      email,
      key,
    ),
    storedHash = text(authRows?.[0]?.[0]),
    configuredPassword = process.env.DASHBOARD_LOGIN_PASSWORD?.trim();

  const passwordOk = configuredPassword
    ? sameSecret(password, configuredPassword)
    : matchesStoredHash(password, storedHash);
  if (!passwordOk) {
    registerFailure(rateKey);
    return unauthorized();
  }

  const member = rows.find(
    (row) =>
      text(row[0]).toUpperCase() === STORE &&
      text(row[1]) === nik &&
      text(row[2]) &&
      !/ONLINE/i.test(text(row[3])),
  );
  if (!member) {
    registerFailure(rateKey);
    return unauthorized();
  }

  attempts.delete(rateKey);
  const name = text(member[2]),
    timestamp = new Date().toISOString(),
    ua = text(request.headers.get("user-agent"));
  try {
    await appendSheetValues(
      MASTER_ID,
      `'${LOGIN_TAB}'!A:F`,
      [[timestamp, jakartaDate(), nik, name, ua, ip]],
      email,
      key,
    );
  } catch {}
  const response = NextResponse.json({ ok: true, name });
  response.cookies.set(
    SESSION_COOKIE,
    createSessionToken(nik, name),
    sessionCookieOptions,
  );
  return response;
}
