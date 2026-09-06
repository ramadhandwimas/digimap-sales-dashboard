"use client";

export type ExportCell = string | number | boolean | null | undefined;
export type ExportSheet = {
  name: string;
  rows: ExportCell[][];
};

const safeName = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "") || "m238-report";

const unsupportedColor = /(oklab|oklch|lab|lch|color-mix|color)\(/i;
const colorProps = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
  "columnRuleColor",
  "caretColor",
] as const;

function sanitizeClone(doc: Document, root: HTMLElement) {
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const node of nodes) {
    const style = doc.defaultView?.getComputedStyle(node);
    if (!style) continue;
    for (const prop of colorProps) {
      const value = style[prop];
      if (value && unsupportedColor.test(value)) {
        if (prop === "backgroundColor") node.style.backgroundColor = "transparent";
        else if (prop === "color") node.style.color = "#0f172a";
        else node.style[prop] = "transparent";
      }
    }
    if (unsupportedColor.test(style.backgroundImage || "")) node.style.backgroundImage = "none";
    if (unsupportedColor.test(style.boxShadow || "")) node.style.boxShadow = "none";
    if (unsupportedColor.test(style.textShadow || "")) node.style.textShadow = "none";
    if (unsupportedColor.test(style.filter || "")) node.style.filter = "none";
    const svg = node as unknown as SVGElement;
    if (svg instanceof doc.defaultView!.SVGElement) {
      const fill = style.fill;
      const stroke = style.stroke;
      if (fill && unsupportedColor.test(fill)) svg.setAttribute("fill", "none");
      if (stroke && unsupportedColor.test(stroke)) svg.setAttribute("stroke", "#0f172a");
    }
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 12,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function mappedTextColor(node: HTMLElement) {
  const cls = node.className?.toString() || "";
  if (node.closest("aside")) return "#ffffff";
  if (cls.includes("text-slate-400")) return "#94a3b8";
  if (cls.includes("text-slate-500")) return "#64748b";
  if (cls.includes("text-slate-600")) return "#475569";
  if (cls.includes("text-blue-600")) return "#2563eb";
  if (cls.includes("text-emerald-600")) return "#059669";
  if (cls.includes("text-violet-600")) return "#7c3aed";
  if (cls.includes("text-rose-600")) return "#e11d48";
  if (cls.includes("text-white")) return "#ffffff";
  return "#0f172a";
}

function mappedBackground(node: HTMLElement) {
  const cls = node.className?.toString() || "";
  if (node.tagName === "ASIDE") return "#0b73b7";
  if (node.tagName === "MAIN") return "#f8fafc";
  if (cls.includes("bg-blue-600")) return "#2563eb";
  if (cls.includes("bg-blue-50")) return "#eff6ff";
  if (cls.includes("bg-emerald-50")) return "#ecfdf5";
  if (cls.includes("bg-violet-50")) return "#f5f3ff";
  if (cls.includes("bg-amber-50")) return "#fffbeb";
  if (cls.includes("bg-rose-50")) return "#fff1f2";
  if (cls.includes("bg-slate-50")) return "#f8fafc";
  if (cls.includes("bg-slate-100")) return "#f1f5f9";
  if (cls.includes("bg-white/20")) return "rgba(255,255,255,.20)";
  if (cls.includes("bg-white/15")) return "rgba(255,255,255,.15)";
  if (cls.includes("bg-white/10")) return "rgba(255,255,255,.10)";
  if (cls.includes("bg-white/5")) return "rgba(255,255,255,.05)";
  if (cls.includes("bg-white") || node.tagName === "SECTION" || node.tagName === "ARTICLE")
    return "#ffffff";
  return "";
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return;
  let line = "",
    yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

function layoutFallbackCanvas(target: HTMLElement) {
  const rootRect = target.getBoundingClientRect(),
    width = Math.max(1280, target.scrollWidth),
    height = Math.max(900, target.scrollHeight),
    canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas export tidak tersedia di browser ini.");

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, height);

  const nodes = [target, ...Array.from(target.querySelectorAll<HTMLElement>("*"))];
  for (const node of nodes) {
    if (node.classList?.contains("export-hide")) continue;
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0)
      continue;
    const rect = node.getBoundingClientRect(),
      x = rect.left - rootRect.left,
      y = rect.top - rootRect.top,
      w = rect.width,
      h = rect.height;
    if (w <= 0 || h <= 0 || x + w < 0 || y + h < 0 || x > width || y > height) continue;

    const bg = mappedBackground(node);
    if (bg) {
      ctx.save();
      roundRect(ctx, x, y, w, h, node.tagName === "SECTION" || node.tagName === "ARTICLE" ? 14 : 6);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.restore();
    }

    const cls = node.className?.toString() || "";
    if (cls.includes("border") || node.tagName === "TD" || node.tagName === "TH" || node.tagName === "TR") {
      ctx.save();
      ctx.strokeStyle = "#dbe4ef";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));
      ctx.restore();
    }

    const directText = Array.from(node.childNodes)
      .filter((child) => child.nodeType === Node.TEXT_NODE)
      .map((child) => child.textContent?.replace(/\s+/g, " ").trim() || "")
      .filter(Boolean)
      .join(" ");
    if (!directText) continue;

    const fontSize = Math.max(10, Math.min(34, parseFloat(style.fontSize) || 14)),
      weight = Number(style.fontWeight) || (style.fontWeight === "bold" ? 700 : 400),
      paddingLeft = parseFloat(style.paddingLeft) || 0,
      paddingRight = parseFloat(style.paddingRight) || 0,
      paddingTop = parseFloat(style.paddingTop) || 0,
      lineHeight = Math.max(fontSize * 1.2, parseFloat(style.lineHeight) || fontSize * 1.3),
      tx = x + paddingLeft,
      ty = y + paddingTop + fontSize,
      maxTextWidth = Math.max(20, w - paddingLeft - paddingRight - 4);

    ctx.save();
    ctx.fillStyle = mappedTextColor(node);
    ctx.font = `${weight >= 600 ? 700 : 400} ${fontSize}px Arial, sans-serif`;
    ctx.textBaseline = "alphabetic";
    drawWrappedText(ctx, directText, tx, ty, maxTextWidth, lineHeight);
    ctx.restore();
  }
  return canvas;
}

