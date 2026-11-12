import {productKey,saleKind,vasKey,type SalesRow} from "./m238-sales-sanitize";
export type ReferenceTotals={device:number;accessories:number;vas:number;total:number;lob:Record<string,number>;lobAmount:Record<string,number>;vasDetail:Record<string,{qty:number;amount:number}>};
export type ReferencePeriod={period:string;start:string;end:string;available:boolean;totals:ReferenceTotals};
export type ReferenceStaff={id:string;name:string;device:number;accessories:number;vas:number;total:number;lob:Record<string,number>};
export type ReferenceContext={cutoff:string;history:ReferencePeriod[];annual:ReferencePeriod[];staff:ReferenceStaff[];current:ReferencePeriod;mtm:ReferencePeriod;lfl:ReferencePeriod|null};
export function referenceTotals(rows:SalesRow[]):ReferenceTotals{
 const out:ReferenceTotals={device:0,accessories:0,vas:0,total:0,lob:{iphone:0,mac:0,ipad:0,watch:0,airpods:0},lobAmount:{iphone:0,mac:0,ipad:0,watch:0,airpods:0},vasDetail:{QOALA:{qty:0,amount:0},TELKOMSEL:{qty:0,amount:0},XL:{qty:0,amount:0},INDOSAT:{qty:0,amount:0}}};
 for(const row of rows){const kind=saleKind(row);if(kind==="device")out.device+=row.amount;else if(kind==="accessories")out.accessories+=row.amount;else if(kind==="vas")out.vas+=row.amount;else continue;out.total+=row.amount;const lob=productKey(row);if(lob in out.lob){out.lob[lob]+=row.qty;out.lobAmount[lob]+=row.amount}const provider=vasKey(row).toUpperCase();if(kind==="vas"&&provider in out.vasDetail){out.vasDetail[provider].qty+=row.qty;out.vasDetail[provider].amount+=row.amount}}
 return out;
}
export function referenceContext(rows:SalesRow[],archive:SalesRow[]|null,cutoff:string):ReferenceContext{
 const period=cutoff.slice(0,7),[year,month]=period.split("-").map(Number),day=Number(cutoff.slice(8));
 const shifted=(offset:number)=>new Date(Date.UTC(year,month-1+offset,1)).toISOString().slice(0,7);
 const collect=(p:string,source:SalesRow[],full=false):ReferencePeriod=>{const[y,m]=p.split("-").map(Number),start=`${p}-01`,end=`${p}-${String(full?new Date(Date.UTC(y,m,0)).getUTCDate():Math.min(day,new Date(Date.UTC(y,m,0)).getUTCDate())).padStart(2,"0")}`,matched=source.filter(row=>row.date>=start&&row.date<=end);return{period:p,start,end,available:matched.length>0,totals:referenceTotals(matched)}};
 const monthly=rows.filter(row=>row.date>=`${period}-01`&&row.date<=cutoff),ids=[...new Set(monthly.map(row=>row.id))];
 const staff=ids.map(id=>{const own=monthly.filter(row=>row.id===id);return{id,name:own[0]?.name||id,...referenceTotals(own)}}).sort((a,b)=>b.total-a.total);
 const annualPeriods=[...new Set(rows.filter(row=>row.date.startsWith(`${year}-`)&&row.date.slice(0,7)<period).map(row=>row.date.slice(0,7)))].sort();
 const priorYear=`${year-1}-${String(month).padStart(2,"0")}`,liveLfl=rows.filter(row=>row.date.startsWith(priorYear)),lflRows=liveLfl.length?liveLfl:(archive||[]).filter(row=>row.date.startsWith(priorYear));
 return{cutoff,current:collect(period,rows),mtm:collect(shifted(-1),rows),lfl:lflRows.length?collect(priorYear,lflRows):null,history:[-3,-2,-1].map(offset=>collect(shifted(offset),rows,true)),annual:annualPeriods.map(p=>collect(p,rows,true)),staff};
}
