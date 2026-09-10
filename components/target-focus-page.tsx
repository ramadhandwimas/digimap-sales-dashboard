"use client";
import dynamic from "next/dynamic";
import PerformanceSkeleton from "@/components/performance-skeleton";
type Mode="lob-focus"|"product-focus"|"vas-focus";
const VasFocusPage=dynamic(()=>import("@/components/vas-focus-page"),{loading:()=> <PerformanceSkeleton label="Memuat VAS Fokus…"/>});
export default function TargetFocusPage({mode}:{mode:Mode}){if(mode==="vas-focus")return <VasFocusPage/>;return null}
