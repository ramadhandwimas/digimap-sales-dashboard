import {m238ReviewPresentationBytes} from "@/lib/m238-template-presentation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { weeklyPresentationBytes } from "@/lib/weekly-presentation";
import {enrichWeeklyPresentation} from "@/lib/weekly-presentation-source";
import {GET as getWeekly} from "@/app/api/weekly/route";
import {NextRequest} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const agg = z.object({ qty: z.number().finite(), amount: z.number().finite() });
const side = z.object({ scheme: z.record(z.string(), agg), vas: z.record(z.string(), agg), lob: z.record(z.string(), z.record(z.string(), agg)) });
const weekly = z.object({ yearA:z.string().regex(/^20\d{2}$/).optional(),yearB:z.string().regex(/^20\d{2}$/).optional(),labelA: z.string().min(1).max(80), labelB: z.string().min(1).max(80), periodA: z.object({ start: z.string().max(40), end: z.string().max(40) }), periodB: z.object({ start: z.string().max(40), end: z.string().max(40) }), a: side, b: side });

export async function POST(request: Request) {
  try {
    const parsed = z.object({ data: weekly, filename: z.string().min(1).max(120), format:z.enum(["complete","m238"]).optional(), presentationMonth:z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/).optional(), notes:z.object({issues:z.string().max(3000),actionPlan:z.string().max(3000),support:z.string().max(3000)}).optional() }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Data weekly untuk PowerPoint tidak valid." }, { status: 400 });
    const url=new URL("/api/weekly",request.url);url.searchParams.set("from",parsed.data.data.labelA);url.searchParams.set("to",parsed.data.data.labelB);url.searchParams.set("fromYear",parsed.data.data.yearA||parsed.data.data.periodA.start.slice(0,4));url.searchParams.set("toYear",parsed.data.data.yearB||parsed.data.data.periodB.start.slice(0,4));
    const response=await getWeekly(new NextRequest(url)),live=await response.json();
    if(!response.ok||live.error)throw new Error(live.error||"Data weekly gagal dimuat.");
    if(live.labelA!==parsed.data.data.labelA||live.labelB!==parsed.data.data.labelB||live.periodA.start!==parsed.data.data.periodA.start||live.periodB.start!==parsed.data.data.periodB.start) return NextResponse.json({error:"Periode weekly berubah. Perbarui report lalu unduh lagi."},{status:409});
    const enriched=await enrichWeeklyPresentation(live,{period:parsed.data.presentationMonth}),report={...enriched,notes:parsed.data.notes};
    const bytes = await (parsed.data.format==="m238"?m238ReviewPresentationBytes(report):weeklyPresentationBytes(report)), safe = parsed.data.filename.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const body = Uint8Array.from(bytes).buffer;
    return new Response(body, { headers: { "cache-control": "no-store", "content-disposition": `attachment; filename="${safe}.pptx"`, "content-length": String(body.byteLength), "content-type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "x-content-type-options": "nosniff" } });
  } catch (error) {
    console.error("weekly-presentation", error);
    return NextResponse.json({ error: "PowerPoint gagal dibuat. Silakan coba lagi." }, { status: 500 });
  }
}
