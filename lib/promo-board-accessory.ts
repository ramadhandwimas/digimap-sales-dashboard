import * as XLSX from "xlsx";

export type AccessoryPriceProduct={
  supplier:string;brand:string;sapArticle:string;articleMapemall:string;sapDescription:string;category:string;
  referenceSrp:number;currentSrpCash:number;repricingCash:number;activePrice:number;brZout:string;remarks:string;
};
export type AccessoryIssue={severity:"WARNING"|"BLOCKING";code:string;row:number;sapArticle:string;reason:string};
export type AccessoryParseResult={
  fileName:string;sheetName:string;priceListDate:string|null;totalRows:number;totalSku:number;totalBrand:number;totalCategory:number;
  products:AccessoryPriceProduct[];warnings:string[];issues:AccessoryIssue[];blockingErrors:number;
};
export type SupplierRef={vendorCode:string;supplier:string;brandCode:string;brandName:string};
export type AccessoryChangeType="NEW_SKU"|"REMOVED_SKU"|"PRICE_DOWN"|"PRICE_UP"|"REMARKS_CHANGED"|"BR_ZOUT_CHANGED";
export type AccessoryChange={type:AccessoryChangeType;sapArticle:string;description:string;beforePrice:number;afterPrice:number;beforeText?:string;afterText?:string};
export type AccessoryComparison={counts:Record<AccessoryChangeType,number>;changes:AccessoryChange[]};

const clean=(v:unknown)=>String(v??"").replace(/\u00a0/g," ").replace(/[\u200b-\u200d\u2060\ufeff]/g,"").replace(/\s+/g," ").trim();
export const accessoryArticleKey=(v:unknown)=>clean(v).replace(/\s/g,"").toUpperCase();
const headerKey=(v:unknown)=>clean(v).toUpperCase().replace(/[^A-Z0-9]+/g," ").trim();
const price=(v:unknown)=>{
  if(typeof v==="number")return Number.isFinite(v)&&v>=0?v:0;
  const s=clean(v).replace(/^Rp\s*/i,"").replace(/\s+/g,"");
  if(!s)return 0;
  if(/^\d{1,3}(?:[.,]\d{3})+$/.test(s))return Number(s.replace(/[.,]/g,""));
  if(/^\d+$/.test(s))return Number(s);
  if(/^\d+[.,]00$/.test(s))return Number(s.replace(/[.,]00$/, ""));
  return 0;
};
const MONTHS:Record<string,number>={januari:0,january:0,februari:1,february:1,maret:2,march:2,april:3,mei:4,may:4,juni:5,june:5,juli:6,july:6,agustus:7,august:7,september:8,oktober:9,october:9,november:10,desember:11,december:11};
function detectDate(rows:unknown[][]){
  for(const row of rows.slice(0,15))for(const cell of row){
    const m=clean(cell).match(/(\d{1,2})\s+(Januari|January|Februari|February|Maret|March|April|Mei|May|Juni|June|Juli|July|Agustus|August|September|Oktober|October|November|Desember|December)\s+(20\d{2})/i);
    if(!m)continue;const mo=MONTHS[m[2].toLowerCase()];if(mo===undefined)continue;return `${m[3]}-${String(mo+1).padStart(2,"0")}-${String(Number(m[1])).padStart(2,"0")}`;
  }
  return null;
}
function sameIdentity(a:AccessoryPriceProduct,b:AccessoryPriceProduct){return ["brand","sapDescription","category","articleMapemall"].every(k=>clean(a[k as keyof AccessoryPriceProduct]).toUpperCase()===clean(b[k as keyof AccessoryPriceProduct]).toUpperCase())}

