"use client";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Clock3, TrendingDown, TrendingUp } from "lucide-react";

type AnnualRow = { period: string; label: string; amount: number };
type AnnualData = {
  lastYear: AnnualRow[];
  thisYear: AnnualRow[];
  lastYearTotal: number;
  thisYearTotal: number;
};
type SalesUpdate = { generatedAt: string; latestDate: string };
const money = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const pct = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const jakartaDateTime = (v: string) =>
  v
    ? new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
        .format(new Date(v))
        .replace(".", ":")
        .replace(".", ":")
    : "—";

export default function DashboardEnhancements() {
  const [compareTarget, setCompareTarget] = useState<HTMLElement | null>(null),
    [salesTarget, setSalesTarget] = useState<HTMLElement | null>(null),
    [annual, setAnnual] = useState<AnnualData | null>(null),
    [salesUpdate, setSalesUpdate] = useState<SalesUpdate | null>(null);
  useEffect(() => {
    const setup = () => {
      const heading = [...document.querySelectorAll("h2")].find(
        (x) => x.textContent?.trim() === "Revenue Analytics",
      );
      if (!heading) return false;
      const card = heading.closest(".rounded-2xl");
      if (!(card instanceof HTMLElement)) return false;
      const content = card.querySelector(":scope > .space-y-6");
      if (!(content instanceof HTMLElement)) return false;
      const old = [...content.querySelectorAll("h3")].filter(
        (x) =>
          x.textContent?.includes("2025") || x.textContent?.includes("2026"),
      );
      old.forEach((x) => {
        const p = x.parentElement;
        if (p) p.style.display = "none";
      });
      let host = content.querySelector(
        "[data-year-compare]",
      ) as HTMLElement | null;
      if (!host) {
        host = document.createElement("div");
        host.dataset.yearCompare = "true";
        content.appendChild(host);
      }
      setCompareTarget(host);
      return true;
    };
    if (!setup()) {
      const obs = new MutationObserver(() => {
        if (setup()) obs.disconnect();
      });
      obs.observe(document.body, { childList: true, subtree: true });
      return () => obs.disconnect();
    }
  }, []);
  useEffect(() => {
    const setup = () => {
      const heading = [...document.querySelectorAll("h1")].find(
        (x) => x.textContent?.trim() === "Daily Sales",
      );
      if (!heading) return;
      const parent = heading.parentElement;
      if (!(parent instanceof HTMLElement)) return;
      let host = parent.querySelector(
        "[data-sales-update]",
      ) as HTMLElement | null;
      if (!host) {
        host = document.createElement("div");
        host.dataset.salesUpdate = "true";
        host.className = "mt-2";
        parent.appendChild(host);
      }
      if (host !== salesTarget) setSalesTarget(host);
    };
    setup();
    const obs = new MutationObserver(setup);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [salesTarget]);
  useEffect(() => {
    const period = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
    })
      .format(new Date())
      .slice(0, 7);
    const load = () =>
      fetch(`/api/data?period=${period}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.generatedAt)
            setSalesUpdate({
              generatedAt: j.generatedAt,
              latestDate: j.latestDate || "",
            });
        })
        .catch(() => {});
    void load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const period =
      new URLSearchParams(window.location.search).get("period") ||
      new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
      })
        .format(new Date())
        .slice(0, 7);
    fetch(`/api/data?period=${period}`)
      .then((r) => r.json())
      .then((j) => setAnnual(j.annual || null))
      .catch(() => {});
  }, []);
  const pairs = useMemo(() => {
    if (!annual) return [];
    const last = new Map(annual.lastYear.map((x) => [x.period.slice(5, 7), x]));
    return annual.thisYear.map((y) => {
      const key = y.period.slice(5, 7),
        x = last.get(key),
        v25 = x?.amount ?? 0,
        v26 = y.amount ?? 0,
        growth = v25 ? ((v26 - v25) / v25) * 100 : 0,
        diff = v26 - v25;
      return { label: y.label, v25, v26, growth, diff };
    });
  }, [annual]);
  const totalGrowth = annual?.lastYearTotal
      ? ((annual.thisYearTotal - annual.lastYearTotal) / annual.lastYearTotal) *
        100
      : 0,
    totalDiff = (annual?.thisYearTotal ?? 0) - (annual?.lastYearTotal ?? 0);
  return (
    <>
      {salesTarget &&
        createPortal(
          <div className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-950 dark:text-slate-300">
            <Clock3 className="size-4 text-blue-600" />
            <span>
              Update sales terakhir:{" "}
              <b>{jakartaDateTime(salesUpdate?.generatedAt || "")} WIB</b>
              {salesUpdate?.latestDate
                ? ` • Data ${salesUpdate.latestDate}`
                : ""}
            </span>
          </div>,
          salesTarget,
        )}
      {compareTarget &&
        createPortal(
          <div className="space-y-4">
            <div>
              <h3 className="font-extrabold">2025 vs 2026</h3>
              <p className="mt-1 text-sm text-slate-500">
                Perbandingan revenue per bulan. Growth menunjukkan lebih/kurang
                dibanding bulan yang sama tahun 2025.
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-3 py-3 text-left">Bulan</th>
                    <th className="px-3 py-3 text-right">2025</th>
                    <th className="px-3 py-3 text-right">2026</th>
                    <th className="px-3 py-3 text-right">Selisih</th>
                    <th className="px-3 py-3 text-right">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.map((r) => (
                    <tr key={r.label} className="border-t">
                      <td className="px-3 py-3 font-bold">{r.label}</td>
                      <td className="px-3 py-3 text-right">
                        {money.format(r.v25)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold">
                        {money.format(r.v26)}
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-semibold ${r.diff >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {r.diff >= 0 ? "+" : ""}
                        {money.format(r.diff)}
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-black ${r.growth >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          {r.growth >= 0 ? (
                            <TrendingUp className="size-4" />
                          ) : (
                            <TrendingDown className="size-4" />
                          )}
                          {r.growth >= 0 ? "+" : ""}
                          {pct.format(r.growth)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-slate-50 font-black dark:bg-slate-900">
                    <td className="px-3 py-3">TOTAL</td>
                    <td className="px-3 py-3 text-right">
                      {money.format(annual?.lastYearTotal ?? 0)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {money.format(annual?.thisYearTotal ?? 0)}
                    </td>
                    <td
                      className={`px-3 py-3 text-right ${totalDiff >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                    >
                      {totalDiff >= 0 ? "+" : ""}
                      {money.format(totalDiff)}
                    </td>
                    <td
                      className={`px-3 py-3 text-right ${totalGrowth >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                    >
                      {totalGrowth >= 0 ? "+" : ""}
                      {pct.format(totalGrowth)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div
              className={`rounded-xl p-4 text-sm font-bold ${totalGrowth >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
            >
              {totalGrowth >= 0
                ? `2026 lebih tinggi ${pct.format(totalGrowth)}% dibanding 2025 (${money.format(Math.abs(totalDiff))}).`
                : `2026 masih kurang ${pct.format(Math.abs(totalGrowth))}% dibanding 2025 (${money.format(Math.abs(totalDiff))}).`}
            </div>
          </div>,
          compareTarget,
        )}
    </>
  );
}
