import { NextRequest, NextResponse } from "next/server";
import { getGoogleSheetRequestCount } from "@/lib/google-sheets";
import { getDailySummaryRange } from "@/lib/m238-daily-summary-cache";

const validDate = (value: string) => /^20\d{2}-\d{2}-\d{2}$/.test(value);

export async function GET(request: NextRequest) {
  const started = Date.now();
  const requestStartedAt = new Date().toISOString();
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
    const result = await getDailySummaryRange(
      from,
      to,
      { email, key },
      refresh,
    );
    const apiRequests = getGoogleSheetRequestCount() - apiStarted;
    const responseStarted = Date.now();
    const body = {
      from,
      to,
      summary: result.summary,
      dailyRows: result.dailyRows,
      previousFrom: result.previousStart,
      previousTo: result.previousEnd,
      generatedAt: new Date().toISOString(),
      source: "DAILY SUMMARY CACHE",
      cache: result.cacheStatus,
      performance: {
        ...result.timing,
        apiResponse: 0,
        totalLoad: 0,
        googleSheetRequests: apiRequests,
        rawRowsFetched: result.timing.rawRowsFetched,
        rowsReturned: result.dailyRows.length,
        payloadBytes: 0,
      },
    };
    let serialized = JSON.stringify(body);
    body.performance.apiResponse = Date.now() - responseStarted;
    body.performance.totalLoad = Date.now() - started;
    body.performance.payloadBytes = Buffer.byteLength(serialized, "utf8");
    serialized = JSON.stringify(body);
    body.performance.payloadBytes = Buffer.byteLength(serialized, "utf8");
    serialized = JSON.stringify(body);
    const timing = body.performance;
    console.info("M238_PERF", {
      op: "daily-summary",
      requestStartedAt,
      from,
      to,
      cache: result.cacheStatus,
      rawRowsFetched: timing.rawRowsFetched,
      rowsReturned: timing.rowsReturned,
      payloadBytes: timing.payloadBytes,
      timing,
    });
    return new NextResponse(serialized, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": refresh
          ? "no-store"
          : "private, max-age=60, stale-while-revalidate=300",
        "server-timing": [
          `sheets;dur=${timing.googleSheetsRead + timing.cacheRead}`,
          `normalize;dur=${timing.normalization}`,
          `aggregate;dur=${timing.dailyAggregation}`,
          `traffic;dur=${timing.trafficJoin}`,
          `summary;dur=${timing.summaryCalculation}`,
          `total;dur=${timing.totalLoad}`,
        ].join(", "),
        "x-daily-summary-cache": result.cacheStatus,
        "x-daily-summary-rows": String(result.dailyRows.length),
        "x-daily-summary-bytes": String(timing.payloadBytes),
      },
    });
  } catch (error) {
    const duration = Date.now() - started;
    const apiRequests = getGoogleSheetRequestCount() - apiStarted;
    console.warn("M238_PERF", {
      op: "daily-summary",
      requestStartedAt,
      from,
      to,
      total: duration,
      apiRequests,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      {
        error:
          "Data Daily Summary belum berhasil dimuat. Silakan coba Perbarui.",
        performance: { total: duration, apiRequests },
      },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
