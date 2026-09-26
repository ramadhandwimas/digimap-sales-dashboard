import type {PromoProduct} from "@/lib/promo-board-parser";
import type {PromoProductGroup} from "@/lib/promo-board-insights";

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

const clean=(value:string)=>String(value??"").replace(/\s+/g," ").trim();
const upper=(value:string)=>clean(value).toUpperCase();

// Keep SAP matching exact in meaning, but ignore formatting differences such as spaces, / and -.
const stockKey=(value:string)=>upper(value).replace(/[^A-Z0-9]/g,"");

export function stockStatus(qty:number|null):StockStatus{
  if(qty==null)return"UNKNOWN";
  if(qty===0)return"OUT_OF_STOCK";
  if(qty<=2)return"LOW_STOCK";
  return"READY";
}

function capacityOf(value:string){
  const text=upper(value);
  const tb=text.match(/(?:^|[^0-9])(1|2|4)\s*T(?:B)?(?=$|[^0-9])/i);
  if(tb)return`${tb[1]}TB`;
  const gb=text.match(/(?:^|[^0-9])(64|128|256|512)\s*G(?:B)?(?=$|[^0-9])/i);
  return gb?`${gb[1]}GB`:"";
}

function connectivityOf(value:string){
  const text=upper(value).replace(/\s+/g," ");
  if(/CELL|CELLULAR|5G|WIFI\s*[+/&-]\s*CELL|WI-FI\s*[+/&-]\s*CELL/.test(text))return"Wi‑Fi + Cellular";
  if(/WIFI|WI-FI/.test(text))return"Wi‑Fi";
  return"";
}

function sizeOf(value:string){
  const text=upper(value);
  const mm=text.match(/\b(40|41|42|44|45|46|49)\s*MM\b/);
  if(mm)return`${mm[1]}mm`;
  const inch=text.match(/\b(11|12\.9|13|13\.3|13\.6|14|14\.2|15|15\.3|16|16\.2)\b/);
  return inch?inch[1]:"";
}

function chipOf(value:string){
  const text=upper(value);
  const chip=text.match(/\bM([1-9])(?:\s*(PRO|MAX|ULTRA))?\b/);
  return chip?`M${chip[1]}${chip[2]?` ${chip[2][0]}${chip[2].slice(1).toLowerCase()}`:""}`:"";
}

function inferLob(product:PromoProduct){
  const text=upper(`${product.section} ${product.sapDescription} ${product.category}`);
  if(/IPHONE|\bIP\s*1[0-9]\b|\bIP1[0-9]\b/.test(text))return"iPhone";
  if(/IPAD/.test(text))return"iPad";
  if(/AIRPODS/.test(text))return"AirPods";
  if(/APPLE WATCH|\bWATCH\b|\bAW\s*(?:SE|S?\d|ULTRA)/.test(text))return"Watch";
  if(/MACBOOK|\bMBA\b|\bMBP\b|\bMB\s*(?:AIR|PRO)\b|IMAC|MAC MINI|\bMAC\b/.test(text))return"Mac";
  if(product.category==="Apple Watch")return"Watch";
  if(["iPhone","iPad","Mac","AirPods"].includes(product.category))return product.category;
  return product.category||"Others";
}

function friendlyModel(product:PromoProduct){
  const text=upper(`${product.section} ${product.sapDescription}`);

  let iphone=text.match(/IPHONE\s*(AIR|\d{2}(?:\s*(?:PRO MAX|PRO|PLUS|E))?)/);
  if(!iphone){
    const short=text.match(/\bIP\s*(1[0-9])\s*(PRO MAX|PRO|PLUS|E)?\b/);
    if(short)iphone=[short[0],clean(`${short[1]}${short[2]?` ${short[2]}`:""}`)] as RegExpMatchArray;
  }
  if(iphone)return`iPhone ${clean(iphone[1]).toLowerCase()==="air"?"Air":clean(iphone[1]).replace(/\b\w/g,x=>x.toUpperCase())}`;

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
    const series=text.match(/(?:SERIES|\bS)\s*(\d{1,2})/);
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

  return clean(product.section||product.sapDescription).replace(/\s+-IND\d*$/i,"");
}

function friendlyName(model:string,capacity:string,connectivity:string){
  return clean(`${model}${capacity?` ${capacity}`:""}${connectivity?` • ${connectivity}`:""}`);
}

function makeGroup(key:string,title:string,product:PromoProduct):PromoProductGroup{
  return{
    key,
    title,
    category:product.category,
    normalPrice:product.normalPrice,
    promotionPrice:product.promotionPrice,
    savingAmount:product.savingAmount,
    discountPercentage:product.discountPercentage,
    promoStartDate:product.promoStartDate,
    promoEndDate:product.promoEndDate,
    promoPeriodType:product.promoPeriodType,
    promoStatus:product.promoStatus,
    daysRemaining:product.daysRemaining,
    remarks:product.remarks,
    variants:[product],
  };
}

export function buildPromoCatalog(products:PromoProduct[],sohRows:SohRow[]):PromoCatalogItem[]{
  const stock=new Map<string,SohRow>();
  for(const row of sohRows){
    const key=stockKey(row.article);
    if(key)stock.set(key,row);
  }

  // Group by what staff actually selects: LOB + model + capacity/config + same price + same promo period.
  // Color/SKU becomes a variant. This prevents identical iPhone cards from being split only by color text.
  const groups=new Map<string,{lob:string;model:string;capacity:string;connectivity:string;group:PromoProductGroup}>();

  for(const product of products){
    const lob=inferLob(product);
    const model=friendlyModel(product);
    const sourceText=`${product.section} ${product.sapDescription}`;
    const capacity=capacityOf(sourceText);
    const connectivity=connectivityOf(sourceText);
    const key=[
      lob,model,capacity,connectivity,
      product.normalPrice,product.promotionPrice,
      product.promoStartDate??"",product.promoEndDate??"",
      product.promoPeriodType,product.promoStatus,
    ].join("|");

    const existing=groups.get(key);
    if(existing){
      existing.group.variants.push(product);
      continue;
    }
    groups.set(key,{lob,model,capacity,connectivity,group:makeGroup(key,friendlyName(model,capacity,connectivity),product)});
  }

  return [...groups.values()].map(({lob,model,capacity,connectivity,group})=>{
    const stockVariants=group.variants.map(product=>{
      const row=stock.get(stockKey(product.sapArticle));
      const soh=row?Math.max(0,Number(row.qty||0)):null;
      return{product,soh,status:stockStatus(soh),description:row?.description||""};
    });
    const known=stockVariants.filter(x=>x.soh!=null);
    const totalSoh=known.length?known.reduce((sum,x)=>sum+Number(x.soh||0),0):null;
    return{
      key:group.key,
      lob,
      model,
      capacity,
      connectivity,
      friendlyName:friendlyName(model,capacity,connectivity),
      group,
      totalSoh,
      stockStatus:stockStatus(totalSoh),
      stockVariants,
    };
  }).sort((a,b)=>{
    const lobDiff=promoLobOrder(a.lob)-promoLobOrder(b.lob);
    if(lobDiff)return lobDiff;
    const modelDiff=a.model.localeCompare(b.model);
    if(modelDiff)return modelDiff;
    return a.capacity.localeCompare(b.capacity,undefined,{numeric:true});
  });
}

export function promoLobOrder(value:string){
  const index=["iPhone","iPad","Mac","Watch","AirPods","Accessories","Others"].indexOf(value);
  return index<0?999:index;
}
