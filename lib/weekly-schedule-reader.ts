export type SchedulePerson={id:string;name:string;position:string;status:string};
const s=(v:unknown)=>String(v??"").trim(),up=(v:unknown)=>s(v).toUpperCase(),n=(v:unknown)=>Number(v)||0;
const months:Record<string,number>={JANUARI:1,FEBRUARI:2,MARET:3,APRIL:4,MEI:5,JUNI:6,JULI:7,AGUSTUS:8,SEPTEMBER:9,OKTOBER:10,NOVEMBER:11,DESEMBER:12};
export const scheduleUnavailable=(v:string)=>/OFF|CUTI|TRAINING|MEETING|\bRO\b|SAKIT|SICK|LEAVE/i.test(v);
export function readWeeklySchedule(rows:unknown[][],date:string,known:{id:string;name:string}[]=[]):SchedulePerson[]{
 const names=new Map(known.map(p=>[up(p.name),p.id]));for(const row of rows)if(/^\d{6,10}$/.test(s(row[0]))&&s(row[1]))names.set(up(row[1]),s(row[0]));
 for(let r=0;r<rows.length-2;r++){
  const month=rows[r].slice(0,3).map(c=>months[up(c)]).find(Boolean);if(!month)continue;
  const days=rows[r].slice(3,10).map(n);if(days.length!==7||days.some(d=>d<1||d>31))continue;
  const wrap=days.findIndex((d,i)=>i<6&&d>days[i+1]);
  const index=days.findIndex((day,i)=>{const m=wrap>=0&&i>wrap?(month===12?1:month+1):month;return Number(date.slice(5,7))===m&&Number(date.slice(8,10))===day});if(index<0)continue;
  let h=r+1;if(up(rows[h]?.[1])!=="NAME"&&up(rows[h]?.[0])!=="NIK")h=r+2;if(up(rows[h]?.[1])!=="NAME"&&up(rows[h]?.[0])!=="NIK")continue;
  const result:SchedulePerson[]=[];
  for(let i=h+1;i<Math.min(rows.length,h+24);i++){
   const row=rows[i],name=s(row[1]);if(!name)continue;if(/^D0\d{2}|FULL|OFF|CUTI/.test(up(row[0]))||/^D0\d{2}|FULL|OFF|CUTI/.test(up(name)))break;
   const id=/^\d{6,10}$/.test(s(row[0]))?s(row[0]):names.get(up(name));if(!id)continue;
   let status=up(row[index+3]);if(!status){status="IN";for(let j=index-1;j>=0;j--){const prior=up(row[j+3]);if(!prior)continue;if(/TRAINING|MEETING|CUTI|SAKIT|SICK|LEAVE|\bRO\b/.test(prior))status=prior;break}}
   result.push({id,name,position:s(row[2])||"Sales Assistant",status});
  }
  if(result.length)return result;
 }
 return [];
}
