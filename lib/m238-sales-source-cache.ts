import {getSheetRanges} from "@/lib/google-sheets";
import {isValidSale,parseSalesRow,type SanitizedSalesRow} from "@/lib/m238-sales-sanitize";

const SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const TTL=90_000;
type CachedSource={at:number;dataCopas:SanitizedSalesRow[];rawSales:SanitizedSalesRow[]};
let cache:CachedSource|null=null;
let pending:Promise<CachedSource>|null=null;

export async function getCachedSalesSource(email:string,key:string,force=false){
 const now=Date.now();
 if(!force&&cache&&now-cache.at<TTL)return cache;
 if(!force&&pending)return pending;
 pending=(async()=>{
   const[dataCopasRaw,rawSalesRaw]=await getSheetRanges(SOURCE_ID,["'Data Copas'!A2:S50000","'RAW SalesPerson'!AB2:AR65536"],email,key);
   const next={
     at:Date.now(),
     dataCopas:(dataCopasRaw||[]).map(parseSalesRow).filter(r=>isValidSale(r)),
     rawSales:(rawSalesRaw||[]).map(parseSalesRow).filter(r=>isValidSale(r,false))
   };
   cache=next;
   return next;
 })().finally(()=>{pending=null});
 return pending;
}

export function clearCachedSalesSource(){cache=null;pending=null}
