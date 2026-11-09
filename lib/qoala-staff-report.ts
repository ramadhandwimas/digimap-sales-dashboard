import {isValidSale,saleKind,vasKey,type SalesRow} from "@/lib/m238-sales-sanitize";

export type QoalaStaffRow={id:string;name:string;position:string;deviceQty:number;qoalaQty:number;ar:number|null};
export type QoalaStaffReport={from:string;to:string;staff:QoalaStaffRow[];total:{deviceQty:number;qoalaQty:number;ar:number|null}};
export function buildQoalaStaffReport(config:unknown[][],sales:SalesRow[],from:string,to:string):QoalaStaffReport{
 const text=(v:unknown)=>String(v??"").trim(),staff=new Map<string,QoalaStaffRow>();
 for(const r of config){const store=text(r[0]).toUpperCase(),id=text(r[1]),name=text(r[2]),position=text(r[3]);if(store!=="M238"||!id||!name||/SUPERVISOR|\bSPV\b|ONLINE/i.test(position))continue;staff.set(id,{id,name,position,deviceQty:0,qoalaQty:0,ar:null})}
 for(const r of sales){if(r.date<from||r.date>to||r.store!=="M238"||!isValidSale(r)||/DEMO/i.test(`${r.scheme} ${r.description}`))continue;const p=staff.get(r.id);if(!p)continue;
  const kind=saleKind(r);if(kind==="device"&&r.brand==="APPLE"&&!/AIRPODS/i.test(`${r.category} ${r.description}`))p.deviceQty+=r.qty;
  if(kind==="vas"&&vasKey(r)==="qoala")p.qoalaQty+=r.qty;
 }
 const rows=[...staff.values()].map(p=>({...p,ar:p.deviceQty>0?p.qoalaQty/p.deviceQty*100:null})).sort((a,b)=>b.qoalaQty-a.qoalaQty||b.deviceQty-a.deviceQty||a.name.localeCompare(b.name));
 const total=rows.reduce((a,r)=>({deviceQty:a.deviceQty+r.deviceQty,qoalaQty:a.qoalaQty+r.qoalaQty}),{deviceQty:0,qoalaQty:0});
 return{from,to,staff:rows,total:{...total,ar:total.deviceQty>0?total.qoalaQty/total.deviceQty*100:null}};
}
