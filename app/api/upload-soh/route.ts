import {NextRequest,NextResponse} from "next/server";
import * as XLSX from "xlsx";
import {batchClearRanges,batchWriteRanges,ensureSheets,getGoogleSheetRequestCount} from "@/lib/google-sheets";
import {parseSohFast,sohFastHeaders,sohFastValues} from "@/lib/m238-fast-soh";

const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk",FAST_CACHE="SOH FAST CACHE";
type Cell=string|number|boolean;
function cleanText(v:unknown){return String(v??"").replace(/\u00a0/g," ").replace(/[\u0000-\u001f\u007f]+/g," ").replace(/\s+/g," ").trim()}
function normalizeCell(cell:XLSX.CellObject|undefined):Cell{if(!cell||cell.v===undefined||cell.v===null)return "";if(cell.t==="d"&&cell.v instanceof Date){const d=cell.v;return `${String(d.getUTCDate()).padStart(2,"0")}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${d.getUTCFullYear()}`}if(cell.t==="n"&&cell.z&&XLSX.SSF.is_date(cell.z))return XLSX.SSF.format("dd-mm-yyyy",Number(cell.v));if(cell.t==="n")return Number(cell.v);if(cell.t==="b")return Boolean(cell.v);return cleanText(cell.v)}
function rowsFromSheet(ws:XLSX.WorkSheet){if(!ws["!ref"])return [] as Cell[][];const range=XLSX.utils.decode_range(ws["!ref"]),rows:Cell[][]=[];for(let r=range.s.r;r<=range.e.r;r++){const row=Array.from({length:9},(_,i)=>normalizeCell(ws[XLSX.utils.encode_cell({r,c:range.s.c+i})]));if(row.some(v=>String(v).trim()))rows.push(row)}return rows}
function score(rows:Cell[][]){const flat=rows.flat().map(v=>String(v)),stockTitle=flat.some(v=>/Stock Position Report/i.test(v)),store=flat.some(v=>/Store\s*:/i.test(v)),productRows=rows.filter(r=>typeof r[6]==="number"&&typeof r[7]==="number"&&typeof r[8]==="number").length;return(stockTitle?1000:0)+(store?300:0)+productRows*3+Math.min(rows.length,500)}
function friendly(e:unknown){const raw=e instanceof Error?e.message:"Upload SOH gagal";return/429|Too Many Requests/i.test(raw)?"Google Sheets sedang membatasi request. Sistem sudah mencoba kembali beberapa kali; silakan ulangi upload setelah beberapa saat.":raw}

export async function POST(req:NextRequest){
 const started=Date.now(),apiStart=getGoogleSheetRequestCount(),timing={parse:0,read:0,clear:0,write:0,cache:0,total:0};const e=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,k=process.env.GOOGLE_PRIVATE_KEY;if(!e||!k)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const f=(await req.formData()).get("file");if(!(f instanceof File)||!/\.xlsx?$/i.test(f.name))return NextResponse.json({error:"Pilih file SOH Excel .xlsx/.xls"},{status:400});
  let t=Date.now();const wb=XLSX.read(await f.arrayBuffer(),{type:"array",cellDates:true,cellNF:true,raw:true}),candidates=wb.SheetNames.map(name=>({name,rows:rowsFromSheet(wb.Sheets[name])})).filter(x=>x.rows.length).map(x=>({...x,score:score(x.rows)})).sort((a,b)=>b.score-a.score),report=candidates[0];timing.parse=Date.now()-t;
  if(!report)return NextResponse.json({error:"File SOH kosong"},{status:400});if(report.score<300)return NextResponse.json({error:"Format SOH tidak dikenali. Pastikan file adalah Stock Position Report asli."},{status:400});if(report.rows.length>10000)return NextResponse.json({error:"Data SOH melebihi 10.000 baris"},{status:400});
  const numericProductRows=report.rows.filter(row=>typeof row[6]==="number"&&typeof row[7]==="number"&&typeof row[8]==="number").length;if(!numericProductRows)return NextResponse.json({error:"SOH Price/Qty/Total tidak terbaca sebagai angka."},{status:422});
  t=Date.now();const fast=parseSohFast(report.rows);timing.cache=Date.now()-t;
  try{t=Date.now();await batchClearRanges(MASTER_ID,["'SOH'!A1:I10000",`'${FAST_CACHE}'!A2:F10000`],e,k);timing.clear=Date.now()-t}catch{t=Date.now();await ensureSheets(MASTER_ID,[{title:FAST_CACHE,headers:sohFastHeaders}],e,k);timing.read+=Date.now()-t;t=Date.now();await batchClearRanges(MASTER_ID,["'SOH'!A1:I10000",`'${FAST_CACHE}'!A2:F10000`],e,k);timing.clear=Date.now()-t}
  t=Date.now();await batchWriteRanges(MASTER_ID,[{range:"'SOH'!A1",values:report.rows},{range:`'${FAST_CACHE}'!A2`,values:fast.rows.map(sohFastValues)}],e,k,"RAW");timing.write=Date.now()-t;timing.total=Date.now()-started;const apiRequests=getGoogleSheetRequestCount()-apiStart;
  console.info("M238_PERF",{op:"upload-soh",timing,apiRequests,rows:report.rows.length,fastRows:fast.rows.length});
  return NextResponse.json({ok:true,rows:report.rows.length,sheet:report.name,numericProductRows,fastRows:fast.rows.length,performance:{...timing,apiRequests},message:`SOH berhasil disimpan dan cache aktif diperbarui (${report.rows.length} baris).`},{headers:{"cache-control":"no-store"}})
 }catch(err){timing.total=Date.now()-started;const error=friendly(err),apiRequests=getGoogleSheetRequestCount()-apiStart;console.warn("M238_PERF",{op:"upload-soh",timing,apiRequests,error});return NextResponse.json({error,performance:{...timing,apiRequests}},{status:500})}
}
