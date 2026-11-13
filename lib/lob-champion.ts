import {isValidSale,productKey,saleKind,type SalesRow} from "./m238-sales-sanitize";
export const CHAMPION_LOBS=[{key:"iphone",label:"iPhone"},{key:"ipad",label:"iPad"},{key:"mac",label:"MacBook"},{key:"watch",label:"Apple Watch"},{key:"airpods",label:"AirPods"}] as const;
export type ChampionKey=typeof CHAMPION_LOBS[number]["key"];
export type ChampionMode="daily"|"weekly"|"mtd"|"range";
type Total={qty:number;amount:number};
export type ChampionProduct=Total&{article:string;name:string;description:string};
export type ChampionStaff=Total&{id:string;name:string;products:ChampionProduct[];days:Array<Total&{date:string}>};
export type ChampionLob=Total&{key:ChampionKey;label:string;staff:ChampionStaff[];products:ChampionProduct[]};
export type ChampionReport={from:string;to:string;store:"M238";lobs:ChampionLob[];total:Total;liveDates:string[];loadedAt:string;source:string};
export const validChampionDate=(value:string)=>/^20\d{2}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export function championRange(mode:ChampionMode,date:string,start:string,end:string,today:string){
 if(mode==="range")return{from:start,to:end};
 if(mode==="mtd")return{from:`${date.slice(0,7)}-01`,to:date};
 if(mode==="weekly"&&validChampionDate(date)){const day=new Date(`${date}T00:00:00Z`),from=new Date(day.getTime()-day.getUTCDay()*86400000).toISOString().slice(0,10),last=new Date(Date.parse(from)+6*86400000).toISOString().slice(0,10);return{from,to:last>today?today:last}}
 return{from:date,to:date};
}
const fresh=():Total=>({qty:0,amount:0}),add=(total:Total,row:{qty:number;amount:number})=>{total.qty+=row.qty;total.amount+=row.amount};
const sortTotals=<T extends Total>(items:T[])=>items.sort((a,b)=>b.qty-a.qty||b.amount-a.amount);
function addProduct(map:Map<string,ChampionProduct>,row:SalesRow){const key=row.article||`${row.type}|${row.description}`,item=map.get(key)||{article:row.article,name:row.type||row.description||row.article||"Produk",description:row.description,...fresh()};add(item,row);map.set(key,item)}
function lobOf(row:SalesRow){const key=productKey(row);if(key!=="other")return key;if(row.brand==="APPLE"&&saleKind(row)==="device"&&/\b(?:IMAC|MAC MINI|MAC STUDIO|MAC PRO)\b/i.test(`${row.type} ${row.description} ${row.category}`))return"mac";return"other"}
/** Compiled history plus today's live source; a date is never counted twice. Both inputs are exchange-adjusted. */
export function buildLobChampion(source:{dataCopas:SalesRow[];rawSales:SalesRow[];activeDates:string[];at:number},from:string,to:string,today:string):ChampionReport{
 const inStore=(row:SalesRow)=>isValidSale(row)&&(!row.key||row.key.split("|")[0]==="M238"),raw=source.rawSales.filter(inStore),useLive=today>=from&&today<=to&&source.activeDates.includes(today)&&raw.some(row=>row.date===today),liveDates=useLive?[today]:[];
 const rows=[...source.dataCopas.filter(row=>!liveDates.includes(row.date)),...raw.filter(row=>liveDates.includes(row.date))].filter(row=>inStore(row)&&row.date>=from&&row.date<=to);
 const lobs=CHAMPION_LOBS.map(({key,label}):ChampionLob=>{
  const matching=rows.filter(row=>lobOf(row)===key),staff=new Map<string,{id:string;name:string;total:Total;products:Map<string,ChampionProduct>;days:Map<string,Total>}>(),products=new Map<string,ChampionProduct>(),total=fresh();
  for(const row of matching){add(total,row);addProduct(products,row);const person=staff.get(row.id)||{id:row.id,name:row.name||row.id,total:fresh(),products:new Map<string,ChampionProduct>(),days:new Map<string,Total>()};if(row.name)person.name=row.name;add(person.total,row);addProduct(person.products,row);const day=person.days.get(row.date)||fresh();add(day,row);person.days.set(row.date,day);staff.set(row.id,person)}
  return{key,label,...total,products:sortTotals([...products.values()].filter(row=>row.qty!==0||row.amount!==0)),staff:sortTotals([...staff.values()].map(person=>({id:person.id,name:person.name,...person.total,products:sortTotals([...person.products.values()].filter(row=>row.qty!==0||row.amount!==0)),days:[...person.days].sort(([a],[b])=>a.localeCompare(b)).map(([date,total])=>({date,...total}))})).filter(row=>row.qty!==0||row.amount!==0))};
 });
 return{from,to,store:"M238",lobs,total:lobs.reduce((total,lob)=>({qty:total.qty+lob.qty,amount:total.amount+lob.amount}),fresh()),liveDates,loadedAt:new Date(source.at).toISOString(),source:"Data Copas setelah exchange; hari ini memakai data live jika tersedia."};
}
export function championReportText(report:ChampionReport,key:ChampionKey){
 const lob=report.lobs.find(lob=>lob.key===key);if(!lob)return"";
 const money=(value:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value),date=(value:string)=>new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Jakarta"}).format(new Date(`${value}T00:00:00Z`));
 return[`*LOB Champion M238 — ${lob.label}*`,report.from===report.to?date(report.to):`${date(report.from)} s.d. ${date(report.to)}`,`Total: ${lob.qty} unit • ${money(lob.amount)}`,"",...lob.staff.flatMap((person,index)=>[`${index+1}. ${person.name}: ${person.qty} unit • ${money(person.amount)}`,...person.products.map(product=>`   • ${product.name}: ${product.qty} unit${product.article?` (${product.article})`:""}`)]),...(!lob.staff.length?["Belum ada penjualan pada periode ini."]:[])].join("\n");
}
