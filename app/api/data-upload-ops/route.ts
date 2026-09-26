import {NextRequest,NextResponse} from "next/server";
import {createHash} from "node:crypto";
import {appendSheetValues,batchWriteRanges,clearAndWrite,getSheetRanges,getSheetRangesFresh} from "@/lib/google-sheets";
import {buildSummaryFromRawValues,refreshDailySummaryPeriods,upsertDailySummaryRows} from "@/lib/m238-daily-summary-cache";
import {buildDataCopasRepairWrites,planDataCopasRepair} from "@/lib/data-copas-repair";

const DASHBOARD_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const RAW_SHEET="Raw Salesperson";
const COPAS_SHEET="Data Copas";

const text=(v:unknown)=>String(v??"").trim();

function cleanCell(v:unknown){
 if(v===null||v===undefined)return"";
 if(typeof v==="number")return Number.isFinite(v)?v:"";
 const s=String(v)
  .replace(/\u00A0/g," ")
  .replace(/[\u200B-\u200D\u2060\uFEFF]/g,"")
  .replace(/[\t\r\n\f\v]+/g," ")
  .replace(/ +/g," ")
  .trim();
 return s;
}
function cleanRow(row:unknown[]){
 return Array.from({length:17},(_,i)=>cleanCell(row[i]));
}
function isoDate(v:unknown){
 if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);
 const x=String(cleanCell(v));
 if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);
 const m=x.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
 if(m)return`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
 return"";
}
function keyPart(v:unknown){
 const x=cleanCell(v);
 if(typeof x==="number")return Number.isFinite(x)?String(x):"";
 return String(x).toUpperCase();
}
function numericKeyPart(v:unknown){
 const x=cleanCell(v);
 if(typeof x==="number")return Number.isFinite(x)?String(x):"";
 const raw=String(x);
 if(!raw)return"";
 const n=Number(raw.replace(/,/g,""));
 return Number.isFinite(n)?String(n):raw.toUpperCase();
}
function fingerprint(row:unknown[]){
 return[
  isoDate(row[0]),
  keyPart(row[1]),
  keyPart(row[3]),
  keyPart(row[4]),
  numericKeyPart(row[7]),
  numericKeyPart(row[8])
 ].join("|");
}
function hasData(row:unknown[]){return row.some(v=>String(cleanCell(v))!=="")}
function validCutoffRow(row:unknown[]){
 if(!hasData(row))return false;
 if(!isoDate(row[0]))return false;
 const required=[keyPart(row[1]),keyPart(row[3]),keyPart(row[4]),numericKeyPart(row[7]),numericKeyPart(row[8])];
 return required.every(Boolean);
}
function rowAmount(row:unknown[]){
 const value=Number(cleanCell(row[8]));
 return Number.isFinite(value)?value:0;
}
function inCutoffPeriod(row:unknown[],mode:"date"|"month",value:string){
 const date=isoDate(row[0]);
 return mode==="date"?date===value:date.startsWith(value);
}
function cutoffPlanId(rows:unknown[][],mode:"date"|"month",value:string){
 return createHash("sha256").update(JSON.stringify([mode,value,rows.map(row=>row.map(cleanCell))])).digest("hex");
}
function creds(){const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)throw new Error("Google Sheets belum dikonfigurasi");return{email,key}}
function repairPlanId(candidates:ReturnType<typeof planDataCopasRepair>["candidates"]){return createHash("sha256").update(JSON.stringify(candidates.map(row=>[row.row,row.article,row.changes]))).digest("hex")}

export async function GET(req:NextRequest){
 try{
  const invoice=text(req.nextUrl.searchParams.get("invoice"));
  if(!invoice)return NextResponse.json({error:"No Invoice wajib diisi"},{status:400});
  const{email,key}=creds();
  const[helper,noExchange]=await getSheetRanges(DASHBOARD_ID,[`'${RAW_SHEET}'!AB2:AR50000`,`'${RAW_SHEET}'!Y2:Y50000`],email,key);
  const wanted=invoice.toUpperCase();
  const idx=(helper||[]).findIndex(r=>text(r[3]).toUpperCase()===wanted);
  if(idx<0)return NextResponse.json({error:"Invoice tidak ditemukan."},{status:404});
  const row=helper[idx]||[],existing=text(noExchange?.[idx]?.[0]);
  return NextResponse.json({found:true,rowNumber:idx+2,existingNoExchange:existing,preview:{date:isoDate(row[0]),staffId:text(row[1]),staff:text(row[2]),invoice:text(row[3]),article:text(row[4]),description:text(row[5]),qty:Number(row[7]??0)||0,amount:Number(row[8]??0)||0}},{headers:{"cache-control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal mencari invoice"},{status:500})}
}

export async function POST(req:NextRequest){
 try{
  const body=await req.json(),action=text(body.action),{email,key}=creds();
  if(action==="repair-copas"){
   const[master,copas]=await getSheetRangesFresh(DASHBOARD_ID,["'Master'!A1:L18606",`'${COPAS_SHEET}'!A2:Q50000`],email,key);
   const plan=planDataCopasRepair(master||[],copas||[]),planId=repairPlanId(plan.candidates),dryRun=body.dryRun===true;
   const summary={checkedRows:plan.checkedRows,rowsWithNA:plan.rowsWithNA,naRepairRows:plan.naRepairRows,vendorRows:plan.vendorRows,repairRows:plan.candidates.length,changedCells:plan.changedCells,unresolvedNARows:plan.unresolvedNARows,repairItems:plan.candidates.slice(0,300),repairItemsTotal:plan.candidates.length,issues:plan.issues,planId};
   if(dryRun||!plan.candidates.length){
    const message=plan.candidates.length
     ?`Ditemukan ${plan.candidates.length} baris yang aman diperbaiki: ${plan.naRepairRows} baris N/A dan ${plan.vendorRows} baris Vendor akan disesuaikan.${plan.unresolvedNARows?` ${plan.unresolvedNARows} baris perlu diperiksa manual.`:""}`
     :plan.unresolvedNARows?`Belum ada data yang aman diperbaiki. ${plan.unresolvedNARows} baris N/A perlu diperiksa manual.`:"Data Copas sudah sesuai dengan Master terbaru.";
    return NextResponse.json({ok:true,dryRun,...summary,message},{headers:{"cache-control":"no-store"}});
   }
   if(text(body.planId)!==planId)return NextResponse.json({error:"Data Master atau Data Copas berubah setelah pengecekan. Silakan cek ulang sebelum memperbaiki."},{status:409});

   const writes=buildDataCopasRepairWrites(plan.candidates,COPAS_SHEET,500);
   try{
    for(let index=0;index<writes.length;index+=50)await batchWriteRanges(DASHBOARD_ID,writes.slice(index,index+50),email,key,"RAW");
   }catch(error){
    const detail=error instanceof Error?error.message:"";
    if(/protected cell|protected range|proteksi/i.test(detail))return NextResponse.json({error:"Kolom klasifikasi Data Copas masih diproteksi untuk akun dashboard. Berikan izin edit hanya pada kolom G dan J:N, lalu cek ulang."},{status:409});
    throw error;
   }
   let cacheWarning="";
   try{
    const periods=[...new Set(plan.candidates.map(row=>isoDate(row.date).slice(0,7)).filter(period=>/^20\d{2}-\d{2}$/.test(period)))];
    if(periods.length)await refreshDailySummaryPeriods(periods,{email,key});
   }catch(error){cacheWarning=error instanceof Error?error.message:"Cache ringkasan gagal diperbarui";console.warn("M238_PERF",{op:"repair-copas-summary-cache",error:cacheWarning})}
   return NextResponse.json({ok:true,dryRun:false,...summary,writeBatches:writes.length,dailySummaryCache:{ok:!cacheWarning,warning:cacheWarning||null},message:`Data Copas berhasil diperbaiki: ${plan.candidates.length} baris dan ${plan.changedCells} sel klasifikasi/Vendor disesuaikan dengan Master.${plan.unresolvedNARows?` ${plan.unresolvedNARows} baris tetap masuk daftar pemeriksaan manual.`:""}`},{headers:{"cache-control":"no-store"}});
  }
  if(action==="cutoff"){
   const mode=body.mode==="month"?"month":"date",value=text(body.value);
   if(mode==="date"&&!/^\d{4}-\d{2}-\d{2}$/.test(value))return NextResponse.json({error:"Tanggal cut off tidak valid"},{status:400});
   if(mode==="month"&&!/^\d{4}-\d{2}$/.test(value))return NextResponse.json({error:"Periode cut off tidak valid"},{status:400});
   const[source,destination]=await getSheetRangesFresh(DASHBOARD_ID,[`'${RAW_SHEET}'!AB2:AR50000`,`'${COPAS_SHEET}'!A2:Q50000`],email,key);
   const cleanedSource=(source||[]).map(cleanRow);
   let ignoredCount=0;
   const selected:unknown[][]=[];
   for(const row of cleanedSource){
    if(!hasData(row)){ignoredCount++;continue}
    const d=isoDate(row[0]);
    const inPeriod=mode==="date"?d===value:d.startsWith(value);
    if(!inPeriod)continue;
    if(!validCutoffRow(row)){ignoredCount++;continue}
    selected.push(row);
   }
   if(!selected.length){
    return NextResponse.json({
     ok:true,dryRun:body.dryRun===true,rows:0,sourceCount:0,sourceAmount:0,currentCount:0,currentAmount:0,
     newCount:0,newAmount:0,skippedCount:0,skippedAmount:0,ignoredCount,projectedCount:0,projectedAmount:0,
     differenceCount:0,differenceAmount:0,isBalanced:true,bulkSales:[],bulkSalesCount:0,planId:cutoffPlanId([],mode,value),
     message:"Tidak ada data penjualan valid pada periode yang dipilih."
    },{headers:{"cache-control":"no-store"}});
   }

   const availableExisting=new Map<string,number>();
   for(const row of destination||[]){
    const cleaned=cleanRow(row);
    if(validCutoffRow(cleaned)){
     const keyValue=fingerprint(cleaned);
     availableExisting.set(keyValue,(availableExisting.get(keyValue)||0)+1);
    }
   }

   const newRows:unknown[][]=[];
   let skippedCount=0;
   let skippedAmount=0;
   for(const row of selected){
    const keyValue=fingerprint(row);
    const existingCount=availableExisting.get(keyValue)||0;
    if(existingCount>0){
     availableExisting.set(keyValue,existingCount-1);
     skippedCount++;
     skippedAmount+=rowAmount(row);
     continue
    }
    newRows.push(row);
   }

   const dryRun=body.dryRun===true;
   const selectedAmount=selected.reduce((sum,row)=>sum+rowAmount(row),0);
   const newAmount=newRows.reduce((sum,row)=>sum+rowAmount(row),0);
   const destinationPeriod=(destination||[]).map(cleanRow).filter(row=>validCutoffRow(row)&&inCutoffPeriod(row,mode,value));
   const currentCount=destinationPeriod.length;
   const currentAmount=destinationPeriod.reduce((sum,row)=>sum+rowAmount(row),0);
   const projectedCount=currentCount+newRows.length;
   const projectedAmount=currentAmount+newAmount;
   const differenceAmount=projectedAmount-selectedAmount;
   const differenceCount=projectedCount-selected.length;
   const occurrenceGroups=new Map<string,{row:unknown[];count:number}>();
   for(const row of selected){
    const keyValue=fingerprint(row),entry=occurrenceGroups.get(keyValue);
    if(entry)entry.count++;
    else occurrenceGroups.set(keyValue,{row,count:1});
   }
   const bulkSales=[...occurrenceGroups.values()]
    .filter(entry=>entry.count>1)
    .sort((a,b)=>b.count-a.count)
    .slice(0,50)
    .map(entry=>({
     salesId:text(entry.row[1]),salesName:text(entry.row[2]),invoice:text(entry.row[3]),article:text(entry.row[4]),
     description:text(entry.row[5]),count:entry.count,qtyEach:Number(entry.row[7])||0,amountEach:rowAmount(entry.row),
     totalAmount:entry.count*rowAmount(entry.row)
    }));
   const planId=cutoffPlanId(newRows,mode,value);
   const check={
    sourceCount:selected.length,sourceAmount:selectedAmount,currentCount,currentAmount,
    newCount:newRows.length,newAmount,skippedCount,skippedAmount,ignoredCount,
    projectedCount,projectedAmount,differenceCount,differenceAmount,
    isBalanced:differenceCount===0&&differenceAmount===0,bulkSales,bulkSalesCount:bulkSales.length,planId
   };
   if(!newRows.length){
    return NextResponse.json({
     ok:true,dryRun,rows:0,...check,
     message:check.isBalanced?"Data sudah sesuai. Seluruh transaksi pada periode ini sudah ada di Data Copas.":"Tidak ada data baru, tetapi total RAW dan Data Copas belum sesuai. Periksa daftar sebelum melanjutkan."
    },{headers:{"cache-control":"no-store"}});
   }

   if(!dryRun&&text(body.planId)!==planId)return NextResponse.json({error:"Data RAW SalesPerson atau Data Copas berubah setelah pengecekan. Silakan cek data ulang sebelum Cut Off."},{status:409});
   if(!dryRun)await appendSheetValues(DASHBOARD_ID,`'${COPAS_SHEET}'!A:Q`,newRows,email,key,"USER_ENTERED");
   let cacheWarning="";
   if(!dryRun){
    try{
     const summary=await buildSummaryFromRawValues(newRows,{email,key},"CUT_OFF");
     await upsertDailySummaryRows(summary,{email,key})
    }catch(error){
     cacheWarning=error instanceof Error?error.message:"Daily Summary cache gagal diperbarui";
     console.warn("M238_PERF",{op:"cutoff-summary-cache",error:cacheWarning})
    }
   }
   const message=`Cut Off berhasil: ${newRows.length} data baru ditambahkan, ${skippedCount} data lama dilewati, dan ${ignoredCount} baris kosong/tidak valid diabaikan.`;
   return NextResponse.json({
    ok:true,dryRun,rows:newRows.length,...check,
    dailySummaryCache:{ok:dryRun||!cacheWarning,warning:cacheWarning||null},
    message:dryRun?`Pengecekan selesai: ${selected.length} transaksi RAW senilai Rp${Math.round(selectedAmount).toLocaleString("id-ID")}. ${newRows.length} transaksi senilai Rp${Math.round(newAmount).toLocaleString("id-ID")} siap ditambahkan.`:message
   },{headers:{"cache-control":"no-store"}});
  }
  if(action==="exchange"){
   const invoice=text(body.invoice),noExchange=text(body.noExchange);
   if(!invoice||!noExchange)return NextResponse.json({error:"No Invoice dan No Exchange wajib diisi"},{status:400});
   const[helper,noExchangeCol]=await getSheetRanges(DASHBOARD_ID,[`'${RAW_SHEET}'!AB2:AR50000`,`'${RAW_SHEET}'!Y2:Y50000`],email,key);
   const wanted=invoice.toUpperCase(),idx=(helper||[]).findIndex(r=>text(r[3]).toUpperCase()===wanted);
   if(idx<0)return NextResponse.json({error:"Invoice tidak ditemukan."},{status:404});
   if(text(noExchangeCol?.[idx]?.[0]))return NextResponse.json({error:"No Exchange invoice ini sudah terisi."},{status:409});
   const rowNumber=idx+2;
   await clearAndWrite(DASHBOARD_ID,null,`'${RAW_SHEET}'!Y${rowNumber}:Y${rowNumber}`,[[noExchange]],email,key,"USER_ENTERED");
   return NextResponse.json({ok:true,message:"No Exchange berhasil disimpan."});
  }
  return NextResponse.json({error:"Action tidak dikenal"},{status:400});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Operasi gagal"},{status:500})}
}
