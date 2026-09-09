import {NextRequest,NextResponse} from "next/server"
import {appendSheetValues,clearAndWrite} from "@/lib/google-sheets"
import {parseSpwWorkbook} from "@/lib/spw-upload"

const SHEET_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0"
const MASTER_DATA_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk"

export async function POST(req:NextRequest){
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY
  if(!email||!key)return NextResponse.json({error:"Koneksi Google Sheets belum dikonfigurasi."},{status:503})
  try{
    const form=await req.formData(),file=form.get("file")
    if(!(file instanceof File))return NextResponse.json({error:"Pilih file Excel terlebih dahulu."},{status:400})
    if(!/\.xlsx?$/i.test(file.name))return NextResponse.json({error:"Gunakan file Excel dengan format .xlsx atau .xls."},{status:400})
    const report=parseSpwWorkbook(await file.arrayBuffer())
    if(report.rows.length>65536)return NextResponse.json({error:"File SPW melebihi kapasitas 65.536 baris."},{status:400})
    const tailStart=report.rows.length+1,clearTail=tailStart<=65536?`'RAW SalesPerson'!R${tailStart}:T65536`:null
    await clearAndWrite(SHEET_ID,clearTail,"'RAW SalesPerson'!R1",report.rows,email,key,"RAW")
    let masterData=true
    try{
      await clearAndWrite(MASTER_DATA_ID,"'SPW'!A1:C65536","'SPW'!A1",report.rows,email,key,"RAW")
      await appendSheetValues(MASTER_DATA_ID,"'UPLOAD LOG'!A:H",[[new Date().toISOString(),"SPW",file.name,report.rows.length,"","","SUCCESS",report.sheetName]],email,key)
    }catch{masterData=false}
    return NextResponse.json({ok:true,rows:report.rows.length,sheet:report.sheetName,numbers:report.numbers,masterData})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Upload gagal"},{status:500})}
}
