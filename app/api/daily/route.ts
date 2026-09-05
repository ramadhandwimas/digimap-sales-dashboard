import {NextRequest,NextResponse} from "next/server";
import {appendSheetValues,clearAndWrite,ensureSheet,getSheetRanges} from "@/lib/google-sheets";

const SHEET_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0",STORE="M238",SNAPSHOT="Dashboard Schedule Snapshot",TARGET_SNAPSHOT="Dashboard Daily Target Snapshot",SALES_SNAPSHOT="Dashboard Daily Sales Snapshot";
const SALES_HEADERS=["Date","Sales ID","Sales Name","Position","Share","Status","Target Amount","Target Accessories","Target VAS","Achievement Amount","Accessories","VAS","Qty","Invoices","Updated At"];
const n=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/[^0-9.-]/g,""))||0;
const s=(v:unknown)=>String(v??"").trim(),up=(v:unknown)=>s(v).toUpperCase();
function iso(v:unknown){const x=s(v);if(/^\d{2}-\d{2}-\d{4}$/.test(x)){const[d,m,y]=x.split("-");return`${y}-${m}-${d}`}if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);return""}
function todayJakarta(){return new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date())}
function weekday(date:string){return new Intl.DateTimeFormat("id-ID",{weekday:"long",timeZone:"Asia/Jakarta"}).format(new Date(`${date}T00:00:00Z`)).toLowerCase()}

type Row={date:string;id:string;name:string;invoice:string;article:string;description:string;type:string;qty:number;amount:number;category:string;brand:string;core:string;scheme:string;vendor:string};
function parse(r:unknown[]):Row{return{date:iso(r[0]),id:s(r[1]),name:s(r[2]),invoice:s(r[3]),article:s(r[4]),description:s(r[5]),type:s(r[6]),qty:n(r[7]),amount:n(r[8]),category:up(r[9]),brand:up(r[10]),core:up(r[11]),scheme:up(r[12]),vendor:up(r[13])}}
function valid(r:Row){return!!(r.id&&r.date)&&r.scheme!=="VOUCHER"&&!up(r.description).includes("VOUCHER")}
function kind(r:Row){const text=`${r.category} ${up(r.type)} ${up(r.description)}`;if(r.scheme==="VAS")return"vas";if(r.scheme==="ACCESSORIES")return"accessories";if(r.scheme==="DEVICES")return"device";if(/IPHONE|IPAD|MAC|APPLE WATCH|AIRPODS/.test(text))return"device";return"other"}
function product(r:Row){if(r.brand!=="APPLE")return"other";if(r.scheme==="ACCESSORIES")return r.category==="AIRPODS"?"airpods":"other";if(r.scheme!=="DEVICES")return"other";if(r.category==="IPHONE")return"iphone";if(r.category==="MAC")return"mac";if(r.category==="IPAD")return"ipad";if(r.category==="APPLE WATCH")return"watch";return"other"}
function vasType(r:Row){const t=`${r.article} ${r.brand} ${r.vendor} ${r.description}`.toUpperCase();if(t.includes("QOALA")||t.includes("KLA"))return"qoala";if(t.includes("TELKOMSEL")||t.includes("TSL"))return"telkomsel";if(t.includes("INDOSAT")||t.includes("IDT"))return"indosat";if(/(^|\s)XL(\s|$)|XXL/.test(t))return"xl";return""}

type StaffBase={id:string;name:string;position:string;share:number;status:string};
type DailyTarget={amount:number;accessories:number;vas:number};
type DailyStaff=StaffBase&{amount:number;accessories:number;vas:number;qty:number;invoices:number;upt:number;atv:number;targets:DailyTarget;lob:{iphone:number;mac:number;ipad:number;watch:number;airpods:number};vasDetail:{qoala:{qty:number;value:number};telkomsel:{qty:number;value:number};xl:{qty:number;value:number};indosat:{qty:number;value:number}}};

