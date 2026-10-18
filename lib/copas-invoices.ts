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
export function findCopasInvoice(rows:unknown[][],invoice:string){
 const wanted=key(invoice),items=rows.flatMap((source,index)=>{
  if(!wanted||key(source[3])!==wanted)return [];
  const values=Array.from({length:17},(_,column)=>source[column]??""),row=index+2;
  return[{id:hash([row,values]),row,values,date:copasDate(values[0]),staffId:text(values[1]),staff:text(values[2]),invoice:text(values[3]),article:text(values[4]),description:text(values[5]),qty:Number(values[7])||0,amount:Number(values[8])||0,store:text(values[15]),week:text(values[14])}];
 });
 return{invoice:text(invoice),planId:hash([wanted,items.map(item=>item.id)]),items};
}
export function selectCopasInvoice(plan:ReturnType<typeof findCopasInvoice>,ids:unknown){
 if(!Array.isArray(ids)||!ids.length||ids.length>1000||ids.some(id=>typeof id!=="string")||new Set(ids).size!==ids.length)throw new Error("Pilih baris transaksi yang akan dihapus.");
 const selected=plan.items.filter(item=>ids.includes(item.id));
 if(selected.length!==ids.length)throw new Error("Data transaksi berubah. Cari ulang invoice sebelum menghapus.");
 return selected;
}
export function excludeRemovedInvoices<T extends unknown[]>(rows:T[],fingerprints:string[]){
 const counts=new Map<string,number>();for(const fingerprint of fingerprints)counts.set(fingerprint,(counts.get(fingerprint)||0)+1);
 let excludedCount=0,excludedAmount=0;
 const kept=rows.filter(row=>{const id=invoiceFingerprint(row),count=counts.get(id)||0;if(!count)return true;counts.set(id,count-1);excludedCount++;excludedAmount+=Number(row[8])||0;return false});
 return{rows:kept,excludedCount,excludedAmount};
}
