import {NextRequest,NextResponse} from "next/server"
import {appendSheetValues,clearAndWrite} from "@/lib/google-sheets"

const MASTER_DATA_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk"

export async function POST(req:NextRequest){
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY
  if(!email||!key)return NextResponse.json({error:"Koneksi Google Sheets belum dikonfigurasi."},{status:503})
  try{
    const body=await req.json() as {target?:string,confirm?:string},target=String(body.target||"").toUpperCase(),confirm=String(body.confirm||"").toUpperCase()
    if(confirm!=="CLEAR")return NextResponse.json({error:"Konfirmasi admin clear tidak valid."},{status:400})
    if(target!=="SPW"&&target!=="SOH")return NextResponse.json({error:"Target clear harus SPW atau SOH."},{status:400})
    if(target==="SPW")await clearAndWrite(MASTER_DATA_ID,"'SPW'!A1:C65536","'SPW'!A1",[],email,key,"RAW")
    else await clearAndWrite(MASTER_DATA_ID,"'SOH'!A1:I10000","'SOH'!A1",[],email,key,"RAW")
    await appendSheetValues(MASTER_DATA_ID,"'UPLOAD LOG'!A:H",[[new Date().toISOString(),`CLEAR ${target}`,"ADMIN",0,"","","SUCCESS",target]],email,key)
    return NextResponse.json({ok:true,target})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Admin clear gagal"},{status:500})}
}
