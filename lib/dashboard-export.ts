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

function textFallbackCanvas(element: HTMLElement) {
  const text = (element.innerText || "M238 Daily Sales")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const width = 1600,
    margin = 56,
    lineHeight = 30,
    maxChars = 92,
    wrapped: string[] = [];
  for (const source of text) {
    let line = source;
    while (line.length > maxChars) {
      let cut = line.lastIndexOf(" ", maxChars);
      if (cut < 30) cut = maxChars;
      wrapped.push(line.slice(0, cut));
      line = line.slice(cut).trim();
    }
    wrapped.push(line);
  }
  const height = Math.max(900, margin * 2 + wrapped.length * lineHeight),
    canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas export tidak tersedia di browser ini.");
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 34px Arial, sans-serif";
  ctx.fillText("M238 Daily Sales", margin, margin + 8);
  ctx.font = "20px Arial, sans-serif";
  let y = margin + 60;
  for (const line of wrapped) {
    ctx.fillText(line, margin, y);
    y += lineHeight;
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
      return textFallbackCanvas(element);
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
