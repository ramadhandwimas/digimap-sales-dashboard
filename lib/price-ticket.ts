import type {PromoProduct} from "@/lib/promo-board-parser";
import {parsePromoSku} from "@/lib/promo-board-catalog";

export type TicketMatch={
  model:string;
  capacity?:string;
  connectivity?:string;
  ram?:string;
  size?:string;
  chip?:string;
};

export type TicketPriceSlot={
  id:string;
  label:string;
  oldFullPrice:number;
  match:TicketMatch;
};

export type PriceTicketTemplate={
  id:string;
  title:string;
  subtitle:string;
  masterFile:string;
  pdfFile:string;
  previewFile:string;
  slots:TicketPriceSlot[];
};

const slot=(id:string,label:string,oldFullPrice:number,match:TicketMatch):TicketPriceSlot=>({id,label,oldFullPrice,match});

export const PRICE_TICKETS:PriceTicketTemplate[]=[
  {id:"iphone-18-pro-max",title:"iPhone 18 Pro Max",subtitle:"256 GB sampai 2 TB",masterFile:"iphone-18-pro-max.docx",pdfFile:"iphone-18-pro-max.pdf",previewFile:"iphone-18-pro-max.png",slots:[
    slot("256","256 GB",29_499_000,{model:"iPhone 18 Pro Max",capacity:"256GB"}),slot("512","512 GB",34_499_000,{model:"iPhone 18 Pro Max",capacity:"512GB"}),slot("1tb","1 TB",43_999_000,{model:"iPhone 18 Pro Max",capacity:"1TB"}),slot("2tb","2 TB",57_999_000,{model:"iPhone 18 Pro Max",capacity:"2TB"}),
  ]},
  {id:"iphone-duo",title:"iPhone Duo",subtitle:"256 GB sampai 2 TB",masterFile:"iphone-duo.docx",pdfFile:"iphone-duo.pdf",previewFile:"iphone-duo.png",slots:[
    slot("256","256 GB",46_499_000,{model:"iPhone Duo",capacity:"256GB"}),slot("512","512 GB",51_499_000,{model:"iPhone Duo",capacity:"512GB"}),slot("1tb","1 TB",60_499_000,{model:"iPhone Duo",capacity:"1TB"}),slot("2tb","2 TB",74_999_000,{model:"iPhone Duo",capacity:"2TB"}),
  ]},
  {id:"iphone-17-pro-max",title:"iPhone 17 Pro Max",subtitle:"256 GB sampai 2 TB",masterFile:"iphone-17-pro-max.docx",pdfFile:"iphone-17-pro-max.pdf",previewFile:"iphone-17-pro-max.png",slots:[
    slot("256","256 GB",24_799_000,{model:"iPhone 17 Pro Max",capacity:"256GB"}),slot("512","512 GB",29_299_000,{model:"iPhone 17 Pro Max",capacity:"512GB"}),slot("1tb","1 TB",34_049_000,{model:"iPhone 17 Pro Max",capacity:"1TB"}),slot("2tb","2 TB",43_049_000,{model:"iPhone 17 Pro Max",capacity:"2TB"}),
  ]},
  {id:"iphone-17e",title:"iPhone 17e",subtitle:"256 GB dan 512 GB",masterFile:"iphone-17e.docx",pdfFile:"iphone-17e.pdf",previewFile:"iphone-17e.png",slots:[
    slot("256","256 GB",15_999_000,{model:"iPhone 17e",capacity:"256GB"}),slot("512","512 GB",20_499_000,{model:"iPhone 17e",capacity:"512GB"}),
  ]},
  {id:"iphone-15",title:"iPhone 15",subtitle:"128 GB dan 256 GB",masterFile:"iphone-15.docx",pdfFile:"iphone-15.pdf",previewFile:"iphone-15.png",slots:[
    slot("128","128 GB",14_999_000,{model:"iPhone 15",capacity:"128GB"}),slot("256","256 GB",15_499_000,{model:"iPhone 15",capacity:"256GB"}),
  ]},
  {id:"macbook-neo",title:"MacBook Neo",subtitle:"256 GB dan 512 GB",masterFile:"macbook-neo.docx",pdfFile:"macbook-neo.pdf",previewFile:"macbook-neo.png",slots:[
    slot("256","256 GB",12_999_000,{model:"MacBook Neo",capacity:"256GB"}),slot("512","512 GB",15_249_000,{model:"MacBook Neo",capacity:"512GB"}),
  ]},
  {id:"macbook-air-15-m5",title:"MacBook Air 15 inci M5",subtitle:"3 konfigurasi",masterFile:"macbook-air-15-m5.docx",pdfFile:"macbook-air-15-m5.pdf",previewFile:"macbook-air-15-m5.png",slots:[
    slot("16-512","16 GB / 512 GB",27_499_000,{model:"MacBook Air 15 M5",ram:"16GB",capacity:"512GB"}),slot("16-1tb","16 GB / 1 TB",33_999_000,{model:"MacBook Air 15 M5",ram:"16GB",capacity:"1TB"}),slot("24-1tb","24 GB / 1 TB",37_999_000,{model:"MacBook Air 15 M5",ram:"24GB",capacity:"1TB"}),
  ]},
  {id:"macbook-pro-16-m5",title:"MacBook Pro 16 inci M5",subtitle:"M5 Pro dan M5 Max",masterFile:"macbook-pro-16-m5.docx",pdfFile:"macbook-pro-16-m5.pdf",previewFile:"macbook-pro-16-m5.png",slots:[
    slot("pro-24","M5 Pro / 24 GB / 1 TB",58_499_000,{model:"MacBook Pro 16 M5 Pro",ram:"24GB",capacity:"1TB"}),slot("pro-48","M5 Pro / 48 GB / 1 TB",70_999_000,{model:"MacBook Pro 16 M5 Pro",ram:"48GB",capacity:"1TB"}),slot("max-36","M5 Max / 36 GB / 2 TB",86_999_000,{model:"MacBook Pro 16 M5 Max",ram:"36GB",capacity:"2TB"}),slot("max-48","M5 Max / 48 GB / 2 TB",98_999_000,{model:"MacBook Pro 16 M5 Max",ram:"48GB",capacity:"2TB"}),
  ]},
  {id:"ipad-13",title:"iPad Air M4 & iPad Pro M5 13 inci",subtitle:"Wi-Fi dan Cellular",masterFile:"ipad-13.docx",pdfFile:"ipad-13.pdf",previewFile:"ipad-13.png",slots:[
    ...[["128","128GB",18_999_000,22_199_000],["256","256GB",21_199_000,24_199_000],["512","512GB",24_999_000,28_199_000],["1tb","1TB",31_499_000,34_699_000]].flatMap(([id,capacity,wifi,cell])=>[
      slot(`air-${id}-wifi`,`iPad Air M4 13 ${String(capacity)} Wi-Fi`,Number(wifi),{model:"iPad Air 13 M4",capacity:String(capacity),connectivity:"Wi‑Fi"}),
      slot(`air-${id}-cell`,`iPad Air M4 13 ${String(capacity)} Cellular`,Number(cell),{model:"iPad Air 13 M4",capacity:String(capacity),connectivity:"Wi‑Fi + Cellular"}),
    ]),
    ...[["256","256GB",31_999_000,35_999_000],["512","512GB",39_499_000,43_999_000],["1tb","1TB",47_999_000,53_999_000],["2tb","2TB",58_499_000,0]].flatMap(([id,capacity,wifi,cell])=>[
      slot(`pro-${id}-wifi`,`iPad Pro M5 13 ${String(capacity)} Wi-Fi`,Number(wifi),{model:"iPad Pro 13 M5",capacity:String(capacity),connectivity:"Wi‑Fi"}),
      ...(Number(cell)>0?[slot(`pro-${id}-cell`,`iPad Pro M5 13 ${String(capacity)} Cellular`,Number(cell),{model:"iPad Pro 13 M5",capacity:String(capacity),connectivity:"Wi‑Fi + Cellular"})]:[]),
    ]),
  ]},
  {id:"apple-watch",title:"Apple Watch Ultra 4, Series 12 & SE 3",subtitle:"Semua ukuran pada master asli",masterFile:"apple-watch.docx",pdfFile:"apple-watch.pdf",previewFile:"apple-watch.png",slots:[
    slot("ultra-49","Ultra 4 49 mm",16_499_000,{model:"Apple Watch Ultra 4",size:"49mm"}),slot("series-42","Series 12 42 mm",7_199_000,{model:"Apple Watch Series 12",size:"42mm"}),slot("series-46","Series 12 46 mm",8_199_000,{model:"Apple Watch Series 12",size:"46mm"}),slot("se-40","SE 3 40 mm",4_699_000,{model:"Apple Watch SE 3",size:"40mm"}),slot("se-44","SE 3 44 mm",5_299_000,{model:"Apple Watch SE 3",size:"44mm"}),
  ]},
];

