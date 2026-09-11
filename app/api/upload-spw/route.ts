import {NextRequest,NextResponse} from "next/server";
import {appendSheetValues,clearAndWrite,ensureSheet,getSheetRanges} from "@/lib/google-sheets";
import {parseSpwWorkbook} from "@/lib/spw-upload";
import {aggregateDaily,buildClassificationMap,cacheHeaders,cacheValues,normalizedHeaders,normalizedValues,parseSpwToNormalized,type FastSalesRow} from "@/lib/m238-fast-sales";

const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const NORMALIZED="SALES DASHBOARD DATA",CACHE="DAILY SALES CACHE";
const text=(v:unknown)=>String(v??"").trim(),num=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/[^0-9.-]/g,""))||0;
const iso=(v:unknown)=>{const x=text(v);if(/^\d{2}-\d{2}-\d{4}$/.test(x)){const[d,m,y]=x.split("-");return`${y}-${m}-${d}`}if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);return""};
function creds(){const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)throw new Error("Koneksi Google Sheets belum dikonfigurasi.");return{email,key}}
function normalizedFromSheet(r:unknown[]):FastSalesRow{return{date:iso(r[0]),id:text(r[1]),name:text(r[2]),invoice:text(r[3]),article:text(r[4]).toUpperCase(),description:text(r[5]),type:text(r[6]),qty:num(r[7]),amount:num(r[8]),category:text(r[9]).toUpperCase(),brand:text(r[10]).toUpperCase(),core:text(r[11]).toUpperCase(),scheme:text(r[12]).toUpperCase(),vendor:text(r[13]).toUpperCase(),week:text(r[14]),store:text(r[15]).toUpperCase()||"M238",key:text(r[16])||`M238|${iso(r[0])}|${text(r[3])}|${text(r[4]).toUpperCase()}|${text(r[1])}`}}
function rawToFast(r:unknown[]):FastSalesRow{return{date:iso(r[0]),id:text(r[1]),name:text(r[2]),invoice:text(r[3]),article:text(r[4]).toUpperCase(),description:text(r[5]),type:text(r[6]),qty:num(r[7]),amount:num(r[8]),category:text(r[9]).toUpperCase(),brand:text(r[10]).toUpperCase(),core:text(r[11]).toUpperCase(),scheme:text(r[12]).toUpperCase(),vendor:text(r[13]).toUpperCase(),week:text(r[14]),store:text(r[15]).toUpperCase()||"M238",key:`M238|${iso(r[0])}|${text(r[3])}|${text(r[4]).toUpperCase()}|${text(r[1])}`}}
function cacheSignature(rows:ReturnType<typeof aggregateDaily>){return rows.sort((a,b)=>a.id.localeCompare(b.id)).map(r=>[r.id,r.accessories,r.vas,r.amount,r.invoices,r.qty,r.iphone,r.mac,r.ipad,r.watch,r.airpods,r.qoalaQty,r.qoalaValue,r.telkomselQty,r.telkomselValue,r.xlQty,r.xlValue,r.indosatQty,r.indosatValue].join("|" )).join("\n")}

