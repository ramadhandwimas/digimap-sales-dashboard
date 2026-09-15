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
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
        {busy ? `Membuat ${busy}...` : "Unduh"}
        {!busy ? <ChevronDown className="size-4" /> : null}
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border bg-white p-1.5 text-slate-800 shadow-xl dark:bg-slate-950 dark:text-slate-100">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button type="button" role="menuitem" key={option.label} onClick={() => void run(option.label, option.action)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-900">
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

const unsupportedColor = /(\blab\(|\boklab\(|\blch\(|\boklch\(|\bcolor\()/i;

function safeCssValue(prop: string, value: string) {
  if (!value || !unsupportedColor.test(value)) return value;
  const p = prop.toLowerCase();
  if (p.includes("shadow")) return "none";
  if (p === "background-image" || p.includes("gradient")) return "none";
  if (p.includes("background-color")) return "#ffffff";
  if (p.includes("border") && p.includes("color")) return "#e2e8f0";
  if (p.includes("outline") && p.includes("color")) return "#94a3b8";
  if (p === "fill" || p === "stroke" || p.includes("color")) return "#0f172a";
  return "initial";
}

function makeSafeSnapshot(node: HTMLElement) {
  const snapshot = node.cloneNode(true) as HTMLElement;
  const originals = [node, ...Array.from(node.querySelectorAll<HTMLElement>("*"))];
  const clones = [snapshot, ...Array.from(snapshot.querySelectorAll<HTMLElement>("*"))];

  for (let i = 0; i < Math.min(originals.length, clones.length); i++) {
    const original = originals[i];
    const clone = clones[i];
    const computed = window.getComputedStyle(original);

    clone.removeAttribute("class");
    clone.removeAttribute("style");

    for (let p = 0; p < computed.length; p++) {
      const prop = computed.item(p);
      if (!prop || prop.startsWith("--")) continue;
      const raw = computed.getPropertyValue(prop);
      const value = safeCssValue(prop, raw);
      try { clone.style.setProperty(prop, value, computed.getPropertyPriority(prop)); } catch {}
    }

    if (original instanceof HTMLInputElement && clone instanceof HTMLInputElement) clone.value = original.value;
    if (original instanceof HTMLTextAreaElement && clone instanceof HTMLTextAreaElement) clone.value = original.value;
    if (original instanceof HTMLSelectElement && clone instanceof HTMLSelectElement) clone.value = original.value;
  }

  const rect = node.getBoundingClientRect();
  snapshot.style.setProperty("width", `${Math.ceil(rect.width || node.clientWidth || 720)}px`, "important");
  snapshot.style.setProperty("max-width", "none", "important");
  snapshot.style.setProperty("height", "auto", "important");
  snapshot.style.setProperty("background", "#ffffff", "important");
  snapshot.style.setProperty("background-color", "#ffffff", "important");
  snapshot.style.setProperty("color", "#0f172a", "important");
  snapshot.style.setProperty("position", "fixed", "important");
  snapshot.style.setProperty("left", "-100000px", "important");
  snapshot.style.setProperty("top", "0", "important");
  snapshot.style.setProperty("z-index", "-1", "important");
  snapshot.setAttribute("data-safe-picture-snapshot", "1");
  document.body.appendChild(snapshot);
  return snapshot;
}

async function renderPicture(node: HTMLElement) {
  try { await document.fonts?.ready; } catch {}
  const snapshot = makeSafeSnapshot(node);
  try {
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const width = Math.max(snapshot.scrollWidth, snapshot.clientWidth);
    const height = Math.max(snapshot.scrollHeight, snapshot.clientHeight);
    const canvas = await html2canvas(snapshot, {
      backgroundColor: "#ffffff",
      scale: Math.min(2, window.devicePixelRatio || 2),
      useCORS: true,
      allowTaint: false,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
    });
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Gagal membuat picture PNG")), "image/png", 1),
    );
  } finally {
    snapshot.remove();
  }
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
    setBusy("picture");
    setNotice("");
    try {
      const file = await buildFile();
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setNotice("Picture PNG berhasil dibuat.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Gagal membuat picture");
    } finally {
      setBusy("");
    }
  };

  const sharePicture = async () => {
    setBusy("share");
    setNotice("");
    try {
      const file = await buildFile();
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], title: shareText, text: shareText });
        setNotice("Picture siap dibagikan.");
      } else {
        const url = URL.createObjectURL(file);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = file.name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        setNotice("Browser tidak mendukung share file. PNG sudah dibuat.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setNotice(error instanceof Error ? error.message : "Gagal membagikan picture");
      }
    } finally {
      setBusy("");
    }
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
