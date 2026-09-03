import {NextRequest,NextResponse} from "next/server";
import {timingSafeEqual} from "crypto";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function safeEqual(a:string,b:string){
  const left=Buffer.from(a);
  const right=Buffer.from(b);
  if(left.length!==right.length)return false;
  return timingSafeEqual(left,right);
}

export async function POST(req:NextRequest){
  const configured=process.env.SETTINGS_PIN?.trim();
  if(!configured){
    return NextResponse.json({ok:false,error:"SETTINGS_PIN belum dikonfigurasi di Vercel."},{status:503});
  }
  const body=await req.json().catch(()=>({})) as {pin?:string};
  const pin=String(body.pin??"").trim();
  if(!pin||!safeEqual(pin,configured)){
    return NextResponse.json({ok:false,error:"PIN Settings salah."},{status:401,headers:{"cache-control":"no-store"}});
  }
  return NextResponse.json({ok:true},{headers:{"cache-control":"no-store"}});
}
