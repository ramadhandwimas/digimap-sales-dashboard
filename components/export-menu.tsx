"use client";

import { useState } from "react";
import {
  ChevronDown,
  Download,
  FileImage,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
} from "lucide-react";

export function ExportMenu({
  onXls,
  onPdf,
  onPicture,
}: {
  onXls: () => Promise<void>;
  onPdf: () => Promise<void>;
  onPicture: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState("");
  const run = async (label: string, action: () => Promise<void>) => {
    setBusy(label);
    setOpen(false);
    try {
      await action();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "File gagal dibuat. Coba lagi.",
      );
    } finally {
      setBusy("");
    }
  };
  const options = [
    { label: "XLS", icon: FileSpreadsheet, action: onXls },
    { label: "PDF", icon: FileText, action: onPdf },
    { label: "Picture Screenshot", icon: FileImage, action: onPicture },
  ];
  return (
    <div className="export-hide relative z-30">
      <button
        type="button"
        disabled={Boolean(busy)}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
      >
        {busy ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        {busy ? `Membuat ${busy}...` : "Unduh"}
        {!busy ? <ChevronDown className="size-4" /> : null}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border bg-white p-1.5 text-slate-800 shadow-xl dark:bg-slate-950 dark:text-slate-100"
        >
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                type="button"
                role="menuitem"
                key={option.label}
                onClick={() => void run(option.label, option.action)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <Icon className="size-4 text-blue-600" />
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
