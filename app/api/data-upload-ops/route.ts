import {NextRequest,NextResponse} from "next/server";
import {appendSheetValues,clearAndWrite,getSheetRanges} from "@/lib/google-sheets";
import {buildSummaryFromRawValues,upsertDailySummaryRows} from "@/lib/m238-daily-summary-cache";

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
function creds(){const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)throw new Error("Google Sheets belum dikonfigurasi");return{email,key}}

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
  if(action==="cutoff"){
   const mode=body.mode==="month"?"month":"date",value=text(body.value);
   if(mode==="date"&&!/^\d{4}-\d{2}-\d{2}$/.test(value))return NextResponse.json({error:"Tanggal cut off tidak valid"},{status:400});
   if(mode==="month"&&!/^\d{4}-\d{2}$/.test(value))return NextResponse.json({error:"Periode cut off tidak valid"},{status:400});
   const[source,destination]=await getSheetRanges(DASHBOARD_ID,[`'${RAW_SHEET}'!AB2:AR50000`,`'${COPAS_SHEET}'!A2:Q50000`],email,key);
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
    return NextResponse.json({ok:true,rows:0,newCount:0,skippedCount:0,ignoredCount,message:"Tidak ada data penjualan baru. Seluruh data sudah pernah di-Cut Off atau tidak ada data valid pada periode yang dipilih."},{headers:{"cache-control":"no-store"}});
   }

   const seen=new Set<string>();
   for(const row of destination||[]){
    const cleaned=cleanRow(row);
    if(validCutoffRow(cleaned))seen.add(fingerprint(cleaned));
   }

   const newRows:unknown[][]=[];
   let skippedCount=0;
   for(const row of selected){
    const keyValue=fingerprint(row);
    if(seen.has(keyValue)){skippedCount++;continue}
    seen.add(keyValue);
    newRows.push(row);
   }

   const dryRun=body.dryRun===true;
   if(!newRows.length){
    return NextResponse.json({
     ok:true,dryRun,rows:0,newCount:0,skippedCount,ignoredCount,
     message:"Tidak ada data penjualan baru. Seluruh data sudah pernah di-Cut Off."
    },{headers:{"cache-control":"no-store"}});
   }

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
    ok:true,dryRun,rows:newRows.length,newCount:newRows.length,skippedCount,ignoredCount,
    dailySummaryCache:{ok:dryRun||!cacheWarning,warning:cacheWarning||null},
    message:dryRun?`Simulasi: ${newRows.length} data baru siap ditambahkan, ${skippedCount} data lama akan dilewati, dan ${ignoredCount} baris kosong/tidak valid akan diabaikan.`:message
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
