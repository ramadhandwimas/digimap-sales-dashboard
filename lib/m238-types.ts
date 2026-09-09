export type Staff={id:string;name:string;position:string;share:number}
export type Target={period:string;amount:number;device:number;accessories:number;vas:number}
export type LobMetric={qty:number;amount:number}
export type VasMetric={qty:number;amount:number}
export type StaffMetric={
  id:string;name:string;share:number;amount:number;device:number;accessories:number;vas:number;qty:number;invoices:number;upt:number;atv:number;
  targets:{amount:number;device:number;accessories:number;vas:number};
  lob:{mac:LobMetric;iphone:LobMetric;ipad:LobMetric;watch:LobMetric;airpods:LobMetric};
  vasDetail:{qoala:VasMetric;telkomsel:VasMetric;indosat:VasMetric;xl:VasMetric;icloud:VasMetric};
  incentive:{mac:number;iphone:number;ipad:number;watch:number;qoala:number;accessories:number;total:number}
}
export type DailyMetric={
  date:string;amount:number;device:number;accessories:number;vas:number;invoices:number;qty:number;upt:number;atv:number;
  mac:number;ipad:number;iphone:number;watch:number;airpods:number;
  macAmount:number;ipadAmount:number;iphoneAmount:number;watchAmount:number;airpodsAmount:number;
  qoala:number;telkomsel:number;indosat:number;xl:number;icloud:number;
  qoalaQty:number;telkomselQty:number;indosatQty:number;xlQty:number;icloudQty:number
}
export type StaffSchedule={id:string;status:string}
export type M238Payload={
  mode:"live"|"demo";generatedAt:string;latestDate:string;period:string;staff:Staff[];target:Target;
  dailyStaff:StaffMetric[];monthlyStaff:StaffMetric[];daily:DailyMetric[];dailySchedule:StaffSchedule[];
  summary:{amount:number;device:number;accessories:number;vas:number;invoices:number;qty:number;upt:number;atv:number;estimate:number;point:number;timegone:number}
}