function isDailySales(element: HTMLElement) {
  return element.querySelector("h1")?.textContent?.trim() === "Daily Sales";
}

function resolveCaptureTarget(element: HTMLElement) {
  if (!isDailySales(element)) return element;
  const shell = element.closest("main")?.parentElement as HTMLElement | null;
  return shell || document.body;
}

async function captureReport(element: HTMLElement) {
  const { default: html2canvas } = await import("html2canvas");
  const target = resolveCaptureTarget(element);
  const dailyMode = target !== element;
  const captureId = `m238-export-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  target.setAttribute("data-export-id", captureId);
  try {
    try {
      return await html2canvas(target, {
        backgroundColor: "#f8fafc",
        logging: false,
        scale: Math.min(2, window.devicePixelRatio || 1),
        useCORS: true,
        width: target.scrollWidth,
        height: target.scrollHeight,
        windowWidth: Math.max(target.scrollWidth, 1536),
        windowHeight: target.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        ignoreElements: (node) => node.classList?.contains("export-hide"),
        onclone: (doc) => {
          const clone = doc.querySelector<HTMLElement>(`[data-export-id="${captureId}"]`);
          if (!clone) return;
          sanitizeClone(doc, clone);
          if (dailyMode) {
            const aside = clone.querySelector<HTMLElement>("aside");
            const main = clone.querySelector<HTMLElement>("main");
            const fullHeight = Math.max(clone.scrollHeight, main?.scrollHeight || 0);
            clone.style.minHeight = `${fullHeight}px`;
            if (aside) {
              aside.style.position = "static";
              aside.style.top = "auto";
              aside.style.height = `${fullHeight}px`;
              aside.style.minHeight = `${fullHeight}px`;
            }
            if (main) {
              main.style.minHeight = `${fullHeight}px`;
              main.style.backgroundColor = "#f8fafc";
            }
          }
        },
      });
    } catch {
      return layoutFallbackCanvas(target);
    }
  } finally {
    target.removeAttribute("data-export-id");
  }
}

export async function exportReportPng(element: HTMLElement, filename: string) {
  const canvas = await captureReport(element);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("PNG gagal dibuat")),
      "image/png",
    ),
  );
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = `${safeName(filename)}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportReportPdf(element: HTMLElement, filename: string) {
  const canvas = await captureReport(element),
    { jsPDF } = await import("jspdf"),
    maxPagePoints = 14_000,
    naturalWidth = canvas.width * 0.75,
    naturalHeight = canvas.height * 0.75,
    fit = Math.min(1, maxPagePoints / Math.max(naturalWidth, naturalHeight)),
    pageWidth = Math.max(300, naturalWidth * fit),
    pageHeight = Math.max(300, naturalHeight * fit),
    pdf = new jsPDF({
      orientation: pageWidth > pageHeight ? "landscape" : "portrait",
      unit: "pt",
      format: [pageWidth, pageHeight],
      compress: true,
    });
  pdf.addImage(
    canvas.toDataURL("image/jpeg", 0.92),
    "JPEG",
    0,
    0,
    pageWidth,
    pageHeight,
    undefined,
    "FAST",
  );
  pdf.save(`${safeName(filename)}.pdf`);
}

export async function exportReportXlsx(
  sheets: ExportSheet[],
  filename: string,
) {
  const XLSX = await import("xlsx"),
    workbook = XLSX.utils.book_new();
  sheets.forEach((sheet, index) => {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    worksheet["!cols"] = sheet.rows
      .reduce<number[]>((widths, row) => {
        row.forEach((cell, cellIndex) => {
          widths[cellIndex] = Math.min(
            45,
            Math.max(widths[cellIndex] || 10, String(cell ?? "").length + 2),
          );
        });
        return widths;
      }, [])
      .map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      sheet.name.replace(/[\\/?*:[\]]/g, " ").slice(0, 31) ||
        `Sheet ${index + 1}`,
    );
  });
  XLSX.writeFile(workbook, `${safeName(filename)}.xlsx`);
}
