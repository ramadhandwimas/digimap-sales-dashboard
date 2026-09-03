"use client";
import {useEffect,useState} from "react";
import {LockKeyhole,X} from "lucide-react";

export default function SettingsGuard(){
  const[open,setOpen]=useState(false),[pin,setPin]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(false);

  useEffect(()=>{
    const handler=(event:MouseEvent)=>{
      const target=event.target as HTMLElement|null;
      const button=target?.closest("button");
      if(!button)return;
      const label=(button.textContent||"").trim().toLowerCase();
      if(label!=="settings")return;
      if(sessionStorage.getItem("m238-settings-unlocked")==="1")return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setError("");
      setPin("");
      setOpen(true);
    };
    document.addEventListener("click",handler,true);
    return()=>document.removeEventListener("click",handler,true);
  },[]);

  const unlock=async()=>{
    if(!pin.trim())return setError("Masukkan PIN admin.");
    setLoading(true);setError("");
    try{
      const r=await fetch("/api/settings-auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({pin})});
      const j=await r.json();
      if(!r.ok)throw new Error(j.error||"PIN salah.");
      sessionStorage.setItem("m238-settings-unlocked","1");
      setOpen(false);
      setTimeout(()=>{
        const buttons=[...document.querySelectorAll("button")];
        const settings=buttons.find(b=>(b.textContent||"").trim().toLowerCase()==="settings");
        settings?.click();
      },0);
    }catch(e){setError(e instanceof Error?e.message:"Gagal membuka Settings.")}finally{setLoading(false)}
  };

  if(!open)return null;
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-3xl border bg-white p-6 shadow-2xl dark:bg-slate-950">
      <div className="flex items-start justify-between gap-4">
        <div className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"><LockKeyhole className="size-5"/></div>
        <button onClick={()=>setOpen(false)} className="rounded-xl border p-2 text-slate-500"><X className="size-4"/></button>
      </div>
      <h2 className="mt-5 text-xl font-black">Settings Admin</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">Menu Settings dikunci. Masukkan PIN admin untuk melanjutkan.</p>
      <input autoFocus type="password" inputMode="numeric" value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void unlock()}} placeholder="Masukkan PIN" className="mt-5 h-12 w-full rounded-xl border bg-white px-4 text-center text-lg font-bold tracking-[.25em] outline-none focus:ring-2 focus:ring-blue-200 dark:bg-slate-900"/>
      {error&&<p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-600">{error}</p>}
      <button disabled={loading} onClick={()=>void unlock()} className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-50">{loading?"Memeriksa…":"Buka Settings"}</button>
      <p className="mt-3 text-center text-xs text-slate-400">Akses berlaku selama tab browser ini masih terbuka.</p>
    </div>
  </div>;
}
