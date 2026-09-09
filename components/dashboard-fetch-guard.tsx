"use client"

import {useEffect,useState,type ReactNode} from "react"

const TIMEOUT_MS=12000
const DATA_TTL_MS=5*60*1000
const DAILY_TTL_MS=60*1000

type InflightEntry={promise:Promise<Response>}
type MemoryCache={text:string;at:number}

const dataCacheKey=(period:string)=>`m238-api-data:${period}`
const dataCacheAtKey=(period:string)=>`m238-api-data-at:${period}`

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

      const parsed=new URL(url,window.location.origin)
      const period=parsed.searchParams.get("period")||""
      const date=parsed.searchParams.get("date")||""
      const force=isDashboardData&&parsed.searchParams.get("refresh")==="1"
      const normalizedKey=isDashboardData?`data:${period}`:`daily:${date}`
      const ttl=isDashboardData?DATA_TTL_MS:DAILY_TTL_MS

      if(!force){
        const cached=memory.get(normalizedKey)
        if(cached&&Date.now()-cached.at<ttl)return jsonResponse(cached.text,"memory")
        if(isDashboardData&&period){
          try{
            const text=localStorage.getItem(dataCacheKey(period)),at=Number(localStorage.getItem(dataCacheAtKey(period))||0)
            if(text&&at&&Date.now()-at<DATA_TTL_MS){
              memory.set(normalizedKey,{text,at})
              return jsonResponse(text,"local")
            }
          }catch{}
        }
      }

      const active=inflight.get(normalizedKey)
      if(active&&!force)return (await active.promise).clone()

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
                if(isDashboardData&&period){
                  localStorage.setItem(dataCacheKey(period),text)
                  localStorage.setItem(dataCacheAtKey(period),String(at))
                }
              }
            }catch{}
          }
          return response
        }catch(error){
          if(controller.signal.aborted){
            const cached=memory.get(normalizedKey)
            if(cached)return jsonResponse(cached.text,"timeout-memory")
            if(isDashboardData&&period){
              try{
                const text=localStorage.getItem(dataCacheKey(period))
                if(text)return jsonResponse(text,"timeout-local")
              }catch{}
            }
          }
          throw error
        }finally{
          window.clearTimeout(timer)
          externalSignal?.removeEventListener("abort",abortFromExternal)
          if(inflight.get(normalizedKey)?.promise===promise)inflight.delete(normalizedKey)
        }
      })()

      if(!force)inflight.set(normalizedKey,{promise})
      return (await promise).clone()
    }

    window.fetch=guardedFetch
    setReady(true)
    return()=>{window.fetch=originalFetch}
  },[])

  if(!ready)return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm font-semibold text-slate-500">Menyiapkan dashboard…</div>
  return <>{children}</>
}
