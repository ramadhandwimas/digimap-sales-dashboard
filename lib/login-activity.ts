export function loginDate(value:unknown){
 if(typeof value==="number"&&value>30000&&value<100000)return new Date(Date.UTC(1899,11,30)+Math.floor(value)*86400000).toISOString().slice(0,10);
 const text=String(value??"").trim();if(/^\d{4}-\d{2}-\d{2}$/.test(text))return text;
 const match=text.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);return match?`${match[3]}-${match[2]}-${match[1]}`:text;
}
export function summarizeLoginActivity(raw:unknown[][],date:string,access:unknown[][]=[]){
 const text=(v:unknown)=>String(v??"").trim(),staff=new Map<string,{nik:string;name:string;count:number;lastLogin:string;loginTimes:string[]}>();
 for(const r of raw){if(loginDate(r[1])!==date||!text(r[2]))continue;const ts=text(r[0]);if(Number.isNaN(Date.parse(ts)))continue;const nik=text(r[2]),row=staff.get(nik)||{nik,name:text(r[3])||nik,count:0,lastLogin:"",loginTimes:[]};row.count++;row.loginTimes.push(ts);if(!row.lastLogin||Date.parse(ts)>Date.parse(row.lastLogin)){row.lastLogin=ts;row.name=text(r[3])||row.name}staff.set(nik,row)}
 const rows=[...staff.values()].map(r=>({...r,loginTimes:r.loginTimes.sort((a,b)=>Date.parse(b)-Date.parse(a))})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)),totalLogins=rows.reduce((a,r)=>a+r.count,0);
 const merged=new Map(rows.map(r=>[r.nik,{...r,openCount:0,openTimes:[] as string[],lastOpen:""}])),seen=new Set<string>();
 for(const r of access){const ts=text(r[0]),nik=text(r[2]),id=text(r[4]);if(loginDate(r[1])!==date||!nik||Number.isNaN(Date.parse(ts))||(id&&seen.has(id)))continue;if(id)seen.add(id);const row=merged.get(nik)||{nik,name:text(r[3])||nik,count:0,lastLogin:"",loginTimes:[],openCount:0,openTimes:[],lastOpen:""};row.openCount++;row.openTimes.push(ts);if(!row.lastOpen||Date.parse(ts)>Date.parse(row.lastOpen))row.lastOpen=ts;merged.set(nik,row)}
 const result=[...merged.values()].map(r=>({...r,openTimes:r.openTimes.sort((a,b)=>Date.parse(b)-Date.parse(a))})).sort((a,b)=>(b.count+b.openCount)-(a.count+a.openCount)||a.name.localeCompare(b.name)),totalOpens=result.reduce((a,r)=>a+r.openCount,0);
 return{date,rows:result,totalUsers:result.length,totalLogins,totalOpens,summary:result.length?`${result.length} staff, ${totalLogins} login dan ${totalOpens} buka dashboard pada ${date}.`:`Belum ada aktivitas tercatat pada ${date}.`};
}
