import {getSheetRanges} from "@/lib/google-sheets";
import type {AccessoryPriceProduct} from "@/lib/promo-board-accessory";

const MASTER_RANGE="master!A2:K5000";
const UNKNOWN_SUPPLIER="Supplier belum ter-mapping";
const clean=(v:unknown)=>String(v??"").trim().replace(/\s+/g," ");
const key=(v:unknown)=>clean(v).toUpperCase();

type MasterRow={category:string;brand:string;sap:string;supplier:string;brandCode:string;brandName:string};
type Choice={value:string;count:number;total:number;confident:boolean};
export type AccessoryAudit={totalSku:number;totalBrand:number;totalSupplier:number;brandChanged:number;supplierChanged:number;unmappedSupplier:number;duplicateSku:number;masterConflicts:string[];mappingProblems:string[]};

function choose(values:string[]):Choice{
 const counts=new Map<string,{value:string;count:number}>();
 for(const raw of values){const v=clean(raw);if(!v)continue;const k=key(v),hit=counts.get(k);counts.set(k,{value:hit?.value||v,count:(hit?.count||0)+1})}
 const ranked=[...counts.values()].sort((a,b)=>b.count-a.count||a.value.localeCompare(b.value));
 const total=ranked.reduce((n,x)=>n+x.count,0),top=ranked[0];
 return {value:top?.value||"",count:top?.count||0,total,confident:Boolean(top)&&(ranked.length===1||top.count>(ranked[1]?.count||0))};
}

export async function validateAccessoryProducts(products:AccessoryPriceProduct[],sheetId:string,email:string,privateKey:string){
 const [raw]=await getSheetRanges(sheetId,[MASTER_RANGE],email,privateKey);
 const rows:MasterRow[]=(raw||[]).map(r=>({category:clean(r[0]),brand:clean(r[2]),sap:key(r[3]),supplier:clean(r[7]),brandCode:key(r[9]),brandName:clean(r[10])})).filter(r=>r.sap||r.brandCode||r.brandName||r.brand);
 const bySap=new Map<string,MasterRow[]>(),byCode=new Map<string,MasterRow[]>(),byBrand=new Map<string,MasterRow[]>();
 for(const r of rows){if(r.sap){const a=bySap.get(r.sap)||[];a.push(r);bySap.set(r.sap,a)}if(r.brandCode){const a=byCode.get(r.brandCode)||[];a.push(r);byCode.set(r.brandCode,a)}for(const n of [r.brandName,r.brand])if(n){const k=key(n),a=byBrand.get(k)||[];a.push(r);byBrand.set(k,a)}}
 const codes=[...byCode.keys()].filter(Boolean).sort((a,b)=>b.length-a.length||a.localeCompare(b));
 const masterConflicts:string[]=[];
 for(const [code,rs] of byCode){const brands=choose(rs.flatMap(r=>[r.brandName,r.brand]).filter(Boolean));if(!brands.confident&&brands.total>1)masterConflicts.push(`Brand Code ${code}: ${[...new Set(rs.flatMap(r=>[r.brandName,r.brand]).filter(Boolean))].join(" / ")}`)}
 const seen=new Map<string,number>();let brandChanged=0,supplierChanged=0,unmappedSupplier=0;
 const mapped=products.map(p=>{
  const sap=key(p.sapArticle),exact=bySap.get(sap)||[];
  let source:MasterRow[]=exact,brandCode="";
  if(!source.length){brandCode=codes.find(c=>sap.startsWith(c))||"";source=brandCode?byCode.get(brandCode)||[]:[]}
  let brandChoice=choose(source.flatMap(r=>[r.brandName,r.brand]).filter(Boolean));
  if(!brandChoice.value){const uploaded=byBrand.get(key(p.brand))||[];const c=choose(uploaded.flatMap(r=>[r.brandName,r.brand]).filter(Boolean));if(c.confident)brandChoice=c}
  const brand=brandChoice.confident&&brandChoice.value?brandChoice.value:clean(p.brand)||"Brand belum ter-mapping";
  const supplierRows=exact.length?exact:(byBrand.get(key(brand))||source);
  const supplierChoice=choose(supplierRows.map(r=>r.supplier).filter(Boolean));
  const supplier=supplierChoice.confident&&supplierChoice.value?supplierChoice.value:UNKNOWN_SUPPLIER;
  const categoryChoice=choose(exact.map(r=>r.category).filter(Boolean));
  const category=categoryChoice.confident&&categoryChoice.value?categoryChoice.value:clean(p.category)||"Lainnya";
  if(key(brand)!==key(p.brand))brandChanged++;
  if(key(supplier)!==key(p.supplier))supplierChanged++;
  if(supplier===UNKNOWN_SUPPLIER)unmappedSupplier++;
  seen.set(sap,(seen.get(sap)||0)+1);
  return {...p,brand,supplier,category,brandCode:brandCode||choose(exact.map(r=>r.brandCode).filter(Boolean)).value||""} as AccessoryPriceProduct&{brandCode:string};
 });
 const duplicateSku=[...seen.values()].filter(n=>n>1).reduce((n,x)=>n+x-1,0);
 const problems:string[]=[];
 if(unmappedSupplier)problems.push(`${unmappedSupplier} SKU belum memiliki Supplier yang dapat ditentukan dengan aman.`);
 if(duplicateSku)problems.push(`${duplicateSku} duplicate SAP Article terdeteksi.`);
 const audit:AccessoryAudit={totalSku:mapped.length,totalBrand:new Set(mapped.map(p=>key(p.brand)).filter(Boolean)).size,totalSupplier:new Set(mapped.map(p=>key(p.supplier)).filter(Boolean)).size,brandChanged,supplierChanged,unmappedSupplier,duplicateSku,masterConflicts,mappingProblems:problems};
 return {products:mapped,audit};
}
