import {randomUUID} from "node:crypto";
import {sheetReadRequest,sheetRequestOnce} from "./google-sheets";

export const SPW_MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const LOCK_ID=238996018;
const LOCK_TTL_MS=15*60*1000;
type Credentials={email:string;key:string};
type Replacement={title:string;startRow:number;width:number;values:unknown[][]};
export class SpwWriteError extends Error{constructor(message:string,public status=503,public safeToUnlock=true){super(message)}}
const batch=(c:Credentials,requests:unknown[])=>sheetRequestOnce(SPW_MASTER_ID,":batchUpdate",c.email,c.key,{method:"POST",body:JSON.stringify({requests})});
const lockLookup=(value:string)=>({developerMetadataLookup:{metadataId:LOCK_ID,metadataValue:value}});
const unlock=(value:string)=>({deleteDeveloperMetadata:{dataFilter:lockLookup(value)}});
const createLock=(value:string)=>({createDeveloperMetadata:{developerMetadata:{metadataId:LOCK_ID,metadataKey:"m238_m996_spw_lock",metadataValue:value,location:{spreadsheet:true},visibility:"DOCUMENT"}}});

export async function acquireSpwLock(c:Credentials){
 const value=`${Date.now()}:${randomUUID()}`;
 const response=await batch(c,[createLock(value)]);
 if(response.ok)return value;
 if(response.status!==400)throw new SpwWriteError(`Kunci SPW gagal dibuat (${response.status}). Coba kembali setelah koneksi Google Sheets pulih.`,503);
 const existing=await sheetReadRequest(SPW_MASTER_ID,`/developerMetadata/${LOCK_ID}`,c.email,c.key);
 if(!existing.ok)throw new SpwWriteError("Status kunci SPW tidak dapat diperiksa. Coba kembali beberapa saat lagi.",503);
 const metadata=await existing.json() as {metadataKey?:string;metadataValue?:string};
 if(metadata.metadataKey!=="m238_m996_spw_lock")throw new SpwWriteError("ID kunci SPW dipakai oleh metadata lain. Hubungi pengelola dashboard.",503);
 const oldValue=metadata.metadataValue??"",lockedAt=Number(oldValue.split(":")[0]);
 if(!Number.isSafeInteger(lockedAt)||lockedAt<=0)throw new SpwWriteError("Format kunci SPW tidak dikenali. Hubungi pengelola dashboard.",503);
 if(Date.now()-lockedAt<LOCK_TTL_MS)throw new SpwWriteError("SPW sedang diproses. Coba kembali setelah proses upload selesai.",409);
 // Both requests are atomic. The value match prevents deleting a newer lock
 // if another request released or replaced the stale one after our read.
 const recovered=await batch(c,[unlock(oldValue),createLock(value)]);
 if(!recovered.ok)throw new SpwWriteError("Kunci SPW berubah saat dipulihkan. Coba kembali.",409);
 return value;
}
export async function releaseSpwLock(c:Credentials,value:string){const response=await batch(c,[unlock(value)]);if(!response.ok)throw new SpwWriteError("Kunci SPW belum dapat dilepas. Hubungi pengelola dashboard.")}

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
