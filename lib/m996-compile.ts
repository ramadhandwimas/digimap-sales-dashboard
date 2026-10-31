export type M996Sale={
 date:string;staffId:string;staffName:string;invoice:string;article:string;description:string;type:string;
 qty:number;amount:number;category:string;brand:string;core:string;scheme:string;vendor:string;week:string;sourceKey:string;
};

const text=(value:unknown)=>String(value??"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim();
const upper=(value:unknown)=>text(value).toUpperCase();
const number=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)?value:Number(String(value??"").replace(/[^0-9.-]/g,""))||0;
const isoDate=(value:unknown)=>{const raw=text(value);if(/^\d{4}-\d{2}-\d{2}/.test(raw))return raw.slice(0,10);if(/^\d{2}-\d{2}-\d{4}$/.test(raw)){const[day,month,year]=raw.split("-");return`${year}-${month}-${day}`}return""};
const vasName=(row:M996Sale)=>{const value=upper(`${row.article} ${row.description} ${row.category} ${row.brand} ${row.vendor}`);if(/QOALA|PROTEKSI|(^|\s)KLA/.test(value))return"QOALA";if(/TELKOMSEL|(^|\s)TSL(\s|$)/.test(value))return"TELKOMSEL";if(/INDOSAT|(^|\s)IDT(\s|$)/.test(value))return"INDOSAT";if(/(^|\s)XL(\s|$)|XXL/.test(value))return"XL";return row.vendor||row.brand||row.category||"VAS LAINNYA"};
const detailName=(row:M996Sale)=>row.scheme==="DEVICES"?(row.type||row.category||row.description||"DEVICE LAINNYA"):row.scheme==="ACCESSORIES"?(row.category||row.type||row.description||"ACCESSORIES LAINNYA"):row.scheme==="VAS"?vasName(row):(row.type||row.category||row.description||"BELUM TERKLASIFIKASI");

export function m996QuantityOverrides(rows:unknown[][]){let date="",staffId="",article="";const quantities=new Map<string,number>();for(const row of rows){const first=text(row?.[0]),second=text(row?.[1]),parsedDate=isoDate(first);if(parsedDate){date=parsedDate;continue}const staff=first.match(/^(\d{6,10})\s*\/\s*(.+)$/);if(staff){staffId=staff[1];continue}if(first&&second&&!/^TOTAL\s+FOR|^GRAND\s+TOTAL|^PAGE\s*:/i.test(first)&&typeof row?.[0]!=="number"){article=upper(second);continue}if(!date||!staffId||!article||typeof row?.[0]!=="number"||!second)continue;const unitPrice=number(row[0]),amount=number(row[2]),ratio=unitPrice>0?amount/unitPrice:1,rounded=Math.round(ratio),qty=rounded>=1&&rounded<=100&&Math.abs(amount-unitPrice*rounded)<=1?rounded:1,key=`M996|${date}|${second}|${article}|${staffId}`;quantities.set(key,(quantities.get(key)||0)+qty)}return quantities}

export function m996SaleFromValues(row:unknown[]):M996Sale|null{
 const sourceKey=text(row[16]),date=isoDate(row[0]);
 if(!/^M996\|/i.test(sourceKey)||!date)return null;
 return{date,staffId:text(row[1]),staffName:text(row[2])||"Tanpa Nama",invoice:text(row[3]),article:upper(row[4]),description:text(row[5]),type:text(row[6]),qty:number(row[7]),amount:number(row[8]),category:upper(row[9]),brand:upper(row[10]),core:upper(row[11]),scheme:upper(row[12]),vendor:upper(row[13]),week:text(row[14]),sourceKey};
}

