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

async function captureReport(element: HTMLElement) {
  const { default: html2canvas } = await import("html2canvas");
  return html2canvas(element, {
    backgroundColor: "#f8fafc",
    logging: false,
    scale: Math.min(2, window.devicePixelRatio || 1),
    useCORS: true,
    width: element.scrollWidth,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    ignoreElements: (node) => node.classList?.contains("export-hide"),
  });
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
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportReportPdf(element: HTMLElement, filename: string) {
  const canvas = await captureReport(element),
    { jsPDF } = await import("jspdf"),
    maxPagePoints = 14_000,
    naturalWidth = canvas.width * 0.75,
    naturalHeight = canvas.height * 0.75,
    fit = Math.min(1, maxPagePoints / Math.max(naturalWidth, naturalHeight)),
    pageWidth = naturalWidth * fit,
    pageHeight = naturalHeight * fit,
    pdf = new jsPDF({
      orientation: pageWidth > pageHeight ? "landscape" : "portrait",
      unit: "pt",
      format: [pageWidth, pageHeight],
      compress: true,
    });
  pdf.addImage(
    canvas.toDataURL("image/jpeg", 0.94),
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
