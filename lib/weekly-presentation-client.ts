"use client";
import type { WeeklyPresentationData } from "@/lib/weekly-presentation";

const PPTX_TYPE="application/vnd.openxmlformats-officedocument.presentationml.presentation";
export async function prepareWeeklyPresentation(data:WeeklyPresentationData,filename:string,format:"complete"|"m238"="complete",signal?:AbortSignal):Promise<File>{
 const response=await fetch("/api/weekly-presentation",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({data,filename,format,notes:data.notes,presentationMonth:data.presentationMonth}),signal});
 if(!response.ok){const message=await response.json().catch(()=>null) as {error?:string}|null;throw new Error(message?.error||"PowerPoint gagal dibuat.")}
 const blob=await response.blob();
 if(blob.size<1000)throw new Error("File PowerPoint tidak lengkap. Silakan coba lagi.");
 return new File([blob],`${filename.replace(/[^a-zA-Z0-9._-]+/g,"-")}.pptx`,{type:PPTX_TYPE});
}
export async function shareWeeklyPresentation(file:File,platform:Pick<Navigator,"canShare"|"share">=navigator):Promise<"shared"|"cancelled"|"unsupported">{
 if(!platform.share||!platform.canShare?.({files:[file]}))return "unsupported";
 // The file is prepared before the tap, so iOS retains user activation.
 try{await platform.share({files:[file],title:file.name});return "shared"}catch(error){if(error instanceof Error&&error.name==="AbortError")return "cancelled";throw error}
}
export async function exportWeeklyPresentation(data:WeeklyPresentationData,filename:string,format:"complete"|"m238"="complete"){
 const file=await prepareWeeklyPresentation(data,filename,format),url=URL.createObjectURL(file),link=document.createElement("a");
 link.href=url;link.download=file.name;document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60_000);
}
