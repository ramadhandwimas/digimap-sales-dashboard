import * as XLSX from "xlsx";

export type PromoStatus = "ACTIVE" | "UPCOMING" | "ENDING_SOON" | "EXPIRED" | "FURTHER_NOTICE" | "UNKNOWN";
export type PromoPeriodType = "DATE_RANGE" | "FURTHER_NOTICE" | "SINGLE_DATE" | "UNKNOWN";

export type PromoIssueSeverity = "INFO" | "WARNING" | "BLOCKING";
export type PromoIssue = {
  severity: PromoIssueSeverity;
  code: "DUPLICATE_IDENTICAL" | "DUPLICATE_CONFLICT" | "INVALID_PRICE" | "MISSING_PRICE" | "INVALID_PERIOD" | "UNKNOWN_PERIOD";
  row: number;
  firstRow?: number;
  sapArticle: string;
  productName: string;
  value: string;
  reason: string;
  differingFields?: string[];
  firstData?: Record<string, unknown>;
  conflictingData?: Record<string, unknown>;
};

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
  issues: PromoIssue[];
  blockingErrors: number;
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

const clean = (value: unknown) => String(value ?? "").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim();
const key = (value: unknown) => clean(value).toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
type ParsedPrice={value:number;valid:boolean;empty:boolean;raw:string};
const parsePrice = (value: unknown):ParsedPrice => {
  if(typeof value==="number")return{value:Number.isFinite(value)?value:0,valid:Number.isFinite(value)&&value>=0,empty:false,raw:String(value)};
  const raw=clean(value);
  if(!raw)return{value:0,valid:true,empty:true,raw:""};
  const normalized=raw.replace(/^Rp\s*/i,"").replace(/\s+/g,"");
  if(!/^\d[\d.,]*$/.test(normalized))return{value:0,valid:false,empty:false,raw};
  if(/^\d{1,3}(?:[.,]\d{3})+$/.test(normalized))return{value:Number(normalized.replace(/[.,]/g,"")),valid:true,empty:false,raw};
  if(/^\d+$/.test(normalized))return{value:Number(normalized),valid:true,empty:false,raw};
  if(/^\d+[.,]00$/.test(normalized))return{value:Number(normalized.replace(/[.,]00$/,"")),valid:true,empty:false,raw};
  return{value:0,valid:false,empty:false,raw};
};
const iso = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;

function monthNumber(value:string){
  const normalized=value.toLowerCase().replace(/\.$/,"");
  return MONTHS[normalized];
}

function makeDate(day:string|number,monthText:string,year:string|number){
  const month=monthNumber(monthText);
  if(month===undefined)return null;
  const dayNumber=Number(day),yearNumber=Number(year);
  const date=new Date(Date.UTC(yearNumber,month,dayNumber));
  if(Number.isNaN(date.getTime())||date.getUTCFullYear()!==yearNumber||date.getUTCMonth()!==month||date.getUTCDate()!==dayNumber)return null;
  return date;
}

function parseFullDate(text: string): Date | null {
  const match = text.match(new RegExp(`(\\d{1,2})\\s+(${MONTH_PATTERN})\\s+(20\\d{2})`,"i"));
  return match?makeDate(match[1],match[2],match[3]):null;
}

function jakartaToday(now:Date){
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
  const read=(type:Intl.DateTimeFormatPartTypes)=>Number(parts.find(part=>part.type===type)?.value||0);
  return new Date(Date.UTC(read("year"),read("month")-1,read("day")));
}

