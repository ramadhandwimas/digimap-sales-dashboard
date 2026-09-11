import {
  batchClearRanges,
  batchWriteRanges,
  ensureSheets,
  getSheetRanges,
} from "@/lib/google-sheets";
import type { FastSalesRow } from "@/lib/m238-fast-sales";

const SOURCE_ID = "160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const MASTER_ID = "1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const STORE = "M238";
const CACHE_SHEET = "DAILY SUMMARY CACHE";
const CACHE_INDEX_SHEET = "DAILY SUMMARY CACHE INDEX";
const SOURCE_INDEX_SHEET = "DAILY SUMMARY SOURCE INDEX";
const CACHE_LIMIT = 1500;
const INDEX_LIMIT = 300;
const SERVER_CACHE_TTL = 5 * 60 * 1000;

export type DailySummaryCacheRow = {
  store: string;
  year: number;
  month: number;
  period: string;
  date: string;
  amount: number;
  invoices: number;
  qty: number;
  upt: number;
  atv: number;
  traffic: number;
  transactions: number;
  cvr: number;
  device: number;
  accessories: number;
  vas: number;
  target: number;
  mac: number;
  ipad: number;
  iphone: number;
  watch: number;
  airpods: number;
  qoala: number;
  telkomsel: number;
  indosat: number;
  xl: number;
  updatedAt: string;
  source: "SPW" | "CUT_OFF" | "CACHE_REFRESH";
};

type Credentials = { email: string; key: string };
type CacheIndex = {
  store: string;
  period: string;
  startRow: number;
  endRow: number;
  updatedAt: string;
};
type SourceIndex = CacheIndex & { sheet: string };
type BuildTiming = {
  googleSheetsRead: number;
  normalization: number;
  dailyAggregation: number;
  trafficJoin: number;
  cacheWrite: number;
  rawRowsFetched: number;
};

export type DailySummaryRow = Pick<
  DailySummaryCacheRow,
  | "date"
  | "amount"
  | "target"
  | "device"
  | "accessories"
  | "vas"
  | "invoices"
  | "qty"
  | "upt"
  | "cvr"
  | "atv"
  | "traffic"
  | "mac"
  | "ipad"
  | "iphone"
  | "watch"
  | "airpods"
  | "qoala"
  | "telkomsel"
  | "indosat"
  | "xl"
> & { achievement: number };

export type DailySummaryTotals = {
  amount: number;
  target: number;
  device: number;
  accessories: number;
  vas: number;
  invoices: number;
  qty: number;
  upt: number;
  atv: number;
  traffic: number;
  cvr: number;
  avgPerDay: number;
  mac: number;
  ipad: number;
  iphone: number;
  watch: number;
  airpods: number;
  qoala: number;
  telkomsel: number;
  indosat: number;
  xl: number;
  bestDay: { date: string; amount: number } | null;
  lowestDay: { date: string; amount: number } | null;
  previousTotal: number;
  comparisonPercent: number | null;
};

export const dailySummaryHeaders = [
  "Store",
  "Year",
  "Month",
  "Period",
  "Date",
  "Total Sales",
  "Invoice Count",
  "Qty",
  "UPT",
  "ATV",
  "Traffic",
  "Transaction",
  "CVR",
  "Device",
  "ACC",
  "VAS",
  "Target",
  "MacBook",
  "iPad",
  "iPhone",
  "Apple Watch",
  "AirPods",
  "Qoala",
  "Telkomsel",
  "Indosat",
  "XL",
  "Updated At",
  "Source",
];
const cacheIndexHeaders = [
  "Store",
  "Period",
  "Start Row",
  "End Row",
  "Updated At",
];
const sourceIndexHeaders = [
  "Store",
  "Period",
  "Sheet",
  "Start Row",
  "End Row",
  "Updated At",
];

const text = (value: unknown) => String(value ?? "").trim();
const upper = (value: unknown) => text(value).toUpperCase();
const number = (value: unknown) =>
  typeof value === "number"
    ? value
    : Number(text(value).replace(/[^0-9.-]/g, "")) || 0;
