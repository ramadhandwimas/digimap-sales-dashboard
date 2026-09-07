import { NextRequest, NextResponse } from "next/server";
import { getSheetRanges } from "@/lib/google-sheets";

const ID = "160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const s = (v: unknown) => String(v ?? "").trim();
const n = (v: unknown) => Number(v) || 0;

type Tot = { qty: number; value: number };
type ProductStaff = { name: string; products: Record<string, Tot>; total: Tot; deviceTotal: Tot };
type ThirdPartyStaff = { name: string; qty: number; value: number };
type VasStaff = { name: string; qty: number; value: number; deviceQty: number; deviceValue: number; ar: number };
type BrandDetail = { name: string; qty: number; value: number };
type BrandRow = { code: string; name: string; qty: number; value: number; details: BrandDetail[] };
type SupplierRow = { supplier: string; qty: number; value: number; brands: BrandRow[]; staff: ThirdPartyStaff[] };

const PRODUCT_ORDER = [
  "iPhone 17 Pro Max",
  "iPhone 17 Pro",
  "iPhone 17",
  "iPhone Air",
  "iPhone 16",
  "iPhone 15",
  "iPad 11",
  "MacBook Neo",
  "Watch SE 3",
] as const;

const SUPPLIERS: Record<string, Array<[string, string]>> = {
  Hastag: [["KTS", "Kate Spade"], ["MUU", "Mutuall"], ["FLTFT", "Flaunt"]],
  Dino: [["AMN", "A.ELEMENTS"], ["GE4", "Gear4"], ["MOK", "MICROPACK"], ["MPI", "MOPHIE"], ["ZAG", "ZAAG"], ["IFG", "Ifrog"], ["VBT", "Verbatim"], ["AAV", "AVANA"], ["INC", "INCASE"], ["INP", "INCIPIO"], ["ITS", "ITSKIN"], ["RIV", "RIVACASE"], ["TCA", "TUCANO"], ["UAQ", "UAG"], ["CRR", "Care"]],
  IGA: [["ADP", "ADIDAS"], ["ECS", "ELEMENCASE"], ["GSH", "GOSH"], ["INT", "INTELIAMOR"], ["LFP", "LIFEPROOF"], ["MDN", "Master Dynamic"], ["NIP", "PINIT"], ["OTB", "OTTERBOX"], ["RPC", "Raptic"], ["SD0", "Sudio"], ["ST1", "STM"], ["RSQ", "Rollingsquare"], ["ARU", "ARC Pulse"], ["RAT", "Kratos"]],
  IBacks: [["IBS", "Ibacks"]],
  Handal: [["CTU", "CASESTUDI"], ["IUV", "ILUV"], ["MHO", "MACHINO"], ["UNQ", "UNIQ"]],
  Omega: [["LYC", "Lycus"], ["OMZ", "Optimuz"]],
};

function add(t: Tot, qty: number, value: number) { t.qty += qty; t.value += value; }
function fresh(): Tot { return { qty: 0, value: 0 }; }
function iso(v: unknown) {
  if (typeof v === "number" && v > 20000) return new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().slice(0, 10);
  const raw = s(v);
  let m = raw.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}
