"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Menu, Target, X } from "lucide-react";

type FocusView = "lob" | "product" | "vas" | null;
type WeeklyPayload = {
  labelB?: string;
  periodB?: { start?: string; end?: string };
  b?: {
    lob?: Record<string, Record<string, { qty: number; amount: number }>>;
    vas?: Record<string, { qty: number; amount: number }>;
  };
  targets?: {
    lob?: Record<string, number>;
    types?: Record<string, Record<string, { target: number; focus: boolean }>>;
  };
};
type ProductFocusPayload = {
  rows?: Array<{
    focus?: {
      iphone15?: number;
      macbookNeo?: number;
      ipad11?: number;
      watchSe?: number;
    };
  }>;
};

const number = new Intl.NumberFormat("id-ID");
const money = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function totalQty(values?: Record<string, { qty: number; amount: number }>) {
  return Object.values(values ?? {}).reduce((sum, row) => sum + (row.qty || 0), 0);
}

export default function M238AppleUI() {
  const [hidden, setHidden] = useState(false);
  const [view, setView] = useState<FocusView>(null);
  const [weekly, setWeekly] = useState<WeeklyPayload | null>(null);
  const [product, setProduct] = useState<ProductFocusPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("2026-09");

  useEffect(() => {
    const saved = localStorage.getItem("m238-sidebar-hidden") === "1";
    setHidden(saved);
    document.body.classList.add("m238-apple-ui");
    document.body.classList.toggle("m238-sidebar-hidden", saved);

    const toggleSidebar = () => {
      setHidden((current) => {
        const next = !current;
        localStorage.setItem("m238-sidebar-hidden", next ? "1" : "0");
        document.body.classList.toggle("m238-sidebar-hidden", next);
        return next;
      });
    };

    const openView = (event: Event) => {
      const detail = (event as CustomEvent<{ view?: FocusView }>).detail;
      if (detail?.view) setView(detail.view);
    };

    window.addEventListener("m238-sidebar-toggle", toggleSidebar);
    window.addEventListener("m238-focus-view", openView as EventListener);

    const apply = () => {
      const aside = document.querySelector("aside");
      const main = document.querySelector("main");
      if (!aside || !main) return;
      const shell = aside.parentElement;
      shell?.classList.add("m238-app-shell");
      aside.classList.add("m238-sidebar");
      main.classList.add("m238-main");

      const brandRow = aside.querySelector(".p-5 > div.flex.items-center.gap-3") as HTMLElement | null;
      if (brandRow && !brandRow.querySelector("[data-m238-sidebar-close]")) {
        brandRow.style.position = "relative";
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.m238SidebarClose = "1";
        button.className = "m238-brand-close";
        button.title = "Tutup menu";
        button.setAttribute("aria-label", "Tutup menu");
        button.textContent = "•••";
        button.onclick = () => window.dispatchEvent(new Event("m238-sidebar-toggle"));
        brandRow.appendChild(button);
      }

      const nav = aside.querySelector("nav");
      if (nav && !nav.querySelector("[data-m238-target-focus]")) {
        const wrap = document.createElement("div");
        wrap.dataset.m238TargetFocus = "1";
        wrap.className = "m238-target-focus rounded-xl p-1";
        wrap.innerHTML = `
          <button type="button" class="m238-target-head">
            <span class="m238-target-icon">◎</span>
            <span>Target Fokus</span>
            <span class="m238-target-chevron">⌄</span>
          </button>
          <div class="m238-target-items">
            <button type="button" data-focus-view="lob">LOB Target Fokus</button>
            <button type="button" data-focus-view="product">Product Fokus</button>
            <button type="button" data-focus-view="vas">VAS • Qoala / Telkomsel / XL / Indosat</button>
          </div>`;
        const head = wrap.querySelector(".m238-target-head") as HTMLButtonElement | null;
        const items = wrap.querySelector(".m238-target-items") as HTMLElement | null;
        head?.addEventListener("click", () => items?.classList.toggle("is-open"));
        wrap.querySelectorAll("[data-focus-view]").forEach((button) => {
          button.addEventListener("click", () => {
            const next = (button as HTMLElement).dataset.focusView as FocusView;
            window.dispatchEvent(new CustomEvent("m238-focus-view", { detail: { view: next } }));
          });
        });
        const firstGroup = nav.firstElementChild;
        if (firstGroup?.nextSibling) nav.insertBefore(wrap, firstGroup.nextSibling);
        else nav.appendChild(wrap);
      }
    };

    apply();
    const mo = new MutationObserver(apply);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      window.removeEventListener("m238-sidebar-toggle", toggleSidebar);
      window.removeEventListener("m238-focus-view", openView as EventListener);
      document.body.classList.remove("m238-apple-ui", "m238-sidebar-hidden");
    };
  }, []);

  useEffect(() => {
    if (!view) return;
    const selected = [...document.querySelectorAll("select")]
      .map((node) => (node as HTMLSelectElement).value)
      .find((value) => /^2026-(0[1-9]|1[0-2])$/.test(value));
    const activePeriod = selected || "2026-09";
    setPeriod(activePeriod);
    setLoading(true);
    Promise.all([
      fetch("/api/weekly", { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/m238-product-focus?period=${encodeURIComponent(activePeriod)}`, { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([weeklyData, productData]) => {
        setWeekly(weeklyData);
        setProduct(productData);
      })
      .finally(() => setLoading(false));
  }, [view]);

  const productTotals = useMemo(() => {
    const result = { iphone15: 0, macbookNeo: 0, ipad11: 0, watchSe: 0 };
    for (const row of product?.rows ?? []) {
      result.iphone15 += row.focus?.iphone15 || 0;
      result.macbookNeo += row.focus?.macbookNeo || 0;
      result.ipad11 += row.focus?.ipad11 || 0;
      result.watchSe += row.focus?.watchSe || 0;
    }
    return result;
  }, [product]);

  const focusTarget = (lob: string) =>
    Object.values(weekly?.targets?.types?.[lob] ?? {})
      .filter((row) => row.focus)
      .reduce((sum, row) => sum + (row.target || 0), 0);

  const lobCards = [
    ["iPhone", "IPHONE"],
    ["MacBook", "MAC"],
    ["iPad", "IPAD"],
    ["Apple Watch", "APPLE WATCH"],
    ["AirPods", "AIRPODS"],
  ] as const;

  const productCards = [
    ["iPhone 15", productTotals.iphone15, focusTarget("IPHONE")],
    ["MacBook Neo", productTotals.macbookNeo, focusTarget("MAC")],
    ["iPad 11", productTotals.ipad11, focusTarget("IPAD")],
    ["Watch SE", productTotals.watchSe, focusTarget("APPLE WATCH")],
  ] as const;

  const vasCards = ["QOALA", "TELKOMSEL", "XL", "INDOSAT"] as const;

  return (
    <>
      {hidden && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("m238-sidebar-toggle"))}
          className="m238-menu-open"
          title="Buka menu"
          aria-label="Buka menu"
        >
          <Menu className="size-5" />
        </button>
      )}

      {view && (
        <section className="m238-focus-panel">
          <div className="m238-focus-header">
            <div>
              <p className="m238-focus-kicker">M238 • Target Fokus</p>
              <h1>
                {view === "lob" ? "LOB Target Fokus" : view === "product" ? "Product Fokus" : "VAS Fokus"}
              </h1>
              <p>
                {view === "lob"
                  ? `${weekly?.labelB || "Week berjalan"} • target vs actual`
                  : view === "product"
                    ? `${period} • achievement product focus`
                    : `${weekly?.labelB || "Week berjalan"} • Qoala, Telkomsel, XL, Indosat`}
              </p>
            </div>
            <button type="button" onClick={() => setView(null)} aria-label="Tutup Target Fokus">
              <X className="size-5" />
            </button>
          </div>

          {loading ? (
            <div className="m238-focus-empty">Memuat Target Fokus…</div>
          ) : view === "lob" ? (
            <div className="m238-focus-grid">
              {lobCards.map(([label, key]) => {
                const actual = totalQty(weekly?.b?.lob?.[key]);
                const target = weekly?.targets?.lob?.[key] || 0;
                const achievement = target ? (actual / target) * 100 : 0;
                return (
                  <article key={key}>
                    <span>{label}</span>
                    <strong>{number.format(actual)} unit</strong>
                    <small>Target {number.format(target)} • {achievement.toFixed(0)}%</small>
                    <div className="m238-focus-progress"><i style={{ width: `${Math.min(100, achievement)}%` }} /></div>
                  </article>
                );
              })}
            </div>
          ) : view === "product" ? (
            <div className="m238-focus-grid">
              {productCards.map(([label, actual, target]) => {
                const achievement = target ? (actual / target) * 100 : 0;
                return (
                  <article key={label}>
                    <span>{label}</span>
                    <strong>{number.format(actual)} unit</strong>
                    <small>{target ? `Target ${number.format(target)} • ${achievement.toFixed(0)}%` : "Target fokus belum diisi"}</small>
                    <div className="m238-focus-progress"><i style={{ width: `${Math.min(100, achievement)}%` }} /></div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="m238-focus-grid">
              {vasCards.map((provider) => {
                const row = weekly?.b?.vas?.[provider] || { qty: 0, amount: 0 };
                return (
                  <article key={provider}>
                    <span>{provider === "QOALA" ? "Qoala" : provider[0] + provider.slice(1).toLowerCase()}</span>
                    <strong>{number.format(row.qty)} transaksi</strong>
                    <small>{money.format(row.amount)}</small>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <style jsx global>{`
        body.m238-apple-ui {
          background: #f5f5f7 !important;
          color: #1d1d1f;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
        }
        body.m238-apple-ui .m238-app-shell {
          background: #f5f5f7 !important;
          transition: grid-template-columns .22s ease;
        }
        body.m238-apple-ui .m238-sidebar {
          background: rgba(255,255,255,.92) !important;
          color: #1d1d1f !important;
          border-right: 1px solid rgba(0,0,0,.08) !important;
          box-shadow: 8px 0 30px rgba(0,0,0,.035);
          backdrop-filter: saturate(180%) blur(22px);
          -webkit-backdrop-filter: saturate(180%) blur(22px);
          overflow-y: auto !important;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: rgba(0,0,0,.18) transparent;
        }
        body.m238-apple-ui .m238-sidebar > div { min-height: 100%; height: auto !important; }
        body.m238-apple-ui .m238-sidebar nav { padding-bottom: 28px !important; }
        body.m238-apple-ui .m238-sidebar [class*="text-white"] { color: #424245 !important; }
        body.m238-apple-ui .m238-sidebar [class*="border-white"] { border-color: rgba(0,0,0,.08) !important; }
        body.m238-apple-ui .m238-sidebar [class*="bg-white/5"],
        .m238-target-focus {
          background: rgba(118,118,128,.07) !important;
          border-radius: 16px !important;
        }
        body.m238-apple-ui .m238-sidebar button {
          color: #424245 !important;
          border-radius: 12px !important;
          transition: background .18s ease, color .18s ease;
        }
        body.m238-apple-ui .m238-sidebar button:hover { background: rgba(0,113,227,.08) !important; color: #0071e3 !important; }
        body.m238-apple-ui .m238-sidebar button[class*="bg-white/20"] { background:#eaf3ff !important; color:#0071e3 !important; box-shadow: inset 0 0 0 1px rgba(0,113,227,.08) !important; }
        body.m238-apple-ui .m238-sidebar svg { stroke-width: 1.8 !important; }
        body.m238-apple-ui .m238-sidebar .size-11 { background:linear-gradient(145deg,#1d1d1f,#4b4b4f) !important; color:#fff !important; border-radius:14px !important; box-shadow:0 7px 18px rgba(0,0,0,.14); }
        .m238-brand-close {
          margin-left: auto !important;
          min-width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 0;
          background: transparent;
          color: #6e6e73 !important;
          font-size: 18px;
          letter-spacing: 2px;
          line-height: 1;
          cursor: pointer;
        }
        .m238-target-head { width:100%; display:flex; align-items:center; gap:8px; padding:12px; border:0; background:transparent; font-weight:800; font-size:14px; }
        .m238-target-head .m238-target-icon { font-size:18px; color:#0071e3; }
        .m238-target-head .m238-target-chevron { margin-left:auto; color:#8e8e93; }
        .m238-target-items { display:none; gap:4px; padding:2px 4px 6px 28px; }
        .m238-target-items.is-open { display:grid; }
        .m238-target-items button { width:100%; border:0; background:transparent; text-align:left; padding:9px 10px; font-size:12px; font-weight:700; }
        body.m238-apple-ui .m238-main { background:#f5f5f7 !important; min-width:0; }
        body.m238-apple-ui .m238-main > header { position:sticky; top:0; z-index:45; background:rgba(250,250,252,.84) !important; border-color:rgba(0,0,0,.07) !important; backdrop-filter:saturate(180%) blur(20px); -webkit-backdrop-filter:saturate(180%) blur(20px); }
        body.m238-apple-ui .m238-main article,
        body.m238-apple-ui .m238-main section[class*="rounded-2xl"],
        body.m238-apple-ui .m238-main section[class*="rounded-3xl"],
        body.m238-apple-ui .m238-main div[class*="rounded-2xl"][class*="bg-white"],
        body.m238-apple-ui .m238-main div[class*="rounded-3xl"][class*="bg-white"] { border-color:rgba(0,0,0,.07) !important; box-shadow:0 8px 24px rgba(0,0,0,.045) !important; }
        body.m238-apple-ui .m238-main article { border-radius:20px !important; background:rgba(255,255,255,.96) !important; }
        body.m238-apple-ui .m238-main h1, body.m238-apple-ui .m238-main h2, body.m238-apple-ui .m238-main h3 { letter-spacing:-.025em; color:#1d1d1f; }
        body.m238-apple-ui .m238-main table { background:rgba(255,255,255,.96); }
        body.m238-apple-ui .m238-main thead { background:#f5f5f7 !important; }
        body.m238-apple-ui .m238-main th { color:#6e6e73 !important; font-size:11px !important; letter-spacing:.035em; }
        body.m238-apple-ui .m238-main td { color:#1d1d1f; }
        body.m238-apple-ui .m238-main tbody tr:hover { background:#f7fbff !important; }
        body.m238-apple-ui .m238-main select, body.m238-apple-ui .m238-main input, body.m238-apple-ui .m238-main textarea { border-color:rgba(0,0,0,.12) !important; border-radius:12px !important; background:rgba(255,255,255,.96) !important; }
        body.m238-apple-ui .m238-main button { border-radius:12px !important; }
        body.m238-apple-ui .m238-main [class*="bg-blue-600"] { background:#0071e3 !important; }
        body.m238-apple-ui .m238-main [class*="text-blue-600"] { color:#0071e3 !important; }
        body.m238-apple-ui .m238-main [class*="bg-blue-50"] { background:#eef6ff !important; }

        .m238-menu-open {
          position:fixed; z-index:90; left:14px; top:12px; width:40px; height:40px; display:grid; place-items:center;
          border:1px solid rgba(0,0,0,.10); border-radius:12px; background:rgba(255,255,255,.92); color:#1d1d1f;
          box-shadow:0 8px 24px rgba(0,0,0,.10); backdrop-filter:blur(18px);
        }
        @media (min-width:1024px) {
          body.m238-sidebar-hidden .m238-app-shell { grid-template-columns:0 minmax(0,1fr) !important; }
          body.m238-sidebar-hidden .m238-sidebar { display:none !important; }
        }
        @media (max-width:1023px) {
          body.m238-sidebar-hidden .m238-sidebar { display:none !important; }
          body.m238-apple-ui .m238-sidebar { box-shadow:none; border-right:0 !important; max-height:70vh; }
        }
        @media (max-width:640px) {
          body.m238-apple-ui .m238-main > div[class*="px-4"] { padding-left:14px !important; padding-right:14px !important; }
          body.m238-apple-ui .m238-main article { padding:16px !important; }
        }

        .m238-focus-panel {
          position:fixed; z-index:75; inset:0 0 0 236px; overflow:auto; background:#f5f5f7; padding:28px;
          transition:left .22s ease;
        }
        body.m238-sidebar-hidden .m238-focus-panel { left:0; }
        .m238-focus-header { max-width:1260px; margin:0 auto 22px; display:flex; justify-content:space-between; align-items:flex-start; gap:20px; }
        .m238-focus-header h1 { margin:5px 0 3px; font-size:34px; line-height:1.05; letter-spacing:-.04em; }
        .m238-focus-header p { margin:0; color:#6e6e73; }
        .m238-focus-kicker { color:#0071e3 !important; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.14em; }
        .m238-focus-header button { width:40px; height:40px; display:grid; place-items:center; border:1px solid rgba(0,0,0,.09); border-radius:50%; background:#fff; }
        .m238-focus-grid { max-width:1260px; margin:0 auto; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
        .m238-focus-grid article { background:#fff; border:1px solid rgba(0,0,0,.07); border-radius:22px; padding:22px; box-shadow:0 8px 24px rgba(0,0,0,.045); }
        .m238-focus-grid article span { display:block; color:#6e6e73; font-size:13px; font-weight:700; }
        .m238-focus-grid article strong { display:block; margin-top:8px; font-size:28px; letter-spacing:-.04em; }
        .m238-focus-grid article small { display:block; margin-top:8px; color:#6e6e73; font-size:13px; }
        .m238-focus-progress { height:7px; margin-top:15px; overflow:hidden; border-radius:999px; background:#e9e9eb; }
        .m238-focus-progress i { display:block; height:100%; border-radius:999px; background:#0071e3; }
        .m238-focus-empty { max-width:1260px; margin:0 auto; padding:36px; text-align:center; color:#6e6e73; background:#fff; border-radius:22px; }
        @media (max-width:1023px) { .m238-focus-panel { left:0; padding:20px 16px; } }
        @media (max-width:680px) { .m238-focus-grid { grid-template-columns:1fr; } .m238-focus-header h1 { font-size:28px; } }

        .dark body.m238-apple-ui, body.m238-apple-ui.dark { background:#000 !important; }
        .dark body.m238-apple-ui .m238-main { background:#000 !important; }
        .dark body.m238-apple-ui .m238-sidebar { background:rgba(28,28,30,.94) !important; color:#f5f5f7 !important; }
        .dark body.m238-apple-ui .m238-sidebar button { color:#f5f5f7 !important; }
        .dark body.m238-apple-ui .m238-main h1, .dark body.m238-apple-ui .m238-main h2, .dark body.m238-apple-ui .m238-main h3, .dark body.m238-apple-ui .m238-main td { color:#f5f5f7 !important; }
      `}</style>
    </>
  );
}