function periodStatus(start:Date,end:Date,now:Date){
  if(start.getTime()>end.getTime())return{start:iso(start),end:iso(end),type:"UNKNOWN" as PromoPeriodType,status:"UNKNOWN" as PromoStatus,daysRemaining:null,error:"Tanggal mulai promo melewati tanggal berakhir."};
  const today=jakartaToday(now),diff=Math.round((end.getTime()-today.getTime())/86400000);
  const status:PromoStatus=today.getTime()<start.getTime()?"UPCOMING":diff<0?"EXPIRED":diff<=7?"ENDING_SOON":"ACTIVE";
  return{start:iso(start),end:iso(end),type:"DATE_RANGE" as PromoPeriodType,status,daysRemaining:diff,error:null};
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
    if(/\d{1,2}\s+[A-Za-z]+/i.test(text)&&!start)return{start:null,end:null,type:"UNKNOWN" as PromoPeriodType,status:"UNKNOWN" as PromoStatus,daysRemaining:null,error:"Tanggal mulai Further Notice tidak valid."};
    const status:PromoStatus=start&&jakartaToday(now).getTime()<start.getTime()?"UPCOMING":"FURTHER_NOTICE";
    return{start:start?iso(start):null,end:null,type:"FURTHER_NOTICE" as PromoPeriodType,status,daysRemaining:null,error:null};
  }

  if(crossMonth){
    const endYear=Number(crossMonth[6]||crossMonth[3]||fallbackYear);
    const startYear=Number(crossMonth[3]||endYear);
    const start=makeDate(crossMonth[1],crossMonth[2],startYear);
    const end=makeDate(crossMonth[4],crossMonth[5],endYear);
    if(start&&end)return periodStatus(start,end,now);
    return{start:null,end:null,type:"UNKNOWN" as PromoPeriodType,status:"UNKNOWN" as PromoStatus,daysRemaining:null,error:"Tanggal promo tidak valid."};
  }
  if(sameMonth){
    const start=makeDate(sameMonth[1],sameMonth[3],sameMonth[4]);
    const end=makeDate(sameMonth[2],sameMonth[3],sameMonth[4]);
    if(start&&end)return periodStatus(start,end,now);
    return{start:null,end:null,type:"UNKNOWN" as PromoPeriodType,status:"UNKNOWN" as PromoStatus,daysRemaining:null,error:"Tanggal promo tidak valid."};
  }
  if(fullDates.length>=2)return periodStatus(fullDates[0],fullDates[1],now);
  if(fullDates.length===1){
    const start=fullDates[0];
    // Repricing/New Article/Harga NAIK dates are effective dates, not an expiry.
    // We can safely parse the date while leaving no artificial end date.
    return{start:iso(start),end:null,type:"SINGLE_DATE" as PromoPeriodType,status:(jakartaToday(now).getTime()<start.getTime()?"UPCOMING":"ACTIVE") as PromoStatus,daysRemaining:null,error:null};
  }

  if(new RegExp(`\\d{1,2}\\s+(?:${MONTH_PATTERN})\\s+20\\d{2}`,"i").test(text))return{start:null,end:null,type:"UNKNOWN" as PromoPeriodType,status:"UNKNOWN" as PromoStatus,daysRemaining:null,error:"Tanggal promo tidak valid."};

  return { start: null, end: null, type: "UNKNOWN" as PromoPeriodType, status: "UNKNOWN" as PromoStatus, daysRemaining: null, error:null };
}

function isoDate(value:string|null){
  if(!value)return null;
  const match=value.match(/^(20\d{2})-(\d{2})-(\d{2})$/);
  if(!match)return null;
  const date=new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3])));
  return date.getUTCFullYear()===Number(match[1])&&date.getUTCMonth()===Number(match[2])-1&&date.getUTCDate()===Number(match[3])?date:null;
}

