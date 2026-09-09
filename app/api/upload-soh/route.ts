import {NextRequest,NextResponse} from "next/server"
import * as XLSX from "xlsx"
import {appendSheetValues,clearAndWrite} from "@/lib/google-sheets"

const MASTER_DATA_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk"

function clean(v:unknown){if(v===null||v===undefined)return"";if(v instanceof Date)return v.toISOString();return typeof v==="number"?v:String(v).replace(/\u00a0/g," ").trim()}

export async function POST(req:NextRequest){
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY
  if(!email||!key)return NextResponse.json({error:"Koneksi Google Sheets belum dikonfigurasi."},{status:503})
  try{
    const form=await req.formData(),file=form.get("file")
    if(!(file instanceof File))return NextResponse.json({error:"Pilih file SOH terlebih dahulu."},{status:400})
    if(!/\.xlsx?$/i.test(file.name))return NextResponse.json({error:"Gunakan file Excel .xls atau .xlsx."},{status:400})
    const workbook=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true}),sheetName=workbook.SheetNames[0],sheet=workbook.Sheets[sheetName]
    if(!sheet)throw new Error("Sheet SOH tidak ditemukan.")
    const raw=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,raw:true,defval:""})
    const rows=raw.map(r=>Array.from({length:9},(_,i)=>clean(r[i]))).filter(r=>r.some(v=>v!==""))
    if(!rows.length)throw new Error("File SOH kosong.")
    if(rows.length>10000)throw new Error("Data SOH melebihi kapasitas 10.000 baris.")
    await clearAndWrite(MASTER_DATA_ID,"'SOH'!A1:I10000","'SOH'!A1",rows,email,key,"RAW")
    await appendSheetValues(MASTER_DATA_ID,"'UPLOAD LOG'!A:H",[[new Date().toISOString(),"SOH",file.name,rows.length,"","","SUCCESS",sheetName]],email,key)
    return NextResponse.json({ok:true,rows:rows.length,sheet:sheetName})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Upload SOH gagal"},{status:500})}
}
