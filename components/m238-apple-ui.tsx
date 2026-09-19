"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";

export default function M238AppleUI() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width:1023px)").matches;
    const saved = localStorage.getItem("m238-sidebar-hidden") === "1";
    const initialHidden = mobile ? true : saved;

    setHidden(initialHidden);
    document.body.classList.add("m238-apple-ui");
    document.body.classList.toggle("m238-sidebar-hidden", initialHidden);

    const setSidebarHidden = (next: boolean) => {
      setHidden(next);
      document.body.classList.toggle("m238-sidebar-hidden", next);
      if (!mobile) localStorage.setItem("m238-sidebar-hidden", next ? "1" : "0");
    };

    const toggle = () =>
      setHidden((current) => {
        const next = !current;
        document.body.classList.toggle("m238-sidebar-hidden", next);
        if (!mobile) localStorage.setItem("m238-sidebar-hidden", next ? "1" : "0");
        return next;
      });

    const closeAfterNav = (event: MouseEvent) => {
      if (!mobile) return;
      const target = event.target as HTMLElement | null;
      const control = target?.closest("nav a, nav button") as HTMLElement | null;
      if (!control || control.hasAttribute("aria-expanded")) return;
      setSidebarHidden(true);
    };

    const normalizeDarkCanvas = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const main = document.querySelector(".m238-main") as HTMLElement | null;
      if (!main) return;

      const candidates = [
        main,
        ...Array.from(main.querySelectorAll<HTMLElement>("div, section")),
      ];

      for (const el of candidates) {
        el.classList.remove("m238-dark-canvas-fix");
        if (!isDark) continue;

        const rect = el.getBoundingClientRect();
        if (rect.width < window.innerWidth * 0.72 || rect.height < 180) continue;

        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor.replace(/\s+/g, "");
        const isLight =
          bg === "rgb(255,255,255)" ||
          bg === "rgb(248,250,252)" ||
          bg === "rgb(249,250,251)" ||
          bg === "rgb(245,247,251)" ||
          bg === "rgb(241,245,249)" ||
          bg === "rgba(255,255,255,0.9)" ||
          bg === "rgba(255,255,255,0.96)";

        const looksLikeCard =
          el.matches("article") ||
          el.className.includes("rounded-2xl") ||
          el.className.includes("rounded-3xl") ||
          el.getAttribute("role") === "dialog";

        if (isLight && !looksLikeCard) {
          el.classList.add("m238-dark-canvas-fix");
        }
      }
    };

    const apply = () => {
      const aside = document.querySelector("aside") as HTMLElement | null;
      const main = document.querySelector("main") as HTMLElement | null;
      if (!aside || !main) return;

      aside.parentElement?.classList.add("m238-app-shell");
      aside.classList.add("m238-sidebar");
      main.classList.add("m238-main");

      normalizeDarkCanvas();

      const brand = aside.querySelector(
        ".p-5 > div.flex.items-center.gap-3",
      ) as HTMLElement | null;

      if (brand && !brand.querySelector("[data-m238-sidebar-close]")) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.m238SidebarClose = "1";
        btn.className = "m238-brand-close";
        btn.title = "Tutup menu";
        btn.setAttribute("aria-label", "Tutup menu");
        btn.innerHTML =
          '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>';
        btn.onclick = () => window.dispatchEvent(new Event("m238-sidebar-toggle"));
        brand.appendChild(btn);
      }
    };

    window.addEventListener("m238-sidebar-toggle", toggle);
    document.addEventListener("click", closeAfterNav, true);
    apply();

    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });

    const themeObserver = new MutationObserver(() => {
      window.requestAnimationFrame(() => {
        normalizeDarkCanvas();
      });
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    window.addEventListener("resize", normalizeDarkCanvas);

    return () => {
      observer.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("resize", normalizeDarkCanvas);
      window.removeEventListener("m238-sidebar-toggle", toggle);
      document.removeEventListener("click", closeAfterNav, true);
      document.body.classList.remove("m238-apple-ui", "m238-sidebar-hidden");
    };
  }, []);

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

      <style jsx global>{`
        body.m238-apple-ui {
          --m238-bg: #f5f7fb;
          --m238-panel: rgba(255, 255, 255, 0.96);
          --m238-panel-solid: #ffffff;
          --m238-panel-subtle: #f8fafc;
          --m238-text: #0f172a;
          --m238-muted: #64748b;
          --m238-muted-2: #94a3b8;
          --m238-border: rgba(15, 23, 42, 0.08);
          --m238-border-strong: rgba(15, 23, 42, 0.12);
          --m238-accent: #2563eb;
          --m238-accent-hover: #1d4ed8;
          --m238-accent-soft: #eff6ff;
          --m238-positive: #059669;
          --m238-warning: #d97706;
          --m238-negative: #e11d48;
          --m238-sidebar-bg: #0a1020;
          --m238-sidebar-bg-2: #111a31;
          --m238-sidebar-text: #cbd5e1;
          --m238-sidebar-muted: #7f8ba3;
          --m238-sidebar-active: rgba(59, 130, 246, 0.16);
          --m238-shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.03);
          --m238-shadow-sm: 0 2px 8px rgba(15, 23, 42, 0.045);
          --m238-shadow-md: 0 12px 32px rgba(15, 23, 42, 0.07);
          --m238-radius: 18px;
          background: var(--m238-bg) !important;
          color: var(--m238-text) !important;
          font-family:
            -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
            Inter, "Segoe UI", Helvetica, Arial, sans-serif;
          color-scheme: light;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        body.m238-apple-ui .m238-app-shell,
        body.m238-apple-ui .m238-main {
          background: var(--m238-bg) !important;
        }

        /* Sidebar — Linear-inspired, compact and high contrast */
        body.m238-apple-ui .m238-sidebar {
          background:
            radial-gradient(circle at 18% 0%, rgba(49, 88, 196, 0.19), transparent 30%),
            linear-gradient(180deg, var(--m238-sidebar-bg-2), var(--m238-sidebar-bg)) !important;
          color: var(--m238-sidebar-text) !important;
          border-right: 1px solid rgba(255,255,255,.065) !important;
          box-shadow: 10px 0 38px rgba(2, 6, 23, 0.08);
          overflow-y: auto !important;
          overflow-x: hidden !important;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.22) transparent;
        }

        body.m238-apple-ui .m238-sidebar > div {
          min-height: 100%;
          height: auto !important;
        }

        body.m238-apple-ui .m238-sidebar nav {
          padding: 0 12px 32px !important;
        }

        body.m238-apple-ui .m238-sidebar .p-5 {
          padding: 20px 16px 16px !important;
        }

        body.m238-apple-ui .m238-sidebar [class*="border-white"] {
          border-color: rgba(255,255,255,.08) !important;
        }

        body.m238-apple-ui .m238-sidebar [class*="bg-white/5"] {
          background: transparent !important;
          border-radius: 13px !important;
          padding: 2px !important;
        }

        body.m238-apple-ui .m238-sidebar button {
          color: var(--m238-sidebar-text) !important;
          border-radius: 10px !important;
          transition:
            background .16s ease,
            color .16s ease,
            transform .16s ease;
        }

        body.m238-apple-ui .m238-sidebar nav > div > button {
          min-height: 42px !important;
          padding: 10px 11px !important;
          font-size: 12px !important;
          letter-spacing: .01em;
          color: #dce5f3 !important;
        }

        body.m238-apple-ui .m238-sidebar nav button:hover {
          background: rgba(255,255,255,.055) !important;
          color: #fff !important;
        }

        body.m238-apple-ui .m238-sidebar nav button[class*="bg-white/20"] {
          background: var(--m238-sidebar-active) !important;
          color: #9fc4ff !important;
          box-shadow: inset 0 0 0 1px rgba(96,165,250,.12) !important;
        }

        body.m238-apple-ui .m238-sidebar nav button[class*="bg-white/20"] svg {
          color: #60a5fa !important;
        }

        body.m238-apple-ui .m238-sidebar nav button:not([aria-expanded]) {
          font-size: 12px !important;
          min-height: 38px !important;
        }

        body.m238-apple-ui .m238-sidebar nav button[aria-expanded] svg:last-child {
          width: 15px !important;
          height: 15px !important;
          flex: 0 0 15px !important;
          color: var(--m238-sidebar-muted);
        }

        body.m238-apple-ui .m238-sidebar .size-11 {
          width: 42px !important;
          height: 42px !important;
          border-radius: 13px !important;
          background: linear-gradient(145deg, #2563eb, #5b6df5) !important;
          color: white !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.22),
            0 8px 20px rgba(37,99,235,.25);
        }

        body.m238-apple-ui .m238-sidebar .font-extrabold {
          color: #f8fafc !important;
          letter-spacing: -.015em;
        }

        body.m238-apple-ui .m238-sidebar [class*="text-white/70"] {
          color: #7f8ba3 !important;
        }

        .m238-brand-close {
          margin-left: auto !important;
          width: 32px;
          height: 32px;
          display: grid !important;
          place-items: center !important;
          border: 0 !important;
          background: rgba(255,255,255,.04) !important;
          color: #8995aa !important;
          padding: 0 !important;
          flex: 0 0 auto;
        }

        .m238-brand-close:hover {
          background: rgba(255,255,255,.08) !important;
          color: #fff !important;
        }

        .m238-menu-open {
          position: fixed;
          z-index: 90;
          left: 16px;
          top: 13px;
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border: 1px solid var(--m238-border);
          border-radius: 12px;
          background: rgba(255,255,255,.92);
          color: var(--m238-text);
          box-shadow: var(--m238-shadow-sm);
          backdrop-filter: saturate(150%) blur(18px);
          -webkit-backdrop-filter: saturate(150%) blur(18px);
        }

        /* Sticky top bar — Vercel-like */
        body.m238-apple-ui .m238-main {
          min-width: 0;
          width: 100%;
        }

        body.m238-apple-ui .m238-main > header {
          position: sticky;
          top: 0;
          z-index: 45;
          background: rgba(255,255,255,.82) !important;
          border-color: var(--m238-border) !important;
          backdrop-filter: saturate(170%) blur(20px);
          -webkit-backdrop-filter: saturate(170%) blur(20px);
          box-shadow: 0 1px 0 rgba(15,23,42,.025);
        }

        body.m238-apple-ui .m238-main > header > div {
          min-height: 64px;
        }

        body.m238-apple-ui .m238-main > header button {
          border-color: var(--m238-border-strong) !important;
          background: rgba(255,255,255,.92) !important;
          box-shadow: var(--m238-shadow-xs);
          border-radius: 11px !important;
          transition:
            transform .16s ease,
            border-color .16s ease,
            box-shadow .16s ease;
        }

        body.m238-apple-ui .m238-main > header button:hover {
          border-color: rgba(37,99,235,.20) !important;
          box-shadow: var(--m238-shadow-sm);
          transform: translateY(-1px);
        }

        /* Content width and rhythm */
        body.m238-apple-ui .m238-main > div[class*="px-4"] {
          max-width: 1600px;
          margin: 0 auto;
          padding-top: 26px !important;
          padding-bottom: 42px !important;
        }

        body.m238-apple-ui .m238-main h1 {
          font-size: clamp(26px, 3vw, 34px) !important;
          font-weight: 780 !important;
          letter-spacing: -.045em !important;
          line-height: 1.08 !important;
        }

        body.m238-apple-ui .m238-main h2 {
          letter-spacing: -.03em !important;
        }

        body.m238-apple-ui .m238-main h3,
        body.m238-apple-ui .m238-main h4 {
          letter-spacing: -.018em !important;
        }

        body.m238-apple-ui .m238-main p[class*="text-slate-500"],
        body.m238-apple-ui .m238-main span[class*="text-slate-500"],
        body.m238-apple-ui .m238-main p[class*="text-slate-400"],
        body.m238-apple-ui .m238-main span[class*="text-slate-400"] {
          color: var(--m238-muted) !important;
        }

        /* Cards — Apple spacing, Stripe data density */
        body.m238-apple-ui .m238-soft-card,
        body.m238-apple-ui .m238-subcard,
        body.m238-apple-ui .m238-main article,
        body.m238-apple-ui .m238-main section[class*="rounded-2xl"],
        body.m238-apple-ui .m238-main section[class*="rounded-3xl"],
        body.m238-apple-ui .m238-main div[class*="rounded-2xl"][class*="border"][class*="bg-white"] {
          border-color: var(--m238-border) !important;
          box-shadow: var(--m238-shadow-xs) !important;
        }

        body.m238-apple-ui .m238-main article,
        body.m238-apple-ui .m238-main section[class*="rounded-2xl"]:not([class*="bg-gradient"]),
        body.m238-apple-ui .m238-main section[class*="rounded-3xl"]:not([class*="bg-gradient"]),
        body.m238-apple-ui .m238-main div[class*="rounded-2xl"][class*="border"][class*="bg-white"] {
          background: var(--m238-panel) !important;
        }

        body.m238-apple-ui .m238-main article,
        body.m238-apple-ui .m238-main section[class*="rounded-2xl"],
        body.m238-apple-ui .m238-main section[class*="rounded-3xl"] {
          border-radius: var(--m238-radius) !important;
        }

        body.m238-apple-ui .m238-main article {
          transition:
            border-color .18s ease,
            box-shadow .18s ease,
            transform .18s ease;
        }

        body.m238-apple-ui .m238-main article:hover {
          border-color: rgba(37,99,235,.13) !important;
          box-shadow: var(--m238-shadow-sm) !important;
          transform: translateY(-1px);
        }

        body.m238-apple-ui .m238-subcard {
          background: var(--m238-panel-subtle) !important;
          border: 1px solid var(--m238-border) !important;
          border-radius: 14px !important;
          box-shadow: none !important;
        }

        /* Hero — premium but restrained */
        body.m238-apple-ui .m238-main section[class*="bg-gradient-to-br"] {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 92% -20%, rgba(147,197,253,.38), transparent 34%),
            radial-gradient(circle at 8% 120%, rgba(99,102,241,.28), transparent 38%),
            linear-gradient(135deg, #1748a5 0%, #1f64c9 58%, #326fd0 100%) !important;
          border: 1px solid rgba(255,255,255,.17) !important;
          box-shadow: 0 16px 38px rgba(30,64,175,.15) !important;
        }

        body.m238-apple-ui .m238-main section[class*="bg-gradient-to-br"]::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(120deg, rgba(255,255,255,.065), transparent 28%),
            radial-gradient(circle at 70% 35%, rgba(255,255,255,.08), transparent 32%);
        }

        body.m238-apple-ui .m238-main section[class*="bg-gradient-to-br"] > * {
          position: relative;
          z-index: 1;
        }

        /* Form controls */
        body.m238-apple-ui .m238-main select,
        body.m238-apple-ui .m238-main input,
        body.m238-apple-ui .m238-main textarea {
          border-color: var(--m238-border-strong) !important;
          border-radius: 11px !important;
          background: var(--m238-panel-solid) !important;
          color: var(--m238-text) !important;
          box-shadow: inset 0 1px 0 rgba(15,23,42,.018);
          transition:
            border-color .15s ease,
            box-shadow .15s ease;
        }

        body.m238-apple-ui .m238-main select:focus,
        body.m238-apple-ui .m238-main input:focus,
        body.m238-apple-ui .m238-main textarea:focus {
          border-color: rgba(37,99,235,.42) !important;
          box-shadow: 0 0 0 4px rgba(37,99,235,.08) !important;
          outline: none !important;
        }

        body.m238-apple-ui .m238-main button[class*="bg-blue-600"],
        body.m238-apple-ui .m238-main button[class*="bg-blue-500"] {
          background: var(--m238-accent) !important;
          border-color: var(--m238-accent) !important;
          box-shadow: 0 5px 14px rgba(37,99,235,.14);
        }

        body.m238-apple-ui .m238-main button[class*="bg-blue-600"]:hover,
        body.m238-apple-ui .m238-main button[class*="bg-blue-500"]:hover {
          background: var(--m238-accent-hover) !important;
        }

        /* Tables */
        body.m238-apple-ui .m238-main table {
          background: var(--m238-panel-solid) !important;
          color: var(--m238-text) !important;
          border-collapse: separate;
          border-spacing: 0;
        }

        body.m238-apple-ui .m238-main thead {
          background: #f8fafc !important;
        }

        body.m238-apple-ui .m238-main th {
          color: #64748b !important;
          font-size: 11px !important;
          font-weight: 750 !important;
          letter-spacing: .045em;
          text-transform: uppercase;
          border-color: var(--m238-border) !important;
        }

        body.m238-apple-ui .m238-main td {
          color: var(--m238-text);
          border-color: var(--m238-border) !important;
        }

        body.m238-apple-ui .m238-main tbody tr {
          transition: background .13s ease;
        }

        body.m238-apple-ui .m238-main tbody tr:hover {
          background: #f8fbff !important;
        }

        /* Native embedded pages */
        body.m238-apple-ui .m238-native-view {
          color: var(--m238-text);
        }

        body.m238-apple-ui .m238-native-view .bg-white {
          background: var(--m238-panel-solid) !important;
        }

        body.m238-apple-ui .m238-native-view .bg-slate-50 {
          background: var(--m238-panel-subtle) !important;
        }

        /* Desktop */
        @media (min-width:1024px) {
          body.m238-apple-ui .m238-app-shell {
            grid-template-columns: 248px minmax(0,1fr) !important;
          }

          body.m238-sidebar-hidden .m238-app-shell {
            display: block !important;
            grid-template-columns: none !important;
          }

          body.m238-sidebar-hidden .m238-sidebar {
            display: none !important;
          }

          body.m238-sidebar-hidden .m238-main {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
          }

          body.m238-sidebar-hidden .m238-main > div[class*="px-4"] {
            max-width: 1700px;
            padding-left: 32px !important;
            padding-right: 32px !important;
          }
        }

        /* Mobile — prioritize scanning, not desktop compression */
        @media (max-width:1023px) {
          body.m238-apple-ui .m238-app-shell {
            display: block !important;
          }

          body.m238-apple-ui .m238-sidebar {
            position: fixed !important;
            inset: 0 auto 0 0 !important;
            width: min(86vw, 310px) !important;
            height: 100dvh !important;
            z-index: 80 !important;
            border-bottom: 0 !important;
            box-shadow: 22px 0 70px rgba(2,6,23,.34);
          }

          body.m238-apple-ui .m238-main {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
          }

          body.m238-sidebar-hidden .m238-sidebar {
            display: none !important;
          }

          body.m238-apple-ui .m238-main > header > div {
            min-height: 62px;
            padding-left: 64px !important;
          }

          .m238-menu-open {
            top: 11px;
            left: 12px;
          }
        }

        @media (max-width:640px) {
          body.m238-apple-ui .m238-main > div[class*="px-4"] {
            padding-left: 14px !important;
            padding-right: 14px !important;
            padding-top: 20px !important;
          }

          body.m238-apple-ui .m238-main h1 {
            font-size: 28px !important;
          }

          body.m238-apple-ui .m238-main section[class*="rounded-3xl"] {
            border-radius: 17px !important;
          }

          body.m238-apple-ui .m238-main article {
            border-radius: 15px !important;
          }

          body.m238-apple-ui .m238-main table {
            font-size: 12px;
          }
        }

        /* Dark mode */
        .dark body.m238-apple-ui {
          --m238-bg: #080c14;
          --m238-panel: rgba(15,21,33,.96);
          --m238-panel-solid: #0f1521;
          --m238-panel-subtle: #141b29;
          --m238-text: #eef2f7;
          --m238-muted: #94a3b8;
          --m238-muted-2: #64748b;
          --m238-border: rgba(226,232,240,.075);
          --m238-border-strong: rgba(226,232,240,.11);
          --m238-accent-soft: rgba(37,99,235,.14);
          --m238-shadow-xs: 0 1px 2px rgba(0,0,0,.12);
          --m238-shadow-sm: 0 5px 18px rgba(0,0,0,.16);
          --m238-shadow-md: 0 18px 38px rgba(0,0,0,.22);
          color-scheme: dark;
        }

        .dark body.m238-apple-ui .m238-app-shell,
        .dark body.m238-apple-ui .m238-main {
          background: var(--m238-bg) !important;
        }

        .dark body.m238-apple-ui .m238-main > header {
          background: rgba(8,12,20,.82) !important;
        }

        .dark body.m238-apple-ui .m238-main > header button {
          background: rgba(15,21,33,.92) !important;
          color: var(--m238-text) !important;
        }

        .dark body.m238-apple-ui .m238-main .bg-white,
        .dark body.m238-apple-ui .m238-native-view .bg-white {
          background: var(--m238-panel-solid) !important;
        }

        .dark body.m238-apple-ui .m238-main .bg-slate-50,
        .dark body.m238-apple-ui .m238-native-view .bg-slate-50 {
          background: var(--m238-panel-subtle) !important;
        }

        .dark body.m238-apple-ui .m238-main .text-slate-900,
        .dark body.m238-apple-ui .m238-main .text-slate-800,
        .dark body.m238-apple-ui .m238-native-view .text-slate-900 {
          color: var(--m238-text) !important;
        }

        .dark body.m238-apple-ui .m238-main thead {
          background: #141b29 !important;
        }

        .dark body.m238-apple-ui .m238-main tbody tr:hover {
          background: #131d2c !important;
        }

        .dark body.m238-apple-ui .m238-main select,
        .dark body.m238-apple-ui .m238-main input,
        .dark body.m238-apple-ui .m238-main textarea {
          background: #101827 !important;
        }

        .dark body.m238-apple-ui .m238-dark-canvas-fix {
          background: var(--m238-bg) !important;
          background-color: var(--m238-bg) !important;
          color: var(--m238-text) !important;
        }

        /* Dark canvas hardening: page shell must never stay light */
        .dark body.m238-apple-ui,
        .dark body.m238-apple-ui .m238-app-shell,
        .dark body.m238-apple-ui .m238-main,
        .dark body.m238-apple-ui .m238-main > div,
        .dark body.m238-apple-ui .m238-native-view,
        .dark body.m238-apple-ui .m238-native-view > main,
        .dark body.m238-apple-ui .m238-native-view > div,
        .dark body.m238-apple-ui [class*="min-h-screen"],
        .dark body.m238-apple-ui [class*="min-h-dvh"],
        .dark body.m238-apple-ui [class*="min-h-svh"] {
          background-color: var(--m238-bg) !important;
          color: var(--m238-text) !important;
        }

        .dark body.m238-apple-ui .m238-main > div[class*="px-4"],
        .dark body.m238-apple-ui .m238-main > div[class*="sm:px-"],
        .dark body.m238-apple-ui .m238-main > div[class*="space-y-"] {
          background: transparent !important;
        }

        /* Catch legacy/arbitrary light page backgrounds used by newer overview views */
        .dark body.m238-apple-ui .m238-main [class*="bg-[#f"],
        .dark body.m238-apple-ui .m238-main [class*="bg-[#F"],
        .dark body.m238-apple-ui .m238-main [class*="bg-[rgb(24"],
        .dark body.m238-apple-ui .m238-native-view [class*="bg-[#f"],
        .dark body.m238-apple-ui .m238-native-view [class*="bg-[#F"] {
          background-color: var(--m238-bg) !important;
        }

        .dark body.m238-apple-ui .m238-main > div > div:not([class*="bg-gradient"]):not([class*="rounded"]),
        .dark body.m238-apple-ui .m238-native-view > div > div:not([class*="bg-gradient"]):not([class*="rounded"]) {
          border-color: var(--m238-border) !important;
        }

        /* Complete dark surface normalization */
        .dark body.m238-apple-ui .m238-main,
        .dark body.m238-apple-ui .m238-native-view {
          color: var(--m238-text) !important;
        }

        .dark body.m238-apple-ui .m238-main article,
        .dark body.m238-apple-ui .m238-main section[class*="rounded-2xl"]:not([class*="bg-gradient"]),
        .dark body.m238-apple-ui .m238-main section[class*="rounded-3xl"]:not([class*="bg-gradient"]),
        .dark body.m238-apple-ui .m238-main div[class*="rounded-2xl"][class*="border"][class*="bg-white"],
        .dark body.m238-apple-ui .m238-native-view article,
        .dark body.m238-apple-ui .m238-native-view section[class*="rounded-2xl"],
        .dark body.m238-apple-ui .m238-native-view section[class*="rounded-3xl"] {
          background: var(--m238-panel) !important;
          border-color: var(--m238-border) !important;
          color: var(--m238-text) !important;
          box-shadow: var(--m238-shadow-xs) !important;
        }

        .dark body.m238-apple-ui .m238-main .bg-white,
        .dark body.m238-apple-ui .m238-main .bg-white\/90,
        .dark body.m238-apple-ui .m238-main .bg-slate-50,
        .dark body.m238-apple-ui .m238-main .bg-slate-100,
        .dark body.m238-apple-ui .m238-main .bg-slate-900,
        .dark body.m238-apple-ui .m238-main .bg-slate-950,
        .dark body.m238-apple-ui .m238-native-view .bg-white,
        .dark body.m238-apple-ui .m238-native-view .bg-slate-50,
        .dark body.m238-apple-ui .m238-native-view .bg-slate-100,
        .dark body.m238-apple-ui .m238-native-view .bg-slate-900,
        .dark body.m238-apple-ui .m238-native-view .bg-slate-950 {
          background-color: var(--m238-panel-solid) !important;
        }

        .dark body.m238-apple-ui .m238-main .bg-slate-50,
        .dark body.m238-apple-ui .m238-main .bg-slate-100,
        .dark body.m238-apple-ui .m238-native-view .bg-slate-50,
        .dark body.m238-apple-ui .m238-native-view .bg-slate-100 {
          background-color: var(--m238-panel-subtle) !important;
        }

        .dark body.m238-apple-ui .m238-main .text-slate-950,
        .dark body.m238-apple-ui .m238-main .text-slate-900,
        .dark body.m238-apple-ui .m238-main .text-slate-800,
        .dark body.m238-apple-ui .m238-main .text-slate-700,
        .dark body.m238-apple-ui .m238-main .text-slate-600,
        .dark body.m238-apple-ui .m238-native-view .text-slate-950,
        .dark body.m238-apple-ui .m238-native-view .text-slate-900,
        .dark body.m238-apple-ui .m238-native-view .text-slate-800,
        .dark body.m238-apple-ui .m238-native-view .text-slate-700,
        .dark body.m238-apple-ui .m238-native-view .text-slate-600 {
          color: #e7edf6 !important;
        }

        .dark body.m238-apple-ui .m238-main .text-slate-500,
        .dark body.m238-apple-ui .m238-main .text-slate-400,
        .dark body.m238-apple-ui .m238-main .text-slate-300,
        .dark body.m238-apple-ui .m238-native-view .text-slate-500,
        .dark body.m238-apple-ui .m238-native-view .text-slate-400,
        .dark body.m238-apple-ui .m238-native-view .text-slate-300 {
          color: var(--m238-muted) !important;
        }

        .dark body.m238-apple-ui .m238-main [class*="border-slate"],
        .dark body.m238-apple-ui .m238-native-view [class*="border-slate"],
        .dark body.m238-apple-ui .m238-main [class*="border-gray"],
        .dark body.m238-apple-ui .m238-native-view [class*="border-gray"] {
          border-color: var(--m238-border) !important;
        }

        .dark body.m238-apple-ui .m238-main table,
        .dark body.m238-apple-ui .m238-native-view table {
          background: var(--m238-panel-solid) !important;
          color: var(--m238-text) !important;
        }

        .dark body.m238-apple-ui .m238-main thead,
        .dark body.m238-apple-ui .m238-native-view thead {
          background: #121a28 !important;
        }

        .dark body.m238-apple-ui .m238-main th,
        .dark body.m238-apple-ui .m238-native-view th {
          color: #9ba8bb !important;
          border-color: var(--m238-border) !important;
        }

        .dark body.m238-apple-ui .m238-main td,
        .dark body.m238-apple-ui .m238-native-view td {
          color: #e5ebf4 !important;
          border-color: var(--m238-border) !important;
        }

        .dark body.m238-apple-ui .m238-main tbody tr[class*="bg-slate"],
        .dark body.m238-apple-ui .m238-native-view tbody tr[class*="bg-slate"] {
          background: #141c2a !important;
        }

        .dark body.m238-apple-ui .m238-main tbody tr:hover,
        .dark body.m238-apple-ui .m238-native-view tbody tr:hover {
          background: #162133 !important;
        }

        .dark body.m238-apple-ui .m238-main select,
        .dark body.m238-apple-ui .m238-main input,
        .dark body.m238-apple-ui .m238-main textarea,
        .dark body.m238-apple-ui .m238-native-view select,
        .dark body.m238-apple-ui .m238-native-view input,
        .dark body.m238-apple-ui .m238-native-view textarea {
          background: #111927 !important;
          border-color: var(--m238-border-strong) !important;
          color: #eef2f7 !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.025);
        }

        .dark body.m238-apple-ui input::placeholder,
        .dark body.m238-apple-ui textarea::placeholder {
          color: #66748a !important;
          opacity: 1;
        }

        .dark body.m238-apple-ui .m238-main button[class*="bg-white"],
        .dark body.m238-apple-ui .m238-main button[class*="bg-slate"],
        .dark body.m238-apple-ui .m238-native-view button[class*="bg-white"],
        .dark body.m238-apple-ui .m238-native-view button[class*="bg-slate"] {
          background: #111927 !important;
          border-color: var(--m238-border-strong) !important;
          color: #dfe7f2 !important;
        }

        .dark body.m238-apple-ui .m238-main .bg-blue-50,
        .dark body.m238-apple-ui .m238-native-view .bg-blue-50 {
          background: rgba(37,99,235,.12) !important;
        }

        .dark body.m238-apple-ui .m238-main .bg-emerald-50,
        .dark body.m238-apple-ui .m238-native-view .bg-emerald-50 {
          background: rgba(5,150,105,.12) !important;
        }

        .dark body.m238-apple-ui .m238-main .bg-violet-50,
        .dark body.m238-apple-ui .m238-native-view .bg-violet-50 {
          background: rgba(124,58,237,.12) !important;
        }

        .dark body.m238-apple-ui .m238-main .bg-amber-50,
        .dark body.m238-apple-ui .m238-native-view .bg-amber-50 {
          background: rgba(217,119,6,.12) !important;
        }

        .dark body.m238-apple-ui .m238-main .bg-rose-50,
        .dark body.m238-apple-ui .m238-native-view .bg-rose-50 {
          background: rgba(225,29,72,.11) !important;
        }

        .dark body.m238-apple-ui .m238-main .text-blue-600,
        .dark body.m238-apple-ui .m238-main .text-blue-700,
        .dark body.m238-apple-ui .m238-native-view .text-blue-600,
        .dark body.m238-apple-ui .m238-native-view .text-blue-700 {
          color: #75a7ff !important;
        }

        .dark body.m238-apple-ui .m238-main .text-emerald-600,
        .dark body.m238-apple-ui .m238-main .text-emerald-700,
        .dark body.m238-apple-ui .m238-native-view .text-emerald-600,
        .dark body.m238-apple-ui .m238-native-view .text-emerald-700 {
          color: #45d6a2 !important;
        }

        .dark body.m238-apple-ui .m238-main .text-rose-600,
        .dark body.m238-apple-ui .m238-main .text-rose-700,
        .dark body.m238-apple-ui .m238-native-view .text-rose-600,
        .dark body.m238-apple-ui .m238-native-view .text-rose-700 {
          color: #fb7185 !important;
        }

        .dark body.m238-apple-ui .m238-main section[class*="bg-gradient-to-br"] {
          background:
            radial-gradient(circle at 90% -15%, rgba(96,165,250,.19), transparent 34%),
            radial-gradient(circle at 7% 120%, rgba(99,102,241,.18), transparent 38%),
            linear-gradient(135deg, #10275d 0%, #163f82 58%, #1d4f9a 100%) !important;
          border-color: rgba(147,197,253,.13) !important;
          box-shadow: 0 18px 44px rgba(0,0,0,.25) !important;
        }

        .dark .m238-menu-open {
          background: rgba(15,21,33,.94);
          color: #f1f5f9;
          border-color: rgba(226,232,240,.10);
        }

        @media (prefers-reduced-motion: reduce) {
          body.m238-apple-ui *,
          body.m238-apple-ui *::before,
          body.m238-apple-ui *::after {
            scroll-behavior: auto !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>
    </>
  );
}
