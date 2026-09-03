"use client"

import {useEffect,useState,type ReactNode} from "react"

const TIMEOUT_MS=15000
const DATA_CACHE_KEY="m238-last-api-data"
const DATA_CACHE_AT_KEY="m238-last-api-data-at"
const DATA_TTL_MS=5*60*1000
const DAILY_TTL_MS=60*1000

type InflightEntry={promise:Promise<Response>}

type MemoryCache={text:string;at:number}

export default function DashboardFetchGuard({children}:{children:ReactNode}){
  const[ready,setReady]=useState(false)

  useEffect(()=>{
    const originalFetch=window.fetch.bind(window)
    const inflight=new Map<string,InflightEntry>()
    const memory=new Map<string,MemoryCache>()

    const jsonResponse=(text:string,source:string)=>new Response(text,{status:200,headers:{"content-type":"application/json","x-m238-cache":source}})

    const guardedFetch:typeof window.fetch=async(input,init)=>{
      const url=typeof input==="string"?input:input instanceof URL?input.toString():input.url
      const isDashboardData=url.includes("/api/data")
      const isDaily=url.includes("/api/daily")
      if(!isDashboardData&&!isDaily)return originalFetch(input,init)

      const method=(init?.method||(typeof input!=="string"&&!(input instanceof URL)?input.method:"GET")||"GET").toUpperCase()
      if(method!=="GET")return originalFetch(input,init)

      const force=isDashboardData&&/[?&]refresh=1(?:&|$)/.test(url)
      const normalizedKey=isDashboardData
        ? `data:${new URL(url,window.location.origin).searchParams.get("period")||""}`
        : `daily:${new URL(url,window.location.origin).searchParams.get("date")||""}`
      const ttl=isDashboardData?DATA_TTL_MS:DAILY_TTL_MS

      if(!force){
        const cached=memory.get(normalizedKey)
        if(cached&&Date.now()-cached.at<ttl)return jsonResponse(cached.text,"memory")
        if(isDashboardData){
          try{
            const text=localStorage.getItem(DATA_CACHE_KEY),at=Number(localStorage.getItem(DATA_CACHE_AT_KEY)||0)
            if(text&&at&&Date.now()-at<DATA_TTL_MS){
              memory.set(normalizedKey,{text,at})
              return jsonResponse(text,"local")
            }
          }catch{}
        }
      }

      const active=inflight.get(normalizedKey)
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
              const text=await response.clone().text(),at=Date.now()
              if(text&&text.length<2_500_000){
                memory.set(normalizedKey,{text,at})
                if(isDashboardData){
                  localStorage.setItem(DATA_CACHE_KEY,text)
                  localStorage.setItem(DATA_CACHE_AT_KEY,String(at))
                }
              }
            }catch{}
          }
          return response
        }catch(error){
          if(controller.signal.aborted){
            const cached=memory.get(normalizedKey)
            if(cached)return jsonResponse(cached.text,"timeout-memory")
            if(isDashboardData){
              try{
                const text=localStorage.getItem(DATA_CACHE_KEY)
                if(text)return jsonResponse(text,"timeout-local")
              }catch{}
            }
          }
          throw error
        }finally{
          window.clearTimeout(timer)
          externalSignal?.removeEventListener("abort",abortFromExternal)
          inflight.delete(normalizedKey)
        }
      })()

      inflight.set(normalizedKey,{promise})
      return (await promise).clone()
    }

    window.fetch=guardedFetch
    setReady(true)
    return()=>{window.fetch=originalFetch}
  },[])

  if(!ready)return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm font-semibold text-slate-500">Menyiapkan dashboard…</div>
  return <>{children}</>
}
