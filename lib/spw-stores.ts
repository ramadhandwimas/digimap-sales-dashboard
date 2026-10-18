import {parseSpwToNormalized,type Classification} from "./m238-fast-sales";

export const SPW_STORES=["M238","M996"] as const;
export type SpwStore=typeof SPW_STORES[number];
export const spwSheet=(store:SpwStore)=>`SPW ${store}`;
export function isSpwStore(value:string):value is SpwStore{return SPW_STORES.some(store=>store===value)}

// Source Key keeps the original POS. Store remains M238, the reporting store
// used by existing staff, focus, summary and detail readers.
export function combineSpw(snapshots:Record<SpwStore,unknown[][]>,classification:Map<string,Classification>){
 const reports=SPW_STORES.map(store=>({store,...parseSpwToNormalized(snapshots[store],classification,store)}));
 const rows=reports.flatMap(report=>report.rows.map(row=>({...row,store:"M238"})));
 return{rows,raw:SPW_STORES.flatMap(store=>snapshots[store]),unknownClassification:reports.reduce((sum,r)=>sum+r.unknownClassification,0),sources:reports.map(report=>({store:report.store,rows:report.rows.length,amount:report.rows.reduce((sum,row)=>sum+row.amount,0),qty:report.rows.reduce((sum,row)=>sum+row.qty,0)}))};
}

