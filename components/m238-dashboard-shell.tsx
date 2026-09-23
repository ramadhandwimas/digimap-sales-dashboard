"use client"

import {useState} from "react"
import DashboardProductionFull from "@/components/dashboard-production-full"
import DailySummaryM238 from "@/components/daily-summary-m238"

export default function M238DashboardShell(){
  const[summary,setSummary]=useState(false)
  if(summary)return <DailySummaryM238 onBack={()=>setSummary(false)}/>
  return <div onClickCapture={event=>{
    const target=event.target as HTMLElement
    const button=target.closest("button")
    if(button?.textContent?.trim()==="Daily Summary"){
      event.preventDefault()
      event.stopPropagation()
      setSummary(true)
    }
  }}><DashboardProductionFull/></div>
}
