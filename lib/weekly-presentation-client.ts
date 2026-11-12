"use client";
import type { WeeklyPresentationData } from "@/lib/weekly-presentation";

export async function exportWeeklyPresentation(data: WeeklyPresentationData, filename: string, format:"complete"|"m238"="complete") {
  const response = await fetch("/api/weekly-presentation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data, filename, format, notes:data.notes, presentationMonth:data.presentationMonth }) });
  if (!response.ok) { const message = await response.json().catch(() => null) as { error?: string } | null; throw new Error(message?.error || "PowerPoint gagal dibuat."); }
  const blob = await response.blob();
  if (blob.size < 1000) throw new Error("File PowerPoint tidak lengkap. Silakan coba lagi.");
  const url = URL.createObjectURL(new Blob([blob], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }));
  const link = document.createElement("a"); link.href = url; link.download = `${filename.replace(/[^a-zA-Z0-9._-]+/g, "-")}.pptx`; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
