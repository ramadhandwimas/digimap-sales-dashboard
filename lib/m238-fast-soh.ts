export type FastSohRow={article:string;description:string;qty:number;category:string;updated:string;status:string};

const s=(v:unknown)=>String(v??"").trim();
const up=(v:unknown)=>s(v).toUpperCase();
const n=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/[^0-9.-]/g,""))||0;

function splitArticle(v:string){const p=v.indexOf(" / ");if(p<0)return{article:up(v),description:v};return{article:up(v.slice(0,p)),description:v.slice(p+3).trim()}}
function categoryFor(brand:string,scheme:string,type:string,description:string){if(brand!=="APPLE"||scheme==="DEMO")return"";if(scheme==="DEVICES"){
  if(type==="PHONE")return"IPHONE";
  if(type==="TABLETS")return"IPAD";
  if(type==="LAPTOPS"||type==="DESKTOP")return"MACBOOK";
  if(type==="WATCH")return"APPLE WATCH";
 }
 if(scheme==="ACCESSORIES"){
  const d=up(description);
  if(type==="EARPHONES"||/AIRPODS|APPLE PENCIL|MAGIC KEYBOARD|KEYBOARD|EARPODS/.test(d))return"AIRPODS, PENCIL & KEYBOARD";
 }
 return"";
}

export function parseSohFast(rows:unknown[][]){
 const updated=s(rows[0]?.[5])||new Date().toISOString();
 const grouped=new Map<string,FastSohRow>();let productRows=0,eligibleRows=0;
 for(const r of rows){
  const brand=up(r[0]),scheme=up(r[2]),type=up(r[3]),raw=s(r[4]),qty=n(r[7]);
  if(!raw||typeof r[7]!=="number")continue;productRows++;
  const {article,description}=splitArticle(raw);if(!article||qty<=0||/DEMO|\-D(?:\b|$)/i.test(`${article} ${description}`))continue;
  const category=categoryFor(brand,scheme,type,description);if(!category)continue;eligibleRows++;
  const key=`${category}|${article}`,prev=grouped.get(key);if(prev)prev.qty+=qty;else grouped.set(key,{article,description,qty,category,updated,status:"ACTIVE"});
 }
 return{rows:[...grouped.values()],productRows,eligibleRows,updated};
}

export const sohFastHeaders=["Article","Description","Qty","Category","Updated","Status"];
export const sohFastValues=(r:FastSohRow)=>[r.article,r.description,r.qty,r.category,r.updated,r.status];
export const sohFastFromValues=(r:unknown[]):FastSohRow=>({article:up(r[0]),description:s(r[1]),qty:n(r[2]),category:up(r[3]),updated:s(r[4]),status:up(r[5])||"ACTIVE"});
