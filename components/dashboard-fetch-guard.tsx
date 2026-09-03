"use client"

import {useEffect,useState,type ReactNode} from "react"

const TIMEOUT_MS=15000
const CACHE_KEY="m238-last-api-data"

type InflightEntry={promise:Promise<Response>}

export default function DashboardFetchGuard({children}:{children:ReactNode}){
  const[ready,setReady]=useState(false)

  useEffect(()=>{
    const originalFetch=window.fetch.bind(window)
    const inflight=new Map<string,InflightEntry>()

    const guardedFetch:typeof window.fetch=async(input,init)=>{
      const url=typeof input==="string"?input:input instanceof URL?input.toString():input.url
      const isDashboardData=url.includes("/api/data")
      const isDaily=url.includes("/api/daily")
      if(!isDashboardData&&!isDaily)return originalFetch(input,init)

      const method=(init?.method||(typeof input!=="string"&&!(input instanceof URL)?input.method:"GET")||"GET").toUpperCase()
      if(method!=="GET")return originalFetch(input,init)

      const key=`${method}:${url}`
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
          if(isDashboardData&&response.ok){
            try{
              const text=await response.clone().text()
              if(text&&text.length<2_500_000)localStorage.setItem(CACHE_KEY,text)
            }catch{}
          }
          return response
        }catch(error){
          if(isDashboardData&&controller.signal.aborted){
            try{
              const cached=localStorage.getItem(CACHE_KEY)
              if(cached)return new Response(cached,{status:200,headers:{"content-type":"application/json","x-m238-cache":"timeout-fallback"}})
            }catch{}
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
