import PptxGenJS from "pptxgenjs";

type Agg = { qty: number; amount: number };
type Side = { scheme: Record<string, Agg>; vas: Record<string, Agg>; lob: Record<string, Record<string, Agg>> };
export type WeeklyPresentationData = { labelA: string; labelB: string; periodA: { start: string; end: string }; periodB: { start: string; end: string }; a: Side; b: Side };

const C = { black: "111111", gray: "666666", soft: "E7E7E7", mid: "D2D2D2", blue: "9DC3E6", yellow: "FFD966", amber: "FFC000", green: "3DAE1C", red: "C62828", white: "FFFFFF" };
const lobKeys = ["IPHONE", "MAC", "IPAD", "APPLE WATCH", "AIRPODS"];
const lobNames: Record<string, string> = { IPHONE: "iPhone", MAC: "MacBook", IPAD: "iPad", "APPLE WATCH": "Apple Watch", AIRPODS: "AirPods" };

function total(values: Record<string, Agg> = {}) { return Object.values(values).reduce((s, v) => ({ qty: s.qty + v.qty, amount: s.amount + v.amount }), { qty: 0, amount: 0 }); }
function percent(previous: number, current: number) { return previous ? ((current - previous) / previous) * 100 : current ? null : 0; }
function movement(previous: number, current: number) {
  const value = percent(previous, current);
  if (value === null) return { value, text: "Baru", direction: "up" as const };
  if (Math.abs(value) < 0.05) return { value, text: "Tetap", direction: "flat" as const };
  const direction = value > 0 ? "up" as const : "down" as const;
  return { value, text: `${direction === "up" ? "Naik" : "Turun"} ${Math.abs(value).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`, direction };
}
function scheme(side: Side, key: string) {
  const aliases: Record<string, string[]> = { DEVICE: ["DEVICE", "DEVICES"], ACC: ["ACC", "ACCESSORIES"], VAS: ["VAS"] };
  return (aliases[key] || [key]).reduce((s, name) => ({ qty: s.qty + (side.scheme[name]?.qty || 0), amount: s.amount + (side.scheme[name]?.amount || 0) }), { qty: 0, amount: 0 });
}

export function weeklyPresentationModel(data: WeeklyPresentationData) {
  const categories = ["DEVICE", "ACC", "VAS"].map((name) => { const previous = scheme(data.a, name), current = scheme(data.b, name); return { name, previous, current, qtyMovement: movement(previous.qty, current.qty), amountMovement: movement(previous.amount, current.amount) }; });
  const overall = categories.reduce((s, row) => ({ previous: { qty: s.previous.qty + row.previous.qty, amount: s.previous.amount + row.previous.amount }, current: { qty: s.current.qty + row.current.qty, amount: s.current.amount + row.current.amount } }), { previous: { qty: 0, amount: 0 }, current: { qty: 0, amount: 0 } });
  const lobs = lobKeys.map((key) => { const previous = total(data.a.lob[key]), current = total(data.b.lob[key]); return { name: lobNames[key], previous, current, qtyMovement: movement(previous.qty, current.qty), amountMovement: movement(previous.amount, current.amount) }; });
  return { categories, lobs, overall: { ...overall, qtyMovement: movement(overall.previous.qty, overall.current.qty), amountMovement: movement(overall.previous.amount, overall.current.amount) } };
}

