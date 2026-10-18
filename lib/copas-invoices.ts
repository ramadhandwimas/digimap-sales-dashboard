import {createHash} from "node:crypto";
const text=(value:unknown)=>String(value??"").replace(/\u00a0/g," ").replace(/[\u200B-\u200D\u2060\uFEFF]/g,"").trim();
const key=(value:unknown)=>text(value).toUpperCase();
const hash=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function copasDate(value:unknown){
 if(typeof value==="number")return new Date(Date.UTC(1899,11,30)+value*86_400_000).toISOString().slice(0,10);
 const raw=text(value);if(/^\d{4}-\d{2}-\d{2}/.test(raw))return raw.slice(0,10);
 const match=raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);return match?`${match[3]}-${match[2].padStart(2,"0")}-${match[1].padStart(2,"0")}`:"";
}
export function invoiceFingerprint(row:unknown[]){
 return hash([copasDate(row[0]),key(row[1]),key(row[3]),key(row[4]),Number(row[7])||0,Number(row[8])||0,key(row[15])]);
}
function invoiceItem(source:unknown[],index:number){
 const values=Array.from({length:17},(_,column)=>source[column]??""),row=index+2;
 return{id:hash([row,values]),row,values,date:copasDate(values[0]),staffId:text(values[1]),staff:text(values[2]),invoice:text(values[3]),article:text(values[4]),description:text(values[5]),qty:Number(values[7])||0,amount:Number(values[8])||0,store:text(values[15]),week:text(values[14])};
}
export function findCopasInvoice(rows:unknown[][],invoice:string){
 const wanted=key(invoice),items=rows.flatMap((source,index)=>wanted&&key(source[3])===wanted?[invoiceItem(source,index)]:[]);
 return{invoice:text(invoice),planId:hash([wanted,items.map(item=>item.id)]),items};
}
export function checkRawExchangeInvoices(copas:unknown[][],exchangeColumn:unknown[][]){
 const references=new Map<string,{invoice:string;sourceRows:number[];items:ReturnType<typeof invoiceItem>[]}>();
 exchangeColumn.forEach((row,index)=>{
  const invoice=text(row[0]),normalized=key(invoice);if(!normalized||/^(?:#?N\/?A|-)$/.test(normalized))return;
  const entry=references.get(normalized)||{invoice,sourceRows:[],items:[]};entry.sourceRows.push(index+2);references.set(normalized,entry);
 });
 copas.forEach((row,index)=>{const group=references.get(key(row[3]));if(group)group.items.push(invoiceItem(row,index))});
 const groups=[...references.values()].map(group=>({...group,found:group.items.length>0,totalQty:group.items.reduce((sum,item)=>sum+item.qty,0),totalAmount:group.items.reduce((sum,item)=>sum+item.amount,0)}));
 const items=groups.flatMap(group=>group.items),foundInvoiceCount=groups.filter(group=>group.found).length;
 const planId=hash([groups.map(group=>[key(group.invoice),group.sourceRows,group.items.map(item=>item.id)])]);
 return{planId,groups,items,sourceInvoiceCount:groups.length,foundInvoiceCount,notFoundInvoiceCount:groups.length-foundInvoiceCount,totalRows:items.length,totalQty:items.reduce((sum,item)=>sum+item.qty,0),totalAmount:items.reduce((sum,item)=>sum+item.amount,0)};
}
export function selectCopasInvoice(plan:Pick<ReturnType<typeof findCopasInvoice>,"items">,ids:unknown){
 if(!Array.isArray(ids)||!ids.length||ids.length>1000||ids.some(id=>typeof id!=="string")||new Set(ids).size!==ids.length)throw new Error("Pilih 1 sampai 1.000 baris transaksi yang akan dihapus.");
 const selected=plan.items.filter(item=>ids.includes(item.id));
 if(selected.length!==ids.length)throw new Error("Data transaksi berubah. Cek ulang daftar invoice sebelum menghapus.");
 return selected;
}
export function excludeRemovedInvoices<T extends unknown[]>(rows:T[],fingerprints:string[]){
 const counts=new Map<string,number>();for(const fingerprint of fingerprints)counts.set(fingerprint,(counts.get(fingerprint)||0)+1);
 let excludedCount=0,excludedAmount=0;
 const kept=rows.filter(row=>{const id=invoiceFingerprint(row),count=counts.get(id)||0;if(!count)return true;counts.set(id,count-1);excludedCount++;excludedAmount+=Number(row[8])||0;return false});
 return{rows:kept,excludedCount,excludedAmount};
}
