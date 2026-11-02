import {createHash} from "node:crypto";
import {copasDate} from "./copas-invoices";
export const DETAIL_SHEET="Detail Exchange",AUDIT_SHEET="Exchange Detail Audit",GROSS_SHEET="Exchange Gross Sales";
export const DETAIL_HEADERS=["Operation ID","Confirmed At","Confirmed By","Status","Mode","Date","Store","Staff ID","Invoice","Article","Unit Price","Original Qty","Original Amount","Exchange Qty","Exchange Amount","Key","Formula Key"];
export type ExchangeSale={date:string;invoice:string;article:string;qty:number;amount:number;store:string;id?:string;staffId?:string;name?:string;staffName?:string;description?:string;key?:string;sourceKey?:string};
export type ExchangeState={details:unknown[][];legacy:string[];history:unknown[][]};
const s=(v:unknown)=>String(v??"").trim();
export const sourceStore=(r:ExchangeSale)=>s((r.key||r.sourceKey||"").split("|")[0]).match(/^M\d+$/)?.[0]||s(r.store)||"M238";
const price=(r:ExchangeSale)=>r.qty>0?Math.round(r.amount/r.qty*1e6)/1e6:0;
export const formulaKey=(r:ExchangeSale)=>[r.date,s(r.id??r.staffId),s(r.invoice),s(r.article).toUpperCase(),price(r).toFixed(6)].join("|");
export const exchangeKey=(r:ExchangeSale)=>`${sourceStore(r)}|${formulaKey(r)}`;
export const scopeKey=(r:ExchangeSale)=>`${sourceStore(r)}|${r.date}|${s(r.invoice)}`;
export function confirmedDetails(rows:unknown[][]){const map=new Map<string,unknown[]>();for(const r of rows){if(s(r[3])!=="CONFIRMED")continue;const key=s(r[15]);if(map.has(key))throw new Error("Detail exchange memiliki key ganda. Periksa tab Detail Exchange.");if(!Number.isFinite(Number(r[13]))||Number(r[13])<0||Number(r[13])>Number(r[11]))throw new Error("Qty pada Detail Exchange tidak valid.");map.set(key,r)}return map}
export function adjustExchangeSales<T extends ExchangeSale>(rows:T[],state:ExchangeState):T[]{
 const details=confirmedDetails(state.details),legacy=new Set(state.legacy.map(s)),archived=new Set(state.history.map(r=>`${s(r[0])}|${s(r[1])}`)),used=new Map<string,number>();
 return rows.flatMap(row=>{
  if(legacy.has(s(row.invoice))||archived.has(`${row.date.slice(0,7)}|${s(row.invoice)}`))return[];
  const key=exchangeKey(row),detail=details.get(key);if(!detail||row.qty<=0)return[row];
  const already=used.get(key)||0,remove=Math.min(row.qty,Math.max(0,Number(detail[13])-already));used.set(key,already+remove);
  const qty=row.qty-remove;if(qty<=0)return[];return[{...row,qty,amount:Math.round(row.amount*qty/row.qty*100)/100}];
 });
}
export function assertExchangePosSafety(rows:ExchangeSale[],state:ExchangeState){
 const active=new Map<string,string>();for(const r of state.details)if(r[3]==="CONFIRMED"&&Number(r[13])>0)active.set(String(r[16]),String(r[6]));
 for(const row of rows){const store=active.get(formulaKey(row));if(store&&store!==sourceStore(row))throw new Error("Invoice/artikel exchange identik ditemukan di dua POS. Upload ditahan agar toko lain tidak ikut terpotong.")}
}
export function groupExchangeSales(rows:ExchangeSale[],invoice:string,store:string){
 const groups=new Map<string,ExchangeSale>();
 for(const r of rows){if(s(r.invoice)!==invoice||sourceStore(r)!==store||r.qty<=0||!r.date||!r.article)continue;const key=exchangeKey(r),previous=groups.get(key);if(previous){previous.qty+=r.qty;previous.amount+=r.amount}else groups.set(key,{...r,store,key})}
 return[...groups.entries()].map(([key,r])=>({...r,key,formulaKey:formulaKey(r)}));
}
export function buildExchangePlan(rows:ExchangeSale[],invoice:string,store:string,state:ExchangeState){
 const groups=groupExchangeSales(rows,invoice,store),details=confirmedDetails(state.details),scopes=new Set(groups.map(scopeKey));
 if(scopes.size>1)throw new Error("Invoice ditemukan pada beberapa tanggal. Periksa tanggal invoice sebelum konfirmasi.");
 const items=groups.map(r=>({...r,exchangeQty:Number(details.get(r.key)?.[13]||0)}));
 const archived=groups.some(r=>state.history.some(h=>h[0]===r.date.slice(0,7)&&s(h[1])===invoice));
 const collision=groups.some(r=>rows.some(other=>sourceStore(other)!==store&&formulaKey(other)===r.formulaKey));
 const legacy=state.legacy.includes(invoice),legacyCollision=legacy&&rows.some(r=>r.invoice===invoice&&sourceStore(r)!==store);
 const planId=createHash("sha256").update(JSON.stringify([invoice,store,items,state.details,state.legacy,state.history])).digest("hex");
 return{invoice,store,planId,items,legacy,archived,collision:collision||legacyCollision,qty:items.reduce((a,r)=>a+r.qty,0),amount:items.reduce((a,r)=>a+r.amount,0)};
}
export function confirmExchangeSelection(plan:ReturnType<typeof buildExchangePlan>,input:unknown,mode:unknown){
 if(!plan.items.length)throw new Error("Invoice belum ditemukan. Upload SPW atau lakukan Cut Off terlebih dahulu.");
 if(plan.archived)throw new Error("Invoice sudah masuk arsip exchange penuh. Arsip lama tidak diubah oleh fitur ini.");
 if(plan.collision)throw new Error("Invoice/artikel sama ditemukan di dua POS. Pengaturan belum dapat disimpan agar toko lain tidak ikut terpotong.");
 if(mode!=="all"&&mode!=="partial")throw new Error("Pilih exchange semua atau sebagian.");
 if(!Array.isArray(input)||input.length!==plan.items.length)throw new Error("Konfirmasi ulang daftar barang.");
 const selections=new Map<string,number>();for(const entry of input){if(!entry||typeof entry.key!=="string"||typeof entry.qty!=="number"||!Number.isSafeInteger(entry.qty)||entry.qty<0||selections.has(entry.key))throw new Error("Qty exchange harus bilangan bulat dan tidak boleh ganda.");selections.set(entry.key,entry.qty)}
 const items=plan.items.map(item=>{const qty=selections.get(item.key);if(qty===undefined||qty>item.qty)throw new Error("Qty exchange melebihi qty awal atau daftar barang berubah.");if(mode==="all"&&qty!==item.qty)throw new Error("Exchange semua harus mencakup seluruh qty.");return{...item,exchangeQty:qty,exchangeAmount:Math.round(item.amount*qty/item.qty*100)/100}});
 if(!items.some(r=>r.exchangeQty>0))throw new Error("Pilih minimal 1 qty yang di-exchange.");
 return items;
}
