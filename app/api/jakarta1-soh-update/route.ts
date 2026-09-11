import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const SOH_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwy0Gm6BN8FqyZD8JQeozqpOMQQ0-uqqjx1dFq2XRTCpysA4JIcsQ3o6CU3V53PIyOd/exec";

export async function POST() {
  const token = process.env.SOH_API_TOKEN;

  if (!token) {
    console.error("jakarta1-soh-update: SOH_API_TOKEN is not configured");
    return NextResponse.json(
      { success: false, message: "Update SOH gagal. Silakan coba kembali." },
      { status: 503 }
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 240_000);

    const response = await fetch(SOH_WEB_APP_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({ token }).toString(),
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const text = await response.text();
    let payload: { success?: boolean; message?: string } = {};
    try {
      payload = JSON.parse(text) as { success?: boolean; message?: string };
    } catch {
      console.error("jakarta1-soh-update: non-JSON Apps Script response", response.status);
    }

    if (!response.ok || payload.success !== true) {
      console.error("jakarta1-soh-update: Apps Script rejected update", {
        status: response.status,
        message: payload.message || "unknown",
      });
      return NextResponse.json(
        { success: false, message: "Update SOH gagal. Silakan coba kembali." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "SOH berhasil diperbarui.",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("jakarta1-soh-update", error);
    return NextResponse.json(
      { success: false, message: "Update SOH gagal. Silakan coba kembali." },
      { status: 500 }
    );
  }
}
