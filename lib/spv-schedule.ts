export const SHIFTS = [
  ["D047", "09.00–17.00"], ["D072", "11.00–19.00"], ["D083", "12.00–20.00"],
  ["D093", "13.00–21.00"], ["D103", "14.00–22.00"], ["FULL", "Full"],
  ["OFF", "OFF"], ["CUTI", "Cuti"], ["RO", "RO"], ["SAKIT", "Sakit"],
  ["MEETING", "Meeting"], ["TRAINING", "Training"], ["TRAINING_IPHONE", "Training iPhone for You"],
  ["NONE", "Tidak dijadwalkan"],
] as const;
export const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
export type SchedulePerson = {uid:string; id:string; name:string; position:string; shifts:string[]};
export type Schedule = {start:string; week:number; note:string; dayNotes:string[]; people:SchedulePerson[]};
export type ScheduleRecord = {revision:string; updatedAt:string; updatedBy:string; status:"DRAFT"|"READY"; data:Schedule};
export function dateValid(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value+"T12:00:00Z").toISOString().slice(0,10)===value}
export function addDays(value:string,n:number){const d=new Date(value+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
export function monday(value:string){const d=new Date(value+"T12:00:00Z");return addDays(value,-((d.getUTCDay()+6)%7))}
export function dates(start:string){return DAYS.map((_,i)=>addDays(start,i))}
export function weekNumber(start:string){const d=new Date(addDays(start,3)+"T12:00:00Z"),q=Math.floor(d.getUTCMonth()/3)*3,first=monday(`${d.getUTCFullYear()}-${String(q+1).padStart(2,"0")}-01`);return Math.floor((Date.parse(start)-Date.parse(first))/604800000)+1}
export function rangeLabel(start:string){return `${new Date(start+"T12:00:00Z").toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"})} – ${new Date(addDays(start,6)+"T12:00:00Z").toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"})}`}
export function blankSchedule(start:string,people:Omit<SchedulePerson,"shifts">[]):Schedule{return {start,week:weekNumber(start),note:"",dayNotes:Array(7).fill(""),people:people.filter(p=>isScheduleStaff(p.name)).map(p=>({...p,shifts:Array(7).fill("")}))}}
export function validateSchedule(value:unknown,ready=false):Schedule{
 const raw=value as Schedule;
 const v=raw&&Array.isArray(raw.people)?{...raw,people:raw.people.filter(p=>!p||typeof p.name!=="string"||isScheduleStaff(p.name))}:raw;
 if(!v||!dateValid(v.start)||monday(v.start)!==v.start||!Number.isInteger(v.week)||v.week<1||v.week>53)throw Error("Tanggal awal harus Senin dan nomor week 1–53.");
 if(typeof v.note!=="string"||v.note.length>500||!Array.isArray(v.dayNotes)||v.dayNotes.length!==7||v.dayNotes.some(x=>typeof x!=="string"||x.length>100))throw Error("Catatan jadwal tidak valid.");
 if(!Array.isArray(v.people)||v.people.length<1||v.people.length>60)throw Error("Isi minimal satu staff, maksimal 60 staff.");
 const ids=new Set<string>(),uids=new Set<string>();
 for(const p of v.people){
  if(!p||typeof p.uid!=="string"||!/^[-\w]{1,80}$/.test(p.uid)||uids.has(p.uid))throw Error("Identitas baris staff tidak valid.");uids.add(p.uid);
  if(typeof p.id!=="string"||(p.id&&!/^\d{6,10}$/.test(p.id))||ids.has(p.id))throw Error("NIK harus 6–10 digit dan tidak boleh sama.");if(p.id)ids.add(p.id);
  if(typeof p.name!=="string"||!p.name.trim()||p.name.length>100||typeof p.position!=="string"||!p.position.trim()||p.position.length>50)throw Error("Lengkapi nama dan jabatan staff.");
  if(!Array.isArray(p.shifts)||p.shifts.length!==7||p.shifts.some(s=>typeof s!=="string"||(s!==""&&!SHIFTS.some(([code])=>code===s))))throw Error("Kode shift tidak valid.");
  if(ready&&p.shifts.some(s=>!s))throw Error("Lengkapi semua shift, atau pilih Tidak dijadwalkan sebelum menandai siap.");
 }
 return {start:v.start,week:v.week,note:v.note,dayNotes:[...v.dayNotes],people:v.people.map(p=>({uid:p.uid,id:p.id,name:p.name.trim(),position:p.position.trim(),shifts:[...p.shifts]}))};
}
export function personCounts(p:SchedulePerson){return ["D047","D103","D083"].map(code=>p.shifts.filter(s=>s===code).length).concat([p.shifts.filter(s=>["OFF","CUTI","RO","SAKIT"].includes(s)).length,p.shifts.filter(s=>["MEETING","TRAINING","TRAINING_IPHONE"].includes(s)).length])}
export function shiftCounts(s:Schedule,code:string){return DAYS.map((_,i)=>s.people.filter(p=>p.shifts[i]===code).length)}
export function shiftText(code:string){return code==="NONE"?"—":code==="TRAINING_IPHONE"?"TR IPHONE":code||"Belum diisi"}
export function roleColor(role:string){return /SPV|SUPERVISOR|^ST$|^MT$/i.test(role)?"#a4c2f4":/cashier|kasir/i.test(role)?"#ea9999":"#ffd966"}
export function shiftColor(code:string){return ({D047:"#93c47d",D072:"#f1c232",D083:"#f1c232",D093:"#ea9999",D103:"#00ccff",FULL:"#ea9999",OFF:"#ff0000",CUTI:"#a4c2f4",TRAINING:"#00ffff",TRAINING_IPHONE:"#ff00ff",NONE:"#000000"} as Record<string,string>)[code]||"#eee"}
const months=["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];
/** Imports exact date columns, keeping empty cells unresolved instead of assuming attendance. */
export function importSchedule(rows:unknown[][],start:string,roster:Omit<SchedulePerson,"shifts">[]):Schedule{
 const out=blankSchedule(start,roster),weekDates=dates(start);
 for(let r=0;r<rows.length-2;r++){
  const header=rows[r],month=header.slice(0,3).map(x=>months.indexOf(String(x).trim().toUpperCase())).find(x=>x>=0);
  if(month===undefined)continue;
  const year=header.slice(0,3).map(String).find(x=>/^20\d{2}$/.test(x));
  let currentMonth=month,currentYear=year?Number(year):Number(start.slice(0,4));
  const actual=header.slice(3,10).map((day,i)=>{if(i&&Number(day)<Number(header[i+2])){currentMonth++;if(currentMonth===12){currentMonth=0;currentYear++}}return `${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(Number(day)).padStart(2,"0")}`});
  if(actual.join()!==weekDates.join())continue;
  let h=r+1;if(!/NIK/i.test(String(rows[h]?.[0])))h++;
  if(!/NIK/i.test(String(rows[h]?.[0])))continue;
  for(let i=h+1;i<rows.length;i++){
   const row=rows[i],id=String(row[0]??"").trim(),name=String(row[1]??"").trim();
   if(/^(D0\d\d|FULL|OFF|CUTI)/i.test(id))break;
   if(!name||!isScheduleStaff(name))continue;
   if(!/^\d{6,10}$/.test(id)&&id)continue;
   let p=out.people.find(p=>(id&&p.id===id)||p.name.toUpperCase()===name.toUpperCase());
   if(!p){p={uid:id||`manual-${i}`,id,name,position:String(row[2]||"DW"),shifts:Array(7).fill("")};out.people.push(p)}
   p.name=name;p.position=String(row[2]||p.position).trim();
   p.shifts=row.slice(3,10).map(s=>{const code=String(s??"").trim().toUpperCase();return SHIFTS.some(([c])=>c===code)?code:""});while(p.shifts.length<7)p.shifts.push("");
  }
  break;
 }
 return out;
}
export function latestRecords(rows:unknown[][]):ScheduleRecord[]{
 const records=new Map<string,ScheduleRecord>();
 for(const row of rows){try{const record=JSON.parse(String(row[4])) as ScheduleRecord;record.data=validateSchedule(record.data,record.status==="READY");if(!["READY","DRAFT"].includes(record.status)||record.revision!==row[1]||record.data.start!==row[0])continue;records.set(record.data.start,record)}catch{throw Error("Arsip schedule tidak valid. Hubungi SPV agar data tidak tertimpa.")}}
 return [...records.values()];
}
/** Store/channel accounts are not people and never belong in staffing. */
export function isScheduleStaff(name:string){return !/(DIGIMAP|MAPEMALL)/.test(name.toUpperCase().replace(/[^A-Z0-9]/g,""))}
export const SUMMARY_SHIFTS=SHIFTS.slice(0,8);
export function orderRoster<T extends {id:string;name:string;position:string}>(people:T[],rows:unknown[][]):T[]{
 const sourceOrder=new Map<string,number>();
 for(const row of rows){const id=String(row[0]??"").trim(),name=String(row[1]??"").trim();if((/^\d{6,10}$/.test(id)||!id)&&name&&isScheduleStaff(name)){const key=id||name.toUpperCase();if(!sourceOrder.has(key))sourceOrder.set(key,sourceOrder.size)}}
 const rank=(p:T)=>/SPV|SUPERVISOR/i.test(p.position)?0:/^ST$|TRAINER/i.test(p.position)?1:/^MT$/i.test(p.position)?2:/CASHIER|KASIR/i.test(p.position)?3:/^DW$/i.test(p.position)?5:4;
 return people.filter(p=>isScheduleStaff(p.name)).map((p,i)=>({p,i})).sort((a,b)=>rank(a.p)-rank(b.p)||(sourceOrder.get(a.p.id||a.p.name.toUpperCase())??10000+a.i)-(sourceOrder.get(b.p.id||b.p.name.toUpperCase())??10000+b.i)).map(x=>x.p);
}
export function initialSchedule(rows:unknown[][],start:string,roster:Omit<SchedulePerson,"shifts">[],records:ScheduleRecord[]):Schedule{
 const prior=records.filter(r=>r.data.start<start).sort((a,b)=>b.data.start.localeCompare(a.data.start))[0];
 const people=orderRoster(prior?prior.data.people.map(({shifts,...p})=>p):roster,rows);
 const imported=importSchedule(rows,start,people);
 // A saved roster is authoritative for following weeks; retired people must not return from Config.
 if(prior)imported.people=people.map(p=>imported.people.find(i=>i.uid===p.uid)||{...p,shifts:Array(7).fill("")});
 imported.people=orderRoster(imported.people,rows);return imported;
}
