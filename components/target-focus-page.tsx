"use client";

import VasFocusPage from "@/components/vas-focus-page";

type Mode="lob-focus"|"product-focus"|"vas-focus";

export default function TargetFocusPage({mode}:{mode:Mode}){
  if(mode==="vas-focus") return <VasFocusPage/>;
  return null;
}
