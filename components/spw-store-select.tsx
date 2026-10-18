"use client";

export function SpwStoreSelect({value,onChange,disabled=false}:{value:string;onChange:(store:string)=>void;disabled?:boolean}){
 return <div className="space-y-2"><label className="block text-sm font-bold">Toko sumber SPW<select aria-label="Toko sumber SPW" value={value} onChange={event=>onChange(event.target.value)} disabled={disabled} className="mt-2 w-full rounded-xl border bg-white p-3 text-sm dark:bg-slate-900"><option value="M238">M238</option><option value="M996">M996</option></select></label><p className="text-xs text-slate-500">Upload masing-masing toko. Hasil M238 + M996 otomatis digabung. Upload ulang mengganti data toko yang dipilih.</p></div>
}
