import {NextRequest,NextResponse} from "next/server"
import {clearAndWrite,getSheetRanges} from "@/lib/google-sheets"
import {parseSpwWorkbook} from "@/lib/spw-upload"
const SHEET_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0"

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

    const tailStart=report.rows.length+1
    const clearTail=tailStart<=65536?`'RAW SalesPerson'!R${tailStart}:T65536`:null

    // R:T harus mempertahankan struktur asli SPW: teks tetap teks dan amount tetap number.
    // RAW mencegah Google Sheets mengubah sendiri tanggal, invoice, article, atau format angka,
    // karena formula A:Q membaca posisi dan tipe nilai R:S:T secara langsung.
    await clearAndWrite(SHEET_ID,clearTail,"'RAW SalesPerson'!R1",report.rows,email,key,"RAW")

    const maxRow=Math.max(1,report.rows.length)
    const [written]=await getSheetRanges(SHEET_ID,[`'RAW SalesPerson'!R1:T${maxRow}`],email,key)
    const dates=written.filter(row=>typeof row[0]==="string"&&/^\d{2}-\d{2}-\d{4}$/.test(String(row[0]))).length
    const staff=written.filter(row=>typeof row[0]==="string"&&/^\d{6,}\s*\/\s*\S+/.test(String(row[0]))).length
    const sheetSales=written.reduce((sum,row)=>sum+(typeof row[2]==="number"&&Number.isFinite(row[2])?Number(row[2]):0),0)

    if(!dates||!staff)return NextResponse.json({error:"Data sudah ditulis ke Google Sheets, tetapi pola R:S:T tidak terbaca sebagai SPW. Upload dihentikan agar hasil A:Q dan AB:AR tidak acak."},{status:422})
    if(report.validatedTotals&&Math.abs(sheetSales-report.expectedTotal)>1){
      return NextResponse.json({error:`Total R:S:T Rp ${Math.round(sheetSales).toLocaleString("id-ID")} berbeda dari total report Rp ${Math.round(report.expectedTotal).toLocaleString("id-ID")}. Upload tidak dianggap berhasil.`},{status:422})
    }

    // Tunggu formula A:Q dan QUERY AB:AR menghitung ulang, lalu cek output final.
    let derivedRows:unknown[][]=[]
    for(let attempt=0;attempt<3;attempt++){
      await sleep(450)
      const result=await getSheetRanges(SHEET_ID,[`'RAW SalesPerson'!AB2:AJ${Math.min(65536,maxRow+10)}`],email,key)
      derivedRows=result[0]??[]
      if(derivedRows.some(row=>row[0]&&row[1]&&typeof row[8]==="number"))break
    }
    const derivedSales=derivedRows.reduce((sum,row)=>sum+(row[0]&&row[1]&&typeof row[8]==="number"?Number(row[8]):0),0)
    const derivedCount=derivedRows.filter(row=>row[0]&&row[1]&&typeof row[8]==="number").length

    if(sheetSales>0&&(!derivedCount||Math.abs(derivedSales-sheetSales)>1)){
      return NextResponse.json({error:`R:S:T sudah terbaca Rp ${Math.round(sheetSales).toLocaleString("id-ID")}, tetapi hasil AB:AR Rp ${Math.round(derivedSales).toLocaleString("id-ID")} belum sama. Sistem tidak menandai upload berhasil agar dashboard tidak memakai data yang salah.`},{status:422})
    }

    return NextResponse.json({ok:true,rows:report.rows.length,sheet:report.sheetName,numbers:report.numbers,expectedSales:report.expectedTotal,sheetSales,derivedSales,derivedCount,validatedTotals:report.validatedTotals,storage:"google-sheets-native-values",message:`SPW berhasil dikonversi ke nilai Google Sheets. R:S:T dan hasil AB:AR sudah diverifikasi, total Rp ${Math.round(derivedSales).toLocaleString("id-ID")}.`})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Upload gagal"},{status:500})}
}
