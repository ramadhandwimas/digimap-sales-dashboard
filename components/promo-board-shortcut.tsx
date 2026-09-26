"use client";

import { Tag } from "lucide-react";

export default function PromoBoardShortcut() {
  return (
    <a
      href="/promo-board"
      aria-label="Buka Promo Board"
      className="fixed right-4 z-[9990] inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/95 px-4 py-2.5 text-sm font-black text-blue-700 shadow-lg backdrop-blur-xl hover:bg-blue-50 dark:border-blue-900 dark:bg-slate-950/95 dark:text-blue-300 md:right-6"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 78px)" }}
    >
      <Tag className="size-4" />
      Promo Board
    </a>
  );
}
