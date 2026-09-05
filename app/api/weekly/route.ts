import { NextRequest, NextResponse } from "next/server";
import { getSheetRanges } from "@/lib/google-sheets";

const ID = "160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown) => String(v ?? "").trim();
type Agg = { qty: number; amount: number };
type Side = {
  scheme: Record<string, Agg>;
  vas: Record<string, Agg>;
  lob: Record<string, Record<string, Agg>>;
};
type LobAnalysis = {
  comparison: string;
  reason: string;
  feedbackReason: string;
  actionPlan: string;
};
const total = (values: Record<string, Agg> = {}) =>
  Object.values(values).reduce(
    (sum, value) => ({
      qty: sum.qty + value.qty,
      amount: sum.amount + value.amount,
    }),
    { qty: 0, amount: 0 },
  );
const lobNames: Record<string, string> = {
  AIRPODS: "AirPods",
  IPHONE: "iPhone",
  MAC: "MacBook",
  IPAD: "iPad",
  "APPLE WATCH": "Watch",
};
const iso = (value: unknown) => {
  if (typeof value === "number")
    return new Date(Date.UTC(1899, 11, 30) + value * 86400000)
      .toISOString()
      .slice(0, 10);
  const raw = s(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split(/[/-]/);
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return "";
};
const weekWindow = (anchor: string) => {
  if (!anchor) return { start: "", end: "" };
  const date = new Date(`${anchor}T00:00:00Z`),
    day = date.getUTCDay(),
    startDate = new Date(date.getTime() - day * 86400000),
    endDate = new Date(startDate.getTime() + 6 * 86400000);
  return {
    start: startDate.toISOString().slice(0, 10),
    end: endDate.toISOString().slice(0, 10),
  };
};
const feedbackLob: Record<string, RegExp> = {
  AIRPODS: /airpods?|air pod/i,
  IPHONE: /iphone|\bip\s*(?:\d|air)/i,
  MAC: /macbook|\bmac\s*(?:air|pro|neo)/i,
  IPAD: /ipad/i,
  "APPLE WATCH": /apple watch|\bwatch\b|\baw\s*(?:s|se|ultra)/i,
};
const feedbackThemes: Array<{ pattern: RegExp; text: string }> = [
  {
    pattern:
      /traffic|trafic|sepi|minim.{0,25}(customer|cust|pelanggan)|hanya (lihat|liat)/i,
    text: "traffic dan opportunity customer masih terbatas",
  },
  {
    pattern: /stok|stock|kosong|tidak tersedia/i,
    text: "stok atau varian yang dicari customer belum tersedia",
  },
  {
    pattern: /harga|budget|anggaran|mahal/i,
    text: "customer masih mempertimbangkan harga dan menyesuaikan budget",
  },
  {
    pattern: /compare|banding|kompetitor|ibox|samsung/i,
    text: "customer masih membandingkan produk atau penawaran",
  },
  {
    pattern:
      /follow.?up|\bfu\b|save kontak|simpan kontak|keep (nomor|nomer)|belum mau|nanti/i,
    text: "beberapa customer belum closing dan masih dalam proses follow-up",
  },
  {
    pattern: /provider|\bvas\b|qoala|telkomsel|indosat|\bxl\b/i,
    text: "penawaran VAS atau provider belum seluruhnya berhasil closing",
  },
  {
    pattern: /promo|diskon|potongan/i,
    text: "promo yang berjalan belum maksimal membantu closing",
  },
  {
    pattern: /aksesori|accessor|\bacc\b|adapter|cable|keyboard/i,
    text: "traffic transaksi masih cukup banyak didominasi kebutuhan accessories",
  },
  {
    pattern: /kasir|operasional|administrasi|back office/i,
    text: "aktivitas operasional mengurangi waktu selling team",
  },
];
function frequentFeedback(raws: string[]) {
  return feedbackThemes
    .map((theme, index) => ({
      text: theme.text,
      index,
      count: raws.filter((raw) => theme.pattern.test(raw)).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .slice(0, 3)
    .map((item) => item.text);
}
function feedbackReason(lob: string, raws: string[]) {
  const specific = raws.filter((raw) => feedbackLob[lob]?.test(raw)),
    themes = frequentFeedback(specific);
  if (
    lob === "IPHONE" &&
    specific.some((raw) =>
      /(?:menunggu|tunggu).{0,40}(?:launch|launching).{0,30}(?:iphone|ip)\s*18/i.test(
        raw,
      ),
    )
  )
    themes.unshift(
      "terdapat customer yang menunggu launching iPhone 18 dan kondisi ini bukan lost sales",
    );
  return themes.length
    ? `Berdasarkan feedback team, kendala ${lobNames[lob]} yang muncul adalah ${[...new Set(themes)].slice(0, 3).join(", serta ")}.`
    : `Belum ada feedback team yang menyebut kendala spesifik ${lobNames[lob]} pada week ini.`;
}
const lobActions: Record<string, { up: string; down: string }> = {
  AIRPODS: {
    up: "Pertahankan momentum melalui AirPods Try On, maksimalkan attachment pada penjualan device, dan pastikan promo aktif tersampaikan.",
    down: "Maksimalkan AirPods Try On, cek ketersediaan tipe yang turun, manfaatkan promo aktif, dan lakukan attachment pada setiap penjualan device.",
  },
  IPHONE: {
    up: "Pertahankan kontribusi tipe yang tumbuh, pastikan stok high demand tersedia, dan lanjutkan follow-up customer potensial.",
    down: "Fokus pada tipe iPhone yang mengalami penurunan, monitoring stok high demand, maksimalkan promo atau BNPL, dan follow-up customer yang belum closing.",
  },
  MAC: {
    up: "Pertahankan momentum tipe MacBook yang tumbuh melalui Try On, demo use case, dan follow-up customer potensial.",
    down: "Maksimalkan MacBook Try On, perkuat demo sesuai kebutuhan customer, monitoring stok tipe yang turun, dan follow-up seluruh opportunity.",
  },
  IPAD: {
    up: "Pertahankan tipe iPad yang tumbuh melalui demo use case, penawaran promo, serta attachment Pencil dan keyboard.",
    down: "Fokus pada tipe iPad yang turun, monitoring stok, maksimalkan demo use case dan promo, serta attachment Pencil atau keyboard.",
  },
  "APPLE WATCH": {
    up: "Pertahankan pertumbuhan melalui demo fitur health dan fitness, kebutuhan gift, serta follow-up customer potensial.",
    down: "Maksimalkan demo fitur health dan fitness, cek stok warna serta ukuran yang turun, manfaatkan promo, dan follow-up customer potensial.",
  },
};
function analyze(
  lob: string,
  previous: Record<string, Agg> = {},
  current: Record<string, Agg> = {},
  labelA: string,
  labelB: string,
  feedback: string[] = [],
): LobAnalysis {
  const a = total(previous),
    b = total(current),
    qtyDiff = b.qty - a.qty,
    qtyGrowth = a.qty ? (qtyDiff / a.qty) * 100 : 0,
    amountDiff = b.amount - a.amount,
    amountGrowth = a.amount ? (amountDiff / a.amount) * 100 : 0,
    name = lobNames[lob] ?? lob,
    types = [...new Set([...Object.keys(previous), ...Object.keys(current)])]
      .map((type) => ({
        type,
        diff: (current[type]?.qty ?? 0) - (previous[type]?.qty ?? 0),
      }))
      .filter((item) => item.diff !== 0),
    up = types
      .filter((item) => item.diff > 0)
      .sort((x, y) => y.diff - x.diff)[0],
    down = types
      .filter((item) => item.diff < 0)
      .sort((x, y) => x.diff - y.diff)[0],
    teamFeedback = feedbackReason(lob, feedback);
  if (!a.qty && !b.qty)
    return {
      comparison: `Belum ada penjualan ${name} pada ${labelA} dan ${labelB}.`,
      reason: "Belum ada pergerakan tipe produk yang dapat dianalisa.",
      feedbackReason: teamFeedback,
      actionPlan:
        lobActions[lob]?.down ?? "Monitoring opportunity pada week berikutnya.",
    };
  const movement = !a.qty
      ? `mulai mencatat ${b.qty} unit`
      : qtyDiff > 0
        ? `naik ${Math.abs(qtyGrowth).toFixed(0)}% menjadi ${b.qty} unit`
        : qtyDiff < 0
          ? `turun ${Math.abs(qtyGrowth).toFixed(0)}% menjadi ${b.qty} unit`
          : `stabil di ${b.qty} unit`,
    unitSummary =
      qtyDiff > 0
        ? `plus ${qtyDiff} unit`
        : qtyDiff < 0
          ? `minus ${Math.abs(qtyDiff)} unit`
          : "tidak berubah secara qty",
    comparison = `Penjualan ${name} pada ${labelB} ${movement} dibanding ${labelA}. Secara total ${unitSummary}${a.amount ? ` dengan pertumbuhan amount ${amountDiff >= 0 ? "+" : ""}${amountGrowth.toFixed(0)}%` : ""}.`;
  let why = "Perubahan qty tersebar pada beberapa tipe produk.";
  if (qtyDiff < 0 && down)
    why = `Penurunan terutama terjadi pada ${down.type} yang turun ${Math.abs(down.diff)} unit${up ? `, sementara kenaikan ${up.type} sebesar ${up.diff} unit belum dapat menutup penurunan tersebut` : ""}.`;
  else if (qtyDiff > 0 && up)
    why = `Kenaikan terutama didukung oleh ${up.type} yang bertambah ${up.diff} unit${down ? `, meskipun ${down.type} turun ${Math.abs(down.diff)} unit` : ""}.`;
  else if (!qtyDiff)
    why =
      up && down
        ? `Kenaikan ${up.type} sebesar ${up.diff} unit tertahan oleh penurunan ${down.type} sebesar ${Math.abs(down.diff)} unit, sehingga total penjualan stabil.`
        : "Total penjualan stabil dibanding week sebelumnya.";
  return {
    comparison,
    reason: why,
    feedbackReason: teamFeedback,
    actionPlan:
      lobActions[lob]?.[qtyDiff >= 0 ? "up" : "down"] ??
      "Monitoring pergerakan produk dan maksimalkan opportunity pada week berikutnya.",
  };
}

export async function GET(req: NextRequest) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key)
    return NextResponse.json(
      { error: "Google Sheets belum dikonfigurasi" },
      { status: 503 },
    );

  const [rows, feedbackRows] = await getSheetRanges(
    ID,
    ["'Data Copas'!A2:S50000", "'Dashboard Feedback'!A2:G5000"],
    email,
    key,
  );
  const available = [
      ...new Set(
        rows
          .filter(
            (row) =>
              s(row[15]) === "M238" &&
              s(row[18]) === "2026" &&
              /^Week \d+ Q\d+$/i.test(s(row[14])),
          )
          .map((row) => s(row[14])),
      ),
    ],
    latest = available.slice(-2),
    requestedA = req.nextUrl.searchParams.get("from") ?? "",
    requestedB = req.nextUrl.searchParams.get("to") ?? "",
    labelA = available.includes(requestedA)
      ? requestedA
      : (latest[0] ?? "Week 1 Q4"),
    labelB = available.includes(requestedB)
      ? requestedB
      : (latest[1] ?? latest[0] ?? "Week 2 Q4"),
    parseLabel = (label: string) => {
      const match = label.match(/Week (\d+) Q(\d+)/i);
      return {
        week: Number(match?.[1] ?? 0),
        quarter: Number(match?.[2] ?? 0),
      };
    },
    parsedA = parseLabel(labelA),
    parsedB = parseLabel(labelB),
    weekA = parsedA.week,
    weekB = parsedB.week;
  const emptySide = (): Side => ({ scheme: {}, vas: {}, lob: {} });
  const out: { a: Side; b: Side } = { a: emptySide(), b: emptySide() };
  const add = (
    target: Record<string, Agg>,
    name: string,
    qty: number,
    amount: number,
  ) => {
    target[name] ??= { qty: 0, amount: 0 };
    target[name].qty += qty;
    target[name].amount += amount;
  };

  for (const row of rows) {
    if (s(row[15]) !== "M238" || s(row[18]) !== "2026") continue;
    const weekLabel = s(row[14]);
    const side =
      weekLabel === labelA ? out.a : weekLabel === labelB ? out.b : null;
    if (!side) continue;

    const qty = n(row[7]),
      amount = n(row[8]),
      type = s(row[6]),
      description = s(row[5]),
      category = s(row[9]).toUpperCase(),
      brand = s(row[10]).toUpperCase(),
      scheme = s(row[12]).toUpperCase();
    if (scheme === "DEVICES") add(side.scheme, "DEVICE", qty, amount);
    else if (scheme === "VAS") add(side.scheme, "VAS", qty, amount);
    else if (scheme === "ACCESSORIES") add(side.scheme, "ACC", qty, amount);

    const vasText = `${brand} ${description}`.toUpperCase();
    if (scheme === "VAS" && /QOALA|TELKOMSEL|INDOSAT|XL|XXL/.test(vasText)) {
      const vas = /QOALA/.test(vasText)
        ? "QOALA"
        : /TELKOMSEL/.test(vasText)
          ? "TELKOMSEL"
          : /INDOSAT/.test(vasText)
            ? "INDOSAT"
            : "XL";
      add(side.vas, vas, qty, amount);
    }

    const lob = /AIRPOD/.test(category)
      ? "AIRPODS"
      : category === "IPHONE"
        ? "IPHONE"
        : category === "IPAD"
          ? "IPAD"
          : category === "MAC"
            ? "MAC"
            : /WATCH/.test(category)
              ? "APPLE WATCH"
              : "";
    if (lob) {
      side.lob[lob] ??= {};
      add(side.lob[lob], type || description || category, qty, amount);
    }
  }

  const storeRows = rows.filter(
      (row) =>
        s(row[15]) === "M238" &&
        s(row[18]) === "2026" &&
        iso(row[0]) &&
        s(row[14]),
    ),
    anchorA = iso(storeRows.find((row) => s(row[14]) === labelA)?.[0]),
    anchorB = iso(storeRows.find((row) => s(row[14]) === labelB)?.[0]),
    periodA = weekWindow(anchorA),
    periodB = weekWindow(anchorB),
    weekFeedback = feedbackRows
      .filter((row) => {
        const date = iso(row[1]);
        return Boolean(
          date && periodB.start && date >= periodB.start && date <= periodB.end,
        );
      })
      .map((row) => s(row[5]))
      .filter(Boolean),
    commonThemes = frequentFeedback(weekFeedback),
    feedbackSummary = commonThemes.length
      ? `Kendala yang paling sering disampaikan team pada ${labelB} (${periodB.start} s.d. ${periodB.end}) adalah ${commonThemes.join(", serta ")}.`
      : `Belum ada feedback team yang tersimpan pada ${labelB} (${periodB.start} s.d. ${periodB.end}).`;
  const analysis = Object.fromEntries(
    Object.keys(lobNames).map((lob) => [
      lob,
      analyze(
        lob,
        out.a.lob[lob],
        out.b.lob[lob],
        labelA,
        labelB,
        weekFeedback,
      ),
    ]),
  );
  return NextResponse.json(
    {
      weekA,
      weekB,
      quarterA: parsedA.quarter,
      quarterB: parsedB.quarter,
      labelA,
      labelB,
      periodA,
      periodB,
      availableWeeks: available,
      ...out,
      feedbackCount: weekFeedback.length,
      feedbackSummary,
      analysis,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
