import {randomUUID} from "node:crypto";
import {appendSheetValues,ensureSheets,getSheetRangesFresh} from "@/lib/google-sheets";
import type {PromoParseResult,PromoProduct} from "@/lib/promo-board-parser";
import {MASTER_ID} from "@/lib/accessory-pricelist-store";

const META_SHEET="Promo Price Lists";
const PRODUCT_SHEET="Promo Products";
const META_HEADERS=["Price List ID","File Name","Price List Date","Uploaded At","Total Rows","Total SKU","Warnings JSON"];
const PRODUCT_HEADERS=[
  "Price List ID","SAP Article","SAP Description","Category","Section","Normal Price","Promotion Price","Saving Amount","Discount %","Remarks",
  "Promotion Cicilan Bundling","Promotion Cash Bundling","BR/ZOUT","EOL Status","Promo Start Date","Promo End Date","Promo Period Type","Promo Status","Days Remaining",
];

type Credentials={email:string;key:string};
export type StoredPromoSnapshot=PromoParseResult&{id:string;uploadedAt:string};

const text=(value:unknown)=>String(value??"").trim();
const number=(value:unknown)=>{const n=Number(value);return Number.isFinite(n)?n:0};
const nullableNumber=(value:unknown)=>{if(value===""||value==null)return null;const n=Number(value);return Number.isFinite(n)?n:null};

async function ensurePromoSheets(credentials:Credentials){
  await ensureSheets(MASTER_ID,[
    {title:META_SHEET,headers:META_HEADERS},
    {title:PRODUCT_SHEET,headers:PRODUCT_HEADERS},
  ],credentials.email,credentials.key);
}

function productToRow(id:string,product:PromoProduct):unknown[]{
  return [
    id,product.sapArticle,product.sapDescription,product.category,product.section,product.normalPrice,product.promotionPrice,product.savingAmount,product.discountPercentage,product.remarks,
    product.promotionInstallmentBundling??"",product.promotionCashBundling??"",product.brZout,product.eolStatus,product.promoStartDate??"",product.promoEndDate??"",product.promoPeriodType,product.promoStatus,product.daysRemaining??"",
  ];
}

function rowToProduct(row:unknown[]):PromoProduct{
  return {
    sapArticle:text(row[1]),sapDescription:text(row[2]),category:text(row[3]),section:text(row[4]),
    normalPrice:number(row[5]),promotionPrice:number(row[6]),savingAmount:number(row[7]),discountPercentage:number(row[8]),remarks:text(row[9]),
    promotionInstallmentBundling:nullableNumber(row[10]),promotionCashBundling:nullableNumber(row[11]),brZout:text(row[12]),eolStatus:text(row[13]),
    promoStartDate:text(row[14])||null,promoEndDate:text(row[15])||null,promoPeriodType:(text(row[16])||"UNKNOWN") as PromoProduct["promoPeriodType"],
    promoStatus:(text(row[17])||"UNKNOWN") as PromoProduct["promoStatus"],daysRemaining:nullableNumber(row[18]),
  };
}

export async function savePromoSnapshot(credentials:Credentials,result:PromoParseResult){
  await ensurePromoSheets(credentials);
  const id=`pl_${Date.now()}_${randomUUID().slice(0,8)}`;
  const uploadedAt=new Date().toISOString();
  const metaRow=[id,result.fileName,result.priceListDate??"",uploadedAt,result.totalRows,result.totalSku,JSON.stringify(result.warnings.slice(0,100))];
  await appendSheetValues(MASTER_ID,`'${META_SHEET}'!A:G`,[metaRow],credentials.email,credentials.key,"RAW");
  const rows=result.products.map(product=>productToRow(id,product));
  for(let i=0;i<rows.length;i+=400){
    await appendSheetValues(MASTER_ID,`'${PRODUCT_SHEET}'!A:S`,rows.slice(i,i+400),credentials.email,credentials.key,"RAW");
  }
  return{id,uploadedAt};
}

export async function readPromoSnapshots(credentials:Credentials,limit=6):Promise<StoredPromoSnapshot[]>{
  await ensurePromoSheets(credentials);
  const [metaRows,productRows]=await getSheetRangesFresh(MASTER_ID,[`'${META_SHEET}'!A2:G`,`'${PRODUCT_SHEET}'!A2:S`],credentials.email,credentials.key);
  const metas=(metaRows??[]).filter(row=>text(row[0])).map(row=>({
    id:text(row[0]),fileName:text(row[1]),priceListDate:text(row[2])||null,uploadedAt:text(row[3]),totalRows:number(row[4]),totalSku:number(row[5]),
    warnings:(()=>{try{return JSON.parse(text(row[6])||"[]") as string[]}catch{return[]}})(),
  })).sort((a,b)=>b.uploadedAt.localeCompare(a.uploadedAt)).slice(0,Math.max(1,limit));
  const wanted=new Set(metas.map(meta=>meta.id));
  const byId=new Map<string,PromoProduct[]>();
  for(const row of productRows??[]){
    const id=text(row[0]);
    if(!wanted.has(id))continue;
    const list=byId.get(id)??[];
    list.push(rowToProduct(row));
    byId.set(id,list);
  }
  return metas.map(meta=>({
    ...meta,sheetName:"PRICE LIST APPLE DEVICE",products:byId.get(meta.id)??[],totalSku:(byId.get(meta.id)??[]).length||meta.totalSku,
  }));
}
