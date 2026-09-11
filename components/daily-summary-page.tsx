"use client";

import {
  memo,
  Profiler,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ProfilerOnRenderCallback,
} from "react";
import { RefreshCw, Store } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const money = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat("id-ID");
const percentFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
});
const pct = (value: number) =>
  `${percentFormatter.format(Number.isFinite(value) ? value : 0)}%`;
const today = () =>
  new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
const months = Array.from(
  { length: 24 },
  (_, index) =>
    `${2025 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`,
);
const monthName = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${value}-01T00:00:00Z`));
const dayName = (date: string) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${date}T00:00:00Z`));
const displayDate = (date: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${date}T00:00:00Z`));
const isWeekend = (date: string) => {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
};

type Row = {
  date: string;
  amount: number;
  target: number;
  achievement: number;
  device: number;
  accessories: number;
  vas: number;
  invoices: number;
  qty: number;
  upt: number;
  atv: number;
  cvr: number;
  traffic: number;
  mac: number;
  ipad: number;
  iphone: number;
  watch: number;
  airpods: number;
  qoala: number;
  telkomsel: number;
  indosat: number;
  xl: number;
};
type Summary = {
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
type SummaryResponse = {
  dailyRows: Row[];
  summary: Summary;
  generatedAt?: string;
  performance?: Record<string, number>;
};
type StoredSummary = SummaryResponse & { cachedAt: number };
type Filters = { period: string; start: string; end: string };

const emptySummary: Summary = {
  amount: 0,
  target: 0,
  device: 0,
  accessories: 0,
  vas: 0,
  invoices: 0,
  qty: 0,
  upt: 0,
  atv: 0,
  traffic: 0,
  cvr: 0,
  avgPerDay: 0,
  mac: 0,
  ipad: 0,
  iphone: 0,
  watch: 0,
  airpods: 0,
  qoala: 0,
  telkomsel: 0,
  indosat: 0,
  xl: 0,
  bestDay: null,
  lowestDay: null,
  previousTotal: 0,
  comparisonPercent: null,
};
const emptyData: SummaryResponse = { dailyRows: [], summary: emptySummary };
const CLIENT_CACHE_TTL = 5 * 60 * 1000;
const summaryCacheKey = (from: string, to: string) => {
  const period = from.slice(0, 7),
    [year, month] = period.split("-").map(Number);
  const monthEnd = `${period}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`,
    current = today();
  const fullMonth =
    from === `${period}-01` &&
    (to === monthEnd || (period === current.slice(0, 7) && to === current));
  return fullMonth
    ? `daily-summary:v2:M238:${period}`
    : `daily-summary:v2:M238:${from}:${to}`;
};

const Trend = memo(function Trend({ rows }: { rows: Row[] }) {
  if (!rows.length) return null;
  const width = 760,
    height = 150,
    padding = 18;
  let max = 1;
  for (const row of rows) max = Math.max(max, row.amount);
  const coordinate = (row: Row, index: number) => ({
    x:
      rows.length === 1
        ? width / 2
        : padding + (index * (width - padding * 2)) / (rows.length - 1),
    y: height - padding - (row.amount / max) * (height - padding * 2),
  });
  const points = rows
    .map((row, index) => {
      const point = coordinate(row, index);
      return `${point.x},${point.y}`;
    })
    .join(" ");
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-950">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-slate-900 dark:text-slate-100">
            Sales Trend
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Total Sales sesuai range tanggal.
          </p>
        </div>
        <span className="text-xs text-slate-400">
          {displayDate(rows[0].date)} – {displayDate(rows.at(-1)!.date)}
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-36 min-w-[560px] w-full text-slate-400 dark:text-slate-600"
        >
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="currentColor"
            opacity=".35"
          />
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="text-blue-600 dark:text-blue-400"
          />
          {rows.map((row, index) => {
            const point = coordinate(row, index);
            return (
              <circle
                key={row.date}
                cx={point.x}
                cy={point.y}
                r="3.5"
                fill="currentColor"
                className="text-blue-600 dark:text-blue-400"
              />
            );
          })}
        </svg>
      </div>
    </section>
  );
});

const DailyTable = memo(function DailyTable({
  rows,
  summary,
  emptyLabel,
}: {
  rows: Row[];
  summary: Summary;
  emptyLabel: string;
}) {
  const bestDate = summary.bestDay?.date;
  return (
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b px-5 py-4">
        <h3 className="font-extrabold">Daily Sales Store​</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Data harian mengikuti range tanggal di atas.
        </p>
      </div>
      <div className="overflow-x-auto">
        <Table className="min-w-[2240px] whitespace-nowrap">
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-900">
              <TableHead className="sticky left-0 z-10 min-w-[120px] bg-slate-50 dark:bg-slate-900">
                Tanggal
              </TableHead>
              <TableHead className="sticky left-[120px] z-10 min-w-[110px] border-r bg-slate-50 dark:bg-slate-900">
                Hari
              </TableHead>
              {[
                "Total Sales",
                "Target",
                "Ach %",
                "Device",
                "Accessories",
                "VAS",
                "Invoice",
                "Qty",
                "UPT",
                "CVR",
                "ATV",
                "MacBook",
                "iPad",
                "iPhone",
                "Apple Watch",
                "AirPods",
                "Qoala",
                "Telkomsel",
                "Indosat",
                "XL",
              ].map((heading) => (
                <TableHead key={heading} className="text-right">
                  {heading}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.date}>
                <TableCell className="sticky left-0 z-[5] bg-white font-bold dark:bg-slate-950">
                  {displayDate(row.date)}
                  {bestDate === row.date ? (
                    <span className="ml-2 text-[10px] font-bold text-amber-600">
                      ★ Best
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="sticky left-[120px] z-[5] border-r bg-white font-semibold dark:bg-slate-950">
                  <div>{dayName(row.date)}</div>
                  <div className="text-[10px] font-bold text-slate-400">
                    {isWeekend(row.date) ? "Weekend" : "Weekday"}
                  </div>
                </TableCell>
                <TableCell className="text-right font-black">
                  {money.format(row.amount)}
                </TableCell>
                <TableCell className="text-right">
                  {money.format(row.target)}
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${row.achievement >= 100 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : row.achievement >= 80 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"}`}
                  >
                    {pct(row.achievement)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {money.format(row.device)}
                </TableCell>
                <TableCell className="text-right">
                  {money.format(row.accessories)}
                </TableCell>
                <TableCell className="text-right">
                  {money.format(row.vas)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {num.format(row.invoices)}
                </TableCell>
                <TableCell className="text-right">
                  {num.format(row.qty)}
                </TableCell>
                <TableCell className="text-right">
                  {row.upt.toFixed(1)}
                </TableCell>
                <TableCell className="text-right">{pct(row.cvr)}</TableCell>
                <TableCell className="text-right">
                  {money.format(row.atv)}
                </TableCell>
                <TableCell className="text-right">{row.mac}</TableCell>
                <TableCell className="text-right">{row.ipad}</TableCell>
                <TableCell className="text-right">{row.iphone}</TableCell>
                <TableCell className="text-right">{row.watch}</TableCell>
                <TableCell className="text-right">{row.airpods}</TableCell>
                <TableCell className="text-right">
                  {money.format(row.qoala)}
                </TableCell>
                <TableCell className="text-right">
                  {money.format(row.telkomsel)}
                </TableCell>
                <TableCell className="text-right">
                  {money.format(row.indosat)}
                </TableCell>
                <TableCell className="text-right">
                  {money.format(row.xl)}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length ? (
              <TableRow>
                <TableCell
                  colSpan={22}
                  className="h-28 text-center text-slate-400"
                >
                  {emptyLabel}
                </TableCell>
              </TableRow>
            ) : null}
            {rows.length ? (
              <TableRow className="font-black">
                <TableCell className="sticky left-0 z-[5] bg-white dark:bg-slate-950">
                  TOTAL
                </TableCell>
                <TableCell className="sticky left-[120px] z-[5] border-r bg-white dark:bg-slate-950" />
                <TableCell className="text-right">
                  {money.format(summary.amount)}
                </TableCell>
                <TableCell className="text-right">
                  {money.format(summary.target)}
                </TableCell>
                <TableCell className="text-right">
                  {pct(
                    summary.target
                      ? (summary.amount / summary.target) * 100
                      : 0,
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {money.format(summary.device)}
                </TableCell>
                <TableCell className="text-right">
                  {money.format(summary.accessories)}
                </TableCell>
                <TableCell className="text-right">
                  {money.format(summary.vas)}
                </TableCell>
                <TableCell className="text-right">
                  {num.format(summary.invoices)}
                </TableCell>
                <TableCell className="text-right">
                  {num.format(summary.qty)}
                </TableCell>
                <TableCell className="text-right">
                  {summary.upt.toFixed(1)}
                </TableCell>
                <TableCell className="text-right">{pct(summary.cvr)}</TableCell>
                <TableCell className="text-right">
                  {money.format(summary.atv)}
                </TableCell>
                <TableCell className="text-right">{summary.mac}</TableCell>
                <TableCell className="text-right">{summary.ipad}</TableCell>
                <TableCell className="text-right">{summary.iphone}</TableCell>
                <TableCell className="text-right">{summary.watch}</TableCell>
                <TableCell className="text-right">{summary.airpods}</TableCell>
                <TableCell className="text-right">
                  {money.format(summary.qoala)}
                </TableCell>
                <TableCell className="text-right">
                  {money.format(summary.telkomsel)}
                </TableCell>
                <TableCell className="text-right">
                  {money.format(summary.indosat)}
                </TableCell>
                <TableCell className="text-right">
                  {money.format(summary.xl)}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
  );
});

export default function DailySummaryPage() {
  const current = today(),
    currentPeriod = current.slice(0, 7);
  const [filters, setFilters] = useState<Filters>({
    period: currentPeriod,
    start: `${currentPeriod}-01`,
    end: current,
  });
  const [data, setData] = useState<SummaryResponse>(emptyData);
  const [status, setStatus] = useState({ loading: true, error: "" });
  const abortRef = useRef<AbortController | null>(null),
    requestRef = useRef(0);
  const profileRender = useCallback<ProfilerOnRenderCallback>(
    (id, phase, actualDuration, baseDuration) =>
      console.info("M238_PERF", {
        stage: `${String(id).toLowerCase()}Render`,
        phase,
        actualDurationMs: Math.round(actualDuration * 100) / 100,
        baseDurationMs: Math.round(baseDuration * 100) / 100,
      }),
    [],
  );

  const load = useCallback(
    async (selectedStart: string, selectedEnd: string, force = false) => {
      if (!selectedStart || !selectedEnd || selectedStart > selectedEnd) {
        setStatus({ loading: false, error: "Range tanggal belum valid." });
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestRef.current,
        requestStarted = performance.now(),
        cacheKey = summaryCacheKey(selectedStart, selectedEnd);
      console.info("M238_PERF", {
        stage: "apiRequestStart",
        requestId,
        range: `${selectedStart}:${selectedEnd}`,
        mainApiRequests: 1,
      });
      if (!force) {
        try {
          const stored = sessionStorage.getItem(cacheKey),
            cached = stored ? (JSON.parse(stored) as StoredSummary) : null;
          if (cached && Date.now() - cached.cachedAt < CLIENT_CACHE_TTL) {
            setData(cached);
            setStatus({ loading: false, error: "" });
            requestAnimationFrame(() =>
              console.info("M238_PERF", {
                stage: "totalLoadTime",
                source: "client-cache",
                requestId,
                rows: cached.dailyRows.length,
                totalMs: Math.round(performance.now() - requestStarted),
              }),
            );
            return;
          }
        } catch {
          sessionStorage.removeItem(cacheKey);
        }
      }
      setStatus({ loading: true, error: "" });
      try {
        const query = new URLSearchParams({
          from: selectedStart,
          to: selectedEnd,
        });
        if (force) query.set("refresh", "1");
        const response = await fetch(`/api/daily-summary-fast?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const responseText = await response.text(),
          fetchedAt = performance.now(),
          parseStarted = performance.now();
        const payload = JSON.parse(responseText) as SummaryResponse & {
            error?: string;
          },
          parseEnded = performance.now();
        if (!response.ok)
          throw new Error(
            payload.error ||
              "Data Daily Summary belum berhasil dimuat. Silakan coba Perbarui.",
          );
        if (requestId !== requestRef.current) return;
        const next = {
          dailyRows: Array.isArray(payload.dailyRows) ? payload.dailyRows : [],
          summary: payload.summary || emptySummary,
          generatedAt: payload.generatedAt,
          performance: payload.performance,
        };
        setData(next);
        setStatus({ loading: false, error: "" });
        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              ...next,
              cachedAt: Date.now(),
            } satisfies StoredSummary),
          );
        } catch {}
        requestAnimationFrame(() => {
          const renderedAt = performance.now();
          console.info("M238_PERF", {
            stage: "frontendLoadComplete",
            source: "network",
            requestId,
            range: `${selectedStart}:${selectedEnd}`,
            mainApiRequests: 1,
            responseBytes: new Blob([responseText]).size,
            rows: next.dailyRows.length,
            chartPoints: next.dailyRows.length,
            fetchMs: Math.round(fetchedAt - requestStarted),
            frontendParseMs:
              Math.round((parseEnded - parseStarted) * 100) / 100,
            reactRenderMs: Math.round(renderedAt - parseEnded),
            totalLoadMs: Math.round(renderedAt - requestStarted),
            server: payload.performance,
          });
        });
      } catch (caught) {
        if (
          (caught as Error).name !== "AbortError" &&
          requestId === requestRef.current
        )
          setStatus({
            loading: false,
            error:
              "Data Daily Summary belum berhasil dimuat. Silakan coba Perbarui.",
          });
      }
    },
    [],
  );

  useEffect(() => {
    abortRef.current?.abort();
    const timer = window.setTimeout(
      () => void load(filters.start, filters.end),
      320,
    );
    return () => window.clearTimeout(timer);
  }, [filters.start, filters.end, load]);
  useEffect(() => () => abortRef.current?.abort(), []);
  const changeMonth = (period: string) => {
    const [year, month] = period.split("-").map(Number),
      lastDay = String(new Date(year, month, 0).getDate()).padStart(2, "0");
    setFilters({
      period,
      start: `${period}-01`,
      end: current.startsWith(period) ? current : `${period}-${lastDay}`,
    });
  };
  const rows = data.dailyRows,
    summary = data.summary,
    card =
      "rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950",
    emptyLabel = rows.length
      ? ""
      : status.loading
        ? "Memuat data..."
        : "Belum ada data pada range ini.";

  return (
    <div className="w-full space-y-5 text-slate-950 dark:text-slate-100">
      <section className="rounded-3xl bg-gradient-to-br from-[#0872b9] to-[#075b97] p-5 text-white shadow-lg">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-blue-100">
              <Store className="size-4" />
              <span className="text-sm font-semibold">Digimap PIM 2</span>
            </div>
            <h2 className="mt-2 text-2xl font-black">Daily Sales Store</h2>
            <p className="mt-1 text-sm text-blue-100">
              Rekap harian. Range tanggal bisa melewati bulan.
            </p>
            <div className="mt-3 inline-flex rounded-xl bg-white/15 px-3 py-2 text-sm font-black">
              CVR {pct(summary.cvr)} • Traffic {num.format(summary.traffic)}
            </div>
          </div>
          <label className="block min-w-52">
            <span className="mb-1 block text-xs font-bold uppercase tracking-[.12em] text-blue-100">
              Quick Filter Bulan
            </span>
            <select
              value={filters.period}
              onChange={(event) => changeMonth(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/20 bg-white px-3 text-sm font-bold text-slate-800 dark:bg-slate-900 dark:text-slate-100"
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {monthName(month)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <section className={`${card} p-5`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold">Filter Range Tanggal</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Bisa lintas bulan.
            </p>
          </div>
          <button
            onClick={() => void load(filters.start, filters.end, true)}
            className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            <RefreshCw
              className={`size-4 ${status.loading ? "animate-spin" : ""}`}
            />
            Perbarui
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Dari Tanggal
            </span>
            <input
              type="date"
              value={filters.start}
              onChange={(event) =>
                setFilters((value) => ({ ...value, start: event.target.value }))
              }
              className="h-11 w-full rounded-xl border bg-white px-3 font-bold dark:bg-slate-900"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Sampai Tanggal
            </span>
            <input
              type="date"
              value={filters.end}
              onChange={(event) =>
                setFilters((value) => ({ ...value, end: event.target.value }))
              }
              className="h-11 w-full rounded-xl border bg-white px-3 font-bold dark:bg-slate-900"
            />
          </label>
        </div>
        {status.loading && rows.length ? (
          <p className="mt-3 text-sm font-semibold text-blue-600 dark:text-blue-400">
            Memuat {monthName(filters.period)}...
          </p>
        ) : null}
        {status.error ? (
          <p className="mt-3 text-sm font-bold text-rose-600 dark:text-rose-400">
            {status.error}
          </p>
        ) : null}
      </section>
      <section className={`${card} p-5`}>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <span>
            <b>Total Sales</b> {money.format(summary.amount)}
          </span>
          <span>
            <b>Avg/Day</b> {money.format(summary.avgPerDay)}
          </span>
          <span>
            <b>Invoice</b> {num.format(summary.invoices)}
          </span>
          <span>
            <b>Qty</b> {num.format(summary.qty)}
          </span>
          <span>
            <b>UPT</b> {summary.upt.toFixed(1)}
          </span>
          <span>
            <b>CVR</b> {pct(summary.cvr)}
          </span>
          <span>
            <b>ATV</b> {money.format(summary.atv)}
          </span>
          <span>
            <b>vs Previous</b>{" "}
            {summary.comparisonPercent === null
              ? "No comparison data"
              : `${summary.comparisonPercent >= 0 ? "▲" : "▼"} ${pct(Math.abs(summary.comparisonPercent))}`}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t pt-3 text-sm text-slate-600 dark:text-slate-300">
          <span>
            <b>Best Day:</b>{" "}
            {summary.bestDay
              ? `${displayDate(summary.bestDay.date)} — ${money.format(summary.bestDay.amount)}`
              : "—"}
          </span>
          <span>
            <b>Lowest Day:</b>{" "}
            {summary.lowestDay
              ? `${displayDate(summary.lowestDay.date)} — ${money.format(summary.lowestDay.amount)}`
              : "—"}
          </span>
        </div>
      </section>
      <Profiler id="chart" onRender={profileRender}>
        <Trend rows={rows} />
      </Profiler>
      <Profiler id="table" onRender={profileRender}>
        <DailyTable rows={rows} summary={summary} emptyLabel={emptyLabel} />
      </Profiler>
    </div>
  );
}
