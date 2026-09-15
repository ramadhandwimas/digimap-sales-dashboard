"use client";

import { useState, type RefObject } from "react";
import html2canvas from "html2canvas";
import {
  ChevronDown,
  Download,
  FileImage,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Share2,
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

async function renderPicture(node: HTMLElement) {
  try { await document.fonts?.ready; } catch {}
  const width = Math.max(node.scrollWidth, node.clientWidth);
  const height = Math.max(node.scrollHeight, node.clientHeight);
  const canvas = await html2canvas(node, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
    width,
    height,
    windowWidth: width,
    windowHeight: height,
  });
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Gagal membuat picture PNG")), "image/png"),
  );
}

export function PictureShareActions({
  targetRef,
  filename,
  shareText,
}: {
  targetRef: RefObject<HTMLElement | null>;
  filename: string;
  shareText: string;
}) {
  const [busy, setBusy] = useState<"picture" | "share" | "">("");
  const [notice, setNotice] = useState("");
  const buildFile = async () => {
    if (!targetRef.current) throw new Error("Area report belum siap");
    const blob = await renderPicture(targetRef.current);
    const clean = filename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
    return new File([blob], `${clean}.png`, { type: "image/png" });
  };
  const downloadPicture = async () => {
    setBusy("picture"); setNotice("");
    try {
      const file = await buildFile();
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = file.name; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
      setNotice("Picture PNG siap disimpan.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Gagal membuat picture");
    } finally { setBusy(""); }
  };
  const sharePicture = async () => {
    setBusy("share"); setNotice("");
    try {
      const file = await buildFile();
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], title: shareText, text: shareText });
        setNotice("Pilih WhatsApp lalu grup tujuan.");
      } else {
        const url = URL.createObjectURL(file);
        const anchor = document.createElement("a");
        anchor.href = url; anchor.download = file.name; anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1200);
        setNotice("Share foto belum didukung browser ini. PNG sudah dibuat.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setNotice(error instanceof Error ? error.message : "Gagal membagikan picture");
      }
    } finally { setBusy(""); }
  };
  return (
    <div className="export-hide">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={Boolean(busy)} onClick={() => void downloadPicture()} className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-black disabled:opacity-50">
          {busy === "picture" ? <LoaderCircle className="size-4 animate-spin" /> : <FileImage className="size-4" />}
          Picture Screenshot
        </button>
        <button type="button" disabled={Boolean(busy)} onClick={() => void sharePicture()} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
          {busy === "share" ? <LoaderCircle className="size-4 animate-spin" /> : <Share2 className="size-4" />}
          Share WhatsApp
        </button>
      </div>
      {notice ? <p className="mt-2 text-xs font-semibold text-slate-500">{notice}</p> : null}
    </div>
  );
}
