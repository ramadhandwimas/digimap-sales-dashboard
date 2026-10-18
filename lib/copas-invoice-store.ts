import {randomInt,randomUUID} from "node:crypto";
import {getSheetRangesFresh,sheetRequestOnce} from "./google-sheets";
import {invoiceFingerprint,type findCopasInvoice} from "./copas-invoices";
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
export function buildCopasInvoiceRemoval(snapshot:Awaited<ReturnType<typeof readCopasInvoiceSnapshot>>,items:ReturnType<typeof findCopasInvoice>["items"],actor:string,reason:string,operationId:string,timestamp:string){
 let log=snapshot.log;const requests:unknown[]=[];
 if(!log){let id=randomInt(1_000_000,2_000_000_000);while(snapshot.sheets.some(sheet=>sheet.sheetId===id))id=randomInt(1_000_000,2_000_000_000);log={sheetId:id,title:LOG,gridProperties:{rowCount:1000,columnCount:23}};requests.push({addSheet:{properties:{...log,hidden:true}}},{updateCells:{range:{sheetId:id,startRowIndex:0,endRowIndex:1,startColumnIndex:0,endColumnIndex:23},rows:[cells(HEADERS)],fields:"userEnteredValue"}})}
 const start=Math.max(1,snapshot.history.length),end=start+items.length;
 if(end>log.gridProperties.rowCount)requests.push({appendDimension:{sheetId:log.sheetId,dimension:"ROWS",length:end-log.gridProperties.rowCount}});
 requests.push({updateCells:{range:{sheetId:log.sheetId,startRowIndex:start,endRowIndex:end,startColumnIndex:0,endColumnIndex:23},rows:items.map(item=>cells([operationId,timestamp,actor,reason,item.row,invoiceFingerprint(item.values),...item.values])),fields:"userEnteredValue"}});
 for(const item of items)requests.push({updateCells:{range:{sheetId:snapshot.sheet.sheetId,startRowIndex:item.row-1,endRowIndex:item.row,startColumnIndex:0,endColumnIndex:17},rows:[],fields:"userEnteredValue"}});
 requests.push(unlock());return requests;
}
export async function removeCopasInvoice(credentials:CopasCredentials,snapshot:Awaited<ReturnType<typeof readCopasInvoiceSnapshot>>,items:ReturnType<typeof findCopasInvoice>["items"],actor:string,reason:string){
 const operationId=randomUUID(),timestamp=new Date().toISOString();
 let response:Response;
 try{response=await batch(credentials,buildCopasInvoiceRemoval(snapshot,items,actor,reason,operationId,timestamp))}catch{throw new CopasInvoiceError("Status penghapusan belum terkonfirmasi. Muat ulang untuk memeriksa transaksi dan hubungi pengelola jika proses masih terkunci.",503,false)}
 if(!response.ok)throw new CopasInvoiceError(`Penghapusan ditolak Google Sheets (${response.status}). Data tidak dihapus sebagian.`,503,response.status<500);
 return{operationId,timestamp};
}