function snapshotStaff(rows:unknown[][]):DailyStaff[]{return rows.map(r=>{const amount=n(r[9]),qty=n(r[12]),invoices=n(r[13]);return{id:s(r[1]),name:s(r[2]),position:s(r[3]),share:n(r[4]),status:up(r[5])||"IN",targets:{amount:n(r[6]),accessories:n(r[7]),vas:n(r[8])},amount,accessories:n(r[10]),vas:n(r[11]),qty,invoices,upt:invoices?qty/invoices:0,atv:invoices?amount/invoices:0,lob:{iphone:0,mac:0,ipad:0,watch:0,airpods:0},vasDetail:{qoala:{qty:0,value:0},telkomsel:{qty:0,value:0},xl:{qty:0,value:0},indosat:{qty:0,value:0}}}}).filter(r=>r.id)}
async function readSalesSnapshot(date:string,email:string,key:string){await ensureSheet(SHEET_ID,SALES_SNAPSHOT,SALES_HEADERS,email,key);const rows=(await getSheetRanges(SHEET_ID,[`'${SALES_SNAPSHOT}'!A2:O5000`],email,key))[0]??[];return{all:rows,dated:rows.filter(r=>iso(r[0])===date)}}
function snapshotValues(date:string,row:DailyStaff){return[date,row.id,row.name,row.position,row.share,row.status,row.targets.amount,row.targets.accessories,row.targets.vas,row.amount,row.accessories,row.vas,row.qty,row.invoices,new Date().toISOString()]}
function snapshotChanged(saved:unknown[],next:unknown[]){return next.slice(0,14).some((value,index)=>index===0||index===1||index===2||index===3||index===5?s(saved[index])!==s(value):n(saved[index])!==n(value))}
async function saveSalesSnapshot(date:string,staff:DailyStaff[],all:unknown[][],email:string,key:string){const indexed=new Map(all.map((row,index)=>[`${iso(row[0])}:${s(row[1])}`,{row,index:index+2}])),missing:unknown[][]=[];for(const person of staff){const values=snapshotValues(date,person),saved=indexed.get(`${date}:${person.id}`);if(!saved)missing.push(values);else if(snapshotChanged(saved.row,values))await clearAndWrite(SHEET_ID,null,`'${SALES_SNAPSHOT}'!A${saved.index}:O${saved.index}`,[values],email,key,"RAW")}if(missing.length)await appendSheetValues(SHEET_ID,`'${SALES_SNAPSHOT}'!A:O`,missing,email,key)}

async function targetForDate(date:string,configRows:unknown[][],email:string,key:string):Promise<{target:DailyTarget;locked:boolean}>{
 await ensureSheet(SHEET_ID,TARGET_SNAPSHOT,["Date","Amount","Accessories","VAS","Created At"],email,key);
 const existing=(await getSheetRanges(SHEET_ID,[`'${TARGET_SNAPSHOT}'!A2:E3000`],email,key))[0]??[];
 const saved=existing.find(r=>iso(r[0])===date);
 if(saved)return{target:{amount:n(saved[1]),accessories:n(saved[2]),vas:n(saved[3])},locked:true};
 const dailyTargetRow=configRows.find(r=>s(r[22]).toLowerCase()===weekday(date));
 const target={amount:n(dailyTargetRow?.[23]),accessories:n(dailyTargetRow?.[24]),vas:n(dailyTargetRow?.[25])};
 const shouldLock=date<=todayJakarta()&&(target.amount>0||target.accessories>0||target.vas>0);
 if(shouldLock)await appendSheetValues(SHEET_ID,`'${TARGET_SNAPSHOT}'!A:E`,[[date,target.amount,target.accessories,target.vas,new Date().toISOString()]],email,key);
 return{target,locked:shouldLock};
}

async function scheduleFor(date:string,configRows:unknown[][],email:string,key:string):Promise<StaffBase[]>{
 await ensureSheet(SHEET_ID,SNAPSHOT,["Date","Sales ID","Sales Name","Position","Share","Status","Created At"],email,key);
 const existing=(await getSheetRanges(SHEET_ID,[`'${SNAPSHOT}'!A2:G3000`],email,key))[0]??[];
 const locked=existing.filter(r=>iso(r[0])===date).map(r=>({id:s(r[1]),name:s(r[2]),position:s(r[3]),share:n(r[4]),status:up(r[5])||"IN"}));
 if(locked.length)return locked;
 const staff=configRows.slice(27,55).filter(r=>s(r[7])===STORE&&s(r[8])&&s(r[9])&&!/SUPERVISOR|ONLINE/i.test(s(r[10]))).map(r=>({id:s(r[8]),name:s(r[9]),position:s(r[10]),share:n(r[11]),status:"IN"}));
 const day=Number(date.slice(8,10)),header=configRows[69]??[];let col=header.findIndex(v=>n(v)===day);if(col<0)col=10+day;
 const statusRows=configRows.slice(70,105),statusMap=new Map(statusRows.filter(r=>s(r[7])).map(r=>[s(r[7]),up(r[col])||"IN"]));
 const result=staff.map(p=>({...p,status:statusMap.get(p.id)||"IN"}));
 if(date<=todayJakarta()&&result.length){await appendSheetValues(SHEET_ID,`'${SNAPSHOT}'!A:G`,result.map(p=>[date,p.id,p.name,p.position,p.share,p.status,new Date().toISOString()]),email,key)}
 return result;
}

