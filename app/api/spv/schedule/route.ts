import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {ensureSheet,getSheetRangesFresh,sheetReadRequest,sheetRequestOnce} from "@/lib/google-sheets";
import {isStoreSpv} from "@/lib/spv-access";
import {addDays,dateValid,findScheduleWeeklyBlock,firstScheduleWeeklyBlock,initialSchedule,orderRoster,latestRecords,monday,scheduleWeeklyBlock,validateSchedule,ScheduleRecord} from "@/lib/spv-schedule";
const MASTER="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk",SOURCE="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const TAB=process.env.VERCEL_ENV==="production"?"SPV Schedule Drafts":"SPV Schedule Preview";
const WEEKLY_TAB=process.env.VERCEL_ENV==="production"?"Schedule weekly":"SPV Schedule Weekly Preview";
const headers={"cache-control":"no-store"};
async function authorize(req:NextRequest){
 const session=verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);if(!session)return {error:"Sesi login berakhir.",status:401} as const;
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return {error:"Koneksi penyimpanan belum tersedia.",status:503} as const;
 if(!await isStoreSpv(session.nik,email,key))return {error:"Menu ini khusus SPV M238.",status:403} as const;return {session,email,key};
}
async function read(email:string,key:string){
 const meta=await sheetReadRequest(MASTER,"?fields=sheets.properties.title",email,key);if(!meta.ok)throw Error("Metadata gagal");
 const json=await meta.json(),exists=(json.sheets||[]).some((s:{properties:{title:string}})=>s.properties.title===TAB);
 if(!exists)return [];
 const [rows]=await getSheetRangesFresh(MASTER,[`'${TAB}'!A2:E`],email,key);return latestRecords(rows.filter(r=>r.some(v=>v!==""&&v!==null)));
}
export async function GET(req:NextRequest){try{
 const auth=await authorize(req);if("error"in auth)return NextResponse.json({error:auth.error},{status:auth.status,headers});
 const start=req.nextUrl.searchParams.get("week")||"";if(!dateValid(start)||monday(start)!==start)return NextResponse.json({error:"Pilih tanggal awal minggu (Senin)."},{status:400,headers});
 const [records,[config],[weekly]]=await Promise.all([read(auth.email,auth.key),getSheetRangesFresh(SOURCE,["Config!H28:L60"],auth.email,auth.key),getSheetRangesFresh(MASTER,["'Schedule weekly'!A1:J3000"],auth.email,auth.key)]);
 const seen=new Set<string>(),people=config.filter(r=>String(r[0]).trim().toUpperCase()==="M238"&&/^\d{6,10}$/.test(String(r[1]).trim())&&String(r[2]||"").trim()).flatMap(r=>{const id=String(r[1]).trim();if(seen.has(id))return [];seen.add(id);return [{uid:id,id,name:String(r[2]).trim(),position:String(r[3]||"Sales Assistant").trim()}]});
 const previousStart=addDays(start,-7);
 const normalized=records.map(r=>({...r,data:{...r.data,people:orderRoster(r.data.people,weekly)}}));
 return NextResponse.json({record:normalized.find(r=>r.data.start===start)||null,initial:initialSchedule(weekly,start,people,normalized),previous:normalized.find(r=>r.data.start===previousStart)?.data||initialSchedule(weekly,previousStart,people,normalized),syncTarget:WEEKLY_TAB,isolated:process.env.VERCEL_ENV!=="production"},{headers});
 }catch{return NextResponse.json({error:"Schedule belum dapat dibaca. Coba muat ulang; isian yang belum disimpan tetap di layar."},{status:503,headers})}}
