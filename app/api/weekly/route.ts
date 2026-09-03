import { NextRequest, NextResponse } from "next/server";
import { getSheetRanges } from "@/lib/google-sheets";

const ID = "160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown) => String(v ?? "").trim();
type Agg = { qty: number; amount: number };
type Side = {
  scheme: Record<string, Agg>;
  vas: Record<string, Agg>;
  lob: Record<string, Record<string, Agg>>;
};

export async function GET(req: NextRequest) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) return NextResponse.json({ error: "Google Sheets belum dikonfigurasi" }, { status: 503 });

  const weekA = Number(req.nextUrl.searchParams.get("a") || 8);
  const weekB = Number(req.nextUrl.searchParams.get("b") || 9);
  const [rows] = await getSheetRanges(ID, ["'Data Copas'!A2:S50000"], email, key);
  const emptySide = (): Side => ({ scheme: {}, vas: {}, lob: {} });
  const out: { a: Side; b: Side } = { a: emptySide(), b: emptySide() };

  const add = (target: Record<string, Agg>, name: string, qty: number, amount: number) => {
    target[name] ??= { qty: 0, amount: 0 };
    target[name].qty += qty;
    target[name].amount += amount;
  };

  for (const row of rows) {
    if (s(row[15]) !== "M238" || s(row[18]) !== "2026") continue;
    const match = s(row[14]).match(/Week\s*(\d+)/i);
    const week = match ? Number(match[1]) : 0;
    const side = week === weekA ? out.a : week === weekB ? out.b : null;
    if (!side) continue;

    const qty = n(row[7]);
    const amount = n(row[8]);
    const type = s(row[6]);
    const description = s(row[5]);
    const category = s(row[9]).toUpperCase();
    const brand = s(row[10]).toUpperCase();
    const scheme = s(row[12]).toUpperCase();

    if (scheme === "DEVICES") add(side.scheme, "DEVICE", qty, amount);
    else if (scheme === "VAS") add(side.scheme, "VAS", qty, amount);
    else if (scheme === "ACCESSORIES") add(side.scheme, "ACC", qty, amount);

    const vasText = `${brand} ${description}`.toUpperCase();
    if (scheme === "VAS" && /QOALA|TELKOMSEL|INDOSAT|XL|XXL/.test(vasText)) {
      const vas = /QOALA/.test(vasText) ? "QOALA" : /TELKOMSEL/.test(vasText) ? "TELKOMSEL" : /INDOSAT/.test(vasText) ? "INDOSAT" : "XL";
      add(side.vas, vas, qty, amount);
    }

    const lob = /AIRPOD/.test(category) ? "AIRPODS" : category === "IPHONE" ? "IPHONE" : category === "IPAD" ? "IPAD" : category === "MAC" ? "MACBOOK" : /WATCH/.test(category) ? "WATCH" : "";
    if (lob) {
      side.lob[lob] ??= {};
      add(side.lob[lob], type || description || category, qty, amount);
    }
  }

  return NextResponse.json({ weekA, weekB, ...out }, { headers: { "Cache-Control": "no-store" } });
}