export async function GET(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({error:"Koneksi Google Sheets belum tersedia"},{status:500});
 const date=req.nextUrl.searchParams.get("date")||todayJakarta();
 try{
  const[configRows,rawDates]=await getSheetRanges(SHEET_ID,["Config!A1:AZ120","'RAW SalesPerson'!AB2:AB65536"],email,key);
  const[scheduled,targetResult,salesSnapshot]=await Promise.all([scheduleFor(date,configRows,email,key),targetForDate(date,configRows,email,key),readSalesSnapshot(date,email,key)]),unavailable=(x:string)=>/OFF|CUTI|TRAINING/.test(x),active=scheduled.filter(p=>!unavailable(p.status));
  const matches:number[]=[];rawDates.forEach((r,i)=>{if(iso(r[0])===date)matches.push(i+2)});
  const raw=matches.length?(await getSheetRanges(SHEET_ID,[`'RAW SalesPerson'!AB${matches[0]}:AR${matches.at(-1)}`],email,key))[0]??[]:[],rows=raw.map(parse).filter(r=>r.date===date&&valid(r));
  const target=targetResult.target;
  const shareTotal=active.reduce((a,p)=>a+Math.max(0,p.share),0);
  const liveStaff:DailyStaff[]=active.map(p=>{const mine=rows.filter(r=>r.id===p.id),invoices=new Set(mine.map(r=>r.invoice).filter(Boolean)),sum=(k:string)=>mine.filter(r=>kind(r)===k).reduce((a,r)=>a+r.amount,0),qty=mine.reduce((a,r)=>a+r.qty,0),amount=mine.reduce((a,r)=>a+r.amount,0),w=shareTotal?Math.max(0,p.share)/shareTotal:0,lob={iphone:0,mac:0,ipad:0,watch:0,airpods:0},vasDetail={qoala:{qty:0,value:0},telkomsel:{qty:0,value:0},xl:{qty:0,value:0},indosat:{qty:0,value:0}};for(const r of mine){const pr=product(r);if(pr in lob)lob[pr as keyof typeof lob]+=r.qty;const vt=vasType(r);if(vt){vasDetail[vt as keyof typeof vasDetail].qty+=r.qty;vasDetail[vt as keyof typeof vasDetail].value+=r.amount}}return{...p,amount,accessories:sum("accessories"),vas:sum("vas"),qty,invoices:invoices.size,upt:invoices.size?qty/invoices.size:0,atv:invoices.size?amount/invoices.size:0,targets:{amount:target.amount*w,accessories:target.accessories*w,vas:target.vas*w},lob,vasDetail}});
  const isPast=date<todayJakarta(),useSaved=isPast&&!matches.length&&salesSnapshot.dated.length>0,staff=useSaved?snapshotStaff(salesSnapshot.dated):liveStaff;
  if(!useSaved&&date<=todayJakarta())await saveSalesSnapshot(date,staff,salesSnapshot.all,email,key);
  const total=staff.reduce((a,r)=>({amount:a.amount+r.amount,target:a.target+r.targets.amount,accessories:a.accessories+r.accessories,accTarget:a.accTarget+r.targets.accessories,vas:a.vas+r.vas,vasTarget:a.vasTarget+r.targets.vas,qty:a.qty+r.qty,invoices:a.invoices+r.invoices}),{amount:0,target:0,accessories:0,accTarget:0,vas:0,vasTarget:0,qty:0,invoices:0});
  return NextResponse.json({date,staff,total:{...total,upt:total.invoices?total.qty/total.invoices:0},snapshotLocked:date<=todayJakarta(),targetSnapshotLocked:targetResult.locked,salesSnapshotLocked:date<=todayJakarta()&&(useSaved||staff.length>0)},{headers:{"cache-control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca daily sales"},{status:500})}
}
