import type {PromoProduct} from "@/lib/promo-board-parser";
import type {PromoProductGroup} from "@/lib/promo-board-insights";

export type SohRow={article:string;description:string;qty:number;soldQty:number;category:string};
export type StockStatus="READY"|"LOW_STOCK"|"OUT_OF_STOCK"|"UNKNOWN";
export type StockCompleteness="COMPLETE"|"PARTIAL"|"UNKNOWN";

export type PromoSkuMeta={
  lob:string;
  model:string;
  generation:string;
  chip:string;
  size:string;
  capacity:string;
  connectivity:string;
  ram:string;
  configuration:string;
  color:string;
};

export type PromoStockVariant={
  product:PromoProduct;
  soh:number|null;
  status:StockStatus;
  description:string;
  color:string;
  meta:PromoSkuMeta;
};

export type PromoCatalogItem={
  key:string;
  lob:string;
  model:string;
  generation:string;
  chip:string;
  size:string;
  capacity:string;
  connectivity:string;
  ram:string;
  configuration:string;
  friendlyName:string;
  group:PromoProductGroup;
  totalSoh:number|null;
  stockStatus:StockStatus;
  stockCompleteness:StockCompleteness;
  matchedVariants:number;
  totalVariants:number;
  unknownVariants:number;
  stockVariants:PromoStockVariant[];
};

export type PromoAuditSummary={
  totalSku:number;
  duplicateSap:number;
  unknownLob:number;
  unknownModel:number;
  unknownCapacity:number;
  unknownColor:number;
  missingPrice:number;
  invalidPromoPeriod:number;
  sohMatched:number;
  sohUnmatched:number;
  warnings:string[];
};

const clean=(value:unknown)=>String(value??"").replace(/\s+/g," ").trim();
const upper=(value:unknown)=>clean(value).toUpperCase();
const title=(value:string)=>value.toLowerCase().replace(/\b\w/g,x=>x.toUpperCase());

// SAP matching remains exact in meaning. Only formatting separators are ignored.
export const promoStockKey=(value:string)=>upper(value).replace(/[^A-Z0-9]/g,"");

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
  const gb=text.match(/(?:^|[^0-9])(32|64|128|256|512)\s*G(?:B)?(?=$|[^0-9])/i);
  return gb?`${gb[1]}GB`:"";
}

