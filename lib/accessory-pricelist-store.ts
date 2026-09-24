import {randomUUID} from "node:crypto";
import {getSheetRangesFresh,sheetRequestOnce} from "./google-sheets";
import {type MasterRow} from "./accessory-pricelist";
import {type RepairCandidate} from "./accessory-master-repair";

export const MASTER_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const LOCK_ID=238150926;
const LOCK_KEY="m238_accessory_pricelist_lock";
type Credentials={email:string;key:string};
type Properties={sheetId:number;title:string;gridProperties:{rowCount:number;columnCount:number}};
export class ImportError extends Error {
 constructor(message:string,public status=500,public safeToUnlock=false){super(message)}
}
const batch=(credentials:Credentials,requests:unknown[])=>sheetRequestOnce(MASTER_ID,":batchUpdate",credentials.email,credentials.key,{method:"POST",body:JSON.stringify({requests})});

export async function readMaster(credentials:Credentials){
 const response=await sheetRequestOnce(MASTER_ID,"?fields=sheets.properties",credentials.email,credentials.key);
 if(!response.ok)throw new ImportError(`Struktur Google Sheets tidak dapat dibaca (${response.status}).`);
 const meta=await response.json() as {sheets:Array<{properties:Properties}>};
 const sheet=meta.sheets.find(s=>s.properties.title==="Master")?.properties;
 if(!sheet||sheet.gridProperties.columnCount<12)throw new ImportError("Sheet Master A–L tidak ditemukan.",422);
 if(sheet.gridProperties.rowCount>100000)throw new ImportError("Master melebihi batas 100.000 baris; impor perlu diperiksa.",422);
 const[master,suppliers]=await getSheetRangesFresh(MASTER_ID,[`'Master'!A1:G${sheet.gridProperties.rowCount}`,`'Master'!I1:L${sheet.gridProperties.rowCount}`],credentials.email,credentials.key);
 return{sheet,master,suppliers};
}

// The spreadsheet-scoped unique metadata ID serializes imports across Vercel
// instances, not just across requests in a single process. It occupies no cells.
// Do not steal expired locks: a paused writer could otherwise overwrite new rows.
export async function acquireImportLock(credentials:Credentials){
 const owner=`${Date.now()}:${randomUUID()}`;
 const result=await batch(credentials,[{createDeveloperMetadata:{developerMetadata:{metadataId:LOCK_ID,metadataKey:LOCK_KEY,metadataValue:owner,location:{spreadsheet:true},visibility:"DOCUMENT"}}}]);
 if(!result.ok){
  const current=await sheetRequestOnce(MASTER_ID,`/developerMetadata/${LOCK_ID}`,credentials.email,credentials.key);
  if(current.ok){
   const lock=await current.json() as {metadataKey?:string;metadataValue?:string};
   if(lock.metadataKey===LOCK_KEY){
    const stale=Date.now()-Number(lock.metadataValue?.split(":")[0])>5*60*1000;
    throw new ImportError(stale?"Impor sebelumnya terhenti. Hubungi pengelola dashboard untuk memeriksa kunci impor; data tidak ditimpa.":"Ada upload pricelist lain yang sedang diproses. Tunggu sebentar lalu coba lagi.",409);
   }
  }
  throw new ImportError(`Tidak dapat memulai impor (${result.status}). Coba cek ulang pricelist.`,503);
 }
 return owner;
}

// metadataId is unique within the spreadsheet. Google documents deletion by ID
// alone; combining it with key/value caused batchUpdate to reject the request.
function unlockRequest(_owner:string){return{deleteDeveloperMetadata:{dataFilter:{developerMetadataLookup:{metadataId:LOCK_ID}}}}}
export async function releaseImportLock(credentials:Credentials,owner:string){
 const response=await batch(credentials,[unlockRequest(owner)]);
 if(!response.ok)throw new ImportError("Kunci impor belum dapat dilepas. Hubungi pengelola dashboard.");
}

export function buildMasterWrite(sheet:Properties,master:unknown[][],rows:MasterRow[],owner:string){
 const start=master.length; // A–G only: supplier rows in I–L never affect this.
 const end=start+rows.length,requests:unknown[]=[];
 if(end>sheet.gridProperties.rowCount)requests.push({appendDimension:{sheetId:sheet.sheetId,dimension:"ROWS",length:end-sheet.gridProperties.rowCount}});
 const target={sheetId:sheet.sheetId,startRowIndex:start,endRowIndex:end,startColumnIndex:0,endColumnIndex:7};
 if(rows.length){
  // Empty Master rows are already preformatted. Copying a previous row's
  // format is unnecessary and Google rejects it when that source is protected.
  // stringValue preserves SAP codes and treats formula-looking input as text.
  requests.push({updateCells:{range:target,rows:rows.map(row=>({values:row.map(stringValue=>({userEnteredValue:{stringValue}}))})),fields:"userEnteredValue"}});
 }
 requests.push(unlockRequest(owner));
 return requests;
}

export async function commitMaster(credentials:Credentials,snapshot:Awaited<ReturnType<typeof readMaster>>,rows:MasterRow[],owner:string){
 // Write and unlock are one atomic Sheets batch. Never retry this mutation.
 const response=await batch(credentials,buildMasterWrite(snapshot.sheet,snapshot.master,rows,owner));
 if(!response.ok){
  const detail=(await response.text().catch(()=>"")).slice(0,1000);
  console.error("Accessory pricelist batchUpdate failed",{status:response.status,detail});
  // A 4xx response is a definitive validation rejection: Sheets applies none
  // of the atomic batch, so it is safe to release the separately-created lock.
  const safeToUnlock=response.status>=400&&response.status<500;
  throw new ImportError(`Simpan ditolak Google Sheets (${response.status}). Silakan cek pricelist lagi.`,503,safeToUnlock);
 }
}

export function buildRepairWrite(sheet:Properties,repairs:RepairCandidate[],owner:string){
 const requests:unknown[]=[];
 for(const repair of repairs){
  const changed=repair.proposed.map((value,index)=>value!==repair.current[index]?index:-1).filter(index=>index>=0);
  for(let i=0;i<changed.length;){
   const start=changed[i];let end=start+1;i++;
   while(i<changed.length&&changed[i]===end){end++;i++}
   requests.push({updateCells:{
    range:{sheetId:sheet.sheetId,startRowIndex:repair.row-1,endRowIndex:repair.row,startColumnIndex:start,endColumnIndex:end},
    rows:[{values:repair.proposed.slice(start,end).map(stringValue=>({userEnteredValue:{stringValue}}))}],fields:"userEnteredValue",
   }});
  }
 }
 requests.push(unlockRequest(owner));
 return requests;
}

export async function commitMasterRepairs(credentials:Credentials,sheet:Properties,repairs:RepairCandidate[],owner:string){
 const response=await batch(credentials,buildRepairWrite(sheet,repairs,owner));
 if(!response.ok){
  const detail=(await response.text().catch(()=>"")).slice(0,1000);
  console.error("Accessory Master repair batchUpdate failed",{status:response.status,detail});
  const safeToUnlock=response.status>=400&&response.status<500;
  throw new ImportError(`Perbaikan ditolak Google Sheets (${response.status}). Cek Master kembali.`,503,safeToUnlock);
 }
}
