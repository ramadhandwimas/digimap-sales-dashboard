import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";
const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk",TAB="Dashboard Login Activity";
const s=(v:unknown)=>String(v??"").trim();
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export async function GET(req:NextRequest){
 const e=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,k=process.env.GOOGLE_PRIVATE_KEY;if(!e||!k)return NextResponse.json({date:today(),rows:[]});
 const date=req.nextUrl.searchParams.get("date")||today();
 try{
  const[raw]=await getSheetRanges(MASTER_ID,[`'${TAB}'!A2:F5000`],e,k),filtered=raw.filter(r=>s(r[1])===date&&s(r[2]));
  const map=new Map<string,{nik:string;name:string;count:number;lastLogin:string}>();
  for(const r of filtered){const nik=s(r[2]),name=s(r[3]),ts=s(r[0]),x=map.get(nik)||{nik,name,count:0,lastLogin:""};x.count++;if(!x.lastLogin||ts>x.lastLogin)x.lastLogin=ts;map.set(nik,x)}
  const rows=[...map.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)),totalLogins=rows.reduce((a,r)=>a+r.count,0);
  return NextResponse.json({date,rows,totalUsers:rows.length,totalLogins,summary:rows.length?`${rows.length} staff login hari ini dengan total ${totalLogins} kali login.`:"Belum ada aktivitas login hari ini."},{headers:{"cache-control":"no-store"}})
 }catch(err){return NextResponse.json({date,rows:[],error:err instanceof Error?err.message:"Gagal membaca aktivitas login"},{status:500})}
}
