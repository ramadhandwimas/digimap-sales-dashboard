"use client";

import {useCallback,type ReactNode} from "react";

export default function DailySummaryAutoApply({children}:{children:ReactNode}){
 const handleChange=useCallback((event:React.ChangeEvent<HTMLDivElement>)=>{
  const target=event.target;
  if(!(target instanceof HTMLSelectElement))return;
  const label=target.closest("label");
  if(!label||!label.textContent?.includes("Periode"))return;
  window.requestAnimationFrame(()=>{
   const root=target.closest("[data-daily-summary-root]");
   const buttons=root?.querySelectorAll("button")??[];
   const apply=[...buttons].find(button=>button.textContent?.trim()==="Tampilkan") as HTMLButtonElement|undefined;
   if(apply&&!apply.disabled)apply.click();
  });
 },[]);
 return <div data-daily-summary-root onChange={handleChange}>{children}</div>;
}
