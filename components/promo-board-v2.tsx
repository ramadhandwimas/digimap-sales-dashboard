"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, History, Search, Tag, TrendingDown, TrendingUp, Upload, XCircle } from "lucide-react";
import { parsePromoWorkbook, type PromoParseResult, type PromoProduct, type PromoStatus } from "@/lib/promo-board-parser";
import { comparePromoPriceLists, groupPromoProducts, type PromoProductGroup } from "@/lib/promo-board-insights";

const ACTIVE_KEY = "m238-promo-board-active-v1";
const HISTORY_KEY = "m238-promo-board-history-v1";
const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" });

type ViewMode = "promo" | "ending" | "changes" | "history";

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : dateFmt.format(date);
}

function statusMeta(status: PromoStatus, daysRemaining: number | null) {
  if (status === "FURTHER_NOTICE") return { label: "Further Notice", cls: "bg-blue-50 text-blue-700 border-blue-200" };
  if (status === "ENDING_SOON") return { label: daysRemaining === 0 ? "Berakhir hari ini" : daysRemaining === 1 ? "Berakhir besok" : `Berakhir ${daysRemaining} hari lagi`, cls: "bg-amber-50 text-amber-700 border-amber-200" };
  if (status === "EXPIRED") return { label: "Expired", cls: "bg-rose-50 text-rose-700 border-rose-200" };
  if (status === "ACTIVE") return { label: "Aktif", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  return { label: "Periksa Remarks", cls: "bg-slate-50 text-slate-600 border-slate-200" };
}

function variantLabel(product: PromoProduct) {
  const value = product.sapDescription.toUpperCase();
  const known: [RegExp, string][] = [
    [/\bSPG\b/, "Space Grey"], [/\bSLV\b/, "Silver"], [/\bGLD\b/, "Gold"], [/\bSTL\b/, "Starlight"],
    [/\bMDN\b/, "Midnight"], [/\bBLK\b|\bBLACK\b/, "Black"], [/\bWHT\b|\bWHITE\b/, "White"],
    [/\bBLU\b|\bBLUE\b/, "Blue"], [/\bPINK\b/, "Pink"], [/\bRED\b/, "Red"], [/\bGRN\b|\bGREEN\b/, "Green"],
    [/\bPUR\b|\bPURPLE\b/, "Purple"], [/\bNAT\b|\bNATURAL\b/, "Natural"],
  ];
  return known.find(([pattern]) => pattern.test(value))?.[1] ?? product.sapArticle;
}

function GroupCard({ group }: { group: PromoProductGroup }) {
  const status = statusMeta(group.promoStatus, group.daysRemaining);
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[.12em] text-blue-600">{group.category}</p>
          <h2 className="mt-1 break-words text-lg font-black leading-snug">{group.title}</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">{group.variants.length} SKU / variant</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black ${status.cls}`}>{status.label}</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
          <p className="text-xs font-semibold text-slate-400">Normal Price</p>
          <p className="mt-1 text-sm font-bold text-slate-500 line-through">{group.normalPrice ? money.format(group.normalPrice) : "-"}</p>
          <p className="mt-3 text-xs font-semibold text-slate-400">Promo Price</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-blue-600">{group.promotionPrice ? money.format(group.promotionPrice) : "-"}</p>
        </div>
        <div className="rounded-2xl border border-dashed p-4 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-400">Saving</p>
          <p className="mt-1 text-lg font-black text-emerald-600">{group.savingAmount ? money.format(group.savingAmount) : "Tidak ada price discount"}</p>
          {group.savingAmount ? <p className="mt-1 text-xs font-bold text-emerald-600">{group.discountPercentage.toFixed(1)}% lebih hemat</p> : null}
          <div className="mt-4 border-t border-dashed pt-3 text-xs text-slate-500 dark:border-slate-800">
            <p className="font-bold text-slate-700 dark:text-slate-200">Periode Promo</p>
            <p className="mt-1">{group.promoStartDate ? formatDate(group.promoStartDate) : "Tidak terdeteksi"} → {group.promoPeriodType === "FURTHER_NOTICE" ? "Further Notice" : group.promoEndDate ? formatDate(group.promoEndDate) : "Periksa Remarks"}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {group.variants.slice(0, 8).map((item) => <span key={item.sapArticle} className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">{variantLabel(item)}</span>)}
        {group.variants.length > 8 ? <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:bg-slate-900">+{group.variants.length - 8}</span> : null}
      </div>

      <details className="mt-4 rounded-2xl border p-4 dark:border-slate-800">
        <summary className="cursor-pointer text-sm font-black">Lihat Detail Promo & SKU</summary>
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-slate-600 dark:text-slate-300"><b>Remarks:</b> {group.remarks || "-"}</p>
          <div className="overflow-x-auto rounded-xl border dark:border-slate-800">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900"><tr><th className="p-2">Variant</th><th className="p-2">SAP</th><th className="p-2">BR/ZOUT</th><th className="p-2">Bundling</th></tr></thead>
              <tbody>{group.variants.map((item) => <tr key={item.sapArticle} className="border-t dark:border-slate-800"><td className="p-2 font-bold">{variantLabel(item)}</td><td className="p-2">{item.sapArticle}</td><td className="p-2">{item.brZout || "-"}</td><td className="p-2">{item.promotionCashBundling ? `Cash ${money.format(item.promotionCashBundling)}` : item.promotionInstallmentBundling ? `Cicilan ${money.format(item.promotionInstallmentBundling)}` : "-"}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </details>
    </article>
  );
}

export default function PromoBoardV2() {
  const [active, setActive] = useState<PromoParseResult | null>(null);
  const [preview, setPreview] = useState<PromoParseResult | null>(null);
  const [history, setHistory] = useState<PromoParseResult[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [status, setStatus] = useState<PromoStatus | "ALL">("ALL");
  const [view, setView] = useState<ViewMode>("promo");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_KEY);
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (raw) setActive(JSON.parse(raw));
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch { /* ignore damaged local data */ }
  }, []);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const result = parsePromoWorkbook(await file.arrayBuffer(), file.name);
      setPreview(result);
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : "File tidak dapat dibaca.");
    } finally {
      setBusy(false);
    }
  };

  const comparison = useMemo(() => comparePromoPriceLists(active, preview), [active, preview]);
  const lastComparison = useMemo(() => comparePromoPriceLists(history[0] ?? null, active), [history, active]);

  const activate = () => {
    if (!preview) return;
    const nextHistory = active ? [active, ...history.filter((x) => x.fileName !== active.fileName)].slice(0, 5) : history;
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(preview));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    setHistory(nextHistory);
    setActive(preview);
    setPreview(null);
    setView("promo");
  };

  const products = active?.products ?? [];
  const categories = useMemo(() => ["Semua", ...Array.from(new Set(products.map((x) => x.category))).sort()], [products]);
  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((item) => {
      const text = `${item.sapArticle} ${item.sapDescription} ${item.section}`.toLowerCase();
      const endingMatch = view !== "ending" || item.promoStatus === "ENDING_SOON";
      return endingMatch && (!q || text.includes(q)) && (category === "Semua" || item.category === category) && (status === "ALL" || item.promoStatus === status);
    });
  }, [products, query, category, status, view]);
  const groups = useMemo(() => groupPromoProducts(filteredProducts), [filteredProducts]);

  const metrics = useMemo(() => ({
    active: products.filter((x) => x.promoStatus === "ACTIVE").length,
    further: products.filter((x) => x.promoStatus === "FURTHER_NOTICE").length,
    ending: products.filter((x) => x.promoStatus === "ENDING_SOON").length,
    expired: products.filter((x) => x.promoStatus === "EXPIRED").length,
    discounted: products.filter((x) => x.savingAmount > 0).length,
  }), [products]);

  const changeCards = [
    ["Harga Turun", comparison.counts.PROMO_PRICE_DOWN, "text-emerald-600", TrendingDown],
    ["Harga Naik", comparison.counts.PROMO_PRICE_UP, "text-rose-600", TrendingUp],
    ["Promo Baru", comparison.counts.NEW_PROMO + comparison.counts.NEW_PRODUCT, "text-blue-600", Tag],
    ["Promo Berakhir", comparison.counts.PROMO_ENDED + comparison.counts.REMOVED_PRODUCT, "text-amber-600", XCircle],
    ["Periode Berubah", comparison.counts.PROMO_PERIOD_CHANGED, "text-violet-600", CalendarDays],
  ] as const;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-900 dark:text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <a href="/" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-blue-600"><ArrowLeft className="size-4"/> Dashboard M238</a>
            <p className="mt-4 text-xs font-black uppercase tracking-[.18em] text-blue-600">M238 Digimap PIM 2</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Promo Board</h1>
            <p className="mt-1 text-sm text-slate-500">Harga promo device, masa berlaku, dan perubahan pricelist terbaru.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700">
            <Upload className="size-4"/> {busy ? "Menganalisa..." : "Upload Pricelist Terbaru"}
            <input type="file" accept=".xlsx,.xls" className="hidden" disabled={busy} onChange={(e) => void handleFile(e.target.files?.[0])}/>
          </label>
        </div>

        {error ? <div className="mt-5 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700"><XCircle className="size-5"/>{error}</div> : null}

        {preview ? <section className="mt-6 rounded-3xl border border-blue-200 bg-white p-5 shadow-sm dark:border-blue-900 dark:bg-slate-950">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.15em] text-blue-600">Preview sebelum update</p><h2 className="mt-1 text-xl font-black">Hasil Analisa Pricelist</h2><p className="mt-1 text-sm text-slate-500">{preview.fileName}</p></div><div className="flex gap-2"><button onClick={() => setPreview(null)} className="rounded-xl border px-4 py-2 text-sm font-bold">Batalkan</button><button onClick={activate} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">Gunakan Sebagai Pricelist Aktif</button></div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-xs text-slate-400">Tanggal Pricelist</p><b>{formatDate(preview.priceListDate)}</b></div><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-xs text-slate-400">Total SKU Valid</p><b>{preview.totalSku}</b></div><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-xs text-slate-400">Sheet</p><b>{preview.sheetName}</b></div><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-xs text-slate-400">Warning</p><b>{preview.warnings.length}</b></div></div>
          <div className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-700"><CheckCircle2 className="size-4"/> Struktur file, sheet, header, dan harga berhasil dibaca.</div>
          {active ? <div className="mt-5"><h3 className="font-black">Apa yang berubah dari Pricelist aktif?</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{changeCards.map(([label, value, cls, Icon]) => <div key={label} className="rounded-2xl border p-4 dark:border-slate-800"><Icon className={`size-5 ${cls}`}/><p className="mt-3 text-2xl font-black">{value}</p><p className="text-xs font-bold text-slate-500">{label}</p></div>)}</div></div> : null}
          {preview.warnings.length ? <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">{preview.warnings.slice(0,8).map((w) => <p key={w}>⚠️ {w}</p>)}</div> : null}
        </section> : null}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[["Promo Aktif",metrics.active,"Aktif berdasarkan periode"],["Further Notice",metrics.further,"Sampai info lanjut"],["Akan Berakhir",metrics.ending,"≤ 7 hari"],["Expired",metrics.expired,"Periode lewat"],["Price Discount",metrics.discounted,"Promo < normal"]].map(([label,value,sub]) => <button key={String(label)} onClick={() => label === "Akan Berakhir" ? setView("ending") : setView("promo")} className="rounded-2xl border bg-white p-4 text-left shadow-sm dark:border-slate-800 dark:bg-slate-950"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="mt-1 text-[11px] text-slate-400">{sub}</p></button>)}</section>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">{(["promo","ending","changes","history"] as ViewMode[]).map((item) => <button key={item} onClick={() => setView(item)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black ${view===item?"bg-slate-950 text-white dark:bg-white dark:text-slate-950":"bg-white text-slate-600 shadow-sm dark:bg-slate-950 dark:text-slate-300"}`}>{item === "promo" ? "Promo Aktif" : item === "ending" ? "Akan Berakhir" : item === "changes" ? "Perubahan Terakhir" : "Riwayat Upload"}</button>)}</div>

        {(view === "promo" || view === "ending") ? <>
          <section className="mt-4 rounded-3xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex flex-col gap-3 lg:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Cari iPhone 17, MacBook, 256GB, SAP Article..." className="h-12 w-full rounded-2xl border bg-transparent pl-10 pr-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-200"/></div><select value={status} onChange={(e)=>setStatus(e.target.value as PromoStatus|"ALL")} className="h-12 rounded-2xl border bg-transparent px-4 text-sm font-bold"><option value="ALL">Semua Status</option><option value="ACTIVE">Aktif</option><option value="FURTHER_NOTICE">Further Notice</option><option value="ENDING_SOON">Akan Berakhir</option><option value="EXPIRED">Expired</option><option value="UNKNOWN">Periksa Remarks</option></select></div><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{categories.map((item)=><button key={item} onClick={()=>setCategory(item)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-black ${category===item?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}>{item}</button>)}</div></section>
          {active ? <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500"><span className="inline-flex items-center gap-1"><CalendarDays className="size-4"/> Pricelist {formatDate(active.priceListDate)}</span><span className="inline-flex items-center gap-1"><Tag className="size-4"/> {active.fileName}</span><span>{groups.length} group / {filteredProducts.length} SKU</span></div> : null}
          <section className="mt-5 grid gap-4 xl:grid-cols-2">{active ? groups.map((group)=><GroupCard key={group.key} group={group}/>) : <div className="col-span-full rounded-3xl border border-dashed bg-white p-10 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-950"><Upload className="mx-auto size-8 text-slate-300"/><h2 className="mt-3 font-black text-slate-700 dark:text-slate-200">Belum ada Pricelist aktif</h2><p className="mt-1 text-sm">Upload Pricelist Digimap terbaru untuk mulai menggunakan Promo Board.</p></div>}</section>
        </> : null}

        {view === "changes" ? <section className="mt-4 rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center gap-2"><History className="size-5 text-blue-600"/><h2 className="text-xl font-black">Perubahan Pricelist Terakhir</h2></div>{history[0] && active ? <><p className="mt-1 text-sm text-slate-500">{formatDate(history[0].priceListDate)} → {formatDate(active.priceListDate)}</p><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[["Harga Turun",lastComparison.counts.PROMO_PRICE_DOWN],["Harga Naik",lastComparison.counts.PROMO_PRICE_UP],["Promo Baru",lastComparison.counts.NEW_PROMO+lastComparison.counts.NEW_PRODUCT],["Promo Berakhir",lastComparison.counts.PROMO_ENDED+lastComparison.counts.REMOVED_PRODUCT],["Periode Berubah",lastComparison.counts.PROMO_PERIOD_CHANGED]].map(([label,value])=><div key={String(label)} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}</div><div className="mt-5 divide-y dark:divide-slate-800">{lastComparison.changes.filter((x)=>x.type!=="UNCHANGED").slice(0,80).map((change)=><div key={`${change.type}-${change.sapArticle}`} className="py-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><b>{change.description}</b><p className="text-xs text-slate-400">{change.sapArticle}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black dark:bg-slate-900">{change.type.replaceAll("_"," ")}</span></div>{change.previous && change.current && change.previous.promotionPrice !== change.current.promotionPrice ? <p className="mt-1 text-xs text-slate-500">{money.format(change.previous.promotionPrice)} → <b>{money.format(change.current.promotionPrice)}</b></p> : null}</div>)}</div></> : <p className="mt-4 text-sm text-slate-500">Belum ada dua Pricelist untuk dibandingkan. Upload Pricelist berikutnya, lalu perubahan akan muncul otomatis.</p>}</section> : null}

        {view === "history" ? <section className="mt-4 rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><h2 className="text-xl font-black">Riwayat Upload</h2><div className="mt-4 divide-y dark:divide-slate-800">{active ? <div className="flex items-center justify-between gap-3 py-3"><div><b>{formatDate(active.priceListDate)}</b><p className="text-xs text-slate-500">{active.fileName}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">ACTIVE</span></div> : null}{history.map((item,index)=><div key={`${item.fileName}-${index}`} className="flex items-center justify-between gap-3 py-3"><div><b>{formatDate(item.priceListDate)}</b><p className="text-xs text-slate-500">{item.fileName}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">ARCHIVED</span></div>)}{!active && !history.length ? <p className="py-8 text-center text-sm text-slate-500">Belum ada riwayat upload.</p> : null}</div></section> : null}
      </div>
    </main>
  );
}