export async function POST(req:NextRequest){let release:(()=>Promise<void>)|undefined;try{
 const auth=await authorize(req);if("error"in auth)return NextResponse.json({error:auth.error},{status:auth.status,headers});
 if(req.headers.get("origin")&&req.headers.get("origin")!==req.nextUrl.origin)return NextResponse.json({error:"Permintaan tidak diizinkan."},{status:403,headers});
 const body=await req.json().catch(()=>null);
 if(!body||!/^[-\w]{12,80}$/.test(body.revision||"")||typeof body.baseRevision!=="string"||!["DRAFT","READY"].includes(body.status))return NextResponse.json({error:"Identitas draft tidak valid."},{status:400,headers});
 let data;try{data=validateSchedule(body.data,body.status==="READY")}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Isian tidak valid."},{status:400,headers})}
 await ensureSheet(MASTER,TAB,["Week Start","Revision","Updated At","Updated By","Record JSON"],auth.email,auth.key);
 if(body.status==="READY"&&WEEKLY_TAB!=="Schedule weekly")await ensureSheet(MASTER,WEEKLY_TAB,[""],auth.email,auth.key);
 const lock=process.env.VERCEL_ENV==="production"?238190128:238190127;
 const unlock={deleteDeveloperMetadata:{dataFilter:{developerMetadataLookup:{metadataId:lock}}}};
 const batch=(requests:unknown[])=>sheetRequestOnce(MASTER,":batchUpdate",auth.email,auth.key,{method:"POST",body:JSON.stringify({requests})});
 const acquired=await batch([{createDeveloperMetadata:{developerMetadata:{metadataId:lock,metadataKey:"m238_schedule_lock",metadataValue:body.revision,location:{spreadsheet:true},visibility:"DOCUMENT"}}}]);
 if(!acquired.ok)return NextResponse.json({error:"Schedule sedang disimpan. Tunggu sebentar lalu coba tombol yang sama lagi."},{status:409,headers});
 release=async()=>{await batch([unlock])};
 const records=await read(auth.email,auth.key),existing=records.find(r=>r.data.start===data.start);
 if(existing?.revision===body.revision)return NextResponse.json({record:existing,syncTarget:existing!.status==="READY"?WEEKLY_TAB:null},{headers});
 if((existing?.revision||"")!==body.baseRevision)return NextResponse.json({error:"Schedule berubah di perangkat lain. Salin isianmu sebelum memuat versi terbaru.",conflict:true},{status:409,headers});
 const metadata=await sheetReadRequest(MASTER,"?fields=sheets.properties",auth.email,auth.key);if(!metadata.ok)throw Error("Metadata gagal");
 const {sheets}=await metadata.json();const sheet=sheets.find((s:{properties:{title:string;sheetId:number;gridProperties?:{rowCount?:number}}})=>s.properties.title===TAB);if(!sheet)throw Error("Draft sheet missing");
 const record:ScheduleRecord={revision:body.revision,updatedAt:new Date().toISOString(),updatedBy:auth.session.name,status:body.status,data};
 // One atomic append, optional weekly sync, and unlock. Drafts never change
 // the active weekly table. READY is the reviewed version that becomes the
 // weekly source (a separate preview tab outside production).
 const values=[data.start,record.revision,record.updatedAt,record.updatedBy,JSON.stringify(record)].map(stringValue=>({userEnteredValue:{stringValue}}));
 const requests:unknown[]=[{appendCells:{sheetId:sheet.properties.sheetId,rows:[{values}],fields:"userEnteredValue"}}];
 if(body.status==="READY"){
  const weeklySheet=sheets.find((s:{properties:{title:string;sheetId:number;gridProperties?:{rowCount?:number}}})=>s.properties.title===WEEKLY_TAB);if(!weeklySheet)throw Error("Weekly sheet missing");
  const[[targetRows],[templateRows]]=await Promise.all([getSheetRangesFresh(MASTER,[`'${WEEKLY_TAB}'!A1:P3000`],auth.email,auth.key),WEEKLY_TAB==="Schedule weekly"?Promise.resolve([[]] as unknown[][][]):getSheetRangesFresh(MASTER,["'Schedule weekly'!A1:P3000"],auth.email,auth.key)]);
  const block=scheduleWeeklyBlock(data),found=findScheduleWeeklyBlock(targetRows||[],data.start),used=(targetRows||[]).reduce((last,row,index)=>row.some(value=>String(value??"").trim())?index+1:last,0),first=firstScheduleWeeklyBlock(targetRows||[]);
  // A newly-created week is the next working schedule, so it is inserted at
  // the top and all prior weeks move down. Existing weeks are updated in place.
  const startRow=found?.startRow??0,capacity=found?found.endRow-found.startRow:block.length;
  if(found&&block.length>capacity)requests.push({insertDimension:{range:{sheetId:weeklySheet.properties.sheetId,dimension:"ROWS",startIndex:found.endRow,endIndex:found.endRow+(block.length-capacity)},inheritFromBefore:true}});
  if(!found&&used){
   requests.push({insertDimension:{range:{sheetId:weeklySheet.properties.sheetId,dimension:"ROWS",startIndex:0,endIndex:block.length},inheritFromBefore:false}});
   if(first)requests.push({copyPaste:{source:{sheetId:weeklySheet.properties.sheetId,startRowIndex:first.startRow+block.length,endRowIndex:first.endRow+block.length,startColumnIndex:0,endColumnIndex:16},destination:{sheetId:weeklySheet.properties.sheetId,startRowIndex:0,endRowIndex:first.endRow-first.startRow,startColumnIndex:0,endColumnIndex:16},pasteType:"PASTE_FORMAT",pasteOrientation:"NORMAL"}});
  }else if(!found&&WEEKLY_TAB!=="Schedule weekly"){
   const template=findScheduleWeeklyBlock(templateRows||[],data.start)||firstScheduleWeeklyBlock(templateRows||[]),source=sheets.find((s:{properties:{title:string}})=>s.properties.title==="Schedule weekly");
   if(template&&source)requests.push({copyPaste:{source:{sheetId:source.properties.sheetId,startRowIndex:template.startRow,endRowIndex:template.endRow,startColumnIndex:0,endColumnIndex:16},destination:{sheetId:weeklySheet.properties.sheetId,startRowIndex:0,endRowIndex:template.endRow-template.startRow,startColumnIndex:0,endColumnIndex:16},pasteType:"PASTE_FORMAT",pasteOrientation:"NORMAL"}});
  }
  const writeRows=Array.from({length:Math.max(capacity,block.length)},(_,row)=>Array.from({length:16},(_,column)=>block[row]?.[column]??""));
  requests.push({updateCells:{range:{sheetId:weeklySheet.properties.sheetId,startRowIndex:startRow,endRowIndex:startRow+writeRows.length,startColumnIndex:0,endColumnIndex:16},rows:writeRows.map(row=>({values:row.map(cell=>typeof cell==="number"?{userEnteredValue:{numberValue:cell}}:{userEnteredValue:{stringValue:String(cell)}})})),fields:"userEnteredValue"}});
 }
 const cleanup=release;release=undefined;
 const response=await batch([...requests,unlock]);
 if(!response.ok){if(response.status<500)release=cleanup;throw Error("Save failed")}
 release=undefined;return NextResponse.json({record,syncTarget:body.status==="READY"?WEEKLY_TAB:null},{headers});
 }catch{return NextResponse.json({error:"Penyimpanan belum terkonfirmasi. Isian tetap di layar; coba tombol simpan yang sama lagi."},{status:503,headers})}finally{if(release)await release().catch(()=>{})}}
