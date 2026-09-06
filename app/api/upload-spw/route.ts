import {NextRequest,NextResponse} from "next/server"
import {appendSheetValues,clearAndWrite,getSheetRanges} from "@/lib/google-sheets"
import {parseSpwWorkbook} from "@/lib/spw-upload"

const DASHBOARD_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0"
const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk"
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))

function derivedStats(rows:unknown[][]){
  const valid=rows.filter(row=>row[0]&&row[1]&&typeof row[8]==="number")
  return {
    sales:valid.reduce((sum,row)=>sum+Number(row[8]),0),
    count:valid.length,
  }
}

async function waitForDerivedRows(maxRow:number,masterSales:number,email:string,key:string){
  const range=`'RAW SalesPerson'!AB2:AJ${Math.min(65536,maxRow+20)}`
  let bestRows:unknown[][]=[],bestSales=0,bestCount=0,stableMatches=0
  const started=Date.now()

  for(let attempt=0;attempt<15;attempt++){
    // Google Sheets formulas can recalculate more slowly after a large R:T write.
    // Give the sheet progressively more time instead of assuming a desktop-speed refresh.
    await sleep(attempt<3?800:1200)
    const [rows=[]]=await getSheetRanges(DASHBOARD_ID,[range],email,key)
    const {sales,count}=derivedStats(rows)

    if(count>bestCount||Math.abs(sales-masterSales)<Math.abs(bestSales-masterSales)){
      bestRows=rows
      bestSales=sales
      bestCount=count
    }

    const matches=masterSales===0?count>=0:count>0&&Math.abs(sales-masterSales)<=1
    stableMatches=matches?stableMatches+1:0
    if(stableMatches>=2){
      return {rows,sales,count,waitedMs:Date.now()-started,attempts:attempt+1}
    }
  }

  return {rows:bestRows,sales:bestSales,count:bestCount,waitedMs:Date.now()-started,attempts:15}
}

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

    if(!dates||!staff)return NextResponse.json({error:"MASTER DATA M238 menerima file, tetapi pola SPW tidak valid. Data dashboard lama tidak diubah."},{status:422})
    if(report.validatedTotals&&Math.abs(masterSales-report.expectedTotal)>1)return NextResponse.json({error:`Total MASTER DATA M238 Rp ${Math.round(masterSales).toLocaleString("id-ID")} berbeda dari report Rp ${Math.round(report.expectedTotal).toLocaleString("id-ID")}. Dashboard lama tidak diubah.`},{status:422})

    await clearAndWrite(DASHBOARD_ID,"'RAW SalesPerson'!R1:T65536","'RAW SalesPerson'!R1",masterRows,email,key,"RAW")

    const derived=await waitForDerivedRows(maxRow,masterSales,email,key)
    const derivedSales=derived.sales,derivedCount=derived.count

    if(masterSales>0&&(!derivedCount||Math.abs(derivedSales-masterSales)>1)){
      return NextResponse.json({
        error:`MASTER DATA M238 sudah benar Rp ${Math.round(masterSales).toLocaleString("id-ID")}, tetapi hasil AB:AR setelah menunggu ${Math.round(derived.waitedMs/1000)} detik masih Rp ${Math.round(derivedSales).toLocaleString("id-ID")}. Silakan tekan Upload SPW sekali lagi; data master tidak hilang.`,
        masterSales,derivedSales,derivedCount,waitedMs:derived.waitedMs,attempts:derived.attempts
      },{status:422})
    }

    const ts=new Date().toISOString()
    await appendSheetValues(MASTER_ID,"'UPLOAD LOG'!A:H",[[ts,"SPW",file.name,report.rows.length,masterSales,derivedSales,"SUCCESS",report.sheetName]],email,key)
    return NextResponse.json({
      ok:true,rows:report.rows.length,sheet:report.sheetName,uploadedAt:ts,
      masterSheet:"MASTER DATA M238 / SPW",masterSales,derivedSales,derivedCount,
      verificationWaitMs:derived.waitedMs,verificationAttempts:derived.attempts,
      storage:"master-google-sheets-native-values",
      message:`SPW berhasil dikonversi ke MASTER DATA M238 dan diverifikasi sampai AB:AR. Total Rp ${Math.round(derivedSales).toLocaleString("id-ID")}.`
    })
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Upload gagal"},{status:500})}
}
