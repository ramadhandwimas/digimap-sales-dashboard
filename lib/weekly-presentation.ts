"use client";

type Agg = { qty: number; amount: number };
type Side = {
  scheme: Record<string, Agg>;
  vas: Record<string, Agg>;
  lob: Record<string, Record<string, Agg>>;
};
export type WeeklyPresentationData = {
  labelA: string;
  labelB: string;
  periodA: { start: string; end: string };
  periodB: { start: string; end: string };
  a: Side;
  b: Side;
};

const palette = {
  navy: "0F172A",
  blue: "2563EB",
  lightBlue: "EFF6FF",
  green: "059669",
  lightGreen: "ECFDF5",
  red: "E11D48",
  lightRed: "FFF1F2",
  slate: "64748B",
  line: "DCE3EC",
  light: "F8FAFC",
  white: "FFFFFF",
};
const lobKeys = ["IPHONE", "MAC", "IPAD", "APPLE WATCH", "AIRPODS"];
const lobNames: Record<string, string> = {
  IPHONE: "iPhone",
  MAC: "MacBook",
  IPAD: "iPad",
  "APPLE WATCH": "Apple Watch",
  AIRPODS: "AirPods",
};

function total(values: Record<string, Agg> = {}) {
  return Object.values(values).reduce(
    (sum, value) => ({ qty: sum.qty + value.qty, amount: sum.amount + value.amount }),
    { qty: 0, amount: 0 },
  );
}
function percent(previous: number, current: number) {
  return previous ? ((current - previous) / previous) * 100 : current ? null : 0;
}
function movement(previous: number, current: number) {
  const value = percent(previous, current);
  if (value === null) return { value, text: "Baru", direction: "up" as const };
  if (Math.abs(value) < 0.05) return { value, text: "Tetap", direction: "flat" as const };
  const direction = value > 0 ? "up" as const : "down" as const;
  return {
    value,
    text: `${direction === "up" ? "Naik" : "Turun"} ${Math.abs(value).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`,
    direction,
  };
}
function scheme(side: Side, key: string) {
  const aliases: Record<string, string[]> = {
    DEVICE: ["DEVICE", "DEVICES"],
    ACC: ["ACC", "ACCESSORIES"],
    VAS: ["VAS"],
  };
  return (aliases[key] || [key]).reduce(
    (sum, name) => ({
      qty: sum.qty + (side.scheme[name]?.qty || 0),
      amount: sum.amount + (side.scheme[name]?.amount || 0),
    }),
    { qty: 0, amount: 0 },
  );
}

export function weeklyPresentationModel(data: WeeklyPresentationData) {
  const categories = ["DEVICE", "ACC", "VAS"].map((name) => {
    const previous = scheme(data.a, name), current = scheme(data.b, name);
    return { name, previous, current, qtyMovement: movement(previous.qty, current.qty), amountMovement: movement(previous.amount, current.amount) };
  });
  const overall = categories.reduce(
    (sum, row) => ({
      previous: { qty: sum.previous.qty + row.previous.qty, amount: sum.previous.amount + row.previous.amount },
      current: { qty: sum.current.qty + row.current.qty, amount: sum.current.amount + row.current.amount },
    }),
    { previous: { qty: 0, amount: 0 }, current: { qty: 0, amount: 0 } },
  );
  const lobs = lobKeys.map((key) => {
    const previous = total(data.a.lob[key]), current = total(data.b.lob[key]);
    return { name: lobNames[key], previous, current, qtyMovement: movement(previous.qty, current.qty), amountMovement: movement(previous.amount, current.amount) };
  });
  return { categories, lobs, overall: { ...overall, qtyMovement: movement(overall.previous.qty, overall.current.qty), amountMovement: movement(overall.previous.amount, overall.current.amount) } };
}

const idr = (value: number) => `Rp${Math.round(value).toLocaleString("id-ID")}`;
const num = (value: number) => Math.round(value).toLocaleString("id-ID");
function movementCell(item: ReturnType<typeof movement>) {
  const positive = item.direction === "up", flat = item.direction === "flat";
  return {
    text: item.text,
    options: {
      bold: true,
      color: flat ? palette.slate : positive ? palette.green : palette.red,
      fill: flat ? palette.light : positive ? palette.lightGreen : palette.lightRed,
      align: "center",
    },
  };
}
function baseSlide(pptx: any, title: string, subtitle: string) {
  const slide = pptx.addSlide();
  slide.background = { color: palette.white };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.18, line: { color: palette.blue, transparency: 100 }, fill: { color: palette.blue } });
  slide.addText(title, { x: 0.65, y: 0.45, w: 8.8, h: 0.45, fontFace: "Aptos Display", fontSize: 25, bold: true, color: palette.navy, margin: 0 });
  slide.addText(subtitle, { x: 0.65, y: 0.96, w: 11.8, h: 0.3, fontFace: "Aptos", fontSize: 10.5, color: palette.slate, margin: 0 });
  slide.addText("M238 Digimap PIM 2", { x: 10.5, y: 0.5, w: 2.2, h: 0.24, fontFace: "Aptos", fontSize: 9, bold: true, color: palette.blue, align: "right", margin: 0 });
  slide.addText("Sumber: Data Copas", { x: 10.5, y: 7.12, w: 2.2, h: 0.2, fontFace: "Aptos", fontSize: 7.5, color: palette.slate, align: "right", margin: 0 });
  return slide;
}
function addMetric(pptx: any, slide: any, x: number, y: number, w: number, label: string, amount: string, detail: string, accent: string) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 1.35, rectRadius: 0.08, line: { color: palette.line, width: 1 }, fill: { color: palette.light } });
  slide.addText(label, { x: x + 0.24, y: y + 0.18, w: w - 0.48, h: 0.24, fontFace: "Aptos", fontSize: 9, bold: true, color: palette.slate, margin: 0 });
  slide.addText(amount, { x: x + 0.24, y: y + 0.48, w: w - 0.48, h: 0.38, fontFace: "Aptos Display", fontSize: 22, bold: true, color: accent, margin: 0, fit: "shrink" });
  slide.addText(detail, { x: x + 0.24, y: y + 0.98, w: w - 0.48, h: 0.2, fontFace: "Aptos", fontSize: 8.5, color: palette.slate, margin: 0 });
}

