import {randomUUID} from "node:crypto";
import {sheetRequestOnce} from "./google-sheets";

export const SPW_MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const LOCK_ID=238996018;
type Credentials={email:string;key:string};
type Replacement={title:string;startRow:number;width:number;values:unknown[][]};
export class SpwWriteError extends Error{constructor(message:string,public status=503,public safeToUnlock=true){super(message)}}
const batch=(c:Credentials,requests:unknown[])=>sheetRequestOnce(SPW_MASTER_ID,":batchUpdate",c.email,c.key,{method:"POST",body:JSON.stringify({requests})});
const unlock={deleteDeveloperMetadata:{dataFilter:{developerMetadataLookup:{metadataId:LOCK_ID}}}};

export async function acquireSpwLock(c:Credentials){
 const response=await batch(c,[{createDeveloperMetadata:{developerMetadata:{metadataId:LOCK_ID,metadataKey:"m238_m996_spw_lock",metadataValue:`${Date.now()}:${randomUUID()}`,location:{spreadsheet:true},visibility:"DOCUMENT"}}}]);
 if(!response.ok)throw new SpwWriteError("SPW sedang diproses atau kunci upload sebelumnya belum selesai. Coba kembali setelah proses selesai.",409);
}
export async function releaseSpwLock(c:Credentials){const response=await batch(c,[unlock]);if(!response.ok)throw new SpwWriteError("Kunci SPW belum dapat dilepas. Hubungi pengelola dashboard.")}

// Each owned range is replaced in a single atomic batch, including its trailing
// old rows. A failed write cannot clear just one POS or leave half a cache.
export async function replaceSpwRanges(c:Credentials,replacements:Replacement[]){
 const response=await sheetRequestOnce(SPW_MASTER_ID,"?fields=sheets.properties",c.email,c.key);
 if(!response.ok)throw new SpwWriteError("Struktur SPW tidak dapat dibaca.");
 const meta=await response.json() as {sheets:Array<{properties:{title:string;sheetId:number;gridProperties:{rowCount:number;columnCount:number}}}>};
 const requests:unknown[]=[];
 for(const replacement of replacements){
  const sheet=meta.sheets.find(s=>s.properties.title===replacement.title)?.properties;
  if(!sheet)throw new SpwWriteError(`Tab ${replacement.title} tidak ditemukan.`);
  const rowCount=Math.max(sheet.gridProperties.rowCount,replacement.startRow+replacement.values.length,2);
  if(rowCount>sheet.gridProperties.rowCount)requests.push({appendDimension:{sheetId:sheet.sheetId,dimension:"ROWS",length:rowCount-sheet.gridProperties.rowCount}});
  if(replacement.width>sheet.gridProperties.columnCount)requests.push({appendDimension:{sheetId:sheet.sheetId,dimension:"COLUMNS",length:replacement.width-sheet.gridProperties.columnCount}});
  requests.push({updateCells:{range:{sheetId:sheet.sheetId,startRowIndex:replacement.startRow,endRowIndex:rowCount,startColumnIndex:0,endColumnIndex:replacement.width},rows:replacement.values.map(row=>({values:Array.from({length:replacement.width},(_,index)=>{const value=row[index];return value==null||value===""?{}:{userEnteredValue:typeof value==="number"?{numberValue:value}:typeof value==="boolean"?{boolValue:value}:{stringValue:String(value)}}})})),fields:"userEnteredValue"}});
 }
 let written:Response;
 try{written=await batch(c,requests)}catch{throw new SpwWriteError("Status simpan SPW belum dapat dipastikan. Periksa data dan kunci upload sebelum mencoba kembali.",503,false)}
 if(!written.ok)throw new SpwWriteError(`Simpan SPW gagal (${written.status}). Periksa data sebelum mencoba kembali.`,503,written.status<500);
}
