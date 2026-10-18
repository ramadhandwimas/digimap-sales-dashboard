export function stokanDistribution(total:number,staffCount:number){
 return staffCount>0?{min:Math.floor(total/staffCount),max:Math.ceil(total/staffCount)}:{min:0,max:0};
}

export function distributeStokanRows<T>(rows:T[],names:string[]):Array<T&{stocker:string}>{
 const staff=[...new Set(names.filter(Boolean))];
 if(!staff.length)return [];
 const base=Math.floor(rows.length/staff.length),extra=rows.length%staff.length;
 let cursor=0;
 return staff.flatMap((stocker,index)=>{
  const take=base+(index<extra?1:0),block=rows.slice(cursor,cursor+take).map(row=>({...row,stocker}));
  cursor+=take;return block;
 });
}

type Reassignment={rowNumber:number;stocker:string;expectedStocker:string;article:string;serial:string;totalStock:number};
export function planStokanReassignment(body:unknown[][],input:Reassignment[],selected:string[],allowed:string[],uploadID:string){
 const members=new Set(selected),validStaff=new Set(allowed);
 if(!uploadID||!members.size||members.size!==selected.length||selected.some(name=>!validStaff.has(name)))throw new Error("Pilih minimal satu staff yang tersedia.");
 const current=body.map((row,index)=>({row,rowNumber:index+2})).filter(({row})=>String(row[12]??"")===uploadID);
 if(!current.length||input.length!==current.length)throw new Error("Data stokan berubah. Muat ulang sebelum membagi ulang.");
 const assignments=new Map(input.map(row=>[row.rowNumber,row]));
 if(assignments.size!==input.length)throw new Error("Daftar artikel pembagian tidak lengkap atau berulang.");
 const changes:Array<{rowNumber:number;stocker:string}>=[];
 for(const {row,rowNumber} of current){
  const assignment=assignments.get(rowNumber);
  if(!assignment||!members.has(assignment.stocker))throw new Error("Semua artikel harus dibagi ke staff terpilih.");
  if(assignment.article!==String(row[3]??"")||assignment.serial!==String(row[5]??"")||assignment.totalStock!==Number(row[6]))throw new Error("Artikel atau Qty stokan berubah. Muat ulang sebelum menyimpan.");
  if(assignment.expectedStocker!==String(row[1]??""))throw new Error("Pembagian stokan berubah. Muat ulang sebelum menyimpan.");
  if(assignment.stocker!==String(row[1]??""))changes.push({rowNumber,stocker:assignment.stocker});
 }
 const writes:Array<{range:string;values:string[][]}>=[];
 let start=0,end=0,values:string[][]=[];
 const flush=()=>{if(values.length)writes.push({range:`'STOKAN'!B${start}:B${end}`,values});values=[]};
 for(const change of changes){
  if(values.length&&change.rowNumber!==end+1)flush();
  if(!values.length)start=change.rowNumber;
  end=change.rowNumber;values.push([change.stocker]);
 }
 flush();return{writes,assignments,current};
}
