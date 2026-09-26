import * as XLSX from "xlsx";

export type PromoStatus = "ACTIVE" | "ENDING_SOON" | "EXPIRED" | "FURTHER_NOTICE" | "UNKNOWN";
export type PromoPeriodType = "DATE_RANGE" | "FURTHER_NOTICE" | "SINGLE_DATE" | "UNKNOWN";

export type PromoProduct = {
  sapArticle: string;
  sapDescription: string;
  category: string;
  section: string;
  normalPrice: number;
  promotionPrice: number;
  savingAmount: number;
  discountPercentage: number;
  remarks: string;
  promotionInstallmentBundling: number | null;
  promotionCashBundling: number | null;
  brZout: string;
  eolStatus: string;
  promoStartDate: string | null;
  promoEndDate: string | null;
  promoPeriodType: PromoPeriodType;
  promoStatus: PromoStatus;
  daysRemaining: number | null;
};

export type PromoParseResult = {
  fileName: string;
  sheetName: string;
  priceListDate: string | null;
  totalRows: number;
  totalSku: number;
  products: PromoProduct[];
  warnings: string[];
};

const MONTHS: Record<string, number> = {
  januari: 0, january: 0, februari: 1, february: 1, maret: 2, march: 2,
  april: 3, mei: 4, may: 4, juni: 5, june: 5, juli: 6, july: 6,
  agustus: 7, august: 7, september: 8, oktober: 9, october: 9,
  november: 10, desember: 11, december: 11,
};

const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const key = (value: unknown) => clean(value).toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
const num = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function parseFullDate(text: string): Date | null {
  const match = text.match(/(\d{1,2})\s+(Januari|January|Februari|February|Maret|March|April|Mei|May|Juni|June|Juli|July|Agustus|August|September|Oktober|October|November|Desember|December)\s+(20\d{2})/i);
  if (!match) return null;
  const month = MONTHS[match[2].toLowerCase()];
  if (month === undefined) return null;
  return new Date(Number(match[3]), month, Number(match[1]));
}

function parsePromoPeriod(remarks: string, now: Date) {
  if (!remarks) return { start: null, end: null, type: "UNKNOWN" as PromoPeriodType, status: "UNKNOWN" as PromoStatus, daysRemaining: null };
  const text = remarks.replace(/\s+/g, " ").trim();

  const further = text.match(/Promo\s+(\d{1,2}\s+(?:Januari|January|Februari|February|Maret|March|April|Mei|May|Juni|June|Juli|July|Agustus|August|September|Oktober|October|November|Desember|December)\s+20\d{2})\s*-\s*Further(?:\s+Notice)?/i);
  if (further) {
    const start = parseFullDate(further[1]);
    return { start: start ? iso(start) : null, end: null, type: "FURTHER_NOTICE" as PromoPeriodType, status: "FURTHER_NOTICE" as PromoStatus, daysRemaining: null };
  }

  const rangeSameMonth = text.match(/Promo\s+(\d{1,2})\s*-\s*(\d{1,2}\s+(?:Januari|January|Februari|February|Maret|March|April|Mei|May|Juni|June|Juli|July|Agustus|August|September|Oktober|October|November|Desember|December)\s+20\d{2})/i);
  let start: Date | null = null;
  let end: Date | null = null;
  if (rangeSameMonth) {
    end = parseFullDate(rangeSameMonth[2]);
    if (end) start = new Date(end.getFullYear(), end.getMonth(), Number(rangeSameMonth[1]));
  } else {
    const dates = [...text.matchAll(/\d{1,2}\s+(?:Januari|January|Februari|February|Maret|March|April|Mei|May|Juni|June|Juli|July|Agustus|August|September|Oktober|October|November|Desember|December)\s+20\d{2}/gi)].map((m) => parseFullDate(m[0])).filter(Boolean) as Date[];
    if (dates.length >= 2) [start, end] = [dates[0], dates[1]];
    else if (dates.length === 1) {
      start = dates[0];
      return { start: iso(start), end: null, type: "SINGLE_DATE" as PromoPeriodType, status: "UNKNOWN" as PromoStatus, daysRemaining: null };
    }
  }

  if (!start || !end) return { start: null, end: null, type: "UNKNOWN" as PromoPeriodType, status: "UNKNOWN" as PromoStatus, daysRemaining: null };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.ceil((end.getTime() - today.getTime()) / 86400000);
  const status: PromoStatus = diff < 0 ? "EXPIRED" : diff <= 7 ? "ENDING_SOON" : "ACTIVE";
  return { start: iso(start), end: iso(end), type: "DATE_RANGE" as PromoPeriodType, status, daysRemaining: diff };
}

