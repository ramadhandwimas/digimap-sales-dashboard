import {NextRequest,NextResponse} from "next/server"
import {clearAndWrite,getSheetRanges} from "@/lib/google-sheets"
import {parseSpwWorkbook} from "@/lib/spw-upload"
const SHEET_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0"
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

    // USER_ENTERED membuat nilai diproses oleh Google Sheets sesuai locale sheet,
    // sehingga file Excel hanya menjadi sumber upload dan hasil akhirnya native Sheets values.
    await clearAndWrite(SHEET_ID,clearTail,"'RAW SalesPerson'!R1",report.rows,email,key,"USER_ENTERED")

    // Baca kembali hasil dari Google Sheets untuk memastikan kolom amount benar-benar numeric
    // setelah diproses oleh Sheets, bukan sekadar nilai hasil parser Excel.
    const [written]=await getSheetRanges(SHEET_ID,[`'RAW SalesPerson'!T1:T${Math.max(1,report.rows.length)}`],email,key)
    const sheetSales=written.reduce((sum,row)=>sum+(typeof row[0]==="number"&&Number.isFinite(row[0])?Number(row[0]):0),0)
    if(report.validatedTotals&&Math.abs(sheetSales-report.expectedTotal)>1){
      return NextResponse.json({error:`Upload masuk ke Google Sheets, tetapi total hasil konversi Rp ${Math.round(sheetSales).toLocaleString("id-ID")} berbeda dari total report Rp ${Math.round(report.expectedTotal).toLocaleString("id-ID")}. Data perlu dicek sebelum Cut Off.`},{status:422})
    }

    return NextResponse.json({ok:true,rows:report.rows.length,sheet:report.sheetName,numbers:report.numbers,expectedSales:report.expectedTotal,sheetSales,validatedTotals:report.validatedTotals,storage:"google-sheets-native-values",message:`SPW berhasil. File Excel sudah dikonversi dan diverifikasi sebagai nilai Google Sheets. ${report.rows.length} baris, total Rp ${Math.round(sheetSales).toLocaleString("id-ID")}.`})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Upload gagal"},{status:500})}
}
