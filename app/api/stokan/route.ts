import {NextRequest,NextResponse} from "next/server";
import * as XLSX from "xlsx";
import {clearAndWrite,ensureSheet,getSheetRanges} from "@/lib/google-sheets";

const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const TAB="STOKAN";
const HEADERS=["No","Stocker","Brand","Artikel","Description","S/N","Qty","Backroom","Dropbox","Floor","StockDate","Period","UploadID","UploadedAt"];
const s=(v:unknown)=>String(v??"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim();
const safe=(v:unknown,max=160)=>s(v).replace(/[\r\n]/g," ").slice(0,max);
const norm=(v:unknown)=>s(v).toUpperCase();
const isoDate=(v:unknown)=>/^\d{4}-\d{2}-\d{2}$/.test(s(v))?s(v):"";
const qtyValue=(v:unknown):number|null=>{if(typeof v==="number")return Number.isFinite(v)&&v>=0?v:null;const t=s(v).replace(/,/g,"");if(!t)return null;const x=Number(t);return Number.isFinite(x)&&x>=0?x:null};

type ParsedRow={brand:string;article:string;description:string;serial:string;totalStock:number|null;sourceNo:string};
type Staff={id:string;name:string;position:string};
type BatchWork={uploadID:string;stockDate:string;period:string;uploadedAt:string;totalArticles:number;totalStock:number;stockers:Set<string>};
type FinalRow={stocker:string;brand:string;article:string;description:string;serial:string;totalStock:number;sourceNo:string};

async function salesAssistants(email:string,key:string){
 const [rows]=await getSheetRanges(SOURCE_ID,["Config!H1:L160"],email,key);
 const out=new Map<string,Staff>();
 for(const r of rows){const store=norm(r[0]),id=s(r[1]),name=s(r[2]),position=s(r[3]);if(store!=="M238"||!name||norm(position)!=="SALES ASSISTANT")continue;const k=id||name.toUpperCase();if(!out.has(k))out.set(k,{id,name,position})}
 return Array.from(out.values());
}
function splitArticle(v:unknown){const raw=s(v),i=raw.indexOf("/");if(i<0)return{article:safe(raw,140),description:""};return{article:safe(raw.slice(0,i),140),description:safe(raw.slice(i+1),260)}}
function findDescriptionColumn(raw:unknown[][]){const names=new Set(["DESCRIPTION","DESKRIPSI","PRODUCT DESCRIPTION","ARTICLE DESCRIPTION","NAMA AKSESORIS","NAMA ACCESSORIES"]);for(let r=0;r<Math.min(raw.length,30);r++){const row=raw[r]||[];for(let c=0;c<row.length;c++)if(names.has(norm(row[c])))return c}return -1}
async function parseWorkbook(file:File){
 if(!/\.(xlsx|xls)$/i.test(file.name))throw new Error("Upload gagal — format file tidak sesuai. Gunakan file .xls atau .xlsx.");
 const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true,raw:true});let validColumns=false;let best:{rows:ParsedRow[];sheet:string;descriptionSource:string}|null=null;
 for(const sheet of wb.SheetNames){const ws=wb.Sheets[sheet];if(!ws||!ws["!ref"])continue;const range=XLSX.utils.decode_range(ws["!ref"] as string);if(range.e.c<7)continue;validColumns=true;const raw=XLSX.utils.sheet_to_json<unknown[]>(ws,{header:1,defval:"",raw:true,blankrows:false});const descCol=findDescriptionColumn(raw);const parsed:ParsedRow[]=[];for(let i=0;i<raw.length;i++){const row=raw[i]||[];if(norm(row[2])!=="ACCESSORIES")continue;const parts=splitArticle(row[4]);const direct=descCol>=0?safe(row[descCol],260):"";parsed.push({brand:safe(row[0],120),article:parts.article,description:direct&&norm(direct)!==norm(parts.article)?direct:parts.description,serial:safe(row[5],180),totalStock:qtyValue(row[7]),sourceNo:String(i+1)})}if(parsed.length&&(!best||parsed.length>best.rows.length))best={rows:parsed,sheet,descriptionSource:descCol>=0?`Kolom ${XLSX.utils.encode_col(descCol)} (Description)`:"Kolom E setelah separator /"}}
 if(!validColumns)throw new Error("Upload gagal — format file tidak sesuai. Kolom A, C, E, F, atau H tidak tersedia.");if(!best)throw new Error("Upload gagal — data Accessories tidak ditemukan.");if(best.rows.length>8000)throw new Error("Data stokan melebihi 8.000 artikel Accessories.");return best;
}
function responseError(e:unknown,status=500){return NextResponse.json({error:e instanceof Error?e.message:"Proses stokan gagal"},{status})}
function headerMatches(row:unknown[]){return HEADERS.every((h,i)=>norm(row?.[i])===norm(h))}
function isLegacyRow(row:unknown[]){if(!row?.some(v=>s(v)))return false;return !/^STK-\d{8}-[A-Z0-9]+$/i.test(s(row[12]))||!/^\d{4}-\d{2}-\d{2}T/.test(s(row[13]))}
async function ensureNormalizedSchema(email:string,key:string){
 await ensureSheet(MASTER_ID,TAB,HEADERS,email,key);
 let [header,body]=await getSheetRanges(MASTER_ID,[`'${TAB}'!A1:N1`,`'${TAB}'!A2:N20000`],email,key);
 const goodHeader=headerMatches(header?.[0]||[]),legacy=(body||[]).some(isLegacyRow);
 if(!goodHeader||legacy){await clearAndWrite(MASTER_ID,`'${TAB}'!A1:N20000`,`'${TAB}'!A1`,[HEADERS],email,key,"RAW");header=[HEADERS];body=[]}
 return {header:header?.[0]||HEADERS,body:body||[]};
}
function mapByHeader(header:unknown[],row:unknown[],rowNumber:number){const pos=new Map<string,number>();header.forEach((h,i)=>pos.set(norm(h),i));const v=(name:string)=>row[pos.get(norm(name))??-1];return {rowNumber,no:s(v("No")),stocker:s(v("Stocker")),brand:s(v("Brand")),article:s(v("Artikel")),description:s(v("Description")),serial:s(v("S/N")),totalStock:Number(v("Qty")||0)||0,backroom:s(v("Backroom")),dropbox:s(v("Dropbox")),floor:s(v("Floor")),stockDate:s(v("StockDate")),period:s(v("Period")),uploadID:s(v("UploadID")),uploadedAt:s(v("UploadedAt"))}}
function sameSavedRow(expected:FinalRow,actual:unknown[]){return s(actual[1])===expected.stocker&&s(actual[2])===expected.brand&&s(actual[3])===expected.article&&s(actual[4])===expected.description&&s(actual[5])===expected.serial&&Number(actual[6])===expected.totalStock}

