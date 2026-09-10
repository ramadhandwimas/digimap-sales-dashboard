"use client";
import {useState} from "react";
import OverviewPage from "@/components/overview-page";

const currentPeriod=()=>new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date()).slice(0,7);
export default function OverviewNative(){
 const[period,setPeriod]=useState(currentPeriod());
 return <OverviewPage period={period} setPeriod={setPeriod}/>;
}
