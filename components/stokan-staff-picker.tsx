"use client";

type Staff={id:string;name:string;position?:string};
export default function StokanStaffPicker({staff,selected,onChange,disabled=false}:{staff:Staff[];selected:string[];onChange:(names:string[])=>void;disabled?:boolean}){
 const names=[...new Set(staff.map(person=>person.name))];
 return <fieldset disabled={disabled} className="rounded-2xl border p-4">
  <legend className="px-1 text-sm font-black">Staff yang ikut stokan</legend>
  <p className="text-sm text-slate-500">Centang staff yang bertugas. Staff yang libur tidak ikut pembagian.</p>
  <div className="my-3 flex flex-wrap items-center gap-3 text-xs font-bold"><span>{selected.length} dari {names.length} staff dipilih</span><button type="button" onClick={()=>onChange(names)} className="text-blue-600">Pilih semua</button><button type="button" onClick={()=>onChange([])} className="text-slate-500">Kosongkan pilihan</button></div>
  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{names.map(name=><label key={name} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm ${selected.includes(name)?"border-blue-300 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100":""}`}><input type="checkbox" checked={selected.includes(name)} onChange={event=>onChange(names.filter(person=>person===name?event.target.checked:selected.includes(person)))} className="size-4 shrink-0 accent-blue-600"/><span>{name}<small className="block text-xs opacity-70">{staff.find(person=>person.name===name)?.position||""}</small></span></label>)}</div>
  {!selected.length?<p role="status" className="mt-3 text-xs font-bold text-amber-700">Pilih minimal satu staff untuk membagi artikel.</p>:null}
 </fieldset>;
}