export async function GET(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{const {header,body}=await ensureNormalizedSchema(email,key);const mapped=(body||[]).map((r,i)=>mapByHeader(header,r,i+2));const batches=new Map<string,BatchWork>();for(const r of mapped){if(!r.uploadID)continue;let b=batches.get(r.uploadID);if(!b){b={uploadID:r.uploadID,stockDate:r.stockDate,period:r.period,uploadedAt:r.uploadedAt,totalArticles:0,totalStock:0,stockers:new Set<string>()};batches.set(r.uploadID,b)}b.totalArticles++;b.totalStock+=r.totalStock;if(r.stocker)b.stockers.add(r.stocker)}const history=Array.from(batches.values()).sort((a,b)=>b.uploadedAt.localeCompare(a.uploadedAt)).map(b=>({uploadID:b.uploadID,stockDate:b.stockDate,period:b.period,uploadedAt:b.uploadedAt,totalArticles:b.totalArticles,totalStock:b.totalStock,totalStockers:b.stockers.size}));const requested=s(req.nextUrl.searchParams.get("uploadID")),selectedID=requested||(history[0]?.uploadID||"");const rows=mapped.filter(r=>r.uploadID===selectedID);const staff=await salesAssistants(email,key),selected=history.find(x=>x.uploadID===selectedID)||null;return NextResponse.json({history,selected,rows,staff,schemaValid:headerMatches(header),readBackValid:true},{headers:{"cache-control":"no-store"}})}catch(e){return responseError(e)}
}

