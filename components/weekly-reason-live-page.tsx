"use client";
import dynamic from "next/dynamic";
import PerformanceSkeleton from "@/components/performance-skeleton";
const WeeklyReasonLivePageV2=dynamic(()=>import("@/components/weekly-reason-live-page-v2"),{loading:()=> <PerformanceSkeleton label="Memuat Weekly Reason…"/>});
export default function WeeklyReasonLivePage(){return <WeeklyReasonLivePageV2/>}
