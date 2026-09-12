export type DailySummaryBreakdown={device:number;accessories:number;vas:number;iphoneQty:number;macbookQty:number;ipadQty:number;appleWatchQty:number;airpodsQty:number}
export type DailySummaryProviders={qoalaQty:number;qoalaValue:number;telkomselQty:number;telkomselValue:number;xlQty:number;xlValue:number;indosatQty:number;indosatValue:number}
export type DailySummaryRow={date:string;day:string;totalSales:number;target:number;achievementPct:number;transaction:number;invoice:number;qty:number;upt:number;atv:number;traffic:number|null;cvr:number|null;breakdown:{device:number;accessories:number;vas:number};lob:{iphone:number;macbook:number;ipad:number;appleWatch:number;airpods:number};providers:DailySummaryProviders}
export type DailySummaryPayload={
  mode:"monthly"|"custom";
  source:string[];
  store:"M238";
  period:{label:string;startDate:string;endDate:string;year?:number;month?:number};
  summary:{totalSales:number;target:number;achievementPct:number;transaction:number;invoice:number;qty:number;upt:number;atv:number;traffic:number|null;cvr:number|null;previousPct:number|null;bestDay:DailySummaryRow|null;lowestDay:DailySummaryRow|null};
  breakdown:DailySummaryBreakdown;
  trend:Array<{date:string;sales:number}>;
  dailyRows:DailySummaryRow[];
  meta:{generatedAt:string;cache:"hit"|"miss";rowsRead:number;payloadBytes?:number;serverMs:number;trafficSource:string|null;warnings:string[]};
}
