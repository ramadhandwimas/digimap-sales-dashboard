export type MadingScheduleStaff={id:string;name:string;position:string;status:string};
export type MadingSchedule={date:string;source:string;available:boolean;shifts:{pagi:MadingScheduleStaff[];middle:MadingScheduleStaff[];siang:MadingScheduleStaff[]};o2o:MadingScheduleStaff[];o2oShifts:{pagi:MadingScheduleStaff[];siang:MadingScheduleStaff[]};leaveSick:MadingScheduleStaff[];off:MadingScheduleStaff[];training:MadingScheduleStaff[];other:MadingScheduleStaff[]};

const up=(v:string)=>String(v||"").trim().toUpperCase();
const unavailable=(status:string)=>/CUTI|LEAVE|SAKIT|SICK|TRAINING|MEETING|(^|\b)(OFF|RO)(\b|$)/.test(status);
const pagi=(status:string)=>/D047|PAGI|OPENING/.test(status);
const middle=(status:string)=>/D072|D083|MIDDLE|\bMID\b/.test(status);
const siang=(status:string)=>/D093|D103|SIANG|CLOSING/.test(status);
export function groupMadingSchedule(date:string,source:string,staff:MadingScheduleStaff[]):MadingSchedule{
 const result:MadingSchedule={date,source,available:staff.length>0,shifts:{pagi:[],middle:[],siang:[]},o2o:[],o2oShifts:{pagi:[],siang:[]},leaveSick:[],off:[],training:[],other:[]};
 for(const person of staff){const status=up(person.status);
  if(/CUTI|LEAVE|SAKIT|SICK/.test(status)){result.leaveSick.push(person);continue}
  if(/TRAINING|MEETING/.test(status)){result.training.push(person);continue}
  if(/(^|\b)(OFF|RO)(\b|$)/.test(status)){result.off.push(person);continue}
  if(pagi(status)){result.shifts.pagi.push(person);continue}
  if(middle(status)){result.shifts.middle.push(person);continue}
  if(siang(status)){result.shifts.siang.push(person);continue}
  result.other.push(person);
 }
 const active=staff.filter(person=>!unavailable(up(person.status)));
 const choose=(inShift:(status:string)=>boolean)=>{const rows=active.filter(person=>inShift(up(person.status))),cashiers=rows.filter(person=>/CASHIER|KASIR/.test(up(person.position)));return cashiers.length?cashiers:rows.filter(person=>/^(BAGAS|ANDHEA)\b/.test(up(person.name)))};
 result.o2oShifts.pagi=choose(pagi);
 result.o2oShifts.siang=choose(status=>middle(status)||siang(status));
 result.o2o=[...result.o2oShifts.pagi,...result.o2oShifts.siang];
 return result;
}
