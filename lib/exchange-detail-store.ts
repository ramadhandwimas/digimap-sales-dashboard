import {randomUUID} from "node:crypto";
import {getSheetRangesFresh,sheetRequestOnce} from "./google-sheets";
import {COPAS_ID,CopasInvoiceError,type CopasCredentials} from "./copas-invoice-store";
import {readExchangeHistory} from "./exchange-archive-store";
import {DETAIL_SHEET,AUDIT_SHEET,GROSS_SHEET,DETAIL_HEADERS,buildExchangePlan,confirmExchangeSelection,type ExchangeSale,type ExchangeState} from "./exchange-detail";
import {copasDate} from "./copas-invoices";
const MASTER="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
export async function readExchangeState(c:CopasCredentials):Promise<ExchangeState>{
 const meta=await readExchangeHistory(c),detail=meta.sheets.find(s=>s.title===DETAIL_SHEET),raw=meta.sheets.find(s=>s.title==="RAW SalesPerson");
 const ranges=[`'RAW SalesPerson'!Y2:Y${raw?.gridProperties.rowCount||65536}`];if(detail)ranges.push(`'${DETAIL_SHEET}'!A1:Q${detail.gridProperties.rowCount}`);
 const [legacy,values]=await getSheetRangesFresh(COPAS_ID,ranges,c.email,c.key);
 if(detail&&!DETAIL_HEADERS.every((h,i)=>values?.[0]?.[i]===h))throw new Error("Struktur Detail Exchange berubah. Perhitungan dihentikan.");
 return{history:meta.history,details:(values||[]).slice(1),legacy:(legacy||[]).map(r=>String(r[0]??"").trim()).filter(Boolean)};
}
export async function readInvoiceExchangePlan(c:CopasCredentials,invoice:string,store:string){
 const meta=await readExchangeHistory(c),detail=meta.sheets.find(s=>s.title===DETAIL_SHEET),audit=meta.sheets.find(s=>s.title===AUDIT_SHEET),copas=meta.sheets.find(s=>s.title==="Data Copas"),raw=meta.sheets.find(s=>s.title==="RAW SalesPerson"),gross=meta.sheets.find(s=>s.title===GROSS_SHEET);
 if(!copas||!raw||!detail||!audit||!gross)throw new Error("Detail Exchange belum siap. Hubungi pengelola dashboard.");
 const [values,[normalized]]=await Promise.all([getSheetRangesFresh(COPAS_ID,[`'Data Copas'!D2:D${copas.gridProperties.rowCount}`,`'${GROSS_SHEET}'!A2:Q65536`,`'${DETAIL_SHEET}'!A1:Q${detail.gridProperties.rowCount}`,`'${AUDIT_SHEET}'!A1:Q${audit.gridProperties.rowCount}`,`'RAW SalesPerson'!Y2:Y${raw.gridProperties.rowCount}`],c.email,c.key),getSheetRangesFresh(MASTER,["'SALES DASHBOARD DATA'!A2:Q65537"],c.email,c.key)]);
 const [copasIndex,grossRows,detailRows,auditRows,column]=values;
 const matches=(copasIndex||[]).flatMap((r,i)=>String(r[0]??"").trim()===invoice?[i+2]:[]);
 const [copasBlock]=matches.length?await getSheetRangesFresh(COPAS_ID,[`'Data Copas'!A${matches[0]}:Q${matches.at(-1)}`],c.email,c.key):[[]];
 const copasRows=(copasBlock||[]).filter(r=>String(r[3]??"").trim()===invoice);
 if(![detailRows,auditRows].every(rows=>DETAIL_HEADERS.every((h,i)=>rows?.[0]?.[i]===h)))throw new Error("Header Detail Exchange/audit tidak sesuai.");
 const parse=(r:unknown[],normalized=false):ExchangeSale=>({date:copasDate(r[0]),id:String(r[1]??""),name:String(r[2]??""),invoice:String(r[3]??"").trim(),article:String(r[4]??"").trim().toUpperCase(),description:String(r[5]??""),qty:Number(r[7])||0,amount:Number(r[8])||0,store:String(r[15]||"M238"),sourceKey:normalized?String(r[16]??""):undefined});
 const active=(normalized||[]).map(r=>parse(r,true)),rawRows=(grossRows||[]).map(r=>parse(r)),dates=new Set(active.map(r=>r.date));
 // One source for each date: accumulated Data Copas, then current SPW as authority.
 const activeRows=active.length?active:rawRows,activeDates=active.length?dates:new Set(rawRows.map(r=>r.date));
 const rows=[...(copasRows||[]).map(r=>parse(r)).filter(r=>!activeDates.has(r.date)),...activeRows];
 const state={history:meta.history,details:(detailRows||[]).slice(1),legacy:(column||[]).map(r=>String(r[0]??"").trim()).filter(Boolean)};
 return{plan:buildExchangePlan(rows,invoice,store,state),detail,audit,raw,column:column||[],state,auditRows:auditRows||[]};
}
const cells=(values:unknown[])=>({values:values.map(v=>({userEnteredValue:typeof v==="number"?{numberValue:v}:{stringValue:String(v??"")}}))});
export async function saveInvoiceExchange(c:CopasCredentials,snapshot:Awaited<ReturnType<typeof readInvoiceExchangePlan>>,input:unknown,mode:unknown,actor:string){
 const items=confirmExchangeSelection(snapshot.plan,input,mode),operationId=randomUUID(),timestamp=new Date().toISOString();
 const rows=items.map(item=>[operationId,timestamp,actor,"CONFIRMED",mode,item.date,snapshot.plan.store,item.id??item.staffId??"",item.invoice,item.article,Math.round(item.amount/item.qty*1e6)/1e6,item.qty,item.amount,item.exchangeQty,item.exchangeAmount,item.key,item.formulaKey]);
 const requests:unknown[]=[],positions=new Map(snapshot.state.details.map((r,i)=>[String(r[15]),i+1]));let next=snapshot.state.details.length+1;
 const writes=rows.map(row=>({row,position:positions.get(String(row[15]))??next++}));
 const detailEnd=Math.max(...writes.map(w=>w.position+1));if(detailEnd>snapshot.detail.gridProperties.rowCount)requests.push({appendDimension:{sheetId:snapshot.detail.sheetId,dimension:"ROWS",length:detailEnd-snapshot.detail.gridProperties.rowCount}});
 for(const w of writes)requests.push({updateCells:{range:{sheetId:snapshot.detail.sheetId,startRowIndex:w.position,endRowIndex:w.position+1,startColumnIndex:0,endColumnIndex:17},rows:[cells(w.row)],fields:"userEnteredValue"}});
 const auditStart=snapshot.auditRows.length,auditEnd=auditStart+rows.length;if(auditEnd>snapshot.audit.gridProperties.rowCount)requests.push({appendDimension:{sheetId:snapshot.audit.sheetId,dimension:"ROWS",length:auditEnd-snapshot.audit.gridProperties.rowCount}});
 requests.push({updateCells:{range:{sheetId:snapshot.audit.sheetId,startRowIndex:auditStart,endRowIndex:auditEnd,startColumnIndex:0,endColumnIndex:17},rows:rows.map(cells),fields:"userEnteredValue"}});
 snapshot.column.forEach((r,i)=>{if(String(r[0]??"").trim()===snapshot.plan.invoice)requests.push({updateCells:{range:{sheetId:snapshot.raw.sheetId,startRowIndex:i+1,endRowIndex:i+2,startColumnIndex:24,endColumnIndex:25},rows:[{values:[{}]}],fields:"userEnteredValue"}})});
 let response:Response;try{response=await sheetRequestOnce(COPAS_ID,":batchUpdate",c.email,c.key,{method:"POST",body:JSON.stringify({requests})})}catch{throw new CopasInvoiceError("Status simpan belum terkonfirmasi. Cek ulang invoice sebelum mencoba kembali.",503,false)}
 if(!response.ok)throw new CopasInvoiceError(`Simpan exchange ditolak (${response.status}). Data tidak diubah sebagian.`,503,response.status<500);
 return{operationId,date:items[0].date,exchangedQty:items.reduce((a,r)=>a+r.exchangeQty,0),remainingQty:items.reduce((a,r)=>a+r.qty-r.exchangeQty,0),exchangedAmount:items.reduce((a,r)=>a+r.exchangeAmount,0),remainingAmount:items.reduce((a,r)=>a+r.amount-r.exchangeAmount,0)};
}
