"use client";
import {useEffect} from "react";

export default function OverviewFilterResync(){useEffect(()=>{let replaying=false;const onChange=(e:Event)=>{if(replaying)return;const target=e.target as HTMLSelectElement|null;if(!target||target.tagName!=="SELECT"||!/^20\d{2}-\d{2}$/.test(target.value))return;const label=target.closest("label");if(!label||!((label.textContent||"").toLowerCase().includes("filter bulan")))return;setTimeout(()=>{replaying=true;target.dispatchEvent(new Event("change",{bubbles:true}));setTimeout(()=>{replaying=false},0)},0)};document.addEventListener("change",onChange,false);return()=>document.removeEventListener("change",onChange,false)},[]);return null}
