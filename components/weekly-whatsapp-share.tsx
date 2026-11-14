"use client";
import {useState} from "react";
import {weeklyCompareCaption,weeklyComparePicture,type WeeklyCompareData} from "@/lib/weekly-compare-picture";

export default function WeeklyWhatsappShare({data}:{data:WeeklyCompareData}){
 const[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const share=async()=>{if(busy)return;setBusy(true);setMessage("");try{const file=await weeklyComparePicture(data),caption=weeklyCompareCaption(data);if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({title:`M238 ${caption}`,text:`M238 PIM 2\nWeekly Report ${caption}`,files:[file]});return}setMessage("Share file belum didukung. Buka preview melalui Safari lalu coba lagi.")}catch(error){if(error instanceof DOMException&&error.name==="AbortError")return;setMessage(error instanceof Error?error.message:"Share WhatsApp belum dapat dibuka.")}finally{setBusy(false)}};
 return <div className="export-hide mt-3"><button type="button" disabled={busy} onClick={()=>void share()} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50 sm:w-auto">{busy?"Menyiapkan tabel compare…":"Share WhatsApp · Compare Week to Week"}</button>{message?<p role="status" className="mt-2 text-xs font-semibold text-rose-600">{message}</p>:null}</div>;
}
