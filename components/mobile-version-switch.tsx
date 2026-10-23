"use client";
import {useId} from "react";
export default function MobileVersionSwitch({value,disabled=false}:{value:"new"|"classic";disabled?:boolean}){
 const id=useId();
 const choose=(next:"new"|"classic")=>{
  if(disabled||next===value)return;
  window.dispatchEvent(new CustomEvent("m238:mobile-view-change",{detail:next}));
  window.scrollTo({top:0,behavior:"instant"});
 };
 return <div className="m238-settings-version"><span id={id}>Versi tampilan</span><div role="group" aria-labelledby={id} className="m238-settings-version-controls">
  {([["new","Mobile"],["classic","Versi Lama"]] as const).map(([next,label])=><button key={next} type="button" aria-pressed={value===next} disabled={disabled} onClick={()=>choose(next)}>{label}</button>)}
 </div></div>;
}
