"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
const money = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }),
  today = () =>
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  box = "rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-950",
  input = "h-11 rounded-xl border bg-white px-3 dark:bg-slate-900";
type Agg = { qty: number; amount: number };
type WeeklySide = {
  scheme: Record<string, Agg>;
  vas: Record<string, Agg>;
  lob: Record<string, Record<string, Agg>>;
};
type LobAnalysis = {
  review: string;
  actionPlan: string;
  target: number;
  achievement: number;
  gap: number;
};
type WeekPeriod = { start: string; end: string };
type TypeTarget = { target: number; focus: boolean };
type WeeklyTargets = {
  configured: boolean;
  sourceWeek: string;
  sourceMonth: string;
  lob: Record<string, number>;
  types: Record<string, Record<string, TypeTarget>>;
  grandTotal: number;
};
type WeeklyPayload = {
  weekA: number;
  weekB: number;
  labelA: string;
  labelB: string;
  periodA: WeekPeriod;
  periodB: WeekPeriod;
  availableWeeks: string[];
  feedbackCount: number;
  feedbackSummary: string;
  a: WeeklySide;
  b: WeeklySide;
  targets: WeeklyTargets;
  analysis: Record<string, LobAnalysis>;
};
export default function OperationsPage({
  mode,
}: {
  mode: "bnpl" | "soh" | "weekly";
}) {
  return (
    <main
      className={`min-h-screen bg-slate-50 p-4 text-slate-950 dark:bg-slate-900 dark:text-slate-100 sm:p-7 ${mode === "weekly" ? "weekly-report-page" : ""}`}
    >
      <a href="/" className="no-print text-sm font-bold text-blue-600">
        ← Kembali ke Dashboard
      </a>
      {mode === "bnpl" ? <Bnpl /> : mode === "soh" ? <Soh /> : <Weekly />}
    </main>
  );
}
function Bnpl() {
  const [d, setD] = useState(today()),
    [period, setPeriod] = useState(today().slice(0, 7)),
    [group, setGroup] = useState("BNPL"),
    [type, setType] = useState("HCI"),
    [qty, setQty] = useState(1),
    [amount, setAmount] = useState(0),
    [rows, setRows] = useState<any[]>([]),
    [msg, setMsg] = useState("");
  const load = async () =>
    setRows(
      (await (await fetch(`/api/bnpl?period=${period}`)).json()).rows || [],
    );
  useEffect(() => {
    void load();
  }, [period]);
  useEffect(
    () => setType(group === "BNPL" ? "HCI" : "Laku6 Master Device"),
    [group],
  );
  const save = async () => {
    const r = await fetch("/api/bnpl", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date: d, group, type, qty, amount }),
      }),
      j = await r.json();
    setMsg(r.ok ? "Data berhasil disimpan." : j.error);
    if (r.ok) {
      setAmount(0);
      setQty(1);
      await load();
    }
  };
  const types =
    group === "BNPL"
      ? ["HCI", "Indodana", "Kredivo", "Akulaku", "SPaylater"]
      : ["Laku6 Master Device", "OnePulse"];
  return (
    <div className="mt-6 space-y-5">
      <h1 className="text-3xl font-black">BNPL & Trade-In</h1>
      <section className={box}>
        <div className="grid gap-3 md:grid-cols-6">
          <input
            className={input}
            type="date"
            value={d}
            onChange={(e) => setD(e.target.value)}
          />
          <select
            className={input}
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option>BNPL</option>
            <option value="TRADE_IN">TRADE IN</option>
          </select>
          <select
            className={input}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {types.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <input
            className={input}
            type="number"
            value={qty}
            onChange={(e) => setQty(+e.target.value)}
          />
          <input
            className={input}
            type="number"
            value={amount}
            onChange={(e) => setAmount(+e.target.value)}
          />
          <button
            onClick={save}
            className="rounded-xl bg-blue-600 font-bold text-white"
          >
            Simpan
          </button>
        </div>
        {msg && <p className="mt-3">{msg}</p>}
      </section>
      <section className={box}>
        <div className="mb-4 flex justify-between">
          <h2 className="font-black">Daily Tracking</h2>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className={input}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[850px] w-full text-sm">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Hari</th>
                <th>Category</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr className="border-t" key={i}>
                  <td className="p-2">{r.date}</td>
                  <td>{r.day}</td>
                  <td>{r.group}</td>
                  <td>{r.type}</td>
                  <td>{r.qty}</td>
                  <td>{money.format(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
function Soh() {
  const [q, setQ] = useState(""),
    [rows, setRows] = useState<any[]>([]),
    [updated, setUpdated] = useState("");
  useEffect(() => {
    const t = setTimeout(async () => {
      const j = await (
        await fetch(`/api/soh?q=${encodeURIComponent(q)}`)
      ).json();
      setRows(j.rows || []);
      setUpdated(j.updated || "");
    }, 200);
    return () => clearTimeout(t);
  }, [q]);
  const groups = [
    ["IPHONE", "iPhone"],
    ["IPAD", "iPad"],
    ["MACBOOK", "Mac"],
    ["APPLE WATCH", "Apple Watch"],
    ["AIRPODS, PENCIL & KEYBOARD", "AirPods, Pencil & Keyboard"],
  ] as const;
  return (
    <div className="mt-6 space-y-5">
      <div>
        <h1 className="text-3xl font-black">Stock On Hand</h1>
        <p className="text-slate-500">
          Isi mengikuti langsung sheet SOH
          {updated ? ` • Updated ${updated}` : ""}.
        </p>
      </div>
      <section className={box}>
        <input
          className={`${input} w-full`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari Article atau Description..."
        />
      </section>
      <div className="grid gap-5 xl:grid-cols-2">
        {groups.map(([key, label]) => {
          const rr = rows.filter((x) => x.category === key),
            total = rr.reduce((a, x) => a + x.qty, 0);
          return (
            <section className={box} key={key}>
              <div className="mb-3 flex justify-between">
                <h2 className="font-black">{label}</h2>
                <b>Grand Total: {total}</b>
              </div>
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-slate-950">
                    <tr>
                      <th className="p-2 text-left">Article</th>
                      <th className="text-left">Description</th>
                      <th className="text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rr.map((r: any) => (
                      <tr
                        className="border-t"
                        key={`${r.article}-${r.description}`}
                      >
                        <td className="p-2 font-semibold">{r.article}</td>
                        <td>{r.description}</td>
                        <td className="text-right font-black">{r.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
function Weekly() {
  const [data, setData] = useState<WeeklyPayload | null>(null),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [manual, setManual] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const query =
          manual && from && to
            ? `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
            : "",
        response = await fetch(`/api/weekly${query}`, { cache: "no-store" }),
        json: WeeklyPayload = await response.json();
      if (active) {
        setData(json);
        if (!manual) {
          setFrom(json.labelA);
          setTo(json.labelB);
        }
      }
    };
    void load();
    const timer = setInterval(() => void load(), 300000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [from, to, manual]);
  const chooseFrom = (value: string) => {
      setManual(true);
      setFrom(value);
    },
    chooseTo = (value: string) => {
      setManual(true);
      setTo(value);
    },
    resetAuto = () => {
      setManual(false);
      setFrom("");
      setTo("");
    },
    downloadPdf = () => {
      const previousTitle = document.title;
      document.title = `Weekly Report M238 - ${data?.labelA ?? ""} vs ${data?.labelB ?? ""}`;
      window.print();
      window.setTimeout(() => {
        document.title = previousTitle;
      }, 1000);
    },
    compare = (x = 0, y = 0) =>
      x ? `${(((y - x) / x) * 100).toFixed(0)}%` : y ? "NEW" : "0%",
    merge = (left: Record<string, Agg> = {}, right: Record<string, Agg> = {}) =>
      Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).map(
        (k) => ({
          k,
          x: left[k] || { qty: 0, amount: 0 },
          y: right[k] || { qty: 0, amount: 0 },
        }),
      ),
    sum = (values: Record<string, Agg> = {}) =>
      Object.values(values).reduce(
        (total, value) => ({
          qty: total.qty + value.qty,
          amount: total.amount + value.amount,
        }),
        { qty: 0, amount: 0 },
      ),
    lobs = ["AIRPODS", "IPHONE", "MAC", "IPAD", "APPLE WATCH"],
    targetLobs = ["AIRPODS", "APPLE WATCH", "IPAD", "IPHONE", "MAC"],
    names: Record<string, string> = {
      AIRPODS: "AirPods",
      IPHONE: "iPhone",
      MAC: "MacBook",
      IPAD: "iPad",
      "APPLE WATCH": "Watch",
    },
    la = (data?.labelA ?? "Week sebelumnya").replace("Week ", "W"),
    lb = (data?.labelB ?? "Week berjalan").replace("Week ", "W");
  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Weekly Report M238</h1>
          <p className="mt-1 text-sm text-slate-500">
            Default mengikuti dua week terbaru, tetapi histori week tetap dapat
            dipilih.
          </p>
        </div>
        <button
          onClick={downloadPdf}
          className="no-print flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700"
        >
          <Download className="size-4" />
          Unduh PDF
        </button>
      </div>
      <section className={box}>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <label>
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Week Sebelumnya
            </span>
            <select
              className={`${input} w-full`}
              value={from}
              onChange={(event) => chooseFrom(event.target.value)}
            >
              {data?.availableWeeks?.map((week) => (
                <option key={week} value={week}>
                  {week}
                </option>
              ))}
            </select>
          </label>
          <b className="pb-3 text-center text-blue-600">VS</b>
          <label>
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-blue-500">
              Week Pembanding
            </span>
            <select
              className={`${input} w-full`}
              value={to}
              onChange={(event) => chooseTo(event.target.value)}
            >
              {data?.availableWeeks?.map((week) => (
                <option key={week} value={week}>
                  {week}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">
              Sumber: Data Copas •{" "}
              {manual
                ? "Comparison dipilih manual"
                : "Otomatis mengikuti week berjalan"}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Periode Minggu–Sabtu: {data?.periodA?.start ?? "-"} s.d.{" "}
              {data?.periodA?.end ?? "-"} vs {data?.periodB?.start ?? "-"} s.d.{" "}
              {data?.periodB?.end ?? "-"}
            </p>
          </div>
          {manual ? (
            <button
              onClick={resetAuto}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
            >
              Kembali Otomatis
            </button>
          ) : (
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">
              AUTO
            </span>
          )}
        </div>
      </section>
      <section className={box}>
        <h2 className="mb-3 font-black">Sales Summary — Device / VAS / ACC</h2>
        <CompareTotal
          rows={merge(data?.a?.scheme, data?.b?.scheme)}
          la={la}
          lb={lb}
          compare={compare}
          totalLabel="M238 TOTAL"
        />
      </section>
      <section className={box}>
        <h2 className="mb-3 font-black">
          VAS — Qoala / Indosat / Telkomsel / XL
        </h2>
        <CompareTotal
          rows={merge(data?.a?.vas, data?.b?.vas)}
          la={la}
          lb={lb}
          compare={compare}
          totalLabel="VAS TOTAL"
        />
      </section>
      <section className={box}>
        <div className="mb-3">
          <h2 className="font-black">Weekly LOB M238</h2>
          <p className="text-sm text-slate-500">
            Per type: {data?.labelA ?? "week sebelumnya"} vs{" "}
            {data?.labelB ?? "week pembanding"}.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left">Product Category</th>
                <th className="text-left">Type</th>
                <th>{la} Qty</th>
                <th>{la} Amount</th>
                <th>{lb} Qty</th>
                <th>{lb} Amount</th>
                <th>Qty %</th>
                <th>Amount %</th>
              </tr>
            </thead>
            <tbody>
              {lobs.flatMap((lob) => {
                const rows = merge(data?.a?.lob?.[lob], data?.b?.lob?.[lob]),
                  a = sum(data?.a?.lob?.[lob]),
                  b = sum(data?.b?.lob?.[lob]);
                return [
                  ...rows.map((row, index) => (
                    <tr className="border-t" key={`${lob}-${row.k}`}>
                      <td className="p-2 font-black">
                        {index === 0 ? names[lob] : ""}
                      </td>
                      <td className="font-semibold">{row.k}</td>
                      <td className="text-center">{row.x.qty}</td>
                      <td>{money.format(row.x.amount)}</td>
                      <td className="text-center">{row.y.qty}</td>
                      <td>{money.format(row.y.amount)}</td>
                      <td>{compare(row.x.qty, row.y.qty)}</td>
                      <td>{compare(row.x.amount, row.y.amount)}</td>
                    </tr>
                  )),
                  <tr
                    className="border-t bg-slate-50 font-black dark:bg-slate-900"
                    key={`${lob}-total`}
                  >
                    <td className="p-2">{names[lob]} Total</td>
                    <td />
                    <td className="text-center">{a.qty}</td>
                    <td>{money.format(a.amount)}</td>
                    <td className="text-center">{b.qty}</td>
                    <td>{money.format(b.amount)}</td>
                    <td>{compare(a.qty, b.qty)}</td>
                    <td>{compare(a.amount, b.amount)}</td>
                  </tr>,
                ];
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-6 border-t pt-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="font-black">Target LOB Weekly</h3>
              <p className="mt-1 text-sm text-slate-500">
                Pencapaian {data?.labelB ?? "week berjalan"} dibanding target
                Config. Target berlabel Fokus mengikuti LOB Fokus weekly.
              </p>
            </div>
            <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300">
              {data?.targets?.configured
                ? `${data.targets.sourceMonth} • ${data.targets.sourceWeek}`
                : "Target belum tersedia"}
            </span>
          </div>
          <WeeklyTargetTable data={data} lobs={targetLobs} names={names} />
        </div>
        <div className="mt-6 border-t pt-5">
          <h3 className="font-black">Reason Weekly per LOB</h3>
          <p className="mt-1 text-sm text-slate-500">
            Review dibuat dari hasil compare, pencapaian target, pergerakan
            type, dan kondisi store pada week tersebut.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {lobs.map((lob) => {
              const item = data?.analysis?.[lob];
              return (
                <article
                  key={lob}
                  className="rounded-2xl border bg-slate-50 p-4 dark:bg-slate-900"
                >
                  <h4 className="font-black text-blue-600">{names[lob]}</h4>
                  <div className="mt-3 space-y-3 text-sm leading-6">
                    <div>
                      <b>Weekly Review</b>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">
                        {item?.review ?? "Menunggu data comparison week."}
                      </p>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-950/30">
                      <b className="text-blue-700 dark:text-blue-300">
                        Action Plan
                      </b>
                      <p className="mt-1 text-slate-700 dark:text-slate-200">
                        {item?.actionPlan ?? "Menunggu action plan."}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
function WeeklyTargetTable({
  data,
  lobs,
  names,
}: {
  data: WeeklyPayload | null;
  lobs: string[];
  names: Record<string, string>;
}) {
  const pct = (actual: number, target: number) =>
      target ? `${((actual / target) * 100).toFixed(0)}%` : "-",
    grandActual = lobs.reduce(
      (sum, lob) => {
        const values = Object.values(data?.b?.lob?.[lob] ?? {});
        return values.reduce(
          (acc, value) => ({
            qty: acc.qty + value.qty,
            amount: acc.amount + value.amount,
          }),
          sum,
        );
      },
      { qty: 0, amount: 0 },
    ),
    grandTarget = data?.targets?.grandTotal ?? 0;
  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="p-3 text-left">Product Category</th>
            <th className="text-left">Type</th>
            <th>{data?.labelB ?? "Week"} Qty</th>
            <th>{data?.labelB ?? "Week"} Amount</th>
            <th>Target {data?.targets?.sourceWeek ?? ""}</th>
            <th>Gap</th>
            <th>Achievement</th>
          </tr>
        </thead>
        <tbody>
          {lobs.flatMap((lob) => {
            const current = data?.b?.lob?.[lob] ?? {},
              targetTypes = data?.targets?.types?.[lob] ?? {},
              types = [
                ...new Set([
                  ...Object.keys(current),
                  ...Object.keys(targetTypes),
                ]),
              ],
              lobActual = Object.values(current).reduce(
                (sum, value) => ({
                  qty: sum.qty + value.qty,
                  amount: sum.amount + value.amount,
                }),
                { qty: 0, amount: 0 },
              ),
              lobTarget = data?.targets?.lob?.[lob] ?? 0;
            return [
              ...types.map((type, index) => {
                const actual = current[type] ?? { qty: 0, amount: 0 },
                  targetInfo = targetTypes[type] ?? { target: 0, focus: false },
                  gap = actual.qty - targetInfo.target;
                return (
                  <tr
                    className={`border-t ${targetInfo.focus ? "bg-amber-50/70 dark:bg-amber-950/20" : ""}`}
                    key={`${lob}-${type}-target`}
                  >
                    <td className="p-3 font-black">
                      {index === 0 ? names[lob] : ""}
                    </td>
                    <td className="font-semibold">
                      {type}
                      {targetInfo.focus ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          Fokus
                        </span>
                      ) : null}
                    </td>
                    <td className="text-center">{actual.qty}</td>
                    <td>{money.format(actual.amount)}</td>
                    <td className="text-center font-bold">
                      {targetInfo.target || "-"}
                    </td>
                    <td
                      className={`text-center font-bold ${gap >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                    >
                      {targetInfo.target ? `${gap >= 0 ? "+" : ""}${gap}` : "-"}
                    </td>
                    <td className="text-center">
                      {pct(actual.qty, targetInfo.target)}
                    </td>
                  </tr>
                );
              }),
              <tr
                className="border-t bg-cyan-100 font-black text-slate-950 dark:bg-cyan-950/50 dark:text-slate-100"
                key={`${lob}-target-total`}
              >
                <td className="p-3">{names[lob]} Total</td>
                <td />
                <td className="text-center">{lobActual.qty}</td>
                <td>{money.format(lobActual.amount)}</td>
                <td className="text-center">{lobTarget || "-"}</td>
                <td
                  className={`text-center ${lobActual.qty - lobTarget >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}
                >
                  {lobTarget
                    ? `${lobActual.qty - lobTarget >= 0 ? "+" : ""}${lobActual.qty - lobTarget}`
                    : "-"}
                </td>
                <td className="text-center">{pct(lobActual.qty, lobTarget)}</td>
              </tr>,
            ];
          })}
          <tr className="border-t-2 border-cyan-400 bg-cyan-200 font-black text-slate-950 dark:bg-cyan-900 dark:text-white">
            <td className="p-3">Grand Total</td>
            <td />
            <td className="text-center">{grandActual.qty}</td>
            <td>{money.format(grandActual.amount)}</td>
            <td className="text-center">{grandTarget || "-"}</td>
            <td
              className={`text-center ${grandActual.qty - grandTarget >= 0 ? "text-emerald-800 dark:text-emerald-300" : "text-rose-800 dark:text-rose-300"}`}
            >
              {grandTarget
                ? `${grandActual.qty - grandTarget >= 0 ? "+" : ""}${grandActual.qty - grandTarget}`
                : "-"}
            </td>
            <td className="text-center">{pct(grandActual.qty, grandTarget)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
function CompareTotal({
  rows,
  la,
  lb,
  compare,
  totalLabel,
}: {
  rows: Array<{ k: string; x: Agg; y: Agg }>;
  la: string;
  lb: string;
  compare: (x: number, y: number) => string;
  totalLabel: string;
}) {
  const total = rows.reduce(
    (sum, row) => ({
      x: { qty: sum.x.qty + row.x.qty, amount: sum.x.amount + row.x.amount },
      y: { qty: sum.y.qty + row.y.qty, amount: sum.y.amount + row.y.amount },
    }),
    { x: { qty: 0, amount: 0 }, y: { qty: 0, amount: 0 } },
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left">Category</th>
            <th>{la} Qty</th>
            <th>{la} Amount</th>
            <th>{lb} Qty</th>
            <th>{lb} Amount</th>
            <th>Qty %</th>
            <th>Amount %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-t" key={row.k}>
              <td className="p-2 font-bold">{row.k}</td>
              <td>{row.x.qty}</td>
              <td>{money.format(row.x.amount)}</td>
              <td>{row.y.qty}</td>
              <td>{money.format(row.y.amount)}</td>
              <td>{compare(row.x.qty, row.y.qty)}</td>
              <td>{compare(row.x.amount, row.y.amount)}</td>
            </tr>
          ))}
          <tr className="border-t bg-slate-50 font-black dark:bg-slate-900">
            <td className="p-2">{totalLabel}</td>
            <td>{total.x.qty}</td>
            <td>{money.format(total.x.amount)}</td>
            <td>{total.y.qty}</td>
            <td>{money.format(total.y.amount)}</td>
            <td>{compare(total.x.qty, total.y.qty)}</td>
            <td>{compare(total.x.amount, total.y.amount)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