const idr = (v: number) => `Rp${Math.round(v).toLocaleString("id-ID")}`;
const compact = (v: number) => v >= 1_000_000_000 ? `${(v / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M` : `${(v / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Jt`;
const num = (v: number) => Math.round(v).toLocaleString("id-ID");
const pct = (v: number | null) => v === null ? "Baru" : `${v > 0 ? "+" : ""}${v.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;

function logoSvg() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="220"><rect width="620" height="220" fill="white"/><text x="22" y="132" font-family="Arial,sans-serif" font-size="120" letter-spacing="-8">digimap</text><text x="360" y="157" font-family="Arial,sans-serif" font-size="22">by</text><text x="400" y="178" font-family="Georgia,serif" font-size="72" font-style="italic" fill="#ed1c24">MAP</text><path d="M25 185h320M530 185h65" stroke="#000" stroke-width="5"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
function addHeader(pptx: PptxGenJS, slide: PptxGenJS.Slide, title: string, subtitle: string) {
  slide.background = { color: C.white };
  slide.addShape(pptx.ShapeType.rect, { x: 0.25, y: 0.22, w: 10.25, h: 0.13, line: { color: C.black, transparency: 100 }, fill: { color: C.black } });
  slide.addShape(pptx.ShapeType.rect, { x: 0.25, y: 0.42, w: 10.25, h: 0.04, line: { color: C.black, transparency: 100 }, fill: { color: C.black } });
  slide.addImage({ data: logoSvg(), x: 10.64, y: 0.12, w: 2.35, h: 0.83 });
  slide.addText(title, { x: 0.3, y: 0.66, w: 8.3, h: 0.38, fontFace: "Arial", fontSize: 21, bold: true, color: C.black, margin: 0 });
  slide.addText(subtitle, { x: 0.3, y: 1.05, w: 9.9, h: 0.23, fontFace: "Arial", fontSize: 7.5, color: C.gray, margin: 0 });
  slide.addText("Sumber: Data Copas • M238 Digimap PIM 2", { x: 8.9, y: 7.22, w: 4.05, h: 0.15, fontFace: "Arial", fontSize: 6.5, color: C.gray, align: "right", margin: 0 });
}
function cell(text: string, fill: string, options: Record<string, unknown> = {}) { return { text, options: { fill, color: C.black, margin: 0.04, valign: "middle", ...options } }; }
function movementCell(item: ReturnType<typeof movement>) { return cell(pct(item.value), item.direction === "up" ? "E2F0D9" : item.direction === "down" ? "FCE4D6" : C.soft, { bold: true, color: item.direction === "up" ? "247317" : item.direction === "down" ? C.red : C.gray, align: "center" }); }
function addAmountBars(pptx: PptxGenJS, slide: PptxGenJS.Slide, rows: ReturnType<typeof weeklyPresentationModel>["categories"], labelA: string, labelB: string) {
  const max = Math.max(...rows.flatMap((r) => [r.previous.amount, r.current.amount]), 1), baseY = 5.05, maxH = 2.75;
  slide.addText([{ text: "■ ", options: { color: C.amber } }, { text: labelA, options: { bold: true } }, { text: "     ■ ", options: { color: C.green } }, { text: labelB, options: { bold: true } }], { x: 2.15, y: 1.34, w: 4.7, h: 0.25, fontFace: "Arial", fontSize: 9, align: "center", margin: 0 });
  rows.forEach((row, index) => {
    const groupX = 0.65 + index * 2.33;
    [{ value: row.previous.amount, x: groupX + 0.38, color: C.amber }, { value: row.current.amount, x: groupX + 0.88, color: C.green }].forEach((bar) => {
      const h = Math.max(0.04, (bar.value / max) * maxH);
      slide.addShape(pptx.ShapeType.rect, { x: bar.x, y: baseY - h, w: 0.43, h, line: { color: bar.color, transparency: 100 }, fill: { color: bar.color } });
      slide.addText(compact(bar.value), { x: bar.x - 0.22, y: baseY - h - 0.24, w: 0.87, h: 0.18, fontFace: "Arial", fontSize: 6.5, bold: true, align: "center", margin: 0, fit: "shrink" });
    });
    slide.addText(row.name === "ACC" ? "ACCESSORIES" : row.name, { x: groupX, y: 5.12, w: 1.85, h: 0.22, fontFace: "Arial", fontSize: 8.5, align: "center", margin: 0, bold: true });
  });
  slide.addShape(pptx.ShapeType.line, { x: 0.55, y: baseY, w: 7.2, h: 0, line: { color: "BFBFBF", width: 1 } });
}

export function buildWeeklyPresentation(data: WeeklyPresentationData) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; pptx.author = "M238 Digimap PIM 2"; pptx.company = "Digimap"; pptx.subject = "Weekly sales comparison"; pptx.title = `${data.labelA} vs ${data.labelB}`;
  const model = weeklyPresentationModel(data);
  const subtitle = `${data.labelA}: ${data.periodA.start} s.d. ${data.periodA.end}  |  ${data.labelB}: ${data.periodB.start} s.d. ${data.periodB.end}`;

  const week = pptx.addSlide(); addHeader(pptx, week, "Week To Week", subtitle); addAmountBars(pptx, week, model.categories, data.labelA, data.labelB);
  week.addText("Sales Summary", { x: 8.05, y: 1.36, w: 4.55, h: 0.26, fontFace: "Arial", fontSize: 12, bold: true, align: "center", margin: 0 });
  week.addTable([
    [cell("CATEGORY", C.blue, { bold: true }), cell(data.labelA, C.blue, { bold: true, align: "center" }), cell(data.labelB, C.blue, { bold: true, align: "center" }), cell("%", C.blue, { bold: true, align: "center" })],
    ...model.categories.map((r) => [cell(r.name, C.yellow, { bold: true }), cell(idr(r.previous.amount), C.white, { align: "right" }), cell(idr(r.current.amount), C.white, { align: "right" }), movementCell(r.amountMovement)]),
    [cell("M238 TOTAL", C.blue, { bold: true }), cell(idr(model.overall.previous.amount), C.blue, { bold: true, align: "right" }), cell(idr(model.overall.current.amount), C.blue, { bold: true, align: "right" }), movementCell(model.overall.amountMovement)],
  ] as any, { x: 7.88, y: 1.72, w: 4.9, h: 2.35, colW: [1.22, 1.45, 1.45, 0.78], rowH: 0.46, border: { color: "777777", pt: 0.75 }, fontFace: "Arial", fontSize: 8, margin: 0.04, valign: "middle" });
  week.addTable([
    [cell("METRIC", C.blue, { bold: true }), cell(data.labelA, C.blue, { bold: true, align: "center" }), cell(data.labelB, C.blue, { bold: true, align: "center" }), cell("%", C.blue, { bold: true, align: "center" })],
    [cell("TOTAL QTY", C.yellow, { bold: true }), cell(num(model.overall.previous.qty), C.white, { align: "center" }), cell(num(model.overall.current.qty), C.white, { align: "center" }), movementCell(model.overall.qtyMovement)],
    [cell("TOTAL SALES", C.yellow, { bold: true }), cell(compact(model.overall.previous.amount), C.white, { align: "center" }), cell(compact(model.overall.current.amount), C.white, { align: "center" }), movementCell(model.overall.amountMovement)],
  ] as any, { x: 7.88, y: 4.38, w: 4.9, h: 1.4, colW: [1.22, 1.45, 1.45, 0.78], rowH: 0.45, border: { color: "777777", pt: 0.75 }, fontFace: "Arial", fontSize: 8, margin: 0.04, valign: "middle" });

  const summary = pptx.addSlide(); addHeader(pptx, summary, "Compare Sales — Device / Accessories / VAS", subtitle);
  summary.addTable([
    [cell("KATEGORI", "707070", { bold: true, color: C.white, align: "center" }), cell(`${data.labelA} QTY`, "707070", { bold: true, color: C.white, align: "center" }), cell(`${data.labelB} QTY`, "707070", { bold: true, color: C.white, align: "center" }), cell("QTY %", "707070", { bold: true, color: C.white, align: "center" }), cell(`${data.labelA} AMOUNT`, "707070", { bold: true, color: C.white, align: "center" }), cell(`${data.labelB} AMOUNT`, "707070", { bold: true, color: C.white, align: "center" }), cell("AMOUNT %", "707070", { bold: true, color: C.white, align: "center" })],
    ...model.categories.map((r, i) => [cell(r.name, i % 2 ? C.soft : C.mid, { bold: true }), cell(num(r.previous.qty), i % 2 ? C.soft : C.mid, { align: "center" }), cell(num(r.current.qty), i % 2 ? C.soft : C.mid, { align: "center" }), movementCell(r.qtyMovement), cell(idr(r.previous.amount), i % 2 ? C.soft : C.mid, { align: "right" }), cell(idr(r.current.amount), i % 2 ? C.soft : C.mid, { align: "right" }), movementCell(r.amountMovement)]),
    [cell("TOTAL", "707070", { bold: true, color: C.white }), cell(num(model.overall.previous.qty), "707070", { bold: true, color: C.white, align: "center" }), cell(num(model.overall.current.qty), "707070", { bold: true, color: C.white, align: "center" }), movementCell(model.overall.qtyMovement), cell(idr(model.overall.previous.amount), "707070", { bold: true, color: C.white, align: "right" }), cell(idr(model.overall.current.amount), "707070", { bold: true, color: C.white, align: "right" }), movementCell(model.overall.amountMovement)],
  ] as any, { x: 0.72, y: 1.68, w: 11.9, h: 3.45, colW: [1.35, 1.18, 1.18, 1, 2.55, 2.55, 1.05], rowH: 0.66, border: { color: C.white, pt: 0.7 }, fontFace: "Arial", fontSize: 9.5, margin: 0.06, valign: "middle" });
  summary.addText(`Kesimpulan: total sales ${model.overall.amountMovement.text.toLowerCase()} dan total qty ${model.overall.qtyMovement.text.toLowerCase()} dibanding ${data.labelA}.`, { x: 1.25, y: 5.62, w: 10.8, h: 0.4, fontFace: "Arial", fontSize: 15, bold: true, align: "center", margin: 0 });

  const lob = pptx.addSlide(); addHeader(pptx, lob, "Weekly LOB", subtitle);
  lob.addTable([
    [cell("LOB", "707070", { bold: true, color: C.white, align: "center" }), cell(`${data.labelA} QTY`, "707070", { bold: true, color: C.white, align: "center" }), cell(`${data.labelB} QTY`, "707070", { bold: true, color: C.white, align: "center" }), cell("QTY %", "707070", { bold: true, color: C.white, align: "center" }), cell(`${data.labelA} AMOUNT`, "707070", { bold: true, color: C.white, align: "center" }), cell(`${data.labelB} AMOUNT`, "707070", { bold: true, color: C.white, align: "center" }), cell("AMOUNT %", "707070", { bold: true, color: C.white, align: "center" })],
    ...model.lobs.map((r, i) => [cell(r.name, i % 2 ? C.soft : C.mid, { bold: true }), cell(num(r.previous.qty), i % 2 ? C.soft : C.mid, { align: "center" }), cell(num(r.current.qty), i % 2 ? C.soft : C.mid, { align: "center" }), movementCell(r.qtyMovement), cell(idr(r.previous.amount), i % 2 ? C.soft : C.mid, { align: "right" }), cell(idr(r.current.amount), i % 2 ? C.soft : C.mid, { align: "right" }), movementCell(r.amountMovement)]),
  ] as any, { x: 0.72, y: 1.55, w: 11.9, h: 4.55, colW: [1.35, 1.18, 1.18, 1, 2.55, 2.55, 1.05], rowH: 0.68, border: { color: C.white, pt: 0.7 }, fontFace: "Arial", fontSize: 9.2, margin: 0.06, valign: "middle" });
  return pptx;
}

export async function weeklyPresentationBytes(data: WeeklyPresentationData) { return await buildWeeklyPresentation(data).write({ outputType: "uint8array", compression: true }) as Uint8Array; }
