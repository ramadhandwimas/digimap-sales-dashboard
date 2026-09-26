import type {PromoProduct} from "@/lib/promo-board-parser";
import {groupPromoProducts,type PromoProductGroup} from "@/lib/promo-board-insights";

export type SohRow={article:string;description:string;qty:number;soldQty:number;category:string};
export type StockStatus="READY"|"LOW_STOCK"|"OUT_OF_STOCK"|"UNKNOWN";

export type PromoCatalogItem={
  key:string;
  lob:string;
  model:string;
  capacity:string;
  connectivity:string;
  friendlyName:string;
  group:PromoProductGroup;
  totalSoh:number|null;
  stockStatus:StockStatus;
  stockVariants:Array<{product:PromoProduct;soh:number|null;status:StockStatus;description:string}>;
};

const clean=(value:string)=>value.replace(/\s+/g," ").trim();
const upper=(value:string)=>clean(value).toUpperCase();
const stockKey=(value:string)=>upper(value).replace(/\s+/g,"");

export function stockStatus(qty:number|null):StockStatus{
  if(qty==null)return"UNKNOWN";
  if(qty===0)return"OUT_OF_STOCK";
  if(qty<=2)return"LOW_STOCK";
  return"READY";
}

function capacityOf(value:string){
  const text=upper(value).replace(/\s+/g,"");
  const tb=text.match(/(?:^|[/\-])(1|2|4)TB(?:$|[/\-])/i)||text.match(/\b(1|2|4)TB\b/i);
  if(tb)return`${tb[1]}TB`;
  const gb=text.match(/(?:^|[/\-])(64|128|256|512)GB(?:$|[/\-])/i)||text.match(/\b(64|128|256|512)GB\b/i);
  return gb?`${gb[1]}GB`:"";
}

function connectivityOf(value:string){
  const text=upper(value);
  if(/CELL|CELLULAR|5G|WIFI\+CELL/.test(text))return"Wi‑Fi + Cellular";
  if(/WIFI|WI-FI/.test(text))return"Wi‑Fi";
  return"";
}

function sizeOf(value:string){
  const text=upper(value);
  const mm=text.match(/\b(40|41|42|44|45|46|49)MM\b/);
  if(mm)return`${mm[1]}mm`;
  const inch=text.match(/\b(11|12\.9|13|13\.3|13\.6|14|14\.2|15|15\.3|16|16\.2)\b/);
  return inch?inch[1]:"";
}

function chipOf(value:string){
  const text=upper(value);
  const chip=text.match(/\bM([1-9])(?:\s*(PRO|MAX|ULTRA))?\b/);
  return chip?`M${chip[1]}${chip[2]?` ${chip[2][0]}${chip[2].slice(1).toLowerCase()}`:""}`:"";
}

function friendlyModel(product:PromoProduct,groupTitle:string){
  const raw=clean(`${product.section} ${groupTitle}`);
  const text=upper(raw);

  const iphone=text.match(/IPHONE\s*(AIR|\d{2}(?:\s*(?:PRO MAX|PRO|PLUS|E))?)/);
  if(iphone)return`iPhone ${clean(iphone[1]).replace(/\b\w/g,x=>x.toUpperCase())}`;

  if(/\bMBA\b|MACBOOK AIR/.test(text)){
    const size=sizeOf(text),chip=chipOf(text);
    return clean(`MacBook Air${size?` ${size.replace(/\.\d+$/,'')}\"`:""}${chip?` ${chip}`:""}`);
  }
  if(/\bMBP\b|MACBOOK PRO/.test(text)){
    const size=sizeOf(text),chip=chipOf(text);
    return clean(`MacBook Pro${size?` ${size.replace(/\.\d+$/,'')}\"`:""}${chip?` ${chip}`:""}`);
  }
  if(/MACBOOK NEO|\bNEO\b/.test(text))return"MacBook Neo";
  if(/MAC MINI/.test(text))return clean(`Mac mini ${chipOf(text)}`);
  if(/IMAC/.test(text))return clean(`iMac ${chipOf(text)}`);

  if(/IPAD/.test(text)){
    const family=/IPAD PRO/.test(text)?"iPad Pro":/IPAD AIR/.test(text)?"iPad Air":/IPAD MINI/.test(text)?"iPad mini":"iPad";
    const size=sizeOf(text),chip=chipOf(text);
    return clean(`${family}${size?` ${size}\"`:""}${chip?` ${chip}`:""}`);
  }

  if(/WATCH|\bAW\b/.test(text)){
    if(/ULTRA/.test(text))return"Apple Watch Ultra";
    const series=text.match(/(?:SERIES|S)\s*(\d{1,2})/);
    if(series)return`Apple Watch Series ${series[1]}`;
    if(/\bSE\b/.test(text))return"Apple Watch SE";
    return"Apple Watch";
  }

  if(/AIRPODS/.test(text)){
    if(/MAX/.test(text))return"AirPods Max";
    if(/PRO/.test(text)){const gen=text.match(/PRO\s*(\d)/);return gen?`AirPods Pro ${gen[1]}`:"AirPods Pro";}
    if(/ANC/.test(text))return"AirPods 4 ANC";
    const gen=text.match(/AIRPODS\s*(\d)/);return gen?`AirPods ${gen[1]}`:"AirPods";
  }
  return clean(groupTitle).replace(/\s+-IND\d*$/i,"");
}

function lobOf(product:PromoProduct){
  if(product.category==="Apple Watch")return"Watch";
  return product.category;
}

function friendlyName(model:string,capacity:string,connectivity:string){
  return clean(`${model}${capacity?` ${capacity}`:""}${connectivity?` • ${connectivity}`:""}`);
}

export function buildPromoCatalog(products:PromoProduct[],sohRows:SohRow[]):PromoCatalogItem[]{
  const stock=new Map<string,SohRow>();
  for(const row of sohRows)stock.set(stockKey(row.article),row);
  return groupPromoProducts(products).map(group=>{
    const first=group.variants[0];
    const model=friendlyModel(first,group.title);
    const capacity=capacityOf(group.title)||capacityOf(first.sapDescription);
    const connectivity=connectivityOf(group.title)||connectivityOf(first.sapDescription);
    const stockVariants=group.variants.map(product=>{
      const row=stock.get(stockKey(product.sapArticle));
      const soh=row?Math.max(0,Number(row.qty||0)):null;
      return{product,soh,status:stockStatus(soh),description:row?.description||""};
    });
    const known=stockVariants.filter(x=>x.soh!=null);
    const totalSoh=known.length?known.reduce((sum,x)=>sum+Number(x.soh||0),0):null;
    return{
      key:group.key,
      lob:lobOf(first),
      model,
      capacity,
      connectivity,
      friendlyName:friendlyName(model,capacity,connectivity),
      group,
      totalSoh,
      stockStatus:stockStatus(totalSoh),
      stockVariants,
    };
  });
}

export function promoLobOrder(value:string){
  return["iPhone","iPad","Mac","Watch","AirPods","Accessories","Others"].indexOf(value);
}
