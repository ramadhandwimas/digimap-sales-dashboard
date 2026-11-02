import {readExchangeState} from "./exchange-detail-store";
import {adjustExchangeSales,GROSS_SHEET} from "./exchange-detail";
import {getSheetRanges} from "@/lib/google-sheets";
import {isValidSale,parseSalesRow,type SalesRow} from "@/lib/m238-sales-sanitize";

const SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const TTL=90_000;
type CachedSource={at:number;dataCopas:SalesRow[];rawSales:SalesRow[];activeDates:string[]};
let cache:CachedSource|null=null;
let pending:Promise<CachedSource>|null=null;

export async function getCachedSalesSource(email:string,key:string,force=false){
 const now=Date.now();
 if(!force&&cache&&now-cache.at<TTL)return cache;
 if(!force&&pending)return pending;
 pending=(async()=>{
   const state=await readExchangeState({email,key});
   const [[dataCopasRaw,rawSalesRaw],[normalized]]=await Promise.all([getSheetRanges(SOURCE_ID,["'Data Copas'!A2:S50000",`'${GROSS_SHEET}'!A2:Q65536`],email,key),getSheetRanges("1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk",["'SALES DASHBOARD DATA'!A2:Q65537"],email,key)]);
   const activeRaw=normalized?.length?normalized:rawSalesRaw;
   const next:CachedSource={
     at:Date.now(),
     dataCopas:adjustExchangeSales((dataCopasRaw||[]).map(parseSalesRow).filter(r=>isValidSale(r)),state),
     rawSales:adjustExchangeSales((activeRaw||[]).map(parseSalesRow).filter(r=>isValidSale(r,false)),state),
     activeDates:[...new Set((activeRaw||[]).map(parseSalesRow).map(r=>r.date).filter(Boolean))]
   };
   cache=next;
   return next;
 })().finally(()=>{pending=null});
 return pending;
}

export function clearCachedSalesSource(){cache=null;pending=null}
