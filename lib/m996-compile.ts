export type M996Sale={
 date:string;staffId:string;staffName:string;invoice:string;article:string;description:string;type:string;
 qty:number;amount:number;category:string;brand:string;core:string;scheme:string;vendor:string;week:string;sourceKey:string;
};

const text=(value:unknown)=>String(value??"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim();
const upper=(value:unknown)=>text(value).toUpperCase();
const number=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)?value:Number(String(value??"").replace(/[^0-9.-]/g,""))||0;
const isoDate=(value:unknown)=>{const raw=text(value);if(/^\d{4}-\d{2}-\d{2}/.test(raw))return raw.slice(0,10);if(/^\d{2}-\d{2}-\d{4}$/.test(raw)){const[day,month,year]=raw.split("-");return`${year}-${month}-${day}`}return""};

export function m996SaleFromValues(row:unknown[]):M996Sale|null{
 const sourceKey=text(row[16]),date=isoDate(row[0]);
 if(!/^M996\|/i.test(sourceKey)||!date)return null;
 return{date,staffId:text(row[1]),staffName:text(row[2])||"Tanpa Nama",invoice:text(row[3]),article:upper(row[4]),description:text(row[5]),type:text(row[6]),qty:number(row[7]),amount:number(row[8]),category:upper(row[9]),brand:upper(row[10]),core:upper(row[11]),scheme:upper(row[12]),vendor:upper(row[13]),week:text(row[14]),sourceKey};
}

export function compileM996(values:unknown[][],requestedPeriod=""){
 const allRows=values.map(m996SaleFromValues).filter((row):row is M996Sale=>Boolean(row));
 const availablePeriods=[...new Set(allRows.map(row=>row.date.slice(0,7)))].sort().reverse();
 const period=/^20\d{2}-\d{2}$/.test(requestedPeriod)?requestedPeriod:(availablePeriods[0]||requestedPeriod);
 const rows=allRows.filter(row=>!period||row.date.startsWith(period)).sort((a,b)=>b.date.localeCompare(a.date)||b.invoice.localeCompare(a.invoice)||a.article.localeCompare(b.article));
 const invoiceKeys=new Set(rows.map(row=>row.invoice).filter(Boolean));
 const amount=rows.reduce((sum,row)=>sum+row.amount,0),qty=rows.reduce((sum,row)=>sum+row.qty,0),invoices=invoiceKeys.size;
 const staffMap=new Map<string,{id:string;name:string;amount:number;qty:number;invoiceKeys:Set<string>;rows:number}>();
 const schemeMap=new Map<string,{name:string;amount:number;qty:number;rows:number}>();
 const dailyMap=new Map<string,{date:string;amount:number;qty:number;invoiceKeys:Set<string>}>();
 for(const row of rows){
  const staffKey=row.staffId||row.staffName,staff=staffMap.get(staffKey)||{id:row.staffId,name:row.staffName,amount:0,qty:0,invoiceKeys:new Set<string>(),rows:0};
  staff.amount+=row.amount;staff.qty+=row.qty;staff.rows++;if(row.invoice)staff.invoiceKeys.add(row.invoice);staffMap.set(staffKey,staff);
  const schemeName=row.scheme||"BELUM TERKLASIFIKASI",scheme=schemeMap.get(schemeName)||{name:schemeName,amount:0,qty:0,rows:0};
  scheme.amount+=row.amount;scheme.qty+=row.qty;scheme.rows++;schemeMap.set(schemeName,scheme);
  const daily=dailyMap.get(row.date)||{date:row.date,amount:0,qty:0,invoiceKeys:new Set<string>()};
  daily.amount+=row.amount;daily.qty+=row.qty;if(row.invoice)daily.invoiceKeys.add(row.invoice);dailyMap.set(row.date,daily);
 }
 const staff=[...staffMap.values()].map(item=>({id:item.id,name:item.name,amount:item.amount,qty:item.qty,invoices:item.invoiceKeys.size,rows:item.rows})).sort((a,b)=>b.amount-a.amount);
 const schemes=[...schemeMap.values()].sort((a,b)=>b.amount-a.amount);
 const daily=[...dailyMap.values()].map(item=>({date:item.date,amount:item.amount,qty:item.qty,invoices:item.invoiceKeys.size})).sort((a,b)=>a.date.localeCompare(b.date));
 return{store:"M996" as const,period,availablePeriods,source:"SALES DASHBOARD DATA • Source Key M996",summary:{amount,qty,invoices,rows:rows.length,upt:invoices?qty/invoices:0,atv:invoices?amount/invoices:0,dateFrom:daily[0]?.date||"",dateTo:daily.at(-1)?.date||""},staff,schemes,daily,rows};
}
