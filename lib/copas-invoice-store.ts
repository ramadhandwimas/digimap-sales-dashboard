import {randomInt,randomUUID} from "node:crypto";
import {getSheetRangesFresh,sheetRequestOnce} from "./google-sheets";
import {invoiceFingerprint,planRawExchangeEntry,type findCopasInvoice} from "./copas-invoices";
export const COPAS_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const LOG="Data Copas Exchange Log",LOCK=238190126;
const HEADERS=["Operation ID","Removed At","Removed By","Reason","Original Row","Fingerprint","Date","Sales ID","Sales Name","Invoice","SAP Article","Description","Type","Qty","Amount","Product Category","Brand","Core","Scheme","Vendor","Week","Store","Concept"];
export type CopasCredentials={email:string;key:string};
type Sheet={sheetId:number;title:string;gridProperties:{rowCount:number;columnCount:number}};
export class CopasInvoiceError extends Error{constructor(message:string,public status=500,public safeToUnlock=true){super(message)}}
const request=(credentials:CopasCredentials,suffix:string,init?:RequestInit)=>sheetRequestOnce(COPAS_ID,suffix,credentials.email,credentials.key,init);
const batch=(credentials:CopasCredentials,requests:unknown[])=>request(credentials,":batchUpdate",{method:"POST",body:JSON.stringify({requests})});
async function metadata(credentials:CopasCredentials){
 const response=await request(credentials,"?fields=sheets.properties");if(!response.ok)throw new CopasInvoiceError("Struktur Data Copas gagal dibaca.");
 const body=await response.json() as {sheets:Array<{properties:Sheet}>};return body.sheets.map(sheet=>sheet.properties);
}
export async function readCopasInvoiceSnapshot(credentials:CopasCredentials){
 const sheets=await metadata(credentials),sheet=sheets.find(sheet=>sheet.title==="Data Copas"),log=sheets.find(sheet=>sheet.title===LOG);
 if(!sheet||sheet.gridProperties.columnCount<17||sheet.gridProperties.rowCount>100000)throw new CopasInvoiceError("Struktur Data Copas tidak sesuai untuk pemeriksaan invoice.",422);
 const ranges=[`'Data Copas'!A2:Q${sheet.gridProperties.rowCount}`];
 if(log)ranges.push(`'${LOG}'!A1:W${log.gridProperties.rowCount}`);
 const [rows,history]=await getSheetRangesFresh(COPAS_ID,ranges,credentials.email,credentials.key);
 if(log&&!HEADERS.every((header,index)=>history?.[0]?.[index]===header))throw new CopasInvoiceError("Struktur riwayat exchange/cancel berubah. Penghapusan tidak dilanjutkan.",409);
 return{sheet,log,sheets,rows:rows||[],history:history||[]};
}
export async function readRawExchangeColumn(credentials:CopasCredentials,sheets:Sheet[]){
 const raw=sheets.find(sheet=>sheet.title.toUpperCase().replace(/\s/g,"")==="RAWSALESPERSON");
 if(!raw||raw.gridProperties.columnCount<25||raw.gridProperties.rowCount<2||raw.gridProperties.rowCount>200000)throw new CopasInvoiceError("RAW SalesPerson kolom Y tidak tersedia atau strukturnya berubah.",422);
 const title=raw.title.replace(/'/g,"''"),[rows]=await getSheetRangesFresh(COPAS_ID,[`'${title}'!Y2:Y${raw.gridProperties.rowCount}`],credentials.email,credentials.key);
 return rows||[];
}
export async function readRemovedInvoiceFingerprints(credentials:CopasCredentials){
 const log=(await metadata(credentials)).find(sheet=>sheet.title===LOG);if(!log)return [];
 const [rows]=await getSheetRangesFresh(COPAS_ID,[`'${LOG}'!F1:F${log.gridProperties.rowCount}`],credentials.email,credentials.key);
 if(rows?.[0]?.[0]!=="Fingerprint")throw new CopasInvoiceError("Riwayat exchange/cancel tidak sesuai. Cek ulang sebelum Cut Off.",409);
 return(rows||[]).slice(1).map(row=>String(row[0]??"")).filter(Boolean);
}
export async function acquireCopasLock(credentials:CopasCredentials){
 const owner=randomUUID();
 const result=await batch(credentials,[{createDeveloperMetadata:{developerMetadata:{metadataId:LOCK,metadataKey:"m238_copas_mutation_lock",metadataValue:owner,location:{spreadsheet:true},visibility:"DOCUMENT"}}}]);
 if(!result.ok)throw new CopasInvoiceError("Data Copas sedang diproses. Tunggu sebentar lalu cek ulang.",409);
 return owner;
}
const unlock=()=>({deleteDeveloperMetadata:{dataFilter:{developerMetadataLookup:{metadataId:LOCK}}}});
export async function releaseCopasLock(credentials:CopasCredentials){
 const result=await batch(credentials,[unlock()]);if(!result.ok)throw new CopasInvoiceError("Kunci proses Data Copas belum dapat dilepas.",503);
}
const cells=(values:unknown[])=>({values:values.map(value=>({userEnteredValue:typeof value==="number"?{numberValue:value}:{stringValue:String(value??"")}}))});
// Shift only the transaction table; columns R onward stay at their original positions.
function compactRequests(snapshot:Awaited<ReturnType<typeof readCopasInvoiceSnapshot>>,removedRows:number[]=[]){
 const indices=new Set(removedRows.map(row=>row-1));
 const occupied=(row:unknown[])=>row.slice(0,17).some(value=>value!==null&&value!==undefined&&String(value)!=="");
 const last=snapshot.rows.findLastIndex(occupied);
 snapshot.rows.forEach((row,index)=>{if(index<last&&!occupied(row))indices.add(index+1)});
 const ranges:Array<{start:number;end:number}>=[];
 for(const index of [...indices].sort((a,b)=>a-b)){
  const last=ranges.at(-1);if(last&&last.end===index)last.end=index+1;else ranges.push({start:index,end:index+1});
 }
 return {blankRows:indices.size-removedRows.length,requests:ranges.reverse().map(({start,end})=>({deleteRange:{range:{sheetId:snapshot.sheet.sheetId,startRowIndex:start,endRowIndex:end,startColumnIndex:0,endColumnIndex:17},shiftDimension:"ROWS"}}))};
}
async function applyRemovalBatch(credentials:CopasCredentials,requests:unknown[]){
 let response:Response;
 try{response=await batch(credentials,requests)}catch{throw new CopasInvoiceError("Status perubahan belum terkonfirmasi. Muat ulang untuk memeriksa transaksi dan hubungi pengelola jika proses masih terkunci.",503,false)}
 if(!response.ok)throw new CopasInvoiceError(`Perubahan ditolak Google Sheets (${response.status}). Data tidak diubah sebagian.`,503,response.status<500);
}
export async function compactCopasRows(credentials:CopasCredentials,snapshot:Awaited<ReturnType<typeof readCopasInvoiceSnapshot>>){
 const plan=compactRequests(snapshot);
 await applyRemovalBatch(credentials,[...plan.requests,unlock()]);
 return {compactedRows:plan.blankRows};
}
export function buildCopasInvoiceRemoval(snapshot:Awaited<ReturnType<typeof readCopasInvoiceSnapshot>>,items:ReturnType<typeof findCopasInvoice>["items"],actor:string,reason:string,operationId:string,timestamp:string){
 let log=snapshot.log;const requests:unknown[]=[];
 if(!log){let id=randomInt(1_000_000,2_000_000_000);while(snapshot.sheets.some(sheet=>sheet.sheetId===id))id=randomInt(1_000_000,2_000_000_000);log={sheetId:id,title:LOG,gridProperties:{rowCount:1000,columnCount:23}};requests.push({addSheet:{properties:{...log,hidden:true}}},{updateCells:{range:{sheetId:id,startRowIndex:0,endRowIndex:1,startColumnIndex:0,endColumnIndex:23},rows:[cells(HEADERS)],fields:"userEnteredValue"}})}
 const start=Math.max(1,snapshot.history.length),end=start+items.length;
 if(end>log.gridProperties.rowCount)requests.push({appendDimension:{sheetId:log.sheetId,dimension:"ROWS",length:end-log.gridProperties.rowCount}});
 requests.push({updateCells:{range:{sheetId:log.sheetId,startRowIndex:start,endRowIndex:end,startColumnIndex:0,endColumnIndex:23},rows:items.map(item=>cells([operationId,timestamp,actor,reason,item.row,invoiceFingerprint(item.values),...item.values])),fields:"userEnteredValue"}});
 requests.push(...compactRequests(snapshot,items.map(item=>item.row)).requests);
 requests.push(unlock());return requests;
}
export async function removeCopasInvoice(credentials:CopasCredentials,snapshot:Awaited<ReturnType<typeof readCopasInvoiceSnapshot>>,items:ReturnType<typeof findCopasInvoice>["items"],actor:string,reason:string){
 const operationId=randomUUID(),timestamp=new Date().toISOString();
 await applyRemovalBatch(credentials,buildCopasInvoiceRemoval(snapshot,items,actor,reason,operationId,timestamp));
 return{operationId,timestamp};
}

export async function saveRawExchangeInvoice(credentials:CopasCredentials,invoice:string){
 const sheets=await metadata(credentials),column=await readRawExchangeColumn(credentials,sheets),plan=planRawExchangeEntry(column,invoice);
 if(!plan.added)return plan;
 const raw=sheets.find(sheet=>sheet.title.toUpperCase().replace(/\s/g,"")==="RAWSALESPERSON")!;
 const requests:unknown[]=[];
 if(plan.rowNumber>raw.gridProperties.rowCount)requests.push({appendDimension:{sheetId:raw.sheetId,dimension:"ROWS",length:plan.rowNumber-raw.gridProperties.rowCount}});
 requests.push({updateCells:{range:{sheetId:raw.sheetId,startRowIndex:plan.rowNumber-1,endRowIndex:plan.rowNumber,startColumnIndex:24,endColumnIndex:25},rows:[cells([plan.invoice])],fields:"userEnteredValue"}},unlock());
 let response:Response;
 try{response=await batch(credentials,requests)}catch{throw new CopasInvoiceError("Status penyimpanan belum terkonfirmasi. Cek daftar kolom Y sebelum mencoba lagi.",503,false)}
 if(!response.ok)throw new CopasInvoiceError(`Nomor invoice exchange belum disimpan (${response.status}).`,503,response.status<500);
 return plan;
}
