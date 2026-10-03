import {randomUUID} from "node:crypto";
import {appendSheetValues,ensureSheets,getSheetRangesFresh} from "@/lib/google-sheets";
import {MASTER_ID} from "@/lib/accessory-pricelist-store";
import type {AccessoryParseResult,AccessoryPriceProduct} from "@/lib/promo-board-accessory";

const META_SHEET="Promo ACC Price Lists";
const PRODUCT_SHEET="Promo ACC Products";
const META_HEADERS=["Price List ID","File Name","Price List Date","Uploaded At","Total Rows","Total SKU","Total Brand","Total Category","Warnings JSON"];
const PRODUCT_HEADERS=["Price List ID","Supplier","Brand","SAP Article","Article Mapemall","SAP Description","Category","Reference SRP","Current SRP Cash","Repricing Cash","Active Price","BR/ZOUT","Remarks"];
type Credentials={email:string;key:string};
export type StoredAccessorySnapshot=AccessoryParseResult&{id:string;uploadedAt:string};
const text=(v:unknown)=>String(v??"").trim();const number=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)?n:0};
async function ensure(credentials:Credentials){await ensureSheets(MASTER_ID,[{title:META_SHEET,headers:META_HEADERS},{title:PRODUCT_SHEET,headers:PRODUCT_HEADERS}],credentials.email,credentials.key)}
function productRow(id:string,p:AccessoryPriceProduct){return[id,p.supplier,p.brand,p.sapArticle,p.articleMapemall,p.sapDescription,p.category,p.referenceSrp,p.currentSrpCash,p.repricingCash,p.activePrice,p.brZout,p.remarks]}
function rowProduct(r:unknown[]):AccessoryPriceProduct{return{supplier:text(r[1]),brand:text(r[2]),sapArticle:text(r[3]),articleMapemall:text(r[4]),sapDescription:text(r[5]),category:text(r[6]),referenceSrp:number(r[7]),currentSrpCash:number(r[8]),repricingCash:number(r[9]),activePrice:number(r[10]),brZout:text(r[11]),remarks:text(r[12])}}
export async function readAccessorySupplierRows(credentials:Credentials){const[rows]=await getSheetRangesFresh(MASTER_ID,["'Master'!I1:L1000"],credentials.email,credentials.key);return rows??[]}
export async function saveAccessorySnapshot(credentials:Credentials,result:AccessoryParseResult){
  await ensure(credentials);const id=`acc_${Date.now()}_${randomUUID().slice(0,8)}`,uploadedAt=new Date().toISOString();const rows=result.products.map(p=>productRow(id,p));
  for(let i=0;i<rows.length;i+=400)await appendSheetValues(MASTER_ID,`'${PRODUCT_SHEET}'!A:M`,rows.slice(i,i+400),credentials.email,credentials.key,"RAW");
  await appendSheetValues(MASTER_ID,`'${META_SHEET}'!A:I`,[[id,result.fileName,result.priceListDate??"",uploadedAt,result.totalRows,result.totalSku,result.totalBrand,result.totalCategory,JSON.stringify(result.warnings.slice(0,100))]],credentials.email,credentials.key,"RAW");
  return{id,uploadedAt};
}
export async function readAccessorySnapshots(credentials:Credentials,limit=6):Promise<StoredAccessorySnapshot[]>{
  await ensure(credentials);const[metaRows,productRows]=await getSheetRangesFresh(MASTER_ID,[`'${META_SHEET}'!A2:I`,`'${PRODUCT_SHEET}'!A2:M`],credentials.email,credentials.key);
  const metas=(metaRows??[]).filter(r=>text(r[0])).map(r=>({id:text(r[0]),fileName:text(r[1]),priceListDate:text(r[2])||null,uploadedAt:text(r[3]),totalRows:number(r[4]),totalSku:number(r[5]),totalBrand:number(r[6]),totalCategory:number(r[7]),warnings:(()=>{try{return JSON.parse(text(r[8])||"[]") as string[]}catch{return[]}})()})).sort((a,b)=>b.uploadedAt.localeCompare(a.uploadedAt)).slice(0,Math.max(1,limit));
  const wanted=new Set(metas.map(m=>m.id)),byId=new Map<string,AccessoryPriceProduct[]>();for(const r of productRows??[]){const id=text(r[0]);if(!wanted.has(id))continue;const list=byId.get(id)??[];list.push(rowProduct(r));byId.set(id,list)}
  return metas.map(m=>({...m,sheetName:"ACCESSORIES",products:byId.get(m.id)??[],totalSku:(byId.get(m.id)??[]).length||m.totalSku,issues:[],blockingErrors:0}));
}
