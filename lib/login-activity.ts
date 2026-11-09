export function summarizeLoginActivity(raw:unknown[][],date:string){
 const text=(v:unknown)=>String(v??"").trim(),staff=new Map<string,{nik:string;name:string;count:number;lastLogin:string;loginTimes:string[]}>();
 for(const r of raw){if(text(r[1])!==date||!text(r[2]))continue;const ts=text(r[0]);if(Number.isNaN(Date.parse(ts)))continue;const nik=text(r[2]),row=staff.get(nik)||{nik,name:text(r[3])||nik,count:0,lastLogin:"",loginTimes:[]};row.count++;row.loginTimes.push(ts);if(!row.lastLogin||Date.parse(ts)>Date.parse(row.lastLogin)){row.lastLogin=ts;row.name=text(r[3])||row.name}staff.set(nik,row)}
 const rows=[...staff.values()].map(r=>({...r,loginTimes:r.loginTimes.sort((a,b)=>Date.parse(b)-Date.parse(a))})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)),totalLogins=rows.reduce((a,r)=>a+r.count,0);
 return{date,rows,totalUsers:rows.length,totalLogins,summary:rows.length?`${rows.length} staff, total ${totalLogins} login pada ${date}.`:`Belum ada login tercatat pada ${date}.`};
}