export async function POST(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{const contentType=req.headers.get("content-type")||"";
  if(contentType.includes("multipart/form-data")){const form=await req.formData(),file=form.get("file");if(!(file instanceof File))return NextResponse.json({error:"File stokan tidak ditemukan"},{status:400});const parsed=await parseWorkbook(file),staff=await salesAssistants(email,key);if(!staff.length)return NextResponse.json({error:"Tidak ada Sales Assistant yang tersedia untuk periode ini."},{status:422});const min=Math.floor(parsed.rows.length/staff.length),max=Math.ceil(parsed.rows.length/staff.length);return NextResponse.json({ok:true,fileName:file.name,sheet:parsed.sheet,descriptionSource:parsed.descriptionSource,rows:parsed.rows,totalArticles:parsed.rows.length,totalStock:parsed.rows.reduce((a,r)=>a+(r.totalStock??0),0),staff,distribution:{min,max},samples:parsed.rows.slice(0,10),valid:parsed.rows.every(r=>!!r.article&&r.totalStock!==null)})}
  const body=await req.json(),action=s(body.action);
  if(action==="clear"){const uploadID=s(body.uploadID);const {body:raw}=await ensureNormalizedSchema(email,key);if(uploadID){const indexes:number[]=[];for(let i=0;i<raw.length;i++)if(s(raw[i]?.[12])===uploadID)indexes.push(i+2);if(indexes.length){const start=Math.min(...indexes),end=Math.max(...indexes);await clearAndWrite(MASTER_ID,`'${TAB}'!A${start}:N${end}`,`'${TAB}'!A1`,[HEADERS],email,key,"RAW")}}else await clearAndWrite(MASTER_ID,`'${TAB}'!A2:N20000`,`'${TAB}'!A1`,[HEADERS],email,key,"RAW");return NextResponse.json({ok:true,message:"Stokan berhasil dikosongkan. Silakan upload file week berikutnya."})}
  if(action==="commit"){
   const period=safe(body.period,80),stockDate=isoDate(body.stockDate),input=Array.isArray(body.rows)?body.rows:[];if(!period||!stockDate)return NextResponse.json({error:"Periode dan tanggal stokan wajib diisi."},{status:400});const staff=await salesAssistants(email,key);if(!staff.length)return NextResponse.json({error:"Tidak ada Sales Assistant yang tersedia untuk periode ini."},{status:422});const allowed=new Set(staff.map(x=>x.name));const rows:FinalRow[]=input.map((r:Record<string,unknown>,i:number)=>({brand:safe(r.brand,120),article:safe(r.article,140),description:safe(r.description,260),serial:safe(r.serial,180),totalStock:qtyValue(r.totalStock)??-1,sourceNo:s(r.sourceNo)||String(i+1),stocker:s(r.stocker)}));if(!rows.length)return NextResponse.json({error:"Tidak ada artikel Accessories yang dapat diproses."},{status:400});if(rows.some(r=>!r.article||r.totalStock<0||!allowed.has(r.stocker)))return NextResponse.json({error:"Pembagian belum valid. Pastikan semua Artikel, Qty, dan Stocker terisi dengan benar."},{status:400});
   const {body:existing}=await ensureNormalizedSchema(email,key);const uploadID=`STK-${stockDate.replace(/-/g,"")}-${crypto.randomUUID().slice(0,8).toUpperCase()}`,uploadedAt=new Date().toISOString();const values=rows.map((r,i)=>[i+1,r.stocker,r.brand,r.article,r.description,r.serial,r.totalStock,"","","",stockDate,period,uploadID,uploadedAt]);const start=(existing?.length||0)+2,end=start+values.length-1;await clearAndWrite(MASTER_ID,null,`'${TAB}'!A${start}:N${end}`,values,email,key,"RAW");
   const verifyCount=Math.min(10,rows.length),[saved]=await getSheetRanges(MASTER_ID,[`'${TAB}'!A${start}:N${start+verifyCount-1}`],email,key);const verified=saved.length===verifyCount&&saved.every((r,i)=>sameSavedRow(rows[i],r));if(!verified){await clearAndWrite(MASTER_ID,`'${TAB}'!A${start}:N${end}`,`'${TAB}'!A1`,[HEADERS],email,key,"RAW");return NextResponse.json({error:"Gagal menyimpan Stokan — struktur data berubah saat penyimpanan."},{status:409})}
   return NextResponse.json({ok:true,verified:true,uploadID,rows:values.length,message:"Stokan berhasil disimpan dan siap dibuat PDF."});
  }
  return NextResponse.json({error:"Action tidak dikenali."},{status:400});
 }catch(e){return responseError(e)}
}