const isoDate = (value: unknown) => {
  if (typeof value === "number")
    return new Date(Date.UTC(1899, 11, 30) + value * 86400000)
      .toISOString()
      .slice(0, 10);
  const raw = text(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  return match
    ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`
    : "";
};
const validPeriod = (value: string) => /^20\d{2}-\d{2}$/.test(value);
const periodOf = (date: string) => date.slice(0, 7);
const cacheKey = (store: string, period: string) => `${store}:${period}`;
const rowKey = (row: Pick<DailySummaryCacheRow, "store" | "date">) =>
  `${row.store}:${row.date}`;
const sheetRange = (sheet: string, start: number, end: number) =>
  `'${sheet}'!A${start}:AB${end}`;

let sheetsReady: Promise<void> | undefined;
const serverCache = new Map<
  string,
  { at: number; rows: DailySummaryCacheRow[] }
>();

function ensureCacheSheets(credentials: Credentials) {
  if (!sheetsReady) {
    sheetsReady = ensureSheets(
      MASTER_ID,
      [
        { title: CACHE_SHEET, headers: dailySummaryHeaders },
        { title: CACHE_INDEX_SHEET, headers: cacheIndexHeaders },
        { title: SOURCE_INDEX_SHEET, headers: sourceIndexHeaders },
      ],
      credentials.email,
      credentials.key,
    ).catch((error) => {
      sheetsReady = undefined;
      throw error;
    });
  }
  return sheetsReady;
}

function cacheRowFromValues(values: unknown[]): DailySummaryCacheRow {
  const date = isoDate(values[4]);
  return {
    store: upper(values[0]) || STORE,
    year: number(values[1]) || Number(date.slice(0, 4)),
    month: number(values[2]) || Number(date.slice(5, 7)),
    period: text(values[3]) || periodOf(date),
    date,
    amount: number(values[5]),
    invoices: number(values[6]),
    qty: number(values[7]),
    upt: number(values[8]),
    atv: number(values[9]),
    traffic: number(values[10]),
    transactions: number(values[11]),
    cvr: number(values[12]),
    device: number(values[13]),
    accessories: number(values[14]),
    vas: number(values[15]),
    target: number(values[16]),
    mac: number(values[17]),
    ipad: number(values[18]),
    iphone: number(values[19]),
    watch: number(values[20]),
    airpods: number(values[21]),
    qoala: number(values[22]),
    telkomsel: number(values[23]),
    indosat: number(values[24]),
    xl: number(values[25]),
    updatedAt: text(values[26]),
    source: (text(values[27]) ||
      "CACHE_REFRESH") as DailySummaryCacheRow["source"],
  };
}

function cacheRowValues(row: DailySummaryCacheRow) {
  return [
    row.store,
    row.year,
    row.month,
    row.period,
    row.date,
    row.amount,
    row.invoices,
    row.qty,
    row.upt,
    row.atv,
    row.traffic,
    row.transactions,
    row.cvr,
    row.device,
    row.accessories,
    row.vas,
    row.target,
    row.mac,
    row.ipad,
    row.iphone,
    row.watch,
    row.airpods,
    row.qoala,
    row.telkomsel,
    row.indosat,
    row.xl,
    row.updatedAt,
    row.source,
  ];
}

function cacheIndexFromValues(values: unknown[]): CacheIndex {
  return {
    store: upper(values[0]) || STORE,
    period: text(values[1]),
    startRow: number(values[2]),
    endRow: number(values[3]),
    updatedAt: text(values[4]),
  };
}

function sourceIndexFromValues(values: unknown[]): SourceIndex {
  return {
    store: upper(values[0]) || STORE,
    period: text(values[1]),
    sheet: text(values[2]),
    startRow: number(values[3]),
    endRow: number(values[4]),
    updatedAt: text(values[5]),
  };
}

function buildCacheIndex(rows: DailySummaryCacheRow[]) {
  const groups = new Map<string, CacheIndex>();
  rows.forEach((row, index) => {
    const key = cacheKey(row.store, row.period);
    const sheetRow = index + 2;
    const current = groups.get(key);
    if (!current)
      groups.set(key, {
        store: row.store,
        period: row.period,
        startRow: sheetRow,
        endRow: sheetRow,
        updatedAt: row.updatedAt,
      });
    else {
      current.endRow = sheetRow;
      if (row.updatedAt > current.updatedAt) current.updatedAt = row.updatedAt;
    }
  });
  return [...groups.values()];
}

function rememberRows(rows: DailySummaryCacheRow[]) {
  const periods = new Map<string, DailySummaryCacheRow[]>();
  for (const row of rows) {
    const key = cacheKey(row.store, row.period);
    const list = periods.get(key) ?? [];
    list.push(row);
    periods.set(key, list);
  }
  const at = Date.now();
  for (const [key, list] of periods)
    serverCache.set(key, {
      at,
      rows: list.sort((a, b) => a.date.localeCompare(b.date)),
    });
}

export async function readCachedSummaryPeriods(
  periods: string[],
  credentials: Credentials,
  store = STORE,
) {
  const wanted = [...new Set(periods.filter(validPeriod))];
  const result = new Map<string, DailySummaryCacheRow[]>();
  const missing: string[] = [];
  const now = Date.now();
  for (const period of wanted) {
    const cached = serverCache.get(cacheKey(store, period));
    if (cached && now - cached.at < SERVER_CACHE_TTL)
      result.set(period, cached.rows);
    else missing.push(period);
  }
  if (!missing.length) return { rowsByPeriod: result, missing: [] as string[] };

  let indexValues: unknown[][] = [];
  try {
    [indexValues] = await getSheetRanges(
      MASTER_ID,
      [`'${CACHE_INDEX_SHEET}'!A2:E${INDEX_LIMIT}`],
      credentials.email,
      credentials.key,
    );
  } catch {
    await ensureCacheSheets(credentials);
    [indexValues] = await getSheetRanges(
      MASTER_ID,
      [`'${CACHE_INDEX_SHEET}'!A2:E${INDEX_LIMIT}`],
      credentials.email,
      credentials.key,
    );
  }
  const indexes = (indexValues ?? [])
    .map(cacheIndexFromValues)
    .filter(
      (entry) =>
        entry.store === store &&
        missing.includes(entry.period) &&
        entry.startRow >= 2 &&
        entry.endRow >= entry.startRow,
    );
  const ranges = indexes.map((entry) =>
    sheetRange(CACHE_SHEET, entry.startRow, entry.endRow),
  );
  const blocks = ranges.length
    ? await getSheetRanges(
        MASTER_ID,
        ranges,
        credentials.email,
        credentials.key,
      )
    : [];
  const found = new Set<string>();
  indexes.forEach((entry, index) => {
    const rows = (blocks[index] ?? [])
      .map(cacheRowFromValues)
      .filter(
        (row) => row.store === store && row.period === entry.period && row.date,
      );
    if (rows.length) {
      found.add(entry.period);
      result.set(entry.period, rows);
      rememberRows(rows);
    }
  });
  return {
    rowsByPeriod: result,
    missing: missing.filter((period) => !found.has(period)),
  };
}

export async function upsertDailySummaryRows(
  incoming: DailySummaryCacheRow[],
  credentials: Credentials,
) {
  if (!incoming.length) return;
  await ensureCacheSheets(credentials);
  const [storedValues] = await getSheetRanges(
    MASTER_ID,
    [`'${CACHE_SHEET}'!A2:AB${CACHE_LIMIT}`],
    credentials.email,
    credentials.key,
  );
  const map = new Map<string, DailySummaryCacheRow>();
  for (const values of storedValues ?? []) {
    const row = cacheRowFromValues(values);
    if (row.date) map.set(rowKey(row), row);
  }
  for (const row of incoming) {
    const existing = map.get(rowKey(row));
    if (row.source === "SPW" && existing?.source === "CUT_OFF") continue;
    map.set(rowKey(row), row);
  }
  const rows = [...map.values()].sort(
    (a, b) => a.store.localeCompare(b.store) || a.date.localeCompare(b.date),
  );
  const indexes = buildCacheIndex(rows);
  await batchClearRanges(
    MASTER_ID,
    [
      `'${CACHE_SHEET}'!A2:AB${CACHE_LIMIT}`,
      `'${CACHE_INDEX_SHEET}'!A2:E${INDEX_LIMIT}`,
    ],
    credentials.email,
    credentials.key,
  );
  await batchWriteRanges(
    MASTER_ID,
    [
      { range: `'${CACHE_SHEET}'!A2`, values: rows.map(cacheRowValues) },
      {
        range: `'${CACHE_INDEX_SHEET}'!A2`,
        values: indexes.map((entry) => [
          entry.store,
          entry.period,
          entry.startRow,
          entry.endRow,
          entry.updatedAt,
        ]),
      },
    ],
    credentials.email,
    credentials.key,
    "RAW",
  );
  serverCache.clear();
  rememberRows(rows);
}

export async function clearActiveSpwSummaryRows(credentials: Credentials) {
  await ensureCacheSheets(credentials);
  const [storedValues] = await getSheetRanges(
    MASTER_ID,
    [`'${CACHE_SHEET}'!A2:AB${CACHE_LIMIT}`],
    credentials.email,
    credentials.key,
  );
  const rows = (storedValues ?? [])
    .map(cacheRowFromValues)
    .filter(
      (row) => row.date && !(row.store === STORE && row.source === "SPW"),
    );
  const indexes = buildCacheIndex(rows);
  await batchClearRanges(
    MASTER_ID,
    [
      `'${CACHE_SHEET}'!A2:AB${CACHE_LIMIT}`,
      `'${CACHE_INDEX_SHEET}'!A2:E${INDEX_LIMIT}`,
    ],
    credentials.email,
    credentials.key,
  );
  await batchWriteRanges(
    MASTER_ID,
    [
      { range: `'${CACHE_SHEET}'!A2`, values: rows.map(cacheRowValues) },
      {
        range: `'${CACHE_INDEX_SHEET}'!A2`,
        values: indexes.map((entry) => [
          entry.store,
          entry.period,
          entry.startRow,
          entry.endRow,
          entry.updatedAt,
        ]),
      },
    ],
    credentials.email,
    credentials.key,
    "RAW",
  );
  serverCache.clear();
  rememberRows(rows);
}

function rawToFast(values: unknown[], year: number): FastSalesRow {
  const date = isoDate(values[0]);
  const store =
    year === 2025 ? upper(values[12]) || STORE : upper(values[15]) || STORE;
  return {
    date,
    id: text(values[1]),
    name: text(values[2]),
    invoice: text(values[3]),
    article: upper(values[4]),
    description: text(values[5]),
    type: text(values[6]),
    qty: number(values[7]),
    amount: number(values[8]),
    category: upper(values[9]),
    brand: upper(values[10]),
    core: upper(values[11]),
    scheme: year === 2025 ? "" : upper(values[12]),
    vendor: year === 2025 ? "" : upper(values[13]),
    week: year === 2025 ? "" : text(values[14]),
    store,
    key: `${store}|${date}|${text(values[3])}|${upper(values[4])}|${text(values[1])}`,
  };
}

function classification(row: FastSalesRow) {
  const scheme = upper(row.scheme);
  if (scheme === "DEVICES") return "device";
  if (scheme === "ACCESSORIES") return "accessories";
  if (scheme === "VAS") return "vas";
  const joined = upper(`${row.type} ${row.category} ${row.description}`);
  if (/QOALA|PROTEKSI|TELKOMSEL|INDOSAT|\bXL\b/.test(joined)) return "vas";
  if (
    /IPHONE|IPAD|MACBOOK|APPLE WATCH|WATCH SERIES|WATCH SE|WATCH ULTRA/.test(
      joined,
    )
  )
    return "device";
  if (
    /AIRPODS|ACCESSOR|CASE|CABLE|ADAPTER|CHARGER|PENCIL|KEYBOARD/.test(joined)
  )
    return "accessories";
  return "other";
}

function product(row: FastSalesRow) {
  if (row.brand && row.brand !== "APPLE") return "";
  const joined = upper(`${row.type} ${row.category} ${row.description}`);
  if (joined.includes("AIRPODS")) return "airpods";
  if (joined.includes("IPHONE")) return "iphone";
  if (joined.includes("MACBOOK") || /^MAC(?:BOOK)?$/.test(row.category))
    return "mac";
  if (joined.includes("IPAD")) return "ipad";
  if (/APPLE WATCH|WATCH SERIES|WATCH SE|WATCH ULTRA/.test(joined))
    return "watch";
  return "";
}

function vasType(row: FastSalesRow) {
  const joined = upper(
    `${row.article} ${row.brand} ${row.vendor} ${row.description}`,
  );
  if (joined.includes("QOALA") || /(^|\s)KLA/.test(joined)) return "qoala";
  if (joined.includes("TELKOMSEL") || /(^|\s)TSL(\s|$)/.test(joined))
    return "telkomsel";
  if (joined.includes("INDOSAT") || /(^|\s)IDT(\s|$)/.test(joined))
    return "indosat";
  if (/(^|\s)XL(\s|$)|XXL/.test(joined)) return "xl";
  return "";
}

function weekday(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    timeZone: "Asia/Jakarta",
  })
    .format(new Date(`${date}T00:00:00Z`))
    .toLowerCase();
}

function aggregateRows(
  sales: FastSalesRow[],
  targets: Map<string, number>,
  traffic: Map<string, number>,
  source: DailySummaryCacheRow["source"],
) {
  const groups = new Map<string, FastSalesRow[]>();
  for (const row of sales) {
    if (!row.date || row.store !== STORE || row.qty <= 0) continue;
    if (
      /VOUCHER/.test(upper(`${row.scheme} ${row.description} ${row.article}`))
    )
      continue;
    const list = groups.get(row.date) ?? [];
    list.push(row);
    groups.set(row.date, list);
  }
  const updatedAt = new Date().toISOString();
  const result: DailySummaryCacheRow[] = [];
  for (const [date, rows] of groups) {
    const invoices = new Set(rows.map((row) => row.invoice).filter(Boolean));
    let amount = 0,
      qty = 0,
      device = 0,
      accessories = 0,
      vas = 0,
      mac = 0,
      ipad = 0,
      iphone = 0,
      watch = 0,
      airpods = 0,
      qoala = 0,
      telkomsel = 0,
      indosat = 0,
      xl = 0;
    for (const row of rows) {
      amount += row.amount;
      qty += row.qty;
      const kind = classification(row);
      if (kind === "device") device += row.amount;
      else if (kind === "accessories") accessories += row.amount;
      else if (kind === "vas") vas += row.amount;
      const item = product(row);
      if (item === "mac") mac += row.qty;
      else if (item === "ipad") ipad += row.qty;
      else if (item === "iphone") iphone += row.qty;
      else if (item === "watch") watch += row.qty;
      else if (item === "airpods") airpods += row.qty;
      if (kind === "vas") {
        const provider = vasType(row);
        if (provider === "qoala") qoala += row.amount;
        else if (provider === "telkomsel") telkomsel += row.amount;
        else if (provider === "indosat") indosat += row.amount;
        else if (provider === "xl") xl += row.amount;
      }
    }
    const invoiceCount = invoices.size;
    const dayTraffic = traffic.get(date) ?? 0;
    result.push({
      store: STORE,
      year: Number(date.slice(0, 4)),
      month: Number(date.slice(5, 7)),
      period: periodOf(date),
      date,
      amount,
      invoices: invoiceCount,
      qty,
      upt: invoiceCount ? qty / invoiceCount : 0,
      atv: invoiceCount ? amount / invoiceCount : 0,
      traffic: dayTraffic,
      transactions: invoiceCount,
      cvr: dayTraffic ? (invoiceCount / dayTraffic) * 100 : 0,
      device,
      accessories,
      vas,
      target: targets.get(weekday(date)) ?? 0,
      mac,
      ipad,
      iphone,
      watch,
      airpods,
      qoala,
      telkomsel,
      indosat,
      xl,
      updatedAt,
      source,
    });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

async function readJoins(credentials: Credentials) {
  const started = Date.now();
  const [[targetRows], [trafficRows]] = await Promise.all([
    getSheetRanges(
      SOURCE_ID,
      ["Config!W1:X120"],
      credentials.email,
      credentials.key,
    ),
    getSheetRanges(
      MASTER_ID,
      ["'Traffic'!A2:B1000"],
      credentials.email,
      credentials.key,
    ),
  ]);
  const targets = new Map<string, number>();
  for (const row of targetRows ?? []) {
    const day = text(row[0]).toLowerCase();
    if (day) targets.set(day, number(row[1]));
  }
  const traffic = new Map<string, number>();
  for (const row of trafficRows ?? []) {
    const date = isoDate(row[0]);
    if (date) traffic.set(date, number(row[1]));
  }
  return { targets, traffic, duration: Date.now() - started };
}

export async function buildSummaryFromFastSales(
  sales: FastSalesRow[],
  credentials: Credentials,
  source: DailySummaryCacheRow["source"],
) {
  const joins = await readJoins(credentials);
  return aggregateRows(sales, joins.targets, joins.traffic, source);
}

export async function buildSummaryFromRawValues(
  values: unknown[][],
  credentials: Credentials,
  source: DailySummaryCacheRow["source"],
) {
  const sales = values.map((row) => {
    const date = isoDate(row[0]);
    return rawToFast(row, Number(date.slice(0, 4)) || 2026);
  });
  return buildSummaryFromFastSales(sales, credentials, source);
}

async function writeSourceIndexes(
  indexes: SourceIndex[],
  credentials: Credentials,
) {
  await batchClearRanges(
    MASTER_ID,
    [`'${SOURCE_INDEX_SHEET}'!A2:F${INDEX_LIMIT}`],
    credentials.email,
    credentials.key,
  );
  await batchWriteRanges(
    MASTER_ID,
    [
      {
        range: `'${SOURCE_INDEX_SHEET}'!A2`,
        values: indexes.map((entry) => [
          entry.store,
          entry.period,
          entry.sheet,
          entry.startRow,
          entry.endRow,
          entry.updatedAt,
        ]),
      },
    ],
    credentials.email,
    credentials.key,
    "RAW",
  );
}

async function ensureSourceIndexes(
  periods: string[],
  credentials: Credentials,
  refreshYears = false,
) {
  await ensureCacheSheets(credentials);
  const [storedValues] = await getSheetRanges(
    MASTER_ID,
    [`'${SOURCE_INDEX_SHEET}'!A2:F${INDEX_LIMIT}`],
    credentials.email,
    credentials.key,
  );
  const stored = (storedValues ?? [])
    .map(sourceIndexFromValues)
    .filter(
      (entry) =>
        entry.period && entry.startRow >= 2 && entry.endRow >= entry.startRow,
    );
  const map = new Map(
    stored.map((entry) => [cacheKey(entry.store, entry.period), entry]),
  );
  const missingPeriods = periods.filter(
    (period) => refreshYears || !map.has(cacheKey(STORE, period)),
  );
  if (!missingPeriods.length) return map;

  const rebuilt: SourceIndex[] = [];
  const periodsByYear = new Map<number, string[]>();
  for (const period of missingPeriods) {
    const year = Number(period.slice(0, 4));
    const list = periodsByYear.get(year) ?? [];
    list.push(period);
    periodsByYear.set(year, list);
  }
  for (const [year, yearPeriods] of periodsByYear) {
    const sheet = year === 2025 ? "Data Copas Archive 2025" : "Data Copas";
    const end = year === 2025 ? 32755 : 50000;
    const storeColumn = year === 2025 ? "M" : "P";
    const step = 500;
    const sampleRows: number[] = [];
    for (let row = 2; row <= end; row += step) sampleRows.push(row);
    if (sampleRows.at(-1) !== end) sampleRows.push(end);
    const sampleBlocks = await getSheetRanges(
      SOURCE_ID,
      sampleRows.map((row) => `'${sheet}'!A${row}:A${row}`),
      credentials.email,
      credentials.key,
    );
    const samples = sampleRows
      .map((row, index) => ({
        row,
        date: isoDate(sampleBlocks[index]?.[0]?.[0]),
      }))
      .filter((sample) => sample.date);
    const candidateRanges = yearPeriods.map((period) => {
      const from = `${period}-01`;
      const to = `${period}-31`;
      const before = samples.filter((sample) => sample.date < from).at(-1);
      const after = samples.find((sample) => sample.date > to);
      return {
        period,
        start: before?.row ?? 2,
        end: after?.row ?? Math.min(end, (samples.at(-1)?.row ?? 2) + step),
      };
    });
    const candidateBlocks = await getSheetRanges(
      SOURCE_ID,
      candidateRanges.flatMap((candidate) => [
        `'${sheet}'!A${candidate.start}:A${candidate.end}`,
        `'${sheet}'!${storeColumn}${candidate.start}:${storeColumn}${candidate.end}`,
      ]),
      credentials.email,
      credentials.key,
    );
    candidateRanges.forEach((candidate, candidateIndex) => {
      const dates = candidateBlocks[candidateIndex * 2] ?? [];
      const stores = candidateBlocks[candidateIndex * 2 + 1] ?? [];
      let startRow = 0;
      let endRow = 0;
      for (let index = 0; index < dates.length; index++) {
        const date = isoDate(dates[index]?.[0]);
        const store = upper(stores[index]?.[0]) || STORE;
        if (periodOf(date) !== candidate.period || store !== STORE) continue;
        const sheetRow = candidate.start + index;
        if (!startRow) startRow = sheetRow;
        endRow = sheetRow;
      }
      if (startRow)
        rebuilt.push({
          store: STORE,
          period: candidate.period,
          sheet,
          startRow,
          endRow,
          updatedAt: new Date().toISOString(),
        });
    });
    if (!samples.length) {
      console.warn("M238_PERF", {
        op: "summary-source-index",
        sheet,
        year,
        warning: "no dated samples",
      });
    }
  }
  const rebuiltKeys = new Set(
    missingPeriods.map((period) => cacheKey(STORE, period)),
  );
  const merged = [
    ...stored.filter(
      (entry) => !rebuiltKeys.has(cacheKey(entry.store, entry.period)),
    ),
    ...rebuilt,
  ].sort(
    (a, b) =>
      a.store.localeCompare(b.store) || a.period.localeCompare(b.period),
  );
  await writeSourceIndexes(merged, credentials);
  return new Map(
    merged.map((entry) => [cacheKey(entry.store, entry.period), entry]),
  );
}

async function rebuildPeriods(
  periods: string[],
  credentials: Credentials,
  refreshSourceIndex = false,
) {
  const timing: BuildTiming = {
    googleSheetsRead: 0,
    normalization: 0,
    dailyAggregation: 0,
    trafficJoin: 0,
    cacheWrite: 0,
    rawRowsFetched: 0,
  };
  const wanted = [...new Set(periods.filter(validPeriod))];
  let readStarted = Date.now();
  const indexes = await ensureSourceIndexes(
    wanted,
    credentials,
    refreshSourceIndex,
  );
  timing.googleSheetsRead += Date.now() - readStarted;
  const entries = wanted
    .map((period) => indexes.get(cacheKey(STORE, period)))
    .filter((entry): entry is SourceIndex => Boolean(entry));
  const grouped = new Map<string, SourceIndex[]>();
  for (const entry of entries) {
    const list = grouped.get(entry.sheet) ?? [];
    list.push(entry);
    grouped.set(entry.sheet, list);
  }
  const sales: FastSalesRow[] = [];
  for (const [sheet, sheetEntries] of grouped) {
    readStarted = Date.now();
    const blocks = await getSheetRanges(
      SOURCE_ID,
      sheetEntries.map(
        (entry) => `'${sheet}'!A${entry.startRow}:S${entry.endRow}`,
      ),
      credentials.email,
      credentials.key,
    );
    timing.googleSheetsRead += Date.now() - readStarted;
    timing.rawRowsFetched += blocks.reduce(
      (sum, block) => sum + block.length,
      0,
    );
    const normalizeStarted = Date.now();
    sheetEntries.forEach((entry, index) => {
      const year = Number(entry.period.slice(0, 4));
      for (const values of blocks[index] ?? []) {
        const row = rawToFast(values, year);
        if (row.store === STORE && periodOf(row.date) === entry.period)
          sales.push(row);
      }
    });
    timing.normalization += Date.now() - normalizeStarted;
  }
  const joinStarted = Date.now();
  const joins = await readJoins(credentials);
  timing.trafficJoin = Date.now() - joinStarted;
  const aggregateStarted = Date.now();
  const rows = aggregateRows(
    sales,
    joins.targets,
    joins.traffic,
    "CACHE_REFRESH",
  );
  timing.dailyAggregation = Date.now() - aggregateStarted;
  const writeStarted = Date.now();
  await upsertDailySummaryRows(rows, credentials);
  timing.cacheWrite = Date.now() - writeStarted;
  return { rows, timing };
}

function periodsBetween(from: string, to: string) {
  const periods: string[] = [];
  let [year, month] = from.slice(0, 7).split("-").map(Number);
  const [endYear, endMonth] = to.slice(0, 7).split("-").map(Number);
  while (year < endYear || (year === endYear && month <= endMonth)) {
    periods.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return periods;
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function diffDays(from: string, to: string) {
  return Math.max(
    1,
    Math.round(
      (new Date(`${to}T00:00:00Z`).getTime() -
        new Date(`${from}T00:00:00Z`).getTime()) /
        86400000,
    ) + 1,
  );
}

function toDailyRows(rows: DailySummaryCacheRow[]): DailySummaryRow[] {
  return rows.map((row) => ({
    date: row.date,
    amount: row.amount,
    target: row.target,
    achievement: row.target ? (row.amount / row.target) * 100 : 0,
    device: row.device,
    accessories: row.accessories,
    vas: row.vas,
    invoices: row.invoices,
    qty: row.qty,
    upt: row.upt,
    cvr: row.cvr,
    atv: row.atv,
    traffic: row.traffic,
    mac: row.mac,
    ipad: row.ipad,
    iphone: row.iphone,
    watch: row.watch,
    airpods: row.airpods,
    qoala: row.qoala,
    telkomsel: row.telkomsel,
    indosat: row.indosat,
    xl: row.xl,
  }));
}

function summarizeDailyRows(
  rows: DailySummaryRow[],
  previousTotal: number,
): DailySummaryTotals {
  const totals = {
    amount: 0,
    target: 0,
    device: 0,
    accessories: 0,
    vas: 0,
    invoices: 0,
    qty: 0,
    traffic: 0,
    mac: 0,
    ipad: 0,
    iphone: 0,
    watch: 0,
    airpods: 0,
    qoala: 0,
    telkomsel: 0,
    indosat: 0,
    xl: 0,
  };
  let bestDay: DailySummaryTotals["bestDay"] = null;
  let lowestDay: DailySummaryTotals["lowestDay"] = null;
  for (const row of rows) {
    totals.amount += row.amount;
    totals.target += row.target;
    totals.device += row.device;
    totals.accessories += row.accessories;
    totals.vas += row.vas;
    totals.invoices += row.invoices;
    totals.qty += row.qty;
    totals.traffic += row.traffic;
    totals.mac += row.mac;
    totals.ipad += row.ipad;
    totals.iphone += row.iphone;
    totals.watch += row.watch;
    totals.airpods += row.airpods;
    totals.qoala += row.qoala;
    totals.telkomsel += row.telkomsel;
    totals.indosat += row.indosat;
    totals.xl += row.xl;
    if (!bestDay || row.amount > bestDay.amount)
      bestDay = { date: row.date, amount: row.amount };
    if (!lowestDay || row.amount < lowestDay.amount)
      lowestDay = { date: row.date, amount: row.amount };
  }
  const upt = totals.invoices ? totals.qty / totals.invoices : 0;
  const atv = totals.invoices ? totals.amount / totals.invoices : 0;
  const cvr = totals.traffic ? (totals.invoices / totals.traffic) * 100 : 0;
  return {
    ...totals,
    upt,
    atv,
    cvr,
    avgPerDay: rows.length ? totals.amount / rows.length : 0,
    bestDay,
    lowestDay,
    previousTotal,
    comparisonPercent: previousTotal
      ? ((totals.amount - previousTotal) / previousTotal) * 100
      : null,
  };
}

export async function getDailySummaryRange(
  from: string,
  to: string,
  credentials: Credentials,
  refresh = false,
) {
  const totalStarted = Date.now();
  const days = diffDays(from, to);
  const previousEnd = addDays(from, -1);
  const previousStart = addDays(previousEnd, -days + 1);
  const currentPeriods = periodsBetween(from, to);
  const previousPeriods = periodsBetween(previousStart, previousEnd);
  const wanted = [...new Set([...currentPeriods, ...previousPeriods])];
  let buildTiming: BuildTiming = {
    googleSheetsRead: 0,
    normalization: 0,
    dailyAggregation: 0,
    trafficJoin: 0,
    cacheWrite: 0,
    rawRowsFetched: 0,
  };

  const cacheReadStarted = Date.now();
  let cached = await readCachedSummaryPeriods(wanted, credentials);
  let cacheRead = Date.now() - cacheReadStarted;
  const rebuild = refresh ? wanted : cached.missing;
  if (rebuild.length) {
    const built = await rebuildPeriods(rebuild, credentials, refresh);
    buildTiming = built.timing;
    const rereadStarted = Date.now();
    cached = await readCachedSummaryPeriods(wanted, credentials);
    cacheRead += Date.now() - rereadStarted;
  }
  const allRows = wanted.flatMap(
    (period) => cached.rowsByPeriod.get(period) ?? [],
  );
  const rows = allRows
    .filter((row) => row.date >= from && row.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date));
  const previousTotal = allRows
    .filter((row) => row.date >= previousStart && row.date <= previousEnd)
    .reduce((total, row) => total + row.amount, 0);
  const summaryStarted = Date.now();
  const dailyRows = toDailyRows(rows);
  const summary = summarizeDailyRows(dailyRows, previousTotal);
  const summaryCalculation = Date.now() - summaryStarted;
  return {
    dailyRows,
    summary,
    previousStart,
    previousEnd,
    cacheStatus: rebuild.length ? "rebuilt" : "hit",
    missingPeriods: cached.missing,
    timing: {
      ...buildTiming,
      cacheRead,
      summaryCalculation,
      backendTotal: Date.now() - totalStarted,
    },
  };
}
