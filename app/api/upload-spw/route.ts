import {NextRequest,NextResponse} from "next/server";
import {appendSheetValues,batchClearRanges,batchWriteRanges,ensureSheets,getGoogleSheetRequestCount,getSheetRanges} from "@/lib/google-sheets";
import {parseSpwWorkbook} from "@/lib/spw-upload";
import {aggregateDaily,buildClassificationMap,cacheHeaders,cacheValues,classificationHeaders,classificationMapFromValues,classificationValues,normalizedHeaders,normalizedValues,parseSpwToNormalized,rowClass,type FastSalesRow} from "@/lib/m238-fast-sales";
import {buildSummaryFromFastSales,upsertDailySummaryRows} from "@/lib/m238-daily-summary-cache";

const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk",SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const NORMALIZED="SALES DASHBOARD DATA",CACHE="DAILY SALES CACHE",CLASS_CACHE="FAST SALES CLASSIFICATION";
const text=(v:unknown)=>String(v??"").trim(),num=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/[^0-9.-]/g,""))||0;
const iso=(v:unknown)=>{const x=text(v);if(/^\d{2}-\d{2}-\d{4}$/.test(x)){const[d,m,y]=x.split("-");return`${y}-${m}-${d}`}if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);return""};
function creds(){const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)throw new Error("Koneksi Google Sheets belum dikonfigurasi.");return{email,key}}
function rawToFast(r:unknown[]):FastSalesRow{return{date:iso(r[0]),id:text(r[1]),name:text(r[2]),invoice:text(r[3]),article:text(r[4]).toUpperCase(),description:text(r[5]),type:text(r[6]),qty:num(r[7]),amount:num(r[8]),category:text(r[9]).toUpperCase(),brand:text(r[10]).toUpperCase(),core:text(r[11]).toUpperCase(),scheme:text(r[12]).toUpperCase(),vendor:text(r[13]).toUpperCase(),week:text(r[14]),store:text(r[15]).toUpperCase()||"M238",key:`M238|${iso(r[0])}|${text(r[3])}|${text(r[4]).toUpperCase()}|${text(r[1])}`}}
function signature(rows:ReturnType<typeof aggregateDaily>){return [...rows].sort((a,b)=>a.id.localeCompare(b.id)).map(r=>[r.id,r.accessories,r.vas,r.amount,r.invoices,r.qty,r.iphone,r.mac,r.ipad,r.watch,r.airpods,r.qoalaQty,r.qoalaValue,r.telkomselQty,r.telkomselValue,r.xlQty,r.xlValue,r.indosatQty,r.indosatValue].join("|")).join("\n")}
function friendly(e:unknown){const raw=e instanceof Error?e.message:"Fast processing gagal";if(/429|Too Many Requests/i.test(raw))return"Google Sheets sedang membatasi request. Sistem sudah mencoba kembali beberapa kali; silakan ulangi upload setelah beberapa saat.";return raw}
function currentSlot(){const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date()),hour=Number(p.find(x=>x.type==="hour")?.value||0);const h=Math.min(22,Math.max(10,Math.floor(hour/2)*2));return`${String(h).padStart(2,"0")}:00`}