export function parseAccessoryPriceWorkbook(buffer:ArrayBuffer,fileName:string):AccessoryParseResult{
  const wb=XLSX.read(buffer,{type:"array",cellDates:true});
  let chosen="",grid:unknown[][]=[];
  for(const name of wb.SheetNames){
    const rows=XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name],{header:1,raw:true,defval:"",blankrows:true});
    const at=rows.slice(0,40).findIndex(r=>{const h=r.map(headerKey);return h.includes("BRAND")&&h.includes("SAP ARTICLE")&&h.includes("SAP DESCRIPTION")&&h.includes("CATEGORY")});
    if(at>=0){chosen=name;grid=rows;break}
  }
  if(!chosen)throw new Error("Header Brand, SAP Article, SAP Description, dan Category tidak ditemukan.");
  const headerIndex=grid.slice(0,40).findIndex(r=>{const h=r.map(headerKey);return h.includes("BRAND")&&h.includes("SAP ARTICLE")&&h.includes("SAP DESCRIPTION")&&h.includes("CATEGORY")});
  const headers=grid[headerIndex].map(headerKey);
  const find=(...names:string[])=>headers.findIndex(h=>names.some(n=>h===headerKey(n)));
  const c={brand:find("Brand"),sap:find("SAP Article"),map:find("Article Mapemall"),desc:find("SAP Description"),cat:find("Category"),ref:find("Reference SRP"),current:find("Current SRP Cash"),repricing:find("Repricing Cash"),br:find("BR / Zoutn","BR/Zoutn","BR / ZOUT","BR/ZOUT"),remarks:find("Remarks")};
  const issues:AccessoryIssue[]=[],warnings:string[]=[];const bySap=new Map<string,{product:AccessoryPriceProduct;row:number}>();let totalRows=0;
  for(let i=headerIndex+1;i<grid.length;i++){
    const r=grid[i];const brand=clean(r[c.brand]),sap=accessoryArticleKey(r[c.sap]),desc=clean(r[c.desc]),cat=clean(r[c.cat]);
    if(!brand&&!sap&&!desc&&!cat)continue;if(headers.length&&r.map(headerKey).includes("SAP ARTICLE"))continue;totalRows++;
    if(!sap||!brand||!desc||!cat){issues.push({severity:"WARNING",code:"MISSING_REQUIRED",row:i+1,sapArticle:sap,reason:"Brand, SAP Article, SAP Description, atau Category kosong."});continue}
    const referenceSrp=c.ref>=0?price(r[c.ref]):0,currentSrpCash=c.current>=0?price(r[c.current]):0,repricingCash=c.repricing>=0?price(r[c.repricing]):0;
    const p:AccessoryPriceProduct={supplier:"",brand,sapArticle:sap,articleMapemall:c.map>=0?clean(r[c.map]):"",sapDescription:desc,category:cat,referenceSrp,currentSrpCash,repricingCash,activePrice:repricingCash>0?repricingCash:currentSrpCash,brZout:c.br>=0?clean(r[c.br]):"",remarks:c.remarks>=0?clean(r[c.remarks]):""};
    if(!p.activePrice)issues.push({severity:"WARNING",code:"MISSING_PRICE",row:i+1,sapArticle:sap,reason:"Harga aktif tidak terbaca."});
    const prev=bySap.get(sap);
    if(prev){
      if(!sameIdentity(prev.product,p)){issues.push({severity:"BLOCKING",code:"DUPLICATE_IDENTITY_CONFLICT",row:i+1,sapArticle:sap,reason:`SAP Article sama tetapi identitas produk berbeda dengan baris ${prev.row}.`});continue}
      // The accessory source may repeat a SKU when a later line refreshes its price.
      // Keep the last row and surface a warning so preview remains usable and deterministic.
      warnings.push(`SAP ${sap} berulang; baris ${i+1} dipakai sebagai data terbaru.`);
    }
    bySap.set(sap,{product:p,row:i+1});
  }
  const products=[...bySap.values()].map(v=>v.product);
  return{fileName,sheetName:chosen,priceListDate:detectDate(grid),totalRows,totalSku:products.length,totalBrand:new Set(products.map(p=>p.brand.toUpperCase())).size,totalCategory:new Set(products.map(p=>p.category.toUpperCase())).size,products,warnings:[...new Set(warnings)].slice(0,200),issues,blockingErrors:issues.filter(i=>i.severity==="BLOCKING").length};
}