export type TicketSlotResult=TicketPriceSlot&{status:"CURRENT"|"CHANGED"|"MISSING"|"CONFLICT";currentFullPrice:number|null;articles:string[]};
export type TicketSyncResult=PriceTicketTemplate&{status:"CURRENT"|"CHANGED"|"BLOCKED";slots:TicketSlotResult[];changedCount:number;warningCount:number};

const same=(actual:string,expected:string)=>actual.toLowerCase()===expected.toLowerCase();
function matches(product:PromoProduct,match:TicketMatch){
  const meta=parsePromoSku(product);
  if(!same(meta.model,match.model))return false;
  if(match.capacity&&!same(meta.capacity,match.capacity))return false;
  if(match.connectivity&&!same(meta.connectivity,match.connectivity))return false;
  if(match.ram&&!same(meta.ram,match.ram))return false;
  if(match.size&&!same(meta.size,match.size))return false;
  if(match.chip&&!same(meta.chip,match.chip))return false;
  return true;
}

export function resolvePriceTickets(products:PromoProduct[]):TicketSyncResult[]{
  return PRICE_TICKETS.map(ticket=>{
    const slots=ticket.slots.map<TicketSlotResult>(source=>{
      const found=products.filter(product=>matches(product,source.match)&&product.normalPrice>0);
      const prices=[...new Set(found.map(product=>product.normalPrice))];
      if(!found.length)return{...source,status:"MISSING",currentFullPrice:null,articles:[]};
      if(prices.length!==1)return{...source,status:"CONFLICT",currentFullPrice:null,articles:found.map(product=>product.sapArticle)};
      return{...source,status:prices[0]===source.oldFullPrice?"CURRENT":"CHANGED",currentFullPrice:prices[0],articles:found.map(product=>product.sapArticle)};
    });
    const warningCount=slots.filter(item=>item.status==="MISSING"||item.status==="CONFLICT").length;
    const changedCount=slots.filter(item=>item.status==="CHANGED").length;
    return{...ticket,slots,status:warningCount?"BLOCKED":changedCount?"CHANGED":"CURRENT",changedCount,warningCount};
  });
}

export const ticketById=(id:string)=>PRICE_TICKETS.find(ticket=>ticket.id===id)??null;
export const idr=(value:number)=>new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(value);
export const monthly=(value:number)=>Math.round(value/24);
