"use client"

import {useEffect,useState,type ReactNode} from "react"

const TIMEOUT_MS=15000
const DATA_CACHE_KEY="m238-last-api-data"
const DATA_CACHE_AT_KEY="m238-last-api-data-at"

type InflightEntry={promise:Promise<Response>}
type MemoryCache={text:string;at:number;status:number;headers:Record<string,string>}

type Policy={match:(path:string)=>boolean;ttl:number;persist?:boolean}
const policies:Policy[]=[
  {match:p=>p==="/api/daily"||p.startsWith("/api/daily-"),ttl:45_000},
  {match:p=>p==="/api/soh",ttl:45_000},
  {match:p=>p==="/api/login-activity",ttl:30_000},
  {match:p=>p==="/api/data",ttl:5*60_000,persist:true},
  {match:p=>p==="/api/overview",ttl:2*60_000},
  {match:p=>p.includes("staff-performance"),ttl:2*60_000},
  {match:p=>p.includes("incentive"),ttl:2*60_000},
  {match:p=>p.includes("target-focus")||p.includes("product-focus"),ttl:2*60_000},
  {match:p=>p.includes("weekly"),ttl:2*60_000},
  {match:p=>p==="/api/mading",ttl:2*60_000},
]

function normalized(url:string){
  const u=new URL(url,window.location.origin)
  u.searchParams.delete("t")
  u.searchParams.delete("_t")
  u.searchParams.delete("ts")
  u.searchParams.delete("cacheBust")
  return `${u.pathname}?${[...u.searchParams.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")}`
}

export default function DashboardFetchGuard({children}:{children:ReactNode}){
  const[ready,setReady]=useState(false)

  useEffect(()=>{
    const originalFetch=window.fetch.bind(window)
    const inflight=new Map<string,InflightEntry>()
    const memory=new Map<string,MemoryCache>()
    const jsonResponse=(entry:MemoryCache,source:string)=>new Response(entry.text,{status:entry.status,headers:{...entry.headers,"x-m238-cache":source}})

    const guardedFetch:typeof window.fetch=async(input,init)=>{
      const raw=typeof input==="string"?input:input instanceof URL?input.toString():input.url
      let parsed:URL
      try{parsed=new URL(raw,window.location.origin)}catch{return originalFetch(input,init)}
      if(parsed.origin!==window.location.origin||!parsed.pathname.startsWith("/api/"))return originalFetch(input,init)
      const policy=policies.find(x=>x.match(parsed.pathname))
      if(!policy)return originalFetch(input,init)
      const method=(init?.method||(typeof input!=="string"&&!(input instanceof URL)?input.method:"GET")||"GET").toUpperCase()
      if(method!=="GET")return originalFetch(input,init)

      const force=parsed.searchParams.get("refresh")==="1"||parsed.searchParams.get("force")==="1"
      const key=normalized(raw)
      if(!force){
        const cached=memory.get(key)
        if(cached&&Date.now()-cached.at<policy.ttl)return jsonResponse(cached,"memory")
        if(policy.persist&&parsed.pathname==="/api/data"){
          try{
            const text=localStorage.getItem(DATA_CACHE_KEY),at=Number(localStorage.getItem(DATA_CACHE_AT_KEY)||0)
            if(text&&at&&Date.now()-at<policy.ttl){
              const entry={text,at,status:200,headers:{"content-type":"application/json"}}
              memory.set(key,entry)
              return jsonResponse(entry,"local")
            }
          }catch{}
        }
      }

      const active=inflight.get(key)
      if(active)return (await active.promise).clone()

      const controller=new AbortController()
      const timer=window.setTimeout(()=>controller.abort(),TIMEOUT_MS)
      const externalSignal=init?.signal
      const abortFromExternal=()=>controller.abort()
      externalSignal?.addEventListener("abort",abortFromExternal,{once:true})

      const promise=(async()=>{
        try{
          const response=await originalFetch(input,{...init,signal:controller.signal})
          if(response.ok){
            try{
              const text=await response.clone().text()
              if(text&&text.length<2_500_000){
                const entry:MemoryCache={text,at:Date.now(),status:response.status,headers:{"content-type":response.headers.get("content-type")||"application/json"}}
                memory.set(key,entry)
                if(policy.persist&&parsed.pathname==="/api/data"){
                  try{localStorage.setItem(DATA_CACHE_KEY,text);localStorage.setItem(DATA_CACHE_AT_KEY,String(entry.at))}catch{}
                }
              }
            }catch{}
          }
          return response
        }catch(error){
          if(controller.signal.aborted){
            const cached=memory.get(key)
            if(cached)return jsonResponse(cached,"timeout-memory")
            if(policy.persist&&parsed.pathname==="/api/data"){
              try{
                const text=localStorage.getItem(DATA_CACHE_KEY)
                if(text)return jsonResponse({text,at:Date.now(),status:200,headers:{"content-type":"application/json"}},"timeout-local")
              }catch{}
            }
          }
          throw error
        }finally{
          window.clearTimeout(timer)
          externalSignal?.removeEventListener("abort",abortFromExternal)
          inflight.delete(key)
        }
      })()

      inflight.set(key,{promise})
      return (await promise).clone()
    }

    window.fetch=guardedFetch
    setReady(true)
    return()=>{window.fetch=originalFetch}
  },[])

  if(!ready)return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm font-semibold text-slate-500">Menyiapkan dashboard…</div>
  return <>{children}</>
}