export function refreshPromoStatus(product:PromoProduct,now=new Date()):PromoProduct{
  const start=isoDate(product.promoStartDate),end=isoDate(product.promoEndDate);
  if(product.promoPeriodType==="DATE_RANGE"&&start&&end){
    const period=periodStatus(start,end,now);
    return{...product,promoStartDate:period.start,promoEndDate:period.end,promoPeriodType:period.type,promoStatus:period.status,daysRemaining:period.daysRemaining};
  }
  if(product.promoPeriodType==="FURTHER_NOTICE"){
    const status:PromoStatus=start&&jakartaToday(now).getTime()<start.getTime()?"UPCOMING":"FURTHER_NOTICE";
    return{...product,promoStatus:status,daysRemaining:null};
  }
  if(product.promoPeriodType==="SINGLE_DATE"&&start){
    return{...product,promoStatus:jakartaToday(now).getTime()<start.getTime()?"UPCOMING":"ACTIVE",daysRemaining:null};
  }
  return product;
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

  const issues:PromoIssue[]=[];
  const products: PromoProduct[] = [];
  const seen = new Map<string,{product:PromoProduct;row:number;data:Record<string,unknown>}>();
  const conflicted=new Set<string>();
  let section = "";

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const excelRow=i+1;
    const sap = clean(row[cols.sap]);
    const description = clean(row[cols.description]);
    const normal=parsePrice(row[cols.normal]),promotion=parsePrice(row[cols.promo]);
    const normalPrice = normal.value;
    const promotionPrice = promotion.value;

    if (sap && !description && normal.empty && promotion.empty) { section = sap; continue; }
    if (!sap || !description) continue;

    const invalidPrices=[!normal.valid?`Normal Price: ${normal.raw}`:"",!promotion.valid?`Promotion Price: ${promotion.raw}`:""].filter(Boolean);
    if(invalidPrices.length){
      issues.push({severity:"BLOCKING",code:"INVALID_PRICE",row:excelRow,sapArticle:sap,productName:description,value:invalidPrices.join(" • "),reason:"Format harga tidak dapat dipastikan. Periksa nilai asli sebelum aktivasi."});
      continue;
    }
    if(!normalPrice&&!promotionPrice){
      issues.push({severity:"BLOCKING",code:"MISSING_PRICE",row:excelRow,sapArticle:sap,productName:description,value:"Normal Price dan Promotion Price kosong/0",reason:"Produk tidak memiliki harga yang valid."});
      continue;
    }

    const remarks = cols.remarks >= 0 ? clean(row[cols.remarks]) : "";
    const period = parsePromoPeriod(remarks, now);
    if(period.error){
      issues.push({severity:"BLOCKING",code:"INVALID_PERIOD",row:excelRow,sapArticle:sap,productName:description,value:remarks,reason:period.error});
    }else if(remarks&&period.type==="UNKNOWN"){
      issues.push({severity:"WARNING",code:"UNKNOWN_PERIOD",row:excelRow,sapArticle:sap,productName:description,value:remarks,reason:"Periode promo belum dapat dibaca otomatis."});
    }
    const savingAmount = normalPrice > 0 && promotionPrice > 0 && promotionPrice < normalPrice ? normalPrice - promotionPrice : 0;
    const discountPercentage = normalPrice > 0 ? (savingAmount / normalPrice) * 100 : 0;
    const installment=cols.installment>=0?parsePrice(row[cols.installment]):null;
    const cash=cols.cash>=0?parsePrice(row[cols.cash]):null;
    const product: PromoProduct = {
      sapArticle: sap, sapDescription: description,
      category: detectCategory(description, cols.category >= 0 ? clean(row[cols.category]) : "", section), section,
      normalPrice, promotionPrice, savingAmount, discountPercentage, remarks,
      promotionInstallmentBundling: installment&&installment.valid&&installment.value>0?installment.value:null,
      promotionCashBundling: cash&&cash.valid&&cash.value>0?cash.value:null,
      brZout: cols.br >= 0 ? clean(row[cols.br]) : "", eolStatus: cols.eol >= 0 ? clean(row[cols.eol]) : "",
      promoStartDate: period.start, promoEndDate: period.end, promoPeriodType: period.type, promoStatus: period.status, daysRemaining: period.daysRemaining,
    };

    const identity=sap.toUpperCase().replace(/\s+/g,"");
    const sourceData={sapArticle:sap,sapDescription:description,normalPrice,promotionPrice,remarks,section};
    const previous = seen.get(identity);
    if (previous) {
      const fields=(Object.keys(product) as (keyof PromoProduct)[]).filter(field=>JSON.stringify(previous.product[field])!==JSON.stringify(product[field])).map(String);
      if(!fields.length){
        issues.push({severity:"INFO",code:"DUPLICATE_IDENTICAL",row:excelRow,firstRow:previous.row,sapArticle:sap,productName:description,value:`Baris ${previous.row} dan ${excelRow}`,reason:"SAP duplikat identik digabung menjadi satu SKU."});
      }else if(!conflicted.has(identity)){
        conflicted.add(identity);
        const productIndex=products.findIndex(item=>item.sapArticle.toUpperCase().replace(/\s+/g,"")===identity);
        if(productIndex>=0)products.splice(productIndex,1);
        issues.push({severity:"BLOCKING",code:"DUPLICATE_CONFLICT",row:excelRow,firstRow:previous.row,sapArticle:sap,productName:description,value:`Baris ${previous.row} berbeda dengan baris ${excelRow}`,reason:"SAP Article yang sama memiliki data berbeda. Aktivasi diblokir sampai konflik diperiksa.",differingFields:fields,firstData:previous.data,conflictingData:sourceData});
      }
      continue;
    }
    seen.set(identity,{product,row:excelRow,data:sourceData});
    products.push(product);
  }

  const warnings=issues.filter(issue=>issue.severity!=="INFO").map(issue=>`Baris ${issue.row}${issue.sapArticle?` • ${issue.sapArticle}`:""}: ${issue.reason}`);
  return { fileName, sheetName, priceListDate: detectPriceListDate(rows), totalRows: rows.length, totalSku: products.length, products, warnings,issues,blockingErrors:issues.filter(issue=>issue.severity==="BLOCKING").length };
}
