import {ImageResponse} from "next/og";
import type {NextRequest} from "next/server";

export const runtime="edge";

export async function GET(_req:NextRequest,{params}:{params:Promise<{size:string}>}){
  const {size}=await params;
  const px=size==="192"?192:512;
  return new ImageResponse(
    <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(145deg,#0f172a,#0b5fa5)",color:"white",fontFamily:"Arial, sans-serif",borderRadius:px*0.2}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:px*0.025}}>
        <div style={{fontSize:px*0.25,fontWeight:900,letterSpacing:-px*0.012}}>M238</div>
        <div style={{fontSize:px*0.07,fontWeight:700,letterSpacing:px*0.01,opacity:.9}}>SALES DASHBOARD</div>
      </div>
    </div>,
    {width:px,height:px},
  );
}
