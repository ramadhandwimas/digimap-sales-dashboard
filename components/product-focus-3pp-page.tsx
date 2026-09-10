"use client";
import dynamic from "next/dynamic";
import PerformanceSkeleton from "@/components/performance-skeleton";
const ProductFocus3PPFinalPage=dynamic(()=>import("@/components/product-focus-3pp-final-page"),{loading:()=> <PerformanceSkeleton label="Memuat Product Fokus 3PP…"/>});
export default function ProductFocus3PPPage(){return <ProductFocus3PPFinalPage/>}