function productName(type: string, desc: string, category: string) {
  const x = `${type} ${desc} ${category}`.toUpperCase().replace(/\s+/g, " ");
  if (/IPHONE\s*17\s*PRO\s*MAX/.test(x)) return "iPhone 17 Pro Max";
  if (/IPHONE\s*17\s*PRO/.test(x)) return "iPhone 17 Pro";
  if (/IPHONE\s*17(?!\s*PRO)/.test(x)) return "iPhone 17";
  if (/IPHONE\s*AIR/.test(x)) return "iPhone Air";
  if (/IPHONE\s*16/.test(x)) return "iPhone 16";
  if (/IPHONE\s*15/.test(x)) return "iPhone 15";
  if (/IPAD\s*(?:11|11TH)|IPAD 11/.test(x)) return "iPad 11";
  if (/\bMBN\b|MACBOOK\s*NEO|MAC\s*NEO/.test(x)) return "MacBook Neo";
  if (/\bAW\s*SE\s*3\b|APPLE\s*WATCH\s*SE\s*3|WATCH\s*SE\s*3/.test(x)) return "Watch SE 3";
  return "";
}
function norm(v: string) { return v.toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function brandMatch(article: string, brand: string, desc: string) {
  const compact = norm(`${article} ${brand} ${desc}`);
  for (const [supplier, entries] of Object.entries(SUPPLIERS)) {
    for (const [code, name] of entries) {
      if (compact.includes(norm(code)) || compact.includes(norm(name))) return { supplier, code, name };
    }
  }
  return null;
}
function weekOrder(label: string) {
  const m = label.match(/Week\s*(\d+)\s*Q(\d+)/i);
  return m ? Number(m[2]) * 100 + Number(m[1]) : -1;
}
function monthLabel(v: string) {
  const [y, m] = v.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export async function GET(req: NextRequest) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) return NextResponse.json({ error: "Google Sheets belum dikonfigurasi" }, { status: 503 });
  try {
    const [rows] = await getSheetRanges(ID, ["'Data Copas'!A2:S50000"], email, key);
    const m238 = rows.filter(r => s(r[15]).toUpperCase() === "M238" && s(r[18]) === "2026");
    const availableWeeks = [...new Set(m238.map(r => s(r[14])).filter(v => /Week\s*\d+\s*Q\d+/i.test(v)))].sort((a,b)=>weekOrder(a)-weekOrder(b));
    const availableMonths = [...new Set(m238.map(r => iso(r[0]).slice(0,7)).filter(v => /^2026-\d{2}$/.test(v)))].sort();

    const modeRaw = req.nextUrl.searchParams.get("mode") || "week";
    const mode = modeRaw === "month" || modeRaw === "range" ? modeRaw : "week";
    const requestedWeek = req.nextUrl.searchParams.get("week") || "";
    const week = availableWeeks.includes(requestedWeek) ? requestedWeek : (availableWeeks.at(-1) || "");
    const requestedMonth = req.nextUrl.searchParams.get("month") || "";
    const month = availableMonths.includes(requestedMonth) ? requestedMonth : (availableMonths.at(-1) || "2026-09");
    const firstDate = m238.map(r=>iso(r[0])).filter(Boolean).sort()[0] || "2026-01-01";
    const lastDate = m238.map(r=>iso(r[0])).filter(Boolean).sort().at(-1) || "2026-12-31";
    let from = req.nextUrl.searchParams.get("from") || firstDate;
    let to = req.nextUrl.searchParams.get("to") || lastDate;
    if (!/^2026-\d{2}-\d{2}$/.test(from)) from = firstDate;
    if (!/^2026-\d{2}-\d{2}$/.test(to)) to = lastDate;
    if (from > to) [from, to] = [to, from];

    const selected = m238.filter(r => {
      const d = iso(r[0]);
      if (mode === "range") return Boolean(d && d >= from && d <= to);
      if (mode === "month") return d.startsWith(month);
      return s(r[14]) === week;
    });
    const periodLabel = mode === "range" ? `${from} s.d. ${to}` : mode === "month" ? monthLabel(month) : week;

    const productStaff = new Map<string, ProductStaff>();
    const deviceByStaff = new Map<string, Tot>();
    const productTotals: Record<string, Tot> = Object.fromEntries(PRODUCT_ORDER.map(k => [k, fresh()]));
    const supplierMap = new Map<string, Map<string, { code:string; name:string; total:Tot; details:Map<string,Tot> }>>();
    const supplierStaff = new Map<string, Map<string, Tot>>();
    const vasTotals: Record<string, Tot> = { Qoala: fresh(), Telkomsel: fresh(), XL: fresh(), Indosat: fresh() };
    const vasStaff = new Map<string, Map<string, Tot>>();

    for (const row of selected) {
      const staffName = s(row[2]) || "Tanpa Nama";
      const article = s(row[4]), desc = s(row[5]), type = s(row[6]), category = s(row[9]), brand = s(row[10]);
      const scheme = s(row[12]).toUpperCase(), qty = n(row[7]), value = n(row[8]);

      if (scheme === "DEVICES") {
        const d = deviceByStaff.get(staffName) || fresh(); add(d, qty, value); deviceByStaff.set(staffName, d);
        const p = productName(type, desc, category);
        if (p) {
          const rec = productStaff.get(staffName) || { name: staffName, products: {}, total: fresh(), deviceTotal: fresh() };
          rec.products[p] ||= fresh(); add(rec.products[p], qty, value); add(rec.total, qty, value); productStaff.set(staffName, rec);
          add(productTotals[p], qty, value);
        }
      }

      if (scheme === "ACCESSORIES") {
        const hit = brandMatch(article, brand, desc);
        if (hit) {
          if (!supplierMap.has(hit.supplier)) supplierMap.set(hit.supplier, new Map());
          const brands = supplierMap.get(hit.supplier)!;
          const rec = brands.get(hit.code) || { code: hit.code, name: hit.name, total: fresh(), details: new Map<string,Tot>() };
          const detail = type || desc || article || hit.name;
          rec.details.set(detail, rec.details.get(detail) || fresh());
          add(rec.details.get(detail)!, qty, value); add(rec.total, qty, value); brands.set(hit.code, rec);

          if (!supplierStaff.has(hit.supplier)) supplierStaff.set(hit.supplier, new Map());
          const staffMap = supplierStaff.get(hit.supplier)!;
          const st = staffMap.get(staffName) || fresh(); add(st, qty, value); staffMap.set(staffName, st);
        }
      }

      if (scheme === "VAS") {
        const t = `${brand} ${desc} ${type}`.toUpperCase();
        const provider = /QOALA/.test(t) ? "Qoala" : /TELKOMSEL/.test(t) ? "Telkomsel" : /INDOSAT/.test(t) ? "Indosat" : /(^|\W)XL(\W|$)|XXL/.test(t) ? "XL" : "";
        if (provider) {
          add(vasTotals[provider], qty, value);
          if (!vasStaff.has(provider)) vasStaff.set(provider, new Map());
          const staffMap = vasStaff.get(provider)!;
          const st = staffMap.get(staffName) || fresh(); add(st, qty, value); staffMap.set(staffName, st);
        }
      }
    }

    for (const [name, rec] of productStaff) rec.deviceTotal = deviceByStaff.get(name) || fresh();

    const suppliers: SupplierRow[] = Object.keys(SUPPLIERS).map(supplier => {
      const brands = [...(supplierMap.get(supplier)?.values() || [])].map(r => ({ code:r.code, name:r.name, qty:r.total.qty, value:r.total.value, details:[...r.details.entries()].map(([name,t])=>({name,qty:t.qty,value:t.value})).sort((a,b)=>b.qty-a.qty) })).sort((a,b)=>b.qty-a.qty);
      const staff = [...(supplierStaff.get(supplier)?.entries() || [])].map(([name,t])=>({name,qty:t.qty,value:t.value})).sort((a,b)=>b.qty-a.qty || b.value-a.value);
      return { supplier, qty: brands.reduce((x,r)=>x+r.qty,0), value: brands.reduce((x,r)=>x+r.value,0), brands, staff };
    });

    const providers = Object.keys(vasTotals).map(name => {
      const total = vasTotals[name];
      const staff: VasStaff[] = [...(vasStaff.get(name)?.entries() || [])].map(([staffName,t]) => {
        const device = deviceByStaff.get(staffName) || fresh();
        return { name: staffName, qty:t.qty, value:t.value, deviceQty:device.qty, deviceValue:device.value, ar:device.qty ? (t.qty/device.qty)*100 : 0 };
      }).sort((a,b)=>b.qty-a.qty || b.value-a.value);
      return { name, ...total, staff };
    });

    return NextResponse.json({
      mode, periodLabel, week, month, from, to, availableWeeks, availableMonths,
      lob: { products: PRODUCT_ORDER.map(name => ({ name, ...productTotals[name] })), staff: [...productStaff.values()].sort((a,b)=>b.total.qty-a.total.qty), total: Object.values(productTotals).reduce((t,r)=>({qty:t.qty+r.qty,value:t.value+r.value}),fresh()) },
      thirdParty: { suppliers, total: suppliers.reduce((t,r)=>({qty:t.qty+r.qty,value:t.value+r.value}),fresh()) },
      vas: { providers, total: Object.values(vasTotals).reduce((t,r)=>({qty:t.qty+r.qty,value:t.value+r.value}),fresh()) }
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal membaca Target Fokus" }, { status: 500 });
  }
}
