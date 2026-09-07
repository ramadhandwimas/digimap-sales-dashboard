import { NextRequest, NextResponse } from "next/server";
import { getSheetRanges } from "@/lib/google-sheets";

const ID = "160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const s = (v: unknown) => String(v ?? "").trim();
const n = (v: unknown) => Number(v) || 0;

type Tot = { qty: number; value: number };
type StaffRow = { name: string; products: Record<string, Tot>; total: Tot };
type BrandDetail = { name: string; qty: number; value: number };
type BrandRow = { code: string; name: string; qty: number; value: number; details: BrandDetail[] };
type SupplierRow = { supplier: string; qty: number; value: number; brands: BrandRow[] };

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
  const text = `${article} ${brand} ${desc}`.toUpperCase();
  const compact = norm(text);
  for (const [supplier, entries] of Object.entries(SUPPLIERS)) {
    for (const [code, name] of entries) {
      const c = norm(code), nm = norm(name);
      if (compact.includes(c) || compact.includes(nm)) return { supplier, code, name };
    }
  }
  return null;
}
function weekOrder(label: string) {
  const m = label.match(/Week\s*(\d+)\s*Q(\d+)/i);
  return m ? Number(m[2]) * 100 + Number(m[1]) : -1;
}

export async function GET(req: NextRequest) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) return NextResponse.json({ error: "Google Sheets belum dikonfigurasi" }, { status: 503 });
  try {
    const [rows] = await getSheetRanges(ID, ["'Data Copas'!A2:S50000"], email, key);
    const m238 = rows.filter(r => s(r[15]).toUpperCase() === "M238" && s(r[18]) === "2026");
    const availableWeeks = [...new Set(m238.map(r => s(r[14])).filter(v => /Week\s*\d+\s*Q\d+/i.test(v)))].sort((a,b)=>weekOrder(a)-weekOrder(b));
    const requested = req.nextUrl.searchParams.get("week") || "";
    const week = availableWeeks.includes(requested) ? requested : (availableWeeks.at(-1) || "");
    const selected = m238.filter(r => s(r[14]) === week);

    const staff = new Map<string, StaffRow>();
    const productTotals: Record<string, Tot> = Object.fromEntries(PRODUCT_ORDER.map(k => [k, fresh()]));
    const supplierMap = new Map<string, Map<string, { code:string; name:string; total:Tot; details:Map<string,Tot> }>>();
    const vas: Record<string, Tot> = { Qoala: fresh(), Telkomsel: fresh(), XL: fresh(), Indosat: fresh() };

    for (const row of selected) {
      const staffName = s(row[2]) || "Tanpa Nama";
      const article = s(row[4]), desc = s(row[5]), type = s(row[6]), category = s(row[9]), brand = s(row[10]);
      const scheme = s(row[12]).toUpperCase(), qty = n(row[7]), value = n(row[8]);

      if (scheme === "DEVICES") {
        const p = productName(type, desc, category);
        if (p) {
          const rec = staff.get(staffName) || { name: staffName, products: {}, total: fresh() };
          rec.products[p] ||= fresh(); add(rec.products[p], qty, value); add(rec.total, qty, value); staff.set(staffName, rec);
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
        }
      }

      if (scheme === "VAS") {
        const t = `${brand} ${desc} ${type}`.toUpperCase();
        const provider = /QOALA/.test(t) ? "Qoala" : /TELKOMSEL/.test(t) ? "Telkomsel" : /INDOSAT/.test(t) ? "Indosat" : /(^|\W)XL(\W|$)|XXL/.test(t) ? "XL" : "";
        if (provider) add(vas[provider], qty, value);
      }
    }

    const suppliers: SupplierRow[] = Object.keys(SUPPLIERS).map(supplier => {
      const brands = [...(supplierMap.get(supplier)?.values() || [])].map(r => ({ code:r.code, name:r.name, qty:r.total.qty, value:r.total.value, details:[...r.details.entries()].map(([name,t])=>({name,qty:t.qty,value:t.value})).sort((a,b)=>b.qty-a.qty) })).sort((a,b)=>b.qty-a.qty);
      return { supplier, qty: brands.reduce((x,r)=>x+r.qty,0), value: brands.reduce((x,r)=>x+r.value,0), brands };
    });

    return NextResponse.json({
      week, availableWeeks,
      lob: { products: PRODUCT_ORDER.map(name => ({ name, ...productTotals[name] })), staff: [...staff.values()].sort((a,b)=>b.total.qty-a.total.qty), total: Object.values(productTotals).reduce((t,r)=>({qty:t.qty+r.qty,value:t.value+r.value}),fresh()) },
      thirdParty: { suppliers, total: suppliers.reduce((t,r)=>({qty:t.qty+r.qty,value:t.value+r.value}),fresh()) },
      vas: { providers: Object.entries(vas).map(([name,t])=>({name,...t})), total: Object.values(vas).reduce((t,r)=>({qty:t.qty+r.qty,value:t.value+r.value}),fresh()) }
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal membaca Target Fokus" }, { status: 500 });
  }
}
