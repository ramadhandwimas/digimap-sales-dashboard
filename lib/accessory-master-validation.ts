import {getSheetRanges} from "@/lib/google-sheets";
import type {AccessoryPriceProduct} from "@/lib/promo-board-accessory";

const PRODUCT_RANGE="'Master'!A2:G100000";
const SUPPLIER_RANGE="'Master'!I2:L100000";
const UNKNOWN_SUPPLIER="Supplier belum ter-mapping";
const clean=(v:unknown)=>String(v??"").trim().replace(/\s+/g," ");
const key=(v:unknown)=>clean(v).toUpperCase();

type ProductMaster={category:string;productGroup:string;brand:string;sap:string;description:string};
type SupplierRef={vendorCode:string;supplier:string;brandCode:string;brandName:string};
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
 // Master is two independent tables on the same sheet: A:G = product master,
 // I:L = supplier/brand reference. Never join them by physical row number.
 const [productRaw,supplierRaw]=await getSheetRanges(sheetId,[PRODUCT_RANGE,SUPPLIER_RANGE],email,privateKey);
 const master:ProductMaster[]=(productRaw||[]).map(r=>({category:clean(r[0]),productGroup:clean(r[1]),brand:clean(r[2]),sap:key(r[3]),description:clean(r[4])})).filter(r=>r.sap||r.brand);
 const refs:SupplierRef[]=(supplierRaw||[]).map(r=>({vendorCode:key(r[0]),supplier:clean(r[1]),brandCode:key(r[2]),brandName:clean(r[3])})).filter(r=>r.brandCode||r.brandName||r.supplier);
 const bySap=new Map<string,ProductMaster[]>(),byBrand=new Map<string,ProductMaster[]>(),refsByCode=new Map<string,SupplierRef[]>(),refsByBrand=new Map<string,SupplierRef[]>();
 for(const r of master){if(r.sap){const a=bySap.get(r.sap)||[];a.push(r);bySap.set(r.sap,a)}if(r.brand){const k=key(r.brand),a=byBrand.get(k)||[];a.push(r);byBrand.set(k,a)}}
 for(const r of refs){if(r.brandCode){const a=refsByCode.get(r.brandCode)||[];a.push(r);refsByCode.set(r.brandCode,a)}if(r.brandName){const k=key(r.brandName),a=refsByBrand.get(k)||[];a.push(r);refsByBrand.set(k,a)}}
 const codes=[...refsByCode.keys()].filter(Boolean).sort((a,b)=>b.length-a.length||a.localeCompare(b));
 const masterConflicts:string[]=[];
 for(const [code,rs] of refsByCode){const brands=choose(rs.map(r=>r.brandName));const suppliers=choose(rs.map(r=>r.supplier));if(!brands.confident&&brands.total>1)masterConflicts.push(`Brand Code ${code}: ${[...new Set(rs.map(r=>r.brandName).filter(Boolean))].join(" / ")}`);if(!suppliers.confident&&suppliers.total>1)masterConflicts.push(`Supplier Brand Code ${code}: ${[...new Set(rs.map(r=>r.supplier).filter(Boolean))].join(" / ")}`)}
 const seen=new Map<string,number>();let brandChanged=0,supplierChanged=0,unmappedSupplier=0;
 const mapped=products.map(p=>{
  const sap=key(p.sapArticle),exact=bySap.get(sap)||[];
  const prefix=codes.find(c=>sap.startsWith(c))||"";
  const codeRefs=prefix?refsByCode.get(prefix)||[]:[];
  // Exact SAP product master is strongest. Prefix Brand Code is second.
  // Uploaded brand is only a fallback and never drives supplier when it conflicts with SAP/prefix.
  let brandChoice=choose(exact.map(r=>r.brand));
  if(!brandChoice.value&&codeRefs.length)brandChoice=choose(codeRefs.map(r=>r.brandName));
  if(!brandChoice.value){const known=refsByBrand.get(key(p.brand))||[];const c=choose(known.map(r=>r.brandName));if(c.confident)brandChoice=c}
  const brand=brandChoice.confident&&brandChoice.value?brandChoice.value:clean(p.brand)||"Brand belum ter-mapping";
  let supplierCandidates=codeRefs;
  if(!supplierCandidates.length)supplierCandidates=refsByBrand.get(key(brand))||[];
  const supplierChoice=choose(supplierCandidates.map(r=>r.supplier));
  const supplier=supplierChoice.confident&&supplierChoice.value?supplierChoice.value:UNKNOWN_SUPPLIER;
  const categoryChoice=choose(exact.map(r=>r.category));
  const category=categoryChoice.confident&&categoryChoice.value?categoryChoice.value:clean(p.category)||"Lainnya";
  if(key(brand)!==key(p.brand))brandChanged++;
  if(key(supplier)!==key(p.supplier))supplierChanged++;
  if(supplier===UNKNOWN_SUPPLIER)unmappedSupplier++;
  seen.set(sap,(seen.get(sap)||0)+1);
  return {...p,brand,supplier,category,brandCode:prefix} as AccessoryPriceProduct&{brandCode:string};
 });
 const duplicateSku=[...seen.values()].filter(n=>n>1).reduce((n,x)=>n+x-1,0);
 const problems:string[]=[];
 if(unmappedSupplier)problems.push(`${unmappedSupplier} SKU belum memiliki Supplier yang dapat ditentukan dengan aman.`);
 if(duplicateSku)problems.push(`${duplicateSku} duplicate SAP Article terdeteksi.`);
 const audit:AccessoryAudit={totalSku:mapped.length,totalBrand:new Set(mapped.map(p=>key(p.brand)).filter(Boolean)).size,totalSupplier:new Set(mapped.map(p=>key(p.supplier)).filter(Boolean)).size,brandChanged,supplierChanged,unmappedSupplier,duplicateSku,masterConflicts,mappingProblems:problems};
 return {products:mapped,audit};
}
