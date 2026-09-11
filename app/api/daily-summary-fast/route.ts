import { NextRequest, NextResponse } from "next/server";
import { getGoogleSheetRequestCount } from "@/lib/google-sheets";
import { getDailySummaryRange } from "@/lib/m238-daily-summary-cache";

const validDate = (value: string) => /^20\d{2}-\d{2}-\d{2}$/.test(value);

export async function GET(request: NextRequest) {
  const started = Date.now();
  const apiStarted = getGoogleSheetRequestCount();
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const from = request.nextUrl.searchParams.get("from") ?? "";
  const to = request.nextUrl.searchParams.get("to") ?? "";
  const refresh = request.nextUrl.searchParams.get("refresh") === "1";

  if (!email || !key)
    return NextResponse.json(
      { error: "Google Sheets belum dikonfigurasi" },
      { status: 503 },
    );
  if (!validDate(from) || !validDate(to) || from > to)
    return NextResponse.json(
      { error: "Range tanggal tidak valid" },
      { status: 400 },
    );

  try {
    const result = await getDailySummaryRange(from, to, { email, key }, refresh);
    const duration = Date.now() - started;
    const apiRequests = getGoogleSheetRequestCount() - apiStarted;
    const timing = { ...result.timing, total: duration, apiRequests };
    console.info("M238_PERF", {
      op: "daily-summary",
      from,
      to,
      cache: result.cacheStatus,
      rows: result.rows.length,
      timing,
    });
    return NextResponse.json(
      {
        from,
        to,
        rows: result.rows,
        previousTotal: result.previousTotal,
        previousFrom: result.previousStart,
        previousTo: result.previousEnd,
        generatedAt: new Date().toISOString(),
        source: "DAILY SUMMARY CACHE",
        cache: result.cacheStatus,
        performance: timing,
      },
      {
        headers: {
          "cache-control": refresh
            ? "no-store"
            : "private, max-age=60, stale-while-revalidate=300",
          "server-timing": `summary;dur=${duration}`,
          "x-daily-summary-cache": result.cacheStatus,
        },
      },
    );
  } catch (error) {
    const duration = Date.now() - started;
    const apiRequests = getGoogleSheetRequestCount() - apiStarted;
    console.warn("M238_PERF", {
      op: "daily-summary",
      from,
      to,
      total: duration,
      apiRequests,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      {
        error: "Data Daily Summary belum berhasil dimuat. Silakan coba Perbarui.",
        performance: { total: duration, apiRequests },
      },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