export function parseSupplierReferences(rows:unknown[][]):SupplierRef[]{
  if(!rows.length)return[];const start=headerKey(rows[0]?.[0])==="VENDOR CODE"?1:0;
  return rows.slice(start).map(r=>({vendorCode:clean(r[0]),supplier:clean(r[1]),brandCode:accessoryArticleKey(r[2]),brandName:clean(r[3])})).filter(r=>r.supplier&&r.brandCode&&r.brandName);
}
export function mapAccessorySuppliers(products:AccessoryPriceProduct[],refs:SupplierRef[]):AccessoryPriceProduct[]{
  return products.map(p=>{
    const id=accessoryArticleKey(p.sapArticle);const prefix=refs.filter(r=>id.startsWith(r.brandCode));const max=Math.max(0,...prefix.map(r=>r.brandCode.length));
    let choices=[...new Set(prefix.filter(r=>r.brandCode.length===max).map(r=>r.supplier))];
    if(!choices.length)choices=[...new Set(refs.filter(r=>r.brandName.toUpperCase()===p.brand.toUpperCase()).map(r=>r.supplier))];
    let supplier=choices.length===1?choices[0]:"";
    if(!supplier&&/^APPLE(?:\s+CARE(?:\s+PLUS)?)?$/i.test(p.brand))supplier="APPLE";
    return{...p,supplier:supplier||"Belum Terpetakan"};
  });
}
const emptyCounts=():Record<AccessoryChangeType,number>=>({NEW_SKU:0,REMOVED_SKU:0,PRICE_DOWN:0,PRICE_UP:0,REMARKS_CHANGED:0,BR_ZOUT_CHANGED:0});
export function compareAccessoryPriceLists(before:AccessoryParseResult|null|undefined,after:AccessoryParseResult|null|undefined):AccessoryComparison{
  const counts=emptyCounts(),changes:AccessoryChange[]=[];const a=new Map((before?.products||[]).map(p=>[accessoryArticleKey(p.sapArticle),p])),b=new Map((after?.products||[]).map(p=>[accessoryArticleKey(p.sapArticle),p]));
  for(const[id,p]of b){const q=a.get(id);if(!q){counts.NEW_SKU++;changes.push({type:"NEW_SKU",sapArticle:id,description:p.sapDescription,beforePrice:0,afterPrice:p.activePrice});continue}
    if(q.activePrice!==p.activePrice){const type:AccessoryChangeType=p.activePrice<q.activePrice?"PRICE_DOWN":"PRICE_UP";counts[type]++;changes.push({type,sapArticle:id,description:p.sapDescription,beforePrice:q.activePrice,afterPrice:p.activePrice})}
    if(clean(q.remarks)!==clean(p.remarks)){counts.REMARKS_CHANGED++;changes.push({type:"REMARKS_CHANGED",sapArticle:id,description:p.sapDescription,beforePrice:q.activePrice,afterPrice:p.activePrice,beforeText:q.remarks,afterText:p.remarks})}
    if(clean(q.brZout)!==clean(p.brZout)){counts.BR_ZOUT_CHANGED++;changes.push({type:"BR_ZOUT_CHANGED",sapArticle:id,description:p.sapDescription,beforePrice:q.activePrice,afterPrice:p.activePrice,beforeText:q.brZout,afterText:p.brZout})}
  }
  for(const[id,p]of a)if(!b.has(id)){counts.REMOVED_SKU++;changes.push({type:"REMOVED_SKU",sapArticle:id,description:p.sapDescription,beforePrice:p.activePrice,afterPrice:0})}
  return{counts,changes};
}
export function sameAccessoryPriceList(a:AccessoryParseResult|null|undefined,b:AccessoryParseResult|null|undefined){
  if(!a||!b||a.products.length!==b.products.length)return false;const normalize=(p:AccessoryPriceProduct)=>JSON.stringify([accessoryArticleKey(p.sapArticle),p.supplier,p.brand,p.articleMapemall,p.sapDescription,p.category,p.referenceSrp,p.currentSrpCash,p.repricingCash,p.activePrice,p.brZout,p.remarks]);
  return a.products.map(normalize).sort().join("\n")===b.products.map(normalize).sort().join("\n");
}
