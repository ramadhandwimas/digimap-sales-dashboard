import { NextRequest, NextResponse } from "next/server";
import { getSheetRanges } from "@/lib/google-sheets";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth-session";

const SHEET_ID = "160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const STORE = "M238";
const text = (value: unknown) => String(value ?? "").trim();

export async function POST(request: NextRequest) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
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
    password = text(body.password);
  if (!nik || !password)
    return NextResponse.json(
      { error: "NIK dan password wajib diisi." },
      { status: 400 },
    );
  if (password !== "m238")
    return NextResponse.json(
      { error: "NIK atau password tidak sesuai." },
      { status: 401 },
    );

  const [rows] = await getSheetRanges(SHEET_ID, ["Config!H28:L60"], email, key),
    member = rows.find(
      (row) =>
        text(row[0]).toUpperCase() === STORE &&
        text(row[1]) === nik &&
        text(row[2]) &&
        !/ONLINE/i.test(text(row[3])),
    );
  if (!member)
    return NextResponse.json(
      { error: "NIK tidak terdaftar sebagai team M238." },
      { status: 401 },
    );

  const response = NextResponse.json({ ok: true, name: text(member[2]) });
  response.cookies.set(
    SESSION_COOKIE,
    createSessionToken(nik, text(member[2])),
    sessionCookieOptions,
  );
  return response;
}
