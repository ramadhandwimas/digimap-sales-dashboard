"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function M238AppleUI() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("m238-sidebar-hidden") === "1";
    setHidden(saved);
    document.body.classList.add("m238-apple-ui");
    document.body.classList.toggle("m238-sidebar-hidden", saved);

    const apply = () => {
      const aside = document.querySelector("aside");
      const main = document.querySelector("main");
      if (!aside || !main) return;
      const shell = aside.parentElement;
      shell?.classList.add("m238-app-shell");
      aside.classList.add("m238-sidebar");
      main.classList.add("m238-main");
    };

    apply();
    const mo = new MutationObserver(apply);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      document.body.classList.remove("m238-apple-ui", "m238-sidebar-hidden");
    };
  }, []);

  const toggle = () => {
    const next = !hidden;
    setHidden(next);
    localStorage.setItem("m238-sidebar-hidden", next ? "1" : "0");
    document.body.classList.toggle("m238-sidebar-hidden", next);
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className="m238-sidebar-toggle"
        title={hidden ? "Tampilkan menu" : "Sembunyikan menu"}
        aria-label={hidden ? "Tampilkan menu" : "Sembunyikan menu"}
      >
        {hidden ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
        <span>{hidden ? "Menu" : "Full Screen"}</span>
      </button>
      <style jsx global>{`
        body.m238-apple-ui {
          background: #f5f5f7 !important;
          color: #1d1d1f;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
        }
        body.m238-apple-ui .m238-app-shell {
          background: #f5f5f7 !important;
          transition: grid-template-columns .24s ease;
        }
        body.m238-apple-ui .m238-sidebar {
          background: rgba(255,255,255,.88) !important;
          color: #1d1d1f !important;
          border-right: 1px solid rgba(0,0,0,.08) !important;
          box-shadow: 8px 0 30px rgba(0,0,0,.035);
          backdrop-filter: saturate(180%) blur(22px);
          -webkit-backdrop-filter: saturate(180%) blur(22px);
        }
        body.m238-apple-ui .m238-sidebar [class*="text-white"] { color: #424245 !important; }
        body.m238-apple-ui .m238-sidebar [class*="border-white"] { border-color: rgba(0,0,0,.08) !important; }
        body.m238-apple-ui .m238-sidebar [class*="bg-white/5"] {
          background: rgba(118,118,128,.07) !important;
          border-radius: 16px !important;
        }
        body.m238-apple-ui .m238-sidebar button {
          color: #424245 !important;
          border-radius: 12px !important;
          transition: background .18s ease, color .18s ease, transform .18s ease;
        }
        body.m238-apple-ui .m238-sidebar button:hover {
          background: rgba(0,113,227,.08) !important;
          color: #0071e3 !important;
        }
        body.m238-apple-ui .m238-sidebar button[class*="bg-white/20"] {
          background: #eaf3ff !important;
          color: #0071e3 !important;
          box-shadow: inset 0 0 0 1px rgba(0,113,227,.08) !important;
        }
        body.m238-apple-ui .m238-sidebar svg {
          stroke-width: 1.8 !important;
        }
        body.m238-apple-ui .m238-sidebar .size-11 {
          background: linear-gradient(145deg,#1d1d1f,#4b4b4f) !important;
          color: #fff !important;
          border-radius: 14px !important;
          box-shadow: 0 7px 18px rgba(0,0,0,.14);
        }
        body.m238-apple-ui .m238-main {
          background: #f5f5f7 !important;
          min-width: 0;
        }
        body.m238-apple-ui .m238-main > header {
          position: sticky;
          top: 0;
          z-index: 45;
          background: rgba(250,250,252,.82) !important;
          border-color: rgba(0,0,0,.07) !important;
          backdrop-filter: saturate(180%) blur(20px);
          -webkit-backdrop-filter: saturate(180%) blur(20px);
        }
        body.m238-apple-ui .m238-main article,
        body.m238-apple-ui .m238-main section[class*="rounded-2xl"],
        body.m238-apple-ui .m238-main section[class*="rounded-3xl"],
        body.m238-apple-ui .m238-main div[class*="rounded-2xl"][class*="bg-white"],
        body.m238-apple-ui .m238-main div[class*="rounded-3xl"][class*="bg-white"] {
          border-color: rgba(0,0,0,.07) !important;
          box-shadow: 0 8px 24px rgba(0,0,0,.045) !important;
        }
        body.m238-apple-ui .m238-main article {
          border-radius: 20px !important;
          background: rgba(255,255,255,.96) !important;
        }
        body.m238-apple-ui .m238-main h1,
        body.m238-apple-ui .m238-main h2,
        body.m238-apple-ui .m238-main h3 {
          letter-spacing: -.025em;
          color: #1d1d1f;
        }
        body.m238-apple-ui .m238-main table {
          background: rgba(255,255,255,.96);
        }
        body.m238-apple-ui .m238-main thead {
          background: #f5f5f7 !important;
        }
        body.m238-apple-ui .m238-main th {
          color: #6e6e73 !important;
          font-size: 11px !important;
          letter-spacing: .035em;
        }
        body.m238-apple-ui .m238-main td {
          color: #1d1d1f;
        }
        body.m238-apple-ui .m238-main tbody tr:hover {
          background: #f7fbff !important;
        }
        body.m238-apple-ui .m238-main select,
        body.m238-apple-ui .m238-main input,
        body.m238-apple-ui .m238-main textarea {
          border-color: rgba(0,0,0,.12) !important;
          border-radius: 12px !important;
          background: rgba(255,255,255,.96) !important;
        }
        body.m238-apple-ui .m238-main button {
          border-radius: 12px !important;
        }
        body.m238-apple-ui .m238-main [class*="bg-blue-600"] {
          background: #0071e3 !important;
        }
        body.m238-apple-ui .m238-main [class*="text-blue-600"] {
          color: #0071e3 !important;
        }
        body.m238-apple-ui .m238-main [class*="bg-blue-50"] {
          background: #eef6ff !important;
        }
        .m238-sidebar-toggle {
          position: fixed;
          z-index: 80;
          left: 188px;
          bottom: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
          height: 42px;
          padding: 0 13px;
          border: 1px solid rgba(0,0,0,.10);
          border-radius: 999px;
          background: rgba(255,255,255,.90);
          color: #1d1d1f;
          font: 600 12px -apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif;
          box-shadow: 0 8px 28px rgba(0,0,0,.12);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          transition: left .24s ease, transform .18s ease, background .18s ease;
        }
        .m238-sidebar-toggle:hover { background: #fff; transform: translateY(-1px); }
        body.m238-sidebar-hidden .m238-sidebar-toggle { left: 18px; }
        @media (min-width:1024px) {
          body.m238-sidebar-hidden .m238-app-shell {
            grid-template-columns: 0 minmax(0,1fr) !important;
          }
          body.m238-sidebar-hidden .m238-sidebar {
            display: none !important;
          }
          body.m238-sidebar-hidden .m238-main > div[class*="px-4"] {
            max-width: 1680px;
            margin-left: auto;
            margin-right: auto;
            width: 100%;
          }
        }
        @media (max-width:1023px) {
          .m238-sidebar-toggle { left: auto; right: 16px; bottom: 16px; }
          body.m238-sidebar-hidden .m238-sidebar { display: none !important; }
          body.m238-apple-ui .m238-sidebar { box-shadow: none; border-right: 0 !important; }
        }
        @media (max-width:640px) {
          body.m238-apple-ui .m238-main > div[class*="px-4"] { padding-left: 14px !important; padding-right: 14px !important; }
          body.m238-apple-ui .m238-main article { padding: 16px !important; }
          .m238-sidebar-toggle span { display:none; }
          .m238-sidebar-toggle { width:44px; padding:0; justify-content:center; }
        }
        .dark body.m238-apple-ui,
        body.m238-apple-ui.dark { background:#000 !important; }
        .dark body.m238-apple-ui .m238-main { background:#000 !important; }
        .dark body.m238-apple-ui .m238-sidebar { background:rgba(28,28,30,.92) !important; color:#f5f5f7 !important; }
        .dark body.m238-apple-ui .m238-sidebar button { color:#f5f5f7 !important; }
        .dark body.m238-apple-ui .m238-main h1,
        .dark body.m238-apple-ui .m238-main h2,
        .dark body.m238-apple-ui .m238-main h3,
        .dark body.m238-apple-ui .m238-main td { color:#f5f5f7 !important; }
      `}</style>
    </>
  );
}
