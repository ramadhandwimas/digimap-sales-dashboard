"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, Search, Tag, Upload, XCircle } from "lucide-react";
import { parsePromoWorkbook, type PromoParseResult, type PromoProduct, type PromoStatus } from "@/lib/promo-board-parser";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" });
const STORAGE_KEY = "m238-promo-board-active-v1";

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

function ProductCard({ product }: { product: PromoProduct }) {
  const status = statusMeta(product.promoStatus, product.daysRemaining);
  const hasDiscount = product.savingAmount > 0;
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[.12em] text-blue-600">{product.category}</p>
          <h2 className="mt-1 break-words text-lg font-black leading-snug text-slate-950 dark:text-white">{product.sapDescription}</h2>
          <p className="mt-1 text-xs font-medium text-slate-400">SAP {product.sapArticle}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${status.cls}`}>{status.label}</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
          <p className="text-xs font-semibold text-slate-400">Normal Price</p>
          <p className="mt-1 text-sm font-bold text-slate-500 line-through">{product.normalPrice ? money.format(product.normalPrice) : "-"}</p>
          <p className="mt-3 text-xs font-semibold text-slate-400">Promo Price</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-blue-600">{product.promotionPrice ? money.format(product.promotionPrice) : "-"}</p>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-200 p-4 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-400">Saving</p>
          <p className="mt-1 text-lg font-black text-emerald-600">{hasDiscount ? money.format(product.savingAmount) : "Tidak ada price discount"}</p>
          {hasDiscount ? <p className="mt-1 text-xs font-bold text-emerald-600">{product.discountPercentage.toFixed(1)}% lebih hemat</p> : null}
          <div className="mt-4 border-t border-dashed pt-3 text-xs text-slate-500">
            <p className="font-bold text-slate-700 dark:text-slate-200">Periode Promo</p>
            <p className="mt-1">{product.promoStartDate ? formatDate(product.promoStartDate) : "Tidak terdeteksi"} → {product.promoPeriodType === "FURTHER_NOTICE" ? "Further Notice" : product.promoEndDate ? formatDate(product.promoEndDate) : "Periksa Remarks"}</p>
          </div>
        </div>
      </div>

      <details className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        <summary className="cursor-pointer text-sm font-extrabold">Detail Promo</summary>
        <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
          <p><b>Remarks:</b> {product.remarks || "-"}</p>
          <p><b>BR/ZOUT:</b> {product.brZout || "-"}</p>
          <p><b>Cicilan Bundling:</b> {product.promotionInstallmentBundling ? money.format(product.promotionInstallmentBundling) : "-"}</p>
          <p><b>Cash Bundling:</b> {product.promotionCashBundling ? money.format(product.promotionCashBundling) : "-"}</p>
          <p><b>Section:</b> {product.section || "-"}</p>
          <p><b>EOL:</b> {product.eolStatus || "-"}</p>
        </div>
      </details>
    </article>
  );
}

export default function PromoBoardApp() {
  const [active, setActive] = useState<PromoParseResult | null>(null);
  const [preview, setPreview] = useState<PromoParseResult | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [status, setStatus] = useState<PromoStatus | "ALL">("ALL");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setActive(JSON.parse(raw));
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

  const activate = () => {
    if (!preview) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preview));
    setActive(preview);
    setPreview(null);
  };

  const source = active?.products ?? [];
  const categories = useMemo(() => ["Semua", ...Array.from(new Set(source.map((x) => x.category))).sort()], [source]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return source.filter((item) => {
      const text = `${item.sapArticle} ${item.sapDescription} ${item.section}`.toLowerCase();
      return (!q || text.includes(q)) && (category === "Semua" || item.category === category) && (status === "ALL" || item.promoStatus === status);
    });
  }, [source, query, category, status]);

  const metrics = useMemo(() => ({
    active: source.filter((x) => x.promoStatus === "ACTIVE").length,
    further: source.filter((x) => x.promoStatus === "FURTHER_NOTICE").length,
    ending: source.filter((x) => x.promoStatus === "ENDING_SOON").length,
    expired: source.filter((x) => x.promoStatus === "EXPIRED").length,
    discounted: source.filter((x) => x.savingAmount > 0).length,
  }), [source]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-900 dark:text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <a href="/" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-blue-600"><ArrowLeft className="size-4" /> Dashboard M238</a>
            <p className="mt-4 text-xs font-black uppercase tracking-[.18em] text-blue-600">M238 Digimap PIM 2</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Promo Board</h1>
            <p className="mt-1 text-sm text-slate-500">Cek promo device aktif, harga promo, dan masa berlakunya dari Pricelist Digimap terbaru.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700">
            <Upload className="size-4" /> {busy ? "Menganalisa..." : "Upload Pricelist Terbaru"}
            <input type="file" accept=".xlsx,.xls" className="hidden" disabled={busy} onChange={(e) => void handleFile(e.target.files?.[0])} />
          </label>
        </div>

        {error ? <div className="mt-5 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700"><XCircle className="size-5" />{error}</div> : null}

        {preview ? (
          <section className="mt-6 rounded-3xl border border-blue-200 bg-white p-5 shadow-sm dark:border-blue-900 dark:bg-slate-950">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.15em] text-blue-600">Preview sebelum update</p>
                <h2 className="mt-1 text-xl font-black">Hasil Analisa Pricelist</h2>
                <p className="mt-1 text-sm text-slate-500">{preview.fileName}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setPreview(null)} className="rounded-xl border px-4 py-2 text-sm font-bold">Batalkan</button>
                <button onClick={activate} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">Gunakan Sebagai Pricelist Aktif</button>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-xs text-slate-400">Tanggal Pricelist</p><b>{formatDate(preview.priceListDate)}</b></div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-xs text-slate-400">Total SKU Valid</p><b>{preview.totalSku}</b></div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-xs text-slate-400">Sheet</p><b>{preview.sheetName}</b></div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-xs text-slate-400">Warning</p><b>{preview.warnings.length}</b></div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-700"><CheckCircle2 className="size-4" /> Struktur file, sheet, header, dan harga berhasil dibaca.</div>
            {preview.warnings.length ? <div className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">{preview.warnings.slice(0, 8).map((w) => <p key={w}>⚠️ {w}</p>)}</div> : null}
          </section>
        ) : null}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Promo Aktif", metrics.active, "Aktif berdasarkan periode"],
            ["Further Notice", metrics.further, "Berlaku sampai info lanjut"],
            ["Akan Berakhir", metrics.ending, "≤ 7 hari"],
            ["Expired", metrics.expired, "Periode sudah lewat"],
            ["Price Discount", metrics.discounted, "Promo price < normal price"],
          ].map(([label, value, sub]) => <div key={String(label)} className="rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="mt-1 text-[11px] text-slate-400">{sub}</p></div>)}
        </section>

        <section className="mt-6 rounded-3xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari iPhone 17, MacBook, 256GB, SAP Article..." className="h-12 w-full rounded-2xl border bg-transparent pl-10 pr-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-200"/></div>
            <select value={status} onChange={(e) => setStatus(e.target.value as PromoStatus | "ALL")} className="h-12 rounded-2xl border bg-transparent px-4 text-sm font-bold"><option value="ALL">Semua Status</option><option value="ACTIVE">Aktif</option><option value="FURTHER_NOTICE">Further Notice</option><option value="ENDING_SOON">Akan Berakhir</option><option value="EXPIRED">Expired</option><option value="UNKNOWN">Periksa Remarks</option></select>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-black ${category === item ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}>{item}</button>)}</div>
        </section>

        {active ? <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500"><span className="inline-flex items-center gap-1"><CalendarDays className="size-4"/> Pricelist {formatDate(active.priceListDate)}</span><span className="inline-flex items-center gap-1"><Tag className="size-4"/> {active.fileName}</span><span>{filtered.length} dari {active.totalSku} SKU</span></div> : null}

        <section className="mt-5 grid gap-4 xl:grid-cols-2">
          {active ? filtered.map((product) => <ProductCard key={product.sapArticle} product={product}/>) : <div className="col-span-full rounded-3xl border border-dashed bg-white p-10 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-950"><Upload className="mx-auto size-8 text-slate-300"/><h2 className="mt-3 font-black text-slate-700 dark:text-slate-200">Belum ada Pricelist aktif</h2><p className="mt-1 text-sm">Upload file Pricelist Digimap terbaru untuk mulai menggunakan Promo Board.</p></div>}
          {active && !filtered.length ? <div className="col-span-full rounded-3xl border border-dashed p-10 text-center text-sm text-slate-500">Tidak ada produk yang cocok dengan pencarian/filter ini.</div> : null}
        </section>
      </div>
    </main>
  );
}
