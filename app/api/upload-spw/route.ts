import {NextRequest,NextResponse} from "next/server"
import {appendSheetValues,clearAndWrite,getSheetRanges} from "@/lib/google-sheets"
import {parseSpwWorkbook} from "@/lib/spw-upload"

const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk"

export async function POST(req:NextRequest){
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY
  if(!email||!key)return NextResponse.json({error:"Koneksi Google Sheets belum dikonfigurasi."},{status:503})
  try{
    const form=await req.formData(),file=form.get("file")
    if(!(file instanceof File))return NextResponse.json({error:"Pilih file Excel terlebih dahulu."},{status:400})
    if(!/\.xlsx?$/i.test(file.name))return NextResponse.json({error:"Gunakan file Excel dengan format .xlsx atau .xls."},{status:400})
    const report=parseSpwWorkbook(await file.arrayBuffer())
    if(report.rows.length>65536)return NextResponse.json({error:"File SPW melebihi kapasitas 65.536 baris."},{status:400})
    const maxRow=Math.max(1,report.rows.length)
    await clearAndWrite(MASTER_ID,"'SPW'!A1:C65536","'SPW'!A1",report.rows,email,key,"RAW")
    const [masterRows]=await getSheetRanges(MASTER_ID,[`'SPW'!A1:C${maxRow}`],email,key)
    const dates=masterRows.filter(row=>typeof row[0]==="string"&&/^\d{2}-\d{2}-\d{4}$/.test(String(row[0]))).length
    const staff=masterRows.filter(row=>typeof row[0]==="string"&&/^\d{6,}\s*\/\s*\S+/.test(String(row[0]))).length
    const masterSales=masterRows.reduce((sum,row)=>sum+(typeof row[2]==="number"&&Number.isFinite(row[2])?Number(row[2]):0),0)
    if(!dates||!staff)return NextResponse.json({error:"MASTER DATA M238 menerima file, tetapi pola SPW tidak valid."},{status:422})
    if(report.validatedTotals&&Math.abs(masterSales-report.expectedTotal)>1)return NextResponse.json({error:`Total MASTER DATA M238 Rp ${Math.round(masterSales).toLocaleString("id-ID")} berbeda dari report Rp ${Math.round(report.expectedTotal).toLocaleString("id-ID")}.`},{status:422})
    const ts=new Date().toISOString()
    await appendSheetValues(MASTER_ID,"'UPLOAD LOG'!A:H",[[ts,"SPW",file.name,report.rows.length,masterSales,"","SUCCESS",report.sheetName]],email,key)
    return NextResponse.json({ok:true,rows:report.rows.length,sheet:report.sheetName,uploadedAt:ts,masterSheet:"MASTER DATA M238 / SPW",masterSales,storage:"master-only",message:`SPW berhasil disimpan di MASTER DATA M238. Total Rp ${Math.round(masterSales).toLocaleString("id-ID")}.`})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Upload gagal"},{status:500})}
}