function detectCategory(description: string, category: string, section: string) {
  const value = `${description} ${category} ${section}`.toLowerCase();
  if (value.includes("iphone")) return "iPhone";
  if (value.includes("ipad")) return "iPad";
  if (value.includes("airpods")) return "AirPods";
  if (value.includes("watch") || /\baw\b/.test(value)) return "Apple Watch";
  if (value.includes("macbook") || /\bmba\b/.test(value) || /\bmbp\b/.test(value) || value.includes("imac") || value.includes("mac mini")) return "Mac";
  if (value.includes("accessor")) return "Accessories";
  return "Others";
}

function detectPriceListDate(rows: unknown[][]) {
  for (const row of rows.slice(0, 12)) {
    for (const cell of row) {
      const text = clean(cell);
      const match = text.match(/(\d{1,2}\s+(?:Januari|January|Februari|February|Maret|March|April|Mei|May|Juni|June|Juli|July|Agustus|August|September|Oktober|October|November|Desember|December)\s+20\d{2})/i);
      if (match) {
        const date = parseFullDate(match[1]);
        if (date) return iso(date);
      }
    }
  }
  return null;
}

export function parsePromoWorkbook(buffer: ArrayBuffer, fileName: string, now = new Date()): PromoParseResult {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames.find((name) => {
    const normalized = key(name);
    return normalized.includes("PRICE LIST") && normalized.includes("APPLE DEVICE");
  });
  if (!sheetName) throw new Error("Sheet PRICE LIST APPLE DEVICE tidak ditemukan.");

  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, raw: true, defval: null });
  const headerIndex = rows.findIndex((row) => row.some((cell) => key(cell) === "SAP ARTICLE") && row.some((cell) => key(cell).includes("SAPDESCRIPTION")));
  if (headerIndex < 0) throw new Error("Header SAP Article / SAPDescription tidak ditemukan.");

  const headers = rows[headerIndex].map(key);
  const find = (...names: string[]) => headers.findIndex((header) => names.some((name) => header === key(name) || header.includes(key(name))));
  const cols = {
    sap: find("SAP Article"), description: find("SAPDescription", "SAP Description"), category: find("Category"),
    normal: find("Normal Price"), promo: find("Promotion Price"), remarks: find("Remarks"),
    installment: find("Promotion Cicilan Bundling"), cash: find("Promotion Cash Bundling"), br: find("BR/ZOUT", "BR ZOUT"), eol: find("EOL Status"),
  };
  if (cols.sap < 0 || cols.description < 0 || cols.normal < 0 || cols.promo < 0) throw new Error("Kolom wajib Pricelist Digimap tidak lengkap.");

  const warnings: string[] = [];
  const products: PromoProduct[] = [];
  const seen = new Map<string, PromoProduct>();
  let section = "";

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const sap = clean(row[cols.sap]);
    const description = clean(row[cols.description]);
    const normalPrice = num(row[cols.normal]);
    const promotionPrice = num(row[cols.promo]);

    if (sap && !description && !normalPrice && !promotionPrice) { section = sap; continue; }
    if (!sap || !description || (!normalPrice && !promotionPrice)) continue;

    const remarks = cols.remarks >= 0 ? clean(row[cols.remarks]) : "";
    const period = parsePromoPeriod(remarks, now);
    const savingAmount = normalPrice > 0 && promotionPrice > 0 && promotionPrice < normalPrice ? normalPrice - promotionPrice : 0;
    const discountPercentage = normalPrice > 0 ? (savingAmount / normalPrice) * 100 : 0;
    const product: PromoProduct = {
      sapArticle: sap, sapDescription: description,
      category: detectCategory(description, cols.category >= 0 ? clean(row[cols.category]) : "", section), section,
      normalPrice, promotionPrice, savingAmount, discountPercentage, remarks,
      promotionInstallmentBundling: cols.installment >= 0 && num(row[cols.installment]) > 0 ? num(row[cols.installment]) : null,
      promotionCashBundling: cols.cash >= 0 && num(row[cols.cash]) > 0 ? num(row[cols.cash]) : null,
      brZout: cols.br >= 0 ? clean(row[cols.br]) : "", eolStatus: cols.eol >= 0 ? clean(row[cols.eol]) : "",
      promoStartDate: period.start, promoEndDate: period.end, promoPeriodType: period.type, promoStatus: period.status, daysRemaining: period.daysRemaining,
    };

    const previous = seen.get(sap);
    if (previous) {
      if (JSON.stringify(previous) !== JSON.stringify(product)) warnings.push(`Duplicate SAP dengan data berbeda: ${sap}`);
      continue;
    }
    seen.set(sap, product);
    products.push(product);
  }

  return { fileName, sheetName, priceListDate: detectPriceListDate(rows), totalRows: rows.length, totalSku: products.length, products, warnings };
}
