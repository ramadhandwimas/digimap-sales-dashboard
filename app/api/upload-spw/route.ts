import {NextRequest,NextResponse} from "next/server"
import {clearAndWrite,getSheetRanges} from "@/lib/google-sheets"
import {parseSpwWorkbook} from "@/lib/spw-upload"

const DASHBOARD_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0"
const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk"
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))

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

    // Tahap 1: simpan hasil konversi ke MASTER DATA M238 sebagai native Google Sheets values.
    await clearAndWrite(MASTER_ID,"'SPW'!A1:C65536","'SPW'!A1",report.rows,email,key,"RAW")
    const [masterRows]=await getSheetRanges(MASTER_ID,[`'SPW'!A1:C${maxRow}`],email,key)
    const dates=masterRows.filter(row=>typeof row[0]==="string"&&/^\d{2}-\d{2}-\d{4}$/.test(String(row[0]))).length
    const staff=masterRows.filter(row=>typeof row[0]==="string"&&/^\d{6,}\s*\/\s*\S+/.test(String(row[0]))).length
    const masterSales=masterRows.reduce((sum,row)=>sum+(typeof row[2]==="number"&&Number.isFinite(row[2])?Number(row[2]):0),0)
    if(!dates||!staff)return NextResponse.json({error:"MASTER DATA M238 menerima file, tetapi pola SPW tidak valid. Data dashboard lama tidak diubah."},{status:422})
    if(report.validatedTotals&&Math.abs(masterSales-report.expectedTotal)>1)return NextResponse.json({error:`Total MASTER DATA M238 Rp ${Math.round(masterSales).toLocaleString("id-ID")} berbeda dari report Rp ${Math.round(report.expectedTotal).toLocaleString("id-ID")}. Dashboard lama tidak diubah.`},{status:422})

    // Tahap transisi aman: mirror nilai master ke RAW SalesPerson R:S:T.
    // Ini menjaga formula A:Q dan QUERY AB:AR tetap bekerja sebelum IMPORTRANGE diaktifkan permanen.
    await clearAndWrite(DASHBOARD_ID,"'RAW SalesPerson'!R1:T65536","'RAW SalesPerson'!R1",masterRows,email,key,"RAW")

    let derivedRows:unknown[][]=[]
    for(let attempt=0;attempt<4;attempt++){
      await sleep(500)
      const result=await getSheetRanges(DASHBOARD_ID,[`'RAW SalesPerson'!AB2:AJ${Math.min(65536,maxRow+20)}`],email,key)
      derivedRows=result[0]??[]
      if(derivedRows.some(row=>row[0]&&row[1]&&typeof row[8]==="number"))break
    }
    const derivedSales=derivedRows.reduce((sum,row)=>sum+(row[0]&&row[1]&&typeof row[8]==="number"?Number(row[8]):0),0)
    const derivedCount=derivedRows.filter(row=>row[0]&&row[1]&&typeof row[8]==="number").length
    if(masterSales>0&&(!derivedCount||Math.abs(derivedSales-masterSales)>1))return NextResponse.json({error:`MASTER DATA M238 sudah benar Rp ${Math.round(masterSales).toLocaleString("id-ID")}, tetapi hasil AB:AR masih Rp ${Math.round(derivedSales).toLocaleString("id-ID")}. Upload tidak ditandai berhasil agar dashboard tidak memakai data salah.`},{status:422})

    return NextResponse.json({ok:true,rows:report.rows.length,sheet:report.sheetName,masterSheet:"MASTER DATA M238 / SPW",masterSales,derivedSales,derivedCount,storage:"master-google-sheets-native-values",message:`SPW berhasil dikonversi ke MASTER DATA M238 dan diverifikasi sampai AB:AR. Total Rp ${Math.round(derivedSales).toLocaleString("id-ID")}.`})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Upload gagal"},{status:500})}
}
