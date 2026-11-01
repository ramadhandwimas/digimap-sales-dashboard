import {randomInt} from "node:crypto";
import {getSheetRangesFresh,sheetRequestOnce} from "./google-sheets";
import {COPAS_ID,CopasInvoiceError,type CopasCredentials} from "./copas-invoice-store";
import {EXCHANGE_ARCHIVE,EXCHANGE_HEADERS,planExchangeArchive} from "./exchange-archive";
type Sheet={sheetId:number;title:string;gridProperties:{rowCount:number;columnCount:number}};
const MASTER="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
export async function readExchangeHistory(c:CopasCredentials){
 const response=await sheetRequestOnce(COPAS_ID,"?fields=sheets.properties",c.email,c.key);
 if(!response.ok)throw new Error("Arsip exchange gagal dibaca.");
 const sheets=((await response.json()) as {sheets:Array<{properties:Sheet}>}).sheets.map(s=>s.properties),archive=sheets.find(s=>s.title===EXCHANGE_ARCHIVE);
 if(!archive)return{sheets,archive,history:[] as unknown[][]};
 const [values]=await getSheetRangesFresh(COPAS_ID,[`'${EXCHANGE_ARCHIVE}'!A1:D${archive.gridProperties.rowCount}`],c.email,c.key);
 if(!EXCHANGE_HEADERS.every((v,i)=>values?.[0]?.[i]===v))throw new CopasInvoiceError("Struktur arsip exchange berubah. Proses dihentikan.",409);
 return{sheets,archive,history:(values||[]).slice(1)};
}
export async function readExchangeArchivePlan(c:CopasCredentials,period:string){
 const state=await readExchangeHistory(c),raw=state.sheets.find(s=>s.title.toUpperCase().replace(/\s/g,"")==="RAWSALESPERSON");
 if(!raw||raw.gridProperties.columnCount<25)throw new Error("Kolom Y tidak tersedia.");
 const title=raw.title.replace(/'/g,"''"),ranges=[`'${title}'!Y2:Y${raw.gridProperties.rowCount}`,"'Data Copas'!A2:Q50000",`'${title}'!AB2:AR${raw.gridProperties.rowCount}`],log=state.sheets.find(s=>s.title==="Data Copas Exchange Log");
 if(log)ranges.push(`'${log.title}'!A2:W${log.gridProperties.rowCount}`);
 const [[column,copas,helper,removed],[normalized]]=await Promise.all([getSheetRangesFresh(COPAS_ID,ranges,c.email,c.key),getSheetRangesFresh(MASTER,["'SALES DASHBOARD DATA'!A2:Q65537"],c.email,c.key)]);
 const evidence=[...(copas||[]),...(helper||[]),...(normalized||[]),...(removed||[]).map(r=>r.slice(6,23))];
 return{...state,raw,column:column||[],plan:planExchangeArchive(period,column||[],evidence,state.history)};
}
const cells=(values:unknown[])=>({values:values.map(v=>({userEnteredValue:{stringValue:String(v??"")}}))});
export async function applyExchangeArchive(c:CopasCredentials,state:Awaited<ReturnType<typeof readExchangeArchivePlan>>,actor:string){
 const {plan}=state,requests:unknown[]=[];let archive=state.archive;
 if(!archive){let sheetId=randomInt(1_000_000,2_000_000_000);while(state.sheets.some(s=>s.sheetId===sheetId))sheetId=randomInt(1_000_000,2_000_000_000);archive={sheetId,title:EXCHANGE_ARCHIVE,gridProperties:{rowCount:Math.max(1000,plan.newInvoices.length+1),columnCount:4}};requests.push({addSheet:{properties:archive}},{updateCells:{range:{sheetId,startRowIndex:0,endRowIndex:1,startColumnIndex:0,endColumnIndex:4},rows:[cells(EXCHANGE_HEADERS)],fields:"userEnteredValue"}})}
 const start=state.history.length+1,end=start+plan.newInvoices.length;
 if(end>archive.gridProperties.rowCount)requests.push({appendDimension:{sheetId:archive.sheetId,dimension:"ROWS",length:end-archive.gridProperties.rowCount}});
 if(plan.newInvoices.length)requests.push({updateCells:{range:{sheetId:archive.sheetId,startRowIndex:start,endRowIndex:end,startColumnIndex:0,endColumnIndex:4},rows:plan.newInvoices.map(invoice=>cells([plan.period,invoice,new Date().toISOString(),actor])),fields:"userEnteredValue"}});
 // One batch saves the archive and clears only verified Y cells. No row shifts.
 for(const row of plan.clearRows)requests.push({updateCells:{range:{sheetId:state.raw.sheetId,startRowIndex:row-1,endRowIndex:row,startColumnIndex:24,endColumnIndex:25},rows:[],fields:"userEnteredValue"}});
 if(!requests.length)return;
 let response:Response;try{response=await sheetRequestOnce(COPAS_ID,":batchUpdate",c.email,c.key,{method:"POST",body:JSON.stringify({requests})})}catch{throw new CopasInvoiceError("Status arsip belum terkonfirmasi. Cek ulang daftar arsip sebelum mengulangi.",503,false)}
 if(!response.ok)throw new CopasInvoiceError(`Arsip ditolak (${response.status}); kolom Y tidak diubah sebagian.`,503,response.status<500);
}
