import { NextResponse } from "next/server";
import { z } from "zod";
import { weeklyPresentationBytes } from "@/lib/weekly-presentation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const agg = z.object({ qty: z.number().finite(), amount: z.number().finite() });
const side = z.object({ scheme: z.record(z.string(), agg), vas: z.record(z.string(), agg), lob: z.record(z.string(), z.record(z.string(), agg)) });
const weekly = z.object({ labelA: z.string().min(1).max(80), labelB: z.string().min(1).max(80), periodA: z.object({ start: z.string().max(40), end: z.string().max(40) }), periodB: z.object({ start: z.string().max(40), end: z.string().max(40) }), a: side, b: side });

export async function POST(request: Request) {
  try {
    const parsed = z.object({ data: weekly, filename: z.string().min(1).max(120) }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Data weekly untuk PowerPoint tidak valid." }, { status: 400 });
    const bytes = await weeklyPresentationBytes(parsed.data.data), safe = parsed.data.filename.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const body = Uint8Array.from(bytes).buffer;
    return new Response(body, { headers: { "cache-control": "no-store", "content-disposition": `attachment; filename="${safe}.pptx"`, "content-length": String(body.byteLength), "content-type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "x-content-type-options": "nosniff" } });
  } catch (error) {
    console.error("weekly-presentation", error);
    return NextResponse.json({ error: "PowerPoint gagal dibuat. Silakan coba lagi." }, { status: 500 });
  }
}
