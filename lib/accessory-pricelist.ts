import * as XLSX from "xlsx";

export const MAX_PRICELIST_BYTES = 4 * 1024 * 1024;
const MAX_ROWS = 20000;
const HEADERS = ["BRAND", "SAP ARTICLE", "SAP DESCRIPTION", "CATEGORY"];
export type PriceItem = { sheet: string; row: number; brand: string; article: string; description: string; category: string };
export type ReviewItem = PriceItem & { reason: string };
export type MasterRow = [string, string, string, string, string, string, string];
export type ImportPlan = {
  total: number; existing: number; duplicates: number; ignored: number;
  rows: MasterRow[]; review: ReviewItem[];
};

export function cleanText(value: unknown): string {
  return String(value ?? "").replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200d\u2060\ufeff]/g, "").replace(/\s+/g, " ").trim();
}
export const articleKey = (value: unknown) => cleanText(value).replace(/\s/g, "").toUpperCase();
const key = (value: unknown) => cleanText(value).toUpperCase();

export function parsePricelist(buffer: ArrayBuffer) {
  let workbook: XLSX.WorkBook;
  try { workbook = XLSX.read(buffer, { type: "array", cellFormula: false, sheetRows: MAX_ROWS + 32 }); }
  catch { throw new Error("File Excel tidak dapat dibaca. Gunakan pricelist .xlsx atau .xls yang valid."); }
  const items: PriceItem[] = [];
  let matched = false, ignored = 0;
  if (workbook.SheetNames.length > 30) throw new Error("File memiliki terlalu banyak sheet (maksimal 30).");
  for (const sheet of workbook.SheetNames) {
    const ws = workbook.Sheets[sheet];
    if (!ws["!ref"]) continue;
    const size = XLSX.utils.decode_range(ws["!fullref"] || ws["!ref"]);
    if (size.e.r > MAX_ROWS + 30 || size.e.c > 100) throw new Error("Ukuran sheet melebihi batas 20.000 baris / 101 kolom.");
    const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", blankrows: true, range: 0 });
    const headerAt = grid.slice(0, 30).findIndex(row => HEADERS.every(h => row.map(key).includes(h)));
    if (headerAt < 0) continue;
    matched = true;
    const header = grid[headerAt].map(key), columns = HEADERS.map(h => header.indexOf(h));
    for (let i = headerAt + 1; i < grid.length; i++) {
      const row = grid[i], cells = columns.map(c => cleanText(row[c]));
      if (cells.every(v => !v) || cells.every((v, c) => key(v) === HEADERS[c])) { ignored++; continue; }
      items.push({ sheet, row: i + 1, brand: cells[0], article: cells[1], description: cells[2], category: cells[3] });
      if (items.length > MAX_ROWS) throw new Error("Pricelist maksimal 20.000 produk.");
    }
  }
  if (!matched) throw new Error("Header Brand, SAP Article, SAP Description, dan Category tidak ditemukan.");
  if (!items.length) throw new Error("Pricelist tidak berisi produk.");
  return { items, ignored };
}

