import * as XLSX from "xlsx";
import {articleKey,cleanText,type PriceItem,type ImportPlan,type MasterRow} from "./accessory-pricelist";
import {parsePromoSku} from "./promo-board-catalog";
import type {PromoProduct} from "./promo-board-parser";

const key=(value:unknown)=>cleanText(value).toUpperCase();
const headerKey=(value:unknown)=>key(value).replace(/[^A-Z0-9]/g,"");
export type DeviceItem=PriceItem&{section:string;type:string};
const modelOf=(description:string,category:string,section:string)=>parsePromoSku({sapDescription:description,category,section} as PromoProduct);

export function parseDevicePricelist(buffer:ArrayBuffer){
 const workbook=XLSX.read(buffer,{type:"array",cellFormula:false,sheetRows:20032});
 if(workbook.SheetNames.length>30)throw new Error("File memiliki terlalu banyak sheet (maksimal 30).");
 const items:DeviceItem[]=[];let ignored=0,matched=false;
 for(const sheet of workbook.SheetNames){
  const ws=workbook.Sheets[sheet];if(!ws["!ref"])continue;
  const size=XLSX.utils.decode_range(ws["!fullref"]||ws["!ref"]);
  if(size.e.r>20030||size.e.c>100)throw new Error("Ukuran sheet melebihi batas 20.000 baris / 101 kolom.");
  const grid=XLSX.utils.sheet_to_json<unknown[]>(ws,{header:1,defval:"",blankrows:true,range:0});
  const at=grid.slice(0,30).findIndex(row=>{const h=row.map(headerKey);return h.includes("SAPARTICLE")&&h.includes("SAPDESCRIPTION")});
  if(at<0)continue;matched=true;
  const headers=grid[at].map(headerKey),col=(...names:string[])=>headers.findIndex(h=>names.includes(h));
  const article=col("SAPARTICLE"),description=col("SAPDESCRIPTION"),category=col("CATEGORY","PRODUCTCATEGORY"),brand=col("BRAND","BRANDNAME"),type=col("TYPE","MODEL");
  let section="";
  for(let i=at+1;i<grid.length;i++){
   const row=grid[i],sap=cleanText(row[article]),desc=cleanText(row[description]);
   if(sap&&!desc){section=sap;ignored++;continue}
   if(!sap&&!desc||headerKey(sap)==="SAPARTICLE"){ignored++;continue}
   items.push({sheet,row:i+1,article:sap,description:desc,brand:cleanText(row[brand])||"APPLE",category:cleanText(row[category]),type:cleanText(row[type]),section});
   if(items.length>20000)throw new Error("Pricelist maksimal 20.000 produk.");
  }
 }
 if(!matched)throw new Error("Header SAP Article dan SAP Description / SAPDescription tidak ditemukan.");
 if(!items.length)throw new Error("Pricelist tidak berisi produk.");
 return{items,ignored};
}

export function planDevicePricelist(items:DeviceItem[],master:unknown[][],_suppliers:unknown[][],ignored=0):ImportPlan{
 const expected=["BRAND","SAP ARTICLE","SAP DESCRIPTION","PRODUCT CATEGORY","TYPE","PRODUCT GROUP","CORE"];
 if(!expected.every((h,i)=>key(master[0]?.[i])===h))throw new Error("Format Master A–G berubah. Impor dihentikan agar kolom tidak tertukar.");
 const all=master.slice(1),existing=new Set(all.map(row=>articleKey(row[1])).filter(Boolean));
 const modelRows=new Map<string,unknown[][]>();
 for(const row of all){
  if(key(row[0])!=="APPLE"||!["DEVICES","ACCESSORIES"].includes(key(row[5])))continue;
  const model=key(modelOf(cleanText(row[2]),cleanText(row[3]),"").model);
  if(!model||/UNKNOWN/.test(model))continue;
  const lookup=`${key(row[5])}|${model}`,rows=modelRows.get(lookup)||[];rows.push(row);modelRows.set(lookup,rows);
 }
 const result:ImportPlan={total:items.length,existing:0,duplicates:0,ignored,rows:[],review:[]};
 const seen=new Map<string,DeviceItem[]>();
 for(const item of items){
  const id=articleKey(item.article);
  if(!id||!item.description){result.review.push({...item,reason:"SAP Article atau deskripsi kosong."});continue}
  if(existing.has(id)){result.existing++;continue}
  const group=seen.get(id)||[];group.push(item);seen.set(id,group);
 }
 for(const[id,group]of seen){
  const item=group[0],reject=(reason:string)=>result.review.push({...item,reason});result.duplicates+=group.length-1;
  if(new Set(group.map(row=>JSON.stringify([key(row.brand),key(row.description),key(row.category),key(row.type),key(row.section)]))).size>1){reject("SAP Article berulang dengan informasi berbeda di Excel.");continue}
  if(!["APPLE","APP"].includes(key(item.brand))){reject("Brand device belum dikenali sebagai APPLE.");continue}
  if(/CASE|COVER|ADAPTER|CABLE|KEYBOARD|PENCIL|APPLE\s*CARE|PROTEKSI|VOUCHER|STRAP/.test(key(`${item.description} ${item.category}`))){reject("Produk aksesori/proteksi tidak dimasukkan melalui pricelist device.");continue}
  const meta=modelOf(item.description,item.category,item.section);
  if(meta.lob==="Others"||!meta.model||/UNKNOWN|UNKNOWN MODEL/i.test(meta.model)){reject("Kategori atau model device belum dapat dipastikan dari deskripsi dan bagian pricelist.");continue}
  const categoryByLob:Record<string,string>={iPhone:"IPHONE",iPad:"IPAD",Mac:"MAC",Watch:"APPLE WATCH",AirPods:"AIRPODS"};
  const productGroup=meta.lob==="AirPods"?"ACCESSORIES":"DEVICES";
  const known=modelRows.get(`${productGroup}|${key(meta.model)}`)||[];
  const types=[...new Set(known.map(row=>cleanText(row[4])).filter(value=>value&&!/^#?N\/?A$/i.test(value)))];
  if(types.length>1){reject("Type model ini mempunyai beberapa klasifikasi berbeda di Master.");continue}
  const categories=[...new Set(known.map(row=>key(row[3])).filter(Boolean))];
  const type=types[0]||key(meta.model);
  // A workbook Type is informational until it agrees with the parsed model.
  if(item.type&&headerKey(item.type)!==headerKey(type)&&headerKey(item.type)!==headerKey(meta.model)){reject("Type di file berbeda dengan model yang dikenali. Periksa sebelum menambahkan.");continue}
  const row:MasterRow=["APPLE",id,cleanText(item.description),categories.length===1?categories[0]:categoryByLob[meta.lob],type,productGroup,"APPLE"];
  result.rows.push(row);
 }
 return result;
}