function ipadSizeOf(value:string){
  const text=upper(value);
  const direct=text.match(/\b(11|12\.9|13)\s*(?:-?INCH|\")?\b/);
  return direct?direct[1]:"";
}

function macSizeOf(value:string){
  const text=upper(value);
  const match=text.match(/\b(?:MBA|MBP|MBN|MACBOOK(?:\s+(?:AIR|PRO|NEO))?)\s*(13(?:\.3|\.6)?|14(?:\.2)?|15(?:\.3)?|16(?:\.2)?)\b/);
  if(!match)return"";
  const n=Number(match[1]);
  if(n>=12.5&&n<14)return"13";
  if(n>=14&&n<15)return"14";
  if(n>=15&&n<16)return"15";
  if(n>=16&&n<17)return"16";
  return match[1];
}

function watchSizeOf(value:string){
  const text=upper(value);
  const match=text.match(/\b(40|41|42|44|45|46|49)(?:\s*MM)?\b/);
  return match?`${match[1]}mm`:"";
}

function chipOf(value:string){
  const text=upper(value).replace(/\s*\/\s*/g,"/");
  const apple=text.match(/\bM([1-9])(?:[ /-]*(PRO|MAX|ULTRA))?\b/);
  if(apple){
    const suffix=apple[2]?` ${apple[2][0]}${apple[2].slice(1).toLowerCase()}`:"";
    return`M${apple[1]}${suffix}`;
  }
  if(/\bA17(?:\s+PRO)?\b/.test(text))return"A17 Pro";
  if(/\bA16\b/.test(text))return"A16";
  return"";
}

function ramOf(value:string){
  const text=upper(value);
  const slash=text.match(/\/(8|16|18|24|32|36|48|64|96|128)G(?:B)?(?:\/|\s|$)/);
  if(slash)return`${slash[1]}GB`;
  const beforeStorage=text.match(/\b(8|16|18|24|32|36|48|64|96|128)\s*GB(?=\s*\/\s*(?:256|512|1T|2T))/);
  return beforeStorage?`${beforeStorage[1]}GB`:"";
}

function computeConfig(value:string){
  const text=upper(value);
  const cpu=text.match(/\b(\d{1,2})C(?:\s*CPU)?\b/);
  const gpu=text.match(/\b(\d{1,2})C\s*(?:GPU|GP)\b/);
  const bits:string[]=[];
  if(cpu)bits.push(`${cpu[1]}C CPU`);
  if(gpu)bits.push(`${gpu[1]}C GPU`);
  return bits.join(" • ");
}

function connectivityOf(value:string,lob:string){
  const text=upper(value).replace(/\s+/g," ");
  if(lob==="iPad"){
    if(/WI-?FI\s*\+\s*CELLULAR|WIFI\s*\+\s*CELLULAR|\bWF\s*CL\b|\bWIFI\s*CL\b|\bWI-?FI\s+CELL(?:ULAR)?\b|\bCELLULAR\b/.test(text))return"Wi‑Fi + Cellular";
    if(/\bWI-?FI\b|\bWIFI\b|\bWF\b/.test(text))return"Wi‑Fi";
  }
  if(lob==="Watch"){
    if(/GPS\s*[+/&-]\s*(?:CELL|CELLULAR)|\bCELLULAR\b|\bLTE\b/.test(text))return"GPS + Cellular";
    if(/\bGPS\b/.test(text))return"GPS";
  }
  return"";
}

function inferLob(product:PromoProduct){
  const description=upper(product.sapDescription);
  const section=upper(product.section);
  const category=upper(product.category);
  const detect=(text:string)=>{
    if(/IPHONE|\bIP\s*1[0-9]\b|\bIP1[0-9]\b/.test(text))return"iPhone";
    if(/IPAD/.test(text))return"iPad";
    if(/AIRPODS/.test(text))return"AirPods";
    if(/\bMBA\b|\bMBP\b|\bMBN\b|MACBOOK|IMAC|MAC MINI|MAC STUDIO/.test(text))return"Mac";
    if(/APPLE WATCH|\bWATCH\b|\bAW\s*(?:SE|S?\d|ULTRA)/.test(text))return"Watch";
    return"";
  };
  return detect(description)||detect(section)||detect(category)||"Others";
}

function parseIphoneModel(value:string){
  const text=upper(value);
  if(/IPHONE\s+AIR\b/.test(text))return"iPhone Air";
  const match=text.match(/IPHONE\s*(1[0-9])\s*(PRO\s*MAX|PRO|PLUS|E)?\b/)||text.match(/\bIP\s*(1[0-9])\s*(PRO\s*MAX|PRO|PLUS|E)?\b/);
  if(!match)return"";
  const series=match[1];
  const suffix=(match[2]||"").replace(/\s+/g," ").toUpperCase();
  if(suffix==="PRO MAX")return`iPhone ${series} Pro Max`;
  if(suffix==="PRO")return`iPhone ${series} Pro`;
  if(suffix==="PLUS")return`iPhone ${series} Plus`;
  if(suffix==="E")return`iPhone ${series}e`;
  return`iPhone ${series}`;
}

function parseIpadModel(product:PromoProduct){
  const d=upper(product.sapDescription),s=upper(product.section),text=`${d} ${s}`;
  const size=ipadSizeOf(d)||ipadSizeOf(s);
  const chip=chipOf(d)||chipOf(s);

  if(/IPAD MINI/.test(text)){
    const generation=/\bA17\b|MINI\s*7|A17\s*PRO/.test(text)?"A17 Pro":"";
    return{model:clean(`iPad mini${generation?` ${generation}`:""}`),generation,chip:generation||chip,size:""};
  }
  if(/IPAD AIR/.test(text)){
    if(/5TH\s*GEN|IPAD\s*AIR\s*5\b/.test(text))return{model:"iPad Air 5",generation:"5",chip:"",size:""};
    const generation=chip||(/\bM2\b/.test(s)?"M2":/\bM3\b/.test(s)?"M3":/\bM4\b/.test(s)?"M4":"");
    return{model:clean(`iPad Air${size?` ${size}`:""}${generation?` ${generation}`:""}`),generation,chip:generation,size};
  }
  if(/IPAD PRO/.test(text)){
    const generation=chip||(/\bM2\b/.test(s)?"M2":/\bM4\b/.test(s)?"M4":/\bM5\b/.test(s)?"M5":"");
    return{model:clean(`iPad Pro${size?` ${size}`:""}${generation?` ${generation}`:""}`),generation,chip:generation,size};
  }

  if(/\b9TH\b|GEN\s*9/.test(text))return{model:"iPad Gen 9",generation:"Gen 9",chip:"",size:""};
  if(/\b10TH\b|GEN\s*10/.test(text))return{model:"iPad Gen 10",generation:"Gen 10",chip:"",size:""};
  if(/A16|11TH/.test(s)||(/11-?INCH\s+IPAD/.test(d)&&/A16/.test(s)))return{model:"iPad 11 A16",generation:"A16",chip:"A16",size:"11"};
  return{model:"iPad",generation:"",chip:"",size};
}

function parseWatchModel(product:PromoProduct){
  const d=upper(product.sapDescription),s=upper(product.section),text=`${d} ${s}`;
  const ultra=d.match(/ULTRA\s*([23])\b/)||s.match(/ULTRA\s*([23])\b/);
  if(ultra)return{model:`Apple Watch Ultra ${ultra[1]}`,generation:`Ultra ${ultra[1]}`};
  const se=d.match(/APPLE WATCH\s+SE\s*(\d)?\b/)||s.match(/(?:WATCH|AW)\s*SE(?:\s*GEN)?\s*(\d)?\b/);
  if(se){const gen=se[1]||(/GEN\s*2|SE2/.test(s)?"2":"");return{model:clean(`Apple Watch SE${gen?` ${gen}`:""}`),generation:gen?`SE ${gen}`:"SE"};}
  const series=d.match(/APPLE WATCH\s*(9|10|11)\b/)||s.match(/(?:APPLE WATCH|WATCH|AW)\s*(?:S)?(9|10|11)(?:TH)?\b/);
  if(series)return{model:`Apple Watch Series ${series[1]}`,generation:`Series ${series[1]}`};
  if(/WATCH\s*S9|AW\s*S9/.test(s))return{model:"Apple Watch Series 9",generation:"Series 9"};
  return{model:"Apple Watch",generation:""};
}

function parseMacModel(product:PromoProduct){
  const d=upper(product.sapDescription),s=upper(product.section),text=`${d} ${s}`;
  const size=macSizeOf(d)||macSizeOf(s);
  const chip=chipOf(d)||chipOf(s);
  if(/\bMBN\b|MACBOOK\s+NEO|\bNEO\b/.test(text))return{model:clean(`MacBook Neo${size?` ${size}`:""}`),generation:"Neo",chip:"",size};
  if(/\bMBA\b|MACBOOK\s+AIR/.test(text))return{model:clean(`MacBook Air${size?` ${size}`:""}${chip?` ${chip}`:""}`),generation:chip,chip,size};
  if(/\bMBP\b|MACBOOK\s+PRO/.test(text))return{model:clean(`MacBook Pro${size?` ${size}`:""}${chip?` ${chip}`:""}`),generation:chip,chip,size};
  if(/MAC MINI/.test(text))return{model:clean(`Mac mini${chip?` ${chip}`:""}`),generation:chip,chip,size:""};
  if(/MAC STUDIO/.test(text))return{model:clean(`Mac Studio${chip?` ${chip}`:""}`),generation:chip,chip,size:""};
  if(/IMAC/.test(text))return{model:clean(`iMac${chip?` ${chip}`:""}`),generation:chip,chip,size:""};
  return{model:"Mac",generation:chip,chip,size};
}

function parseAirPodsModel(product:PromoProduct){
  const text=upper(`${product.sapDescription} ${product.section}`);
  if(/AIRPODS\s+MAX/.test(text))return"AirPods Max";
  if(/AIRPODS\s+PRO\s*3|PRO\s*3/.test(text))return"AirPods Pro 3";
  if(/AIRPODS\s+PRO/.test(text))return"AirPods Pro";
  if(/AIRPODS\s*4.*ANC|ANC.*AIRPODS\s*4/.test(text))return"AirPods 4 ANC";
  if(/AIRPODS\s*4/.test(text))return"AirPods 4";
  const gen=text.match(/AIRPODS\s*(\d)/);
  return gen?`AirPods ${gen[1]}`:"AirPods";
}

function watchColorOf(value:string){
  const text=upper(value);
  if(/\b(?:NT\s+TI|N\s*T\s+B\/BB|NATURAL\s+TI|NATURAL TITANIUM)\b/.test(text))return"Natural Titanium";
  if(/\b(?:BLACK\s+TI|BK\s+TI|BLACK TITANIUM)\b/.test(text))return"Black Titanium";
  const sizeIndex=text.search(/\b(?:40|41|42|44|45|46|49)\b/);
  const tail=sizeIndex>=0?text.slice(sizeIndex).replace(/^\d+\s*/,""):text;
  const token=tail.split(/[\s/]+/).filter(Boolean)[0]||"";
  const map:Record<string,string>={JB:"Jet Black",SG:"Space Gray",RG:"Rose Gold",SI:"Silver",ST:"Starlight",S:"Starlight",MI:"Midnight",M:"Midnight",BK:"Black",NT:"Natural Titanium",TI:"Titanium"};
  return map[token]||"Unknown Color";
}

function genericColorOf(value:string,lob:string){
  if(lob==="Watch")return watchColorOf(value);
  const text=upper(value).replace(/\s+/g," ");
  const colors:[RegExp,string][]=[
    [/COSMIC ORANGE/,"Cosmic Orange"],[/DEEP BLUE/,"Deep Blue"],[/MIST BLUE/,"Mist Blue"],[/CLOUD WHITE/,"Cloud White"],[/LIGHT GOLD/,"Light Gold"],[/SOFT PINK/,"Soft Pink"],
    [/DESERT TITANIUM/,"Desert Titanium"],[/NATURAL TITANIUM/,"Natural Titanium"],[/WHITE TITANIUM/,"White Titanium"],[/BLACK TITANIUM/,"Black Titanium"],
    [/SPACE BLACK|\bSP BLK\b|\bSB\b/,"Space Black"],[/SPACE GR(?:E|A)Y|\bSPG\b|\bGRY\b/,"Space Grey"],[/ROSE GOLD/,"Rose Gold"],[/SKY BLUE|\bSKY\b/,"Sky Blue"],
    [/ULTRAMARINE/,"Ultramarine"],[/LAVENDER/,"Lavender"],[/SAGE/,"Sage"],[/TEAL/,"Teal"],[/INDIGO|\bIND\b/,"Indigo"],[/CITRUS|\bCIT\b/,"Citrus"],[/BLUSH|\bBLS\b/,"Blush"],
    [/STARLIGHT|\bSTL\b|\bST\b/,"Starlight"],[/MIDNIGHT|\bMDN\b|\bMD\b/,"Midnight"],[/SILVER|\bSLV\b|\bSL\b/,"Silver"],
    [/BLACK|\bBLK\b/,"Black"],[/WHITE|\bWHT\b/,"White"],[/BLUE|\bBLU\b/,"Blue"],[/PINK|\bPNK\b/,"Pink"],[/PURPLE|\bPUR\b/,"Purple"],
    [/NATURAL|\bNAT\b/,"Natural"],[/GOLD|\bGLD\b/,"Gold"],[/GREEN|\bGRN\b/,"Green"],[/YELLOW/,"Yellow"],[/ORANGE/,"Orange"],[/RED/,"Red"]
  ];
  const known=colors.find(([regex])=>regex.test(text))?.[1];
  if(known)return known;

  // iPad descriptions often place color after a hyphen. Use that only as a controlled fallback.
  const afterDash=text.match(/\s-\s([A-Z ]+?)(?:\s+\d+(?:TH)?|\s*$)/)?.[1]?.trim();
  if(afterDash&&afterDash.length<=24)return title(afterDash);
  return"Unknown Color";
}

export function parsePromoSku(product:PromoProduct):PromoSkuMeta{
  const lob=inferLob(product);
  const description=product.sapDescription;
  const section=product.section;
  let model="Unknown Model",generation="",chip="",size="";
  if(lob==="iPhone"){
    model=parseIphoneModel(description)||parseIphoneModel(section)||"Unknown Model";
  }else if(lob==="iPad"){
    const parsed=parseIpadModel(product);model=parsed.model;generation=parsed.generation;chip=parsed.chip;size=parsed.size;
  }else if(lob==="Watch"){
    const parsed=parseWatchModel(product);model=parsed.model;generation=parsed.generation;size=watchSizeOf(description)||watchSizeOf(section);
  }else if(lob==="Mac"){
    const parsed=parseMacModel(product);model=parsed.model;generation=parsed.generation;chip=parsed.chip;size=parsed.size;
  }else if(lob==="AirPods"){
    model=parseAirPodsModel(product);
  }

  const capacity=capacityOf(description)||capacityOf(section);
  const connectivity=connectivityOf(description,lob)||connectivityOf(section,lob);
  const ram=lob==="Mac"?ramOf(description):"";
  const configuration=lob==="Mac"?computeConfig(description):"";
  const color=lob==="AirPods"?"":genericColorOf(description,lob);
  return{lob,model,generation,chip,size,capacity,connectivity,ram,configuration,color};
}

function friendlyName(meta:PromoSkuMeta){
  const config=[meta.capacity,meta.connectivity,meta.ram,meta.configuration].filter(Boolean).join(" • ");
  return clean(`${meta.model}${config?` • ${config}`:""}`);
}

function makeGroup(key:string,titleText:string,product:PromoProduct):PromoProductGroup{
  return{
    key,
    title:titleText,
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

function stockMap(sohRows:SohRow[]){
  const map=new Map<string,SohRow>();
  for(const row of sohRows){
    const k=promoStockKey(row.article);
    if(k)map.set(k,row);
  }
  return map;
}

export function buildPromoCatalog(products:PromoProduct[],sohRows:SohRow[]):PromoCatalogItem[]{
  const stock=stockMap(sohRows);
  const groups=new Map<string,{meta:PromoSkuMeta;group:PromoProductGroup}>();

  for(const product of products){
    const meta=parsePromoSku(product);
    const key=[
      meta.lob,meta.model,meta.size,meta.capacity,meta.connectivity,meta.ram,meta.configuration,
      product.normalPrice,product.promotionPrice,
      product.promoStartDate??"",product.promoEndDate??"",product.promoPeriodType,product.promoStatus,
    ].join("|");
    const existing=groups.get(key);
    if(existing){existing.group.variants.push(product);continue;}
    groups.set(key,{meta,group:makeGroup(key,friendlyName(meta),product)});
  }

  return[...groups.values()].map(({meta,group})=>{
    const stockVariants:PromoStockVariant[]=group.variants.map(product=>{
      const skuMeta=parsePromoSku(product);
      const row=stock.get(promoStockKey(product.sapArticle));
      const soh=row?Math.max(0,Number(row.qty||0)):null;
      return{product,soh,status:stockStatus(soh),description:row?.description||"",color:skuMeta.color,meta:skuMeta};
    });
    const totalVariants=stockVariants.length;
    const matchedVariants=stockVariants.filter(v=>v.soh!=null).length;
    const unknownVariants=totalVariants-matchedVariants;
    const stockCompleteness:StockCompleteness=matchedVariants===0?"UNKNOWN":matchedVariants===totalVariants?"COMPLETE":"PARTIAL";
    const totalSoh=matchedVariants?stockVariants.reduce((sum,v)=>sum+Number(v.soh??0),0):null;
    return{
      key:group.key,
      lob:meta.lob,model:meta.model,generation:meta.generation,chip:meta.chip,size:meta.size,capacity:meta.capacity,connectivity:meta.connectivity,ram:meta.ram,configuration:meta.configuration,
      friendlyName:friendlyName(meta),group,totalSoh,
      stockStatus:stockCompleteness==="COMPLETE"?stockStatus(totalSoh):"UNKNOWN",
      stockCompleteness,matchedVariants,totalVariants,unknownVariants,stockVariants,
    };
  }).sort((a,b)=>{
    const lobDiff=promoLobOrder(a.lob)-promoLobOrder(b.lob);if(lobDiff)return lobDiff;
    const modelDiff=a.model.localeCompare(b.model,undefined,{numeric:true});if(modelDiff)return modelDiff;
    const sizeDiff=a.size.localeCompare(b.size,undefined,{numeric:true});if(sizeDiff)return sizeDiff;
    return a.capacity.localeCompare(b.capacity,undefined,{numeric:true});
  });
}

export function auditPromoProducts(products:PromoProduct[],sohRows:SohRow[]):PromoAuditSummary{
  const stock=stockMap(sohRows);
  const sapCount=new Map<string,number>();
  let unknownLob=0,unknownModel=0,unknownCapacity=0,unknownColor=0,missingPrice=0,invalidPromoPeriod=0,sohMatched=0,sohUnmatched=0;
  const warnings:string[]=[];

  for(const product of products){
    const key=promoStockKey(product.sapArticle);
    sapCount.set(key,(sapCount.get(key)||0)+1);
    const meta=parsePromoSku(product);
    if(meta.lob==="Others"){unknownLob++;if(warnings.length<30)warnings.push(`LOB tidak terbaca: ${product.sapArticle} • ${product.sapDescription}`);}
    if(meta.model==="Unknown Model"||["iPad","Mac","Apple Watch","AirPods"].includes(meta.model)){unknownModel++;if(warnings.length<30)warnings.push(`Model perlu diperiksa: ${product.sapArticle} • ${product.sapDescription}`);}
    if(["iPhone","iPad","Mac"].includes(meta.lob)&&!meta.capacity){unknownCapacity++;if(warnings.length<30)warnings.push(`Capacity tidak terbaca: ${product.sapArticle} • ${product.sapDescription}`);}
    if(!["AirPods","Others"].includes(meta.lob)&&meta.color==="Unknown Color"){unknownColor++;if(warnings.length<30)warnings.push(`Warna tidak terbaca: ${product.sapArticle} • ${product.sapDescription}`);}
    if(product.normalPrice<=0&&product.promotionPrice<=0)missingPrice++;
    if(product.remarks&&product.promoPeriodType==="UNKNOWN")invalidPromoPeriod++;
    if(stock.has(key))sohMatched++;else sohUnmatched++;
  }
  const duplicateSap=[...sapCount.values()].filter(count=>count>1).length;
  return{totalSku:products.length,duplicateSap,unknownLob,unknownModel,unknownCapacity,unknownColor,missingPrice,invalidPromoPeriod,sohMatched,sohUnmatched,warnings};
}

export function promoLobOrder(value:string){
  const index=["iPhone","iPad","Mac","Watch","AirPods","Accessories","Others"].indexOf(value);
  return index<0?999:index;
}