export function planPricelist(items: PriceItem[], master: unknown[][], suppliers: unknown[][], ignored = 0): ImportPlan {
  const expected = ["BRAND", "SAP ARTICLE", "SAP DESCRIPTION", "PRODUCT CATEGORY", "TYPE", "PRODUCT GROUP", "CORE"];
  if (!expected.every((v, i) => key(master[0]?.[i]) === v)) throw new Error("Format Master A–G berubah. Impor dihentikan agar kolom tidak tertukar.");
  if (!["VENDOR CODE", "PT NAME", "BRAND CODE", "BRAND NAME"].every((v, i) => key(suppliers[0]?.[i]) === v))
    throw new Error("Referensi supplier I–L tidak sesuai format.");
  const all = master.slice(1).map(r => Array.from({ length: 7 }, (_, i) => cleanText(r[i])) as MasterRow);
  const existing = new Set(all.map(r => articleKey(r[1])).filter(Boolean));
  const accessories = all.filter(r => key(r[5]) === "ACCESSORIES");
  const vendorRows = suppliers.slice(1).filter(r => cleanText(r[2]) && cleanText(r[3]));
  const supplierBrand = (article: string) => {
    const matches = vendorRows.filter(r => article.startsWith(articleKey(r[2])));
    const longest = Math.max(0, ...matches.map(r => articleKey(r[2]).length));
    const brands = [...new Set(matches.filter(r => articleKey(r[2]).length === longest).map(r => cleanText(r[3])))];
    return { matched: matches.length > 0, brand: brands.length === 1 ? brands[0] : "" };
  };
  const templates = new Map<string, Map<string, MasterRow>>();
  for (const row of accessories) {
    const canonical = supplierBrand(articleKey(row[1])).brand || row[0];
    const lookup = JSON.stringify([key(canonical), key(row[3])]);
    const rules = templates.get(lookup) || new Map<string, MasterRow>();
    rules.set(JSON.stringify([key(row[3]), key(row[4]), key(row[6])]), row);
    templates.set(lookup, rules);
  }
  const seen = new Map<string, PriceItem[]>();
  const result: ImportPlan = { total: items.length, existing: 0, duplicates: 0, ignored, rows: [], review: [] };
  for (const item of items) {
    const id = articleKey(item.article);
    if (!id || !item.description || !item.category || !item.brand) { result.review.push({ ...item, reason: "Brand, SAP Article, deskripsi, atau kategori kosong." }); continue; }
    if (existing.has(id)) { result.existing++; continue; }
    const group = seen.get(id) || []; group.push(item); seen.set(id, group);
  }
  for (const [id, group] of seen) {
    const item = group[0];
    const reject = (reason: string) => result.review.push({ ...item, reason });
    result.duplicates += group.length - 1;
    if (new Set(group.map(r => JSON.stringify([key(r.brand), key(r.description), key(r.category)]))).size > 1) {
      reject("SAP Article berulang dengan informasi berbeda di Excel."); continue;
    }
    // Price lists can also contain VAS; never force these into ACCESSORIES.
    if (/APPLE\s*CARE|PROTEKSI|INSURANCE|QOALA|VOUCHER/i.test([item.brand, item.category, item.description].join(" "))) {
      reject("Produk VAS/proteksi/voucher tidak ditambahkan melalui impor aksesoris."); continue;
    }
    const mapped = supplierBrand(id);
    let brand = mapped.brand;
    if (!mapped.matched) {
      const byName = [...new Set(vendorRows.filter(r => key(r[3]) === key(item.brand)).map(r => cleanText(r[3])))];
      if (byName.length === 1) brand = byName[0];
      // APP/APPLE is first party and has no supplier entry in I–L.
      if (!brand && id.startsWith("APP") && key(item.brand) === "APPLE" && accessories.some(r => key(r[0]) === "APPLE")) brand = "APPLE";
    }
    if (!brand) { reject("Brand belum terpetakan secara unik pada supplier I–L."); continue; }
    // AirPods require a model-specific Type; do not copy generic Earphone rules.
    if (key(brand) === "APPLE" && /AIR\s*PODS/i.test(item.description) && !/CASE|BAND|STRAP/i.test(item.category)) { reject("Type AirPods perlu dicocokkan dengan model sebelum ditambahkan."); continue; }
    const rules = templates.get(JSON.stringify([key(brand), key(item.category)])) || new Map<string, MasterRow>();
    if (rules.size !== 1) {
      reject(rules.size ? "Aturan Type/Core untuk brand dan kategori ini berbeda-beda di Master." : "Belum ada contoh kategori untuk brand ini di Master."); continue;
    }
    const template = [...rules.values()][0];
    if (!template[6]) { reject("Core pada contoh Master belum terisi."); continue; }
    result.rows.push([brand, id, cleanText(item.description), key(template[3]), template[4], "ACCESSORIES", template[6]]);
  }
  return result;
}
