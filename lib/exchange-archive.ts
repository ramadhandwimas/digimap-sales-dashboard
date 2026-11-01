import {createHash} from "node:crypto";
import {isoDate} from "./m238-sales-sanitize";
export const EXCHANGE_ARCHIVE="Exchange Monthly Archive";
export const EXCHANGE_HEADERS=["Period","Invoice","Archived At","Archived By"];
const text=(v:unknown)=>String(v??"").trim();
export function archiveExclusions(rows:unknown[][]){
 const keys=new Set(rows.map(r=>`${text(r[0])}|${text(r[1])}`));
 return (date:string,invoice:string)=>keys.has(`${date.slice(0,7)}|${text(invoice)}`);
}
export function planExchangeArchive(period:string,column:unknown[][],evidence:unknown[][],history:unknown[][]){
 if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(period))throw new Error("Periode arsip tidak valid.");
 const periods=new Map<string,Set<string>>();
 for(const row of evidence){const date=isoDate(row[0]),invoice=text(row[3]);if(!date||!invoice)continue;const set=periods.get(invoice)||new Set<string>();set.add(date.slice(0,7));periods.set(invoice,set)}
 const known=new Set(history.map(r=>`${text(r[0])}|${text(r[1])}`)),invoices=new Set<string>(),clearRows:number[]=[],pending:string[]=[],kept:string[]=[];
 column.forEach((row,index)=>{const invoice=text(row[0]);if(!invoice)return;const months=periods.get(invoice);if(!/^\d{5,}$/.test(invoice)||!months?.size){pending.push(invoice);return}if(!months.has(period)){kept.push(invoice);return}invoices.add(invoice);if(months.size===1)clearRows.push(index+2);else kept.push(invoice)});
 const list=[...invoices].sort(),newInvoices=list.filter(invoice=>!known.has(`${period}|${invoice}`));
 const planId=createHash("sha256").update(JSON.stringify([period,column,list,newInvoices,clearRows])).digest("hex");
 return{period,invoices:list,newInvoices,clearRows,pending:[...new Set(pending)],kept:[...new Set(kept)],planId};
}