export async function POST(req:NextRequest){
 const started=Date.now();let spwSaved=false,reportRows=0,fileName="",sheetName="",masterSales=0,ts=new Date().toISOString();
 try{
  const{email,key}=creds();const form=await req.formData(),file=form.get("file");
  if(!(file instanceof File))return NextResponse.json({error:"Pilih file Excel terlebih dahulu."},{status:400});
  fileName=file.name;if(!/\.xlsx?$/i.test(file.name))return NextResponse.json({error:"Gunakan file Excel dengan format .xlsx atau .xls."},{status:400});
  const buffer=await file.arrayBuffer(),report=parseSpwWorkbook(buffer);reportRows=report.rows.length;sheetName=report.sheetName;
  if(report.rows.length>65536)return NextResponse.json({error:"File SPW melebihi kapasitas 65.536 baris."},{status:400});
  const maxRow=Math.max(1,report.rows.length);
  await clearAndWrite(MASTER_ID,"'SPW'!A1:C65536","'SPW'!A1",report.rows,email,key,"RAW");spwSaved=true;
  const[masterRows]=await getSheetRanges(MASTER_ID,[`'SPW'!A1:C${maxRow}`],email,key);const dates=masterRows.filter(r=>typeof r[0]==="string"&&/^\d{2}-\d{2}-\d{4}$/.test(String(r[0]))).length,staff=masterRows.filter(r=>typeof r[0]==="string"&&/^\d{6,}\s*\/\s*\S+/.test(String(r[0]))).length;masterSales=masterRows.reduce((sum,r)=>sum+(typeof r[2]==="number"&&Number.isFinite(r[2])?Number(r[2]):0),0);
  if(!dates||!staff)return NextResponse.json({error:"MASTER DATA M238 menerima file, tetapi pola SPW tidak valid."},{status:422});
  if(report.validatedTotals&&Math.abs(masterSales-report.expectedTotal)>1)return NextResponse.json({error:`Total MASTER DATA M238 Rp ${Math.round(masterSales).toLocaleString("id-ID")} berbeda dari report Rp ${Math.round(report.expectedTotal).toLocaleString("id-ID")}.`},{status:422});
  ts=new Date().toISOString();await appendSheetValues(MASTER_ID,"'UPLOAD LOG'!A:H",[[ts,"SPW",file.name,report.rows.length,masterSales,"","SPW_SAVED",report.sheetName]],email,key);
  try{
   await Promise.all([ensureSheet(MASTER_ID,NORMALIZED,normalizedHeaders,email,key),ensureSheet(MASTER_ID,CACHE,cacheHeaders,email,key)]);
   const[classA,classB,existingNormalized,existingCache]=await getSheetRanges(SOURCE_ID,["'Data Copas'!A2:Q50000","'RAW SalesPerson'!AB2:AR50000"],email,key).then(async source=>{const master=await getSheetRanges(MASTER_ID,[`'${NORMALIZED}'!A2:Q50000`,`'${CACHE}'!A2:Z20000`],email,key);return[source[0]||[],source[1]||[],master[0]||[],master[1]||[]]});
   const classification=buildClassificationMap([classA,classB]),parsed=parseSpwToNormalized(report.rows,classification,"M238"),uploadDates=new Set(parsed.rows.map(r=>r.date));
   if(!parsed.rows.length)throw new Error("Tidak ada sales row valid yang dapat diproses dari SPW.");
   const oldRows=(existingNormalized||[]).map(normalizedFromSheet).filter(r=>r.date&&r.id&&r.key),oldByKey=new Map(oldRows.map(r=>[r.key,r]));let newRows=0,updatedRows=0,duplicateExisting=0;
   for(const r of parsed.rows){const old=oldByKey.get(r.key);if(!old)newRows++;else if(JSON.stringify(normalizedValues(old))===JSON.stringify(normalizedValues(r)))duplicateExisting++;else updatedRows++}
   let validation="PENDING_RAW_SYNC";const legacy=(classB||[]).map(rawToFast).filter(r=>uploadDates.has(r.date)&&r.id&&r.amount!==0&&!/VOUCHER/i.test(`${r.scheme} ${r.description}`));const fastTotal=parsed.rows.reduce((a,r)=>a+r.amount,0),legacyTotal=legacy.reduce((a,r)=>a+r.amount,0);
   if(parsed.unknownClassification>0)validation="PENDING_CLASSIFICATION";
   if(legacy.length&&Math.abs(fastTotal-legacyTotal)<=1){const fastSig=cacheSignature(aggregateDaily(parsed.rows,"MATCH")),legacySig=cacheSignature(aggregateDaily(legacy,"MATCH"));validation=fastSig===legacySig?"MATCH":"MISMATCH"}
   const currentCache=aggregateDaily(parsed.rows,validation),preservedRows=oldRows.filter(r=>!uploadDates.has(r.date)),merged=[...preservedRows,...parsed.rows],cachePreserved=(existingCache||[]).filter(r=>!uploadDates.has(iso(r[0]))),cacheMerged=[...cachePreserved,...currentCache.map(cacheValues)];
   await Promise.all([clearAndWrite(MASTER_ID,`'${NORMALIZED}'!A2:Q50000`,`'${NORMALIZED}'!A2`,merged.map(normalizedValues),email,key,"RAW"),clearAndWrite(MASTER_ID,`'${CACHE}'!A2:Z20000`,`'${CACHE}'!A2`,cacheMerged,email,key,"RAW")]);
   const processingMs=Date.now()-started,duplicateSkipped=parsed.duplicateSkipped+duplicateExisting;await appendSheetValues(MASTER_ID,"'UPLOAD LOG'!A:H",[[new Date().toISOString(),"FAST_DAILY",file.name,parsed.rows.length,fastTotal,validation,validation==="MISMATCH"?"WARNING":"SUCCESS",`${newRows} new / ${updatedRows} updated / ${duplicateSkipped} skipped`]],email,key);
   return NextResponse.json({ok:true,fast:{ok:true,validation,warning:validation==="MISMATCH"?"Fast processing mismatch detected":validation==="PENDING_CLASSIFICATION"?`${parsed.unknownClassification} article belum memiliki mapping classification existing`:validation==="PENDING_RAW_SYNC"?"Validation menunggu RAW SalesPerson sinkron":null},rows:report.rows.length,processedRows:parsed.rows.length,newRows,updatedRows,duplicateSkipped,processingMs,sheet:report.sheetName,uploadedAt:ts,masterSheet:"MASTER DATA M238 / SPW",processedSheet:NORMALIZED,cacheSheet:CACHE,masterSales,storage:"master+fast-cache",message:"SPW berhasil diupload dan Daily Sales sudah diperbarui."},{headers:{"cache-control":"no-store"}})
  }catch(fastError){
   const processingMs=Date.now()-started,message=fastError instanceof Error?fastError.message:"Fast processing gagal";await appendSheetValues(MASTER_ID,"'UPLOAD LOG'!A:H",[[new Date().toISOString(),"FAST_DAILY",file.name,report.rows.length,masterSales,"","FAILED",message]],email,key).catch(()=>undefined);
   return NextResponse.json({ok:true,fast:{ok:false,error:message},rows:report.rows.length,processingMs,sheet:report.sheetName,uploadedAt:ts,masterSheet:"MASTER DATA M238 / SPW",masterSales,storage:"spw-saved-fast-failed",message:"SPW berhasil diupload, tetapi Fast Daily Sales gagal diproses. Data existing tetap aman."},{status:200,headers:{"cache-control":"no-store"}})
  }
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Upload gagal",spwSaved,rows:reportRows,file:fileName,sheet:sheetName,masterSales},{status:500})}
}