export async function POST(req:NextRequest){
 const started=Date.now(),apiStart=getGoogleSheetRequestCount();let reportRows=0,fileName="",sheetName="",masterSales=0,report:ReturnType<typeof parseSpwWorkbook>|undefined;
 const timing={parse:0,read:0,clear:0,write:0,cache:0,summary:0,total:0};
 try{
  const{email,key}=creds(),form=await req.formData(),file=form.get("file");if(!(file instanceof File))return NextResponse.json({error:"Pilih file Excel terlebih dahulu."},{status:400});
  fileName=file.name;if(!/\.xlsx?$/i.test(file.name))return NextResponse.json({error:"Gunakan file Excel dengan format .xlsx atau .xls."},{status:400});
  let t=Date.now();report=parseSpwWorkbook(await file.arrayBuffer());timing.parse=Date.now()-t;reportRows=report.rows.length;sheetName=report.sheetName;masterSales=report.detailTotal;
  if(report.rows.length>65536)return NextResponse.json({error:"File SPW melebihi kapasitas 65.536 baris."},{status:400});
  const dates=report.rows.filter(r=>typeof r[0]==="string"&&/^\d{2}-\d{2}-\d{4}$/.test(String(r[0]))).length,staff=report.rows.filter(r=>typeof r[0]==="string"&&/^\d{6,}\s*\/\s*\S+/.test(String(r[0]))).length;if(!dates||!staff)return NextResponse.json({error:"Pola file SPW tidak valid."},{status:422});

  try{
   t=Date.now();let classRows:unknown[][]=[];
   try{[classRows]=await getSheetRanges(MASTER_ID,[`'${CLASS_CACHE}'!A2:I20000`],email,key)}catch{await ensureSheets(MASTER_ID,[{title:NORMALIZED,headers:normalizedHeaders},{title:CACHE,headers:cacheHeaders},{title:CLASS_CACHE,headers:classificationHeaders}],email,key);[classRows]=await getSheetRanges(MASTER_ID,[`'${CLASS_CACHE}'!A2:I20000`],email,key)}
   let classMap=classificationMapFromValues(classRows||[]),sourceRaw:unknown[][]=[],classificationRefreshed=false,parsed=parseSpwToNormalized(report.rows,classMap,"M238");
   if(!classMap.size||parsed.unknownClassification>0){const source=await getSheetRanges(SOURCE_ID,["'Data Copas'!A2:Q50000","'RAW SalesPerson'!AB2:AR50000"],email,key);const copas=source[0]||[];sourceRaw=source[1]||[];const fresh=buildClassificationMap([copas,sourceRaw]);for(const[k,v]of fresh)classMap.set(k,v);classificationRefreshed=true;parsed=parseSpwToNormalized(report.rows,classMap,"M238")}
   timing.read=Date.now()-t;if(!parsed.rows.length)throw new Error("Tidak ada sales row valid yang dapat diproses dari SPW.");

   t=Date.now();let validation=parsed.unknownClassification?"PENDING_CLASSIFICATION":"PENDING_AUDIT";if(sourceRaw.length){const uploadDates=new Set(parsed.rows.map(r=>r.date)),legacy=sourceRaw.map(rawToFast).filter(r=>uploadDates.has(r.date)&&r.id&&r.amount!==0&&!/VOUCHER/i.test(`${r.scheme} ${r.description}`));if(legacy.length){const fastTotal=parsed.rows.reduce((a,r)=>a+r.amount,0),legacyTotal=legacy.reduce((a,r)=>a+r.amount,0);validation=Math.abs(fastTotal-legacyTotal)<=1&&signature(aggregateDaily(parsed.rows,"MATCH"))===signature(aggregateDaily(legacy,"MATCH"))?"MATCH":"MISMATCH"}}
   const cache=aggregateDaily(parsed.rows,validation),debug={deviceRows:parsed.rows.filter(r=>rowClass(r)==="DEVICE").length,accRows:parsed.rows.filter(r=>rowClass(r)==="ACC").length,vasRows:parsed.rows.filter(r=>rowClass(r)==="VAS").length,unclassifiedRows:parsed.rows.filter(r=>rowClass(r)==="UNCLASSIFIED").length};timing.cache=Date.now()-t;if(parsed.unclassified.length)console.warn("M238 fast sales UNCLASSIFIED",parsed.unclassified.slice(0,20));

   const clears=["'SPW'!A1:C65536",`'${NORMALIZED}'!A2:Q50000`,`'${CACHE}'!A2:Z20000`];if(classificationRefreshed)clears.push(`'${CLASS_CACHE}'!A2:I20000`);t=Date.now();await batchClearRanges(MASTER_ID,clears,email,key);timing.clear=Date.now()-t;
   const writes=[{range:"'SPW'!A1",values:report.rows},{range:`'${NORMALIZED}'!A2`,values:parsed.rows.map(normalizedValues)},{range:`'${CACHE}'!A2`,values:cache.map(cacheValues)}];if(classificationRefreshed)writes.push({range:`'${CLASS_CACHE}'!A2`,values:classificationValues(classMap)});t=Date.now();await batchWriteRanges(MASTER_ID,writes,email,key,"RAW");timing.write=Date.now()-t;
   let summaryWarning="";t=Date.now();try{const summary=await buildSummaryFromFastSales(parsed.rows,{email,key},"SPW");await upsertDailySummaryRows(summary,{email,key})}catch(error){summaryWarning=error instanceof Error?error.message:"Daily Summary cache gagal diperbarui";console.warn("M238_PERF",{op:"upload-spw-summary-cache",error:summaryWarning})}timing.summary=Date.now()-t;
   const dataDate=parsed.rows[0]?.date||"",staffDetected=new Set(parsed.rows.map(r=>r.id).filter(Boolean)).size,transactionCount=new Set(parsed.rows.map(r=>r.invoice).filter(Boolean)).size,uploadedAt=new Date().toISOString();
   await appendSheetValues(MASTER_ID,"'UPLOAD LOG'!A:H",[[uploadedAt,"UPDATE_SALES_2H",dataDate,currentSlot(),masterSales,transactionCount,parsed.rows.length,staffDetected]],email,key).catch(error=>console.warn("M238 update-sales-2h log",error));
   timing.total=Date.now()-started;const apiRequests=getGoogleSheetRequestCount()-apiStart;console.info("M238_PERF",{op:"upload-spw",timing,apiRequests,rows:report.rows.length,processed:parsed.rows.length,validation});
   const warning=validation==="MISMATCH"?"Fast processing mismatch detected":validation==="PENDING_CLASSIFICATION"?`${parsed.unknownClassification} article belum memiliki mapping classification existing`:null;
   return NextResponse.json({ok:true,fast:{ok:true,validation,warning},dailySummaryCache:{ok:!summaryWarning,warning:summaryWarning||null},rows:report.rows.length,processedRows:parsed.rows.length,newRows:parsed.rows.length,updatedRows:0,duplicateSkipped:parsed.duplicateSkipped,processingMs:timing.total,masterSales,dataDate,staffDetected,transactionCount,uploadedAt,slot:currentSlot(),debug,performance:{...timing,apiRequests},message:"SPW berhasil diupload dan Daily Sales sudah diperbarui."},{headers:{"cache-control":"no-store"}})
  }catch(fastError){
   if(report){let t2=Date.now();await batchClearRanges(MASTER_ID,["'SPW'!A1:C65536"],email,key).catch(()=>undefined);timing.clear+=Date.now()-t2;t2=Date.now();await batchWriteRanges(MASTER_ID,[{range:"'SPW'!A1",values:report.rows}],email,key,"RAW").catch(()=>undefined);timing.write+=Date.now()-t2}
   timing.total=Date.now()-started;const message=friendly(fastError),apiRequests=getGoogleSheetRequestCount()-apiStart;console.warn("M238_PERF",{op:"upload-spw",timing,apiRequests,error:message});return NextResponse.json({ok:true,fast:{ok:false,error:message},rows:reportRows,processingMs:timing.total,performance:{...timing,apiRequests},message:"SPW berhasil diupload, tetapi Fast Daily Sales gagal diproses. Data existing tetap aman."},{headers:{"cache-control":"no-store"}})
  }
 }catch(e){timing.total=Date.now()-started;return NextResponse.json({error:friendly(e),rows:reportRows,file:fileName,sheet:sheetName,masterSales,performance:{...timing,apiRequests:getGoogleSheetRequestCount()-apiStart}},{status:500})}
}
