export type MadingScheduleStaff={id:string;name:string;position:string;status:string};
export type MadingSchedule={date:string;source:string;available:boolean;shifts:{pagi:MadingScheduleStaff[];middle:MadingScheduleStaff[];siang:MadingScheduleStaff[]};o2o:MadingScheduleStaff[];leaveSick:MadingScheduleStaff[];off:MadingScheduleStaff[];training:MadingScheduleStaff[];other:MadingScheduleStaff[]};

const up=(v:string)=>String(v||"").trim().toUpperCase();
export function groupMadingSchedule(date:string,source:string,staff:MadingScheduleStaff[]):MadingSchedule{
 const result:MadingSchedule={date,source,available:staff.length>0,shifts:{pagi:[],middle:[],siang:[]},o2o:[],leaveSick:[],off:[],training:[],other:[]};
 for(const person of staff){const status=up(person.status);
  if(/O2O/.test(status)){result.o2o.push(person);continue}
  if(/CUTI|LEAVE|SAKIT|SICK/.test(status)){result.leaveSick.push(person);continue}
  if(/TRAINING|MEETING/.test(status)){result.training.push(person);continue}
  if(/(^|\b)(OFF|RO)(\b|$)/.test(status)){result.off.push(person);continue}
  if(/D047|PAGI|OPENING/.test(status)){result.shifts.pagi.push(person);continue}
  if(/D072|MIDDLE|\bMID\b/.test(status)){result.shifts.middle.push(person);continue}
  if(/D083|D093|D103|SIANG|CLOSING/.test(status)){result.shifts.siang.push(person);continue}
  result.other.push(person);
 }
 return result;
}
