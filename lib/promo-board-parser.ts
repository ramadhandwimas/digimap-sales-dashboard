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
  jan:0,januari:0,january:0,
  feb:1,februari:1,february:1,
  mar:2,maret:2,march:2,
  apr:3,april:3,
  mei:4,may:4,
  jun:5,juni:5,june:5,
  jul:6,juli:6,july:6,
  agu:7,agt:7,agustus:7,aug:7,august:7,
  sep:8,sept:8,september:8,
  okt:9,oct:9,oktober:9,october:9,
  nov:10,november:10,
  des:11,dec:11,desember:11,december:11,
};
const MONTH_PATTERN="Jan(?:uari|uary)?|Feb(?:ruari|ruary)?|Mar(?:et|ch)?|Apr(?:il)?|Mei|May|Jun(?:i|e)?|Jul(?:i|y)?|Agu(?:stus)?|Agt|Aug(?:ust)?|Sep(?:t)?(?:ember)?|Okt(?:ober)?|Oct(?:ober)?|Nov(?:ember)?|Des(?:ember)?|Dec(?:ember)?";

const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const key = (value: unknown) => clean(value).toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
const num = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function monthNumber(value:string){
  const normalized=value.toLowerCase().replace(/\.$/,"");
  return MONTHS[normalized];
}

function makeDate(day:string|number,monthText:string,year:string|number){
  const month=monthNumber(monthText);
  if(month===undefined)return null;
  const date=new Date(Number(year),month,Number(day));
  return Number.isNaN(date.getTime())?null:date;
}

function parseFullDate(text: string): Date | null {
  const match = text.match(new RegExp(`(\\d{1,2})\\s+(${MONTH_PATTERN})\\s+(20\\d{2})`,"i"));
  return match?makeDate(match[1],match[2],match[3]):null;
}

function periodStatus(start:Date,end:Date,now:Date){
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const diff=Math.ceil((end.getTime()-today.getTime())/86400000);
  const status:PromoStatus=diff<0?"EXPIRED":diff<=7?"ENDING_SOON":"ACTIVE";
  return{start:iso(start),end:iso(end),type:"DATE_RANGE" as PromoPeriodType,status,daysRemaining:diff};
}

function parsePromoPeriod(remarks: string, now: Date) {
  if (!remarks) return { start: null, end: null, type: "UNKNOWN" as PromoPeriodType, status: "UNKNOWN" as PromoStatus, daysRemaining: null };
  const text=remarks.replace(/[–—]/g,"-").replace(/\s+/g," ").trim();
  const fallbackYear=now.getFullYear();

  // "3 - 29 Maret 2026" / "6-26 September 2026"
  const sameMonth=text.match(new RegExp(`(\\d{1,2})\\s*-\\s*(\\d{1,2})\\s+(${MONTH_PATTERN})\\s+(20\\d{2})`,"i"));
  // "2 Agustus - 26 September 2026" / "26 September - 3 Oct 2026"
  const crossMonth=text.match(new RegExp(`(\\d{1,2})\\s+(${MONTH_PATTERN})(?:\\s+(20\\d{2}))?\\s*-\\s*(\\d{1,2})\\s+(${MONTH_PATTERN})(?:\\s+(20\\d{2}))?`,"i"));

  const fullDates=[...text.matchAll(new RegExp(`(\\d{1,2})\\s+(${MONTH_PATTERN})\\s+(20\\d{2})`,"gi"))]
    .map(m=>makeDate(m[1],m[2],m[3])).filter(Boolean) as Date[];

  const hasFurther=/\bFURTHER(?:\s+NOTICE)?\b/i.test(text);
  if(hasFurther){
    let start:Date|null=null;
    if(crossMonth){
      const year=Number(crossMonth[3]||crossMonth[6]||fallbackYear);
      start=makeDate(crossMonth[1],crossMonth[2],year);
    }else if(sameMonth){
      start=makeDate(sameMonth[1],sameMonth[3],sameMonth[4]);
    }else if(fullDates.length){
      start=fullDates[0];
    }
    return{start:start?iso(start):null,end:null,type:"FURTHER_NOTICE" as PromoPeriodType,status:"FURTHER_NOTICE" as PromoStatus,daysRemaining:null};
  }

  if(crossMonth){
    const endYear=Number(crossMonth[6]||crossMonth[3]||fallbackYear);
    const startYear=Number(crossMonth[3]||endYear);
    const start=makeDate(crossMonth[1],crossMonth[2],startYear);
    const end=makeDate(crossMonth[4],crossMonth[5],endYear);
    if(start&&end)return periodStatus(start,end,now);
  }
  if(sameMonth){
    const start=makeDate(sameMonth[1],sameMonth[3],sameMonth[4]);
    const end=makeDate(sameMonth[2],sameMonth[3],sameMonth[4]);
    if(start&&end)return periodStatus(start,end,now);
  }
  if(fullDates.length>=2)return periodStatus(fullDates[0],fullDates[1],now);
  if(fullDates.length===1){
    const start=fullDates[0];
    // Repricing/New Article/Harga NAIK dates are effective dates, not an expiry.
    // We can safely parse the date while leaving no artificial end date.
    return{start:iso(start),end:null,type:"SINGLE_DATE" as PromoPeriodType,status:"ACTIVE" as PromoStatus,daysRemaining:null};
  }

  return { start: null, end: null, type: "UNKNOWN" as PromoPeriodType, status: "UNKNOWN" as PromoStatus, daysRemaining: null };
}

function detectCategory(description: string, category: string, section: string) {
  // SAP Description is authoritative. Section/category only supply fallback context.
  const primary=description.toLowerCase();
  const fallback=`${section} ${category}`.toLowerCase();
  const detect=(value:string)=>{
    if(value.includes("iphone"))return"iPhone";
    if(value.includes("ipad"))return"iPad";
    if(value.includes("airpods"))return"AirPods";
    if(value.includes("macbook")||/\bmba\b|\bmbp\b|\bmbn\b/.test(value)||value.includes("imac")||value.includes("mac mini")||value.includes("mac studio"))return"Mac";
    if(value.includes("watch")||/\baw\b/.test(value))return"Apple Watch";
    if(value.includes("accessor"))return"Accessories";
    return"";
  };
  return detect(primary)||detect(fallback)||"Others";
}

function detectPriceListDate(rows: unknown[][]) {
  for (const row of rows.slice(0, 12)) {
    for (const cell of row) {
      const text = clean(cell);
      const match = text.match(new RegExp(`(\\d{1,2}\\s+(?:${MONTH_PATTERN})\\s+20\\d{2})`,"i"));
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
  let unknownPeriodCount=0;

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
    if(remarks&&period.type==="UNKNOWN"){
      unknownPeriodCount++;
      if(warnings.length<20)warnings.push(`Periode promo belum terbaca: ${sap} • ${remarks}`);
    }
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

  if(unknownPeriodCount>warnings.filter(w=>w.startsWith("Periode promo belum terbaca")).length)warnings.push(`${unknownPeriodCount} periode promo perlu audit lanjutan.`);
  return { fileName, sheetName, priceListDate: detectPriceListDate(rows), totalRows: rows.length, totalSku: products.length, products, warnings };
}