export function compileM996(values:unknown[][],requestedPeriod="",excludedInvoices:Iterable<string>=[],quantityOverrides:ReadonlyMap<string,number>=new Map()){
 const allRows=values.map(m996SaleFromValues).filter((row):row is M996Sale=>Boolean(row)).map(row=>quantityOverrides.has(row.sourceKey)?{...row,qty:quantityOverrides.get(row.sourceKey)||row.qty}:row);
 const availablePeriods=[...new Set(allRows.map(row=>row.date.slice(0,7)))].sort().reverse();
 const period=/^20\d{2}-\d{2}$/.test(requestedPeriod)?requestedPeriod:(availablePeriods[0]||requestedPeriod);
 const excludedSet=new Set([...excludedInvoices].map(text).filter(Boolean)),periodRows=allRows.filter(row=>!period||row.date.startsWith(period)),excludedRows=periodRows.filter(row=>row.invoice&&excludedSet.has(row.invoice));
 const rows=periodRows.filter(row=>!row.invoice||!excludedSet.has(row.invoice)).sort((a,b)=>b.date.localeCompare(a.date)||b.invoice.localeCompare(a.invoice)||a.article.localeCompare(b.article));
 const invoiceKeys=new Set(rows.map(row=>row.invoice).filter(Boolean));
 const amount=rows.reduce((sum,row)=>sum+row.amount,0),qty=rows.reduce((sum,row)=>sum+row.qty,0),invoices=invoiceKeys.size;
 const staffMap=new Map<string,{id:string;name:string;amount:number;qty:number;invoiceKeys:Set<string>;rows:number}>();
 const schemeMap=new Map<string,{name:string;amount:number;qty:number;rows:number;details:Map<string,{name:string;amount:number;qty:number;rows:number;items:Map<string,{name:string;article:string;amount:number;qty:number;rows:number}>}>}>();
 const dailyMap=new Map<string,{date:string;amount:number;qty:number;invoiceKeys:Set<string>}>();
 for(const row of rows){
  const staffKey=row.staffId||row.staffName,staff=staffMap.get(staffKey)||{id:row.staffId,name:row.staffName,amount:0,qty:0,invoiceKeys:new Set<string>(),rows:0};
  staff.amount+=row.amount;staff.qty+=row.qty;staff.rows++;if(row.invoice)staff.invoiceKeys.add(row.invoice);staffMap.set(staffKey,staff);
  const schemeName=row.scheme||"BELUM TERKLASIFIKASI",scheme=schemeMap.get(schemeName)||{name:schemeName,amount:0,qty:0,rows:0,details:new Map()};
  scheme.amount+=row.amount;scheme.qty+=row.qty;scheme.rows++;
  const productName=detailName(row),detail=scheme.details.get(productName)||{name:productName,amount:0,qty:0,rows:0,items:new Map()};detail.amount+=row.amount;detail.qty+=row.qty;detail.rows++;
  const variantName=row.description||row.type||row.category||row.article||"Tanpa deskripsi",variantKey=`${row.article}|${variantName}`,item=detail.items.get(variantKey)||{name:variantName,article:row.article,amount:0,qty:0,rows:0};item.amount+=row.amount;item.qty+=row.qty;item.rows++;detail.items.set(variantKey,item);scheme.details.set(productName,detail);schemeMap.set(schemeName,scheme);
  const daily=dailyMap.get(row.date)||{date:row.date,amount:0,qty:0,invoiceKeys:new Set<string>()};
  daily.amount+=row.amount;daily.qty+=row.qty;if(row.invoice)daily.invoiceKeys.add(row.invoice);dailyMap.set(row.date,daily);
 }
 const staff=[...staffMap.values()].map(item=>({id:item.id,name:item.name,amount:item.amount,qty:item.qty,invoices:item.invoiceKeys.size,rows:item.rows})).sort((a,b)=>b.amount-a.amount);
 const schemes=[...schemeMap.values()].map(item=>({name:item.name,amount:item.amount,qty:item.qty,rows:item.rows,details:[...item.details.values()].map(detail=>({name:detail.name,amount:detail.amount,qty:detail.qty,rows:detail.rows,items:[...detail.items.values()].sort((a,b)=>b.qty-a.qty||b.amount-a.amount||a.name.localeCompare(b.name))})).sort((a,b)=>b.qty-a.qty||b.amount-a.amount)})).sort((a,b)=>b.amount-a.amount);
 const daily=[...dailyMap.values()].map(item=>({date:item.date,amount:item.amount,qty:item.qty,invoices:item.invoiceKeys.size})).sort((a,b)=>a.date.localeCompare(b.date));
 const excludedInvoiceCount=new Set(excludedRows.map(row=>row.invoice).filter(Boolean)).size,excludedAmount=excludedRows.reduce((sum,row)=>sum+row.amount,0),excludedQty=excludedRows.reduce((sum,row)=>sum+row.qty,0);
 return{store:"M996" as const,period,availablePeriods,source:"SALES DASHBOARD DATA • Source Key M996",summary:{amount,qty,invoices,rows:rows.length,upt:invoices?qty/invoices:0,atv:invoices?amount/invoices:0,dateFrom:daily[0]?.date||"",dateTo:daily.at(-1)?.date||""},excluded:{invoices:excludedInvoiceCount,rows:excludedRows.length,amount:excludedAmount,qty:excludedQty},staff,schemes,daily,rows};
}