export async function exportWeeklyPresentation(data: WeeklyPresentationData, filename: string) {
  const loaded = await import("pptxgenjs");
  const PptxGenJS = ((loaded as any).default ?? loaded) as typeof import("pptxgenjs").default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "M238 Digimap PIM 2";
  pptx.company = "Digimap";
  pptx.subject = "Weekly sales comparison";
  pptx.title = `${data.labelA} vs ${data.labelB}`;
  pptx.theme = { headFontFace: "Aptos Display", bodyFontFace: "Aptos" };
  const model = weeklyPresentationModel(data);
  const subtitle = `${data.labelA}: ${data.periodA.start} s.d. ${data.periodA.end}    ${data.labelB}: ${data.periodB.start} s.d. ${data.periodB.end}`;

  const cover = baseSlide(pptx, "Weekly Sales M238", subtitle);
  addMetric(pptx, cover, 0.72, 1.65, 3.75, data.labelA, idr(model.overall.previous.amount), `${num(model.overall.previous.qty)} qty`, palette.navy);
  addMetric(pptx, cover, 4.8, 1.65, 3.75, data.labelB, idr(model.overall.current.amount), `${num(model.overall.current.qty)} qty`, palette.blue);
  addMetric(pptx, cover, 8.88, 1.65, 3.75, "Perubahan Amount", model.overall.amountMovement.text, `${model.overall.qtyMovement.text} secara qty`, model.overall.amountMovement.direction === "down" ? palette.red : palette.green);
  cover.addText("Perbandingan Total", { x: 0.72, y: 3.48, w: 3.2, h: 0.3, fontFace: "Aptos Display", fontSize: 17, bold: true, color: palette.navy, margin: 0 });
  cover.addTable([
    ["Metrik", data.labelA, data.labelB, "Perubahan"],
    ["Total Sales", idr(model.overall.previous.amount), idr(model.overall.current.amount), movementCell(model.overall.amountMovement)],
    ["Total Qty", num(model.overall.previous.qty), num(model.overall.current.qty), movementCell(model.overall.qtyMovement)],
  ] as any, { x: 0.72, y: 3.95, w: 11.9, h: 1.55, colW: [2.2, 3.2, 3.2, 3.3], rowH: 0.5, border: { color: palette.line, width: 1 }, fill: palette.white, color: palette.navy, fontFace: "Aptos", fontSize: 11, margin: 0.1, valign: "mid", bold: false, autoFit: false, firstRow: true, fillHeader: palette.blue });

  const summary = baseSlide(pptx, "Sales Summary", subtitle);
  summary.addTable([
    ["Kategori", `${data.labelA} Qty`, `${data.labelB} Qty`, "Qty", `${data.labelA} Amount`, `${data.labelB} Amount`, "Amount"],
    ...model.categories.map(row => [row.name, num(row.previous.qty), num(row.current.qty), movementCell(row.qtyMovement), idr(row.previous.amount), idr(row.current.amount), movementCell(row.amountMovement)]),
    ["M238 TOTAL", num(model.overall.previous.qty), num(model.overall.current.qty), movementCell(model.overall.qtyMovement), idr(model.overall.previous.amount), idr(model.overall.current.amount), movementCell(model.overall.amountMovement)],
  ] as any, { x: 0.55, y: 1.55, w: 12.25, h: 3.35, colW: [1.35, 1.25, 1.25, 1.35, 2.45, 2.45, 2.15], rowH: 0.62, border: { color: palette.line, width: 1 }, fill: palette.white, color: palette.navy, fontFace: "Aptos", fontSize: 10, margin: 0.08, valign: "mid", align: "center", bold: false, autoFit: false, firstRow: true, fillHeader: palette.blue });
  summary.addText("Kolom Qty dan Amount menunjukkan arah perubahan dari week sebelumnya ke week pembanding.", { x: 0.65, y: 5.25, w: 11.8, h: 0.28, fontFace: "Aptos", fontSize: 10, color: palette.slate, margin: 0 });

  const lob = baseSlide(pptx, "Weekly LOB", subtitle);
  lob.addTable([
    ["LOB", `${data.labelA} Qty`, `${data.labelB} Qty`, "Qty", `${data.labelA} Amount`, `${data.labelB} Amount`, "Amount"],
    ...model.lobs.map(row => [row.name, num(row.previous.qty), num(row.current.qty), movementCell(row.qtyMovement), idr(row.previous.amount), idr(row.current.amount), movementCell(row.amountMovement)]),
  ] as any, { x: 0.55, y: 1.45, w: 12.25, h: 4.3, colW: [1.35, 1.25, 1.25, 1.35, 2.45, 2.45, 2.15], rowH: 0.66, border: { color: palette.line, width: 1 }, fill: palette.white, color: palette.navy, fontFace: "Aptos", fontSize: 10, margin: 0.08, valign: "mid", align: "center", bold: false, autoFit: false, firstRow: true, fillHeader: palette.blue });

  await pptx.writeFile({ fileName: `${filename.replace(/[^a-zA-Z0-9._-]+/g, "-")}.pptx`, compression: true });
}
