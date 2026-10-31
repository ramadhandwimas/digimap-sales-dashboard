import {NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

export const runtime="nodejs";
export const maxDuration=60;

const SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const DASHBOARD_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const text=(value:unknown)=>String(value??"").trim();
const upper=(value:unknown)=>text(value).toUpperCase();
const number=(value:unknown)=>Number(value)||0;
type HealthStatus="healthy"|"warning"|"critical";
type HealthCheck={id:string;label:string;status:HealthStatus;updatedAt:string|null;total:number;issues:number;summary:string;detail:string;action:string};

function isoDate(value:unknown){
 if(typeof value==="number")return new Date(Date.UTC(1899,11,30)+value*86400000).toISOString().slice(0,10);
 const raw=text(value);
 if(/^\d{4}-\d{2}-\d{2}/.test(raw))return raw.slice(0,10);
 if(/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(raw)){const[d,m,y]=raw.split(/[/-]/);return`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`}
 return"";
}
function latest(values:string[]){return values.filter(Boolean).sort().at(-1)||null}
function jakartaToday(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function daysOld(date:string|null){if(!date)return Infinity;return Math.max(0,Math.floor((new Date(`${jakartaToday()}T00:00:00Z`).getTime()-new Date(`${date.slice(0,10)}T00:00:00Z`).getTime())/86400000))}
function newestMeta(rows:unknown[][]){return rows.filter(row=>text(row[0])).sort((a,b)=>text(a[3]).localeCompare(text(b[3]))).at(-1)}
function state(empty:boolean,stale:boolean,issues=0):HealthStatus{return empty?"critical":stale||issues>0?"warning":"healthy"}

export async function GET(){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Koneksi Google Sheets belum dikonfigurasi."},{status:503});
 try{
  const [dashboard,source]=await Promise.all([
   getSheetRanges(DASHBOARD_ID,["'DAILY SALES CACHE'!A2:Z5000","'SOH FAST CACHE'!A2:F10000"],email,key),
   getSheetRanges(SOURCE_ID,["'Data Copas'!A2:N50000","'Master'!A2:G100000","'Promo Price Lists'!A2:G1000","'Promo ACC Price Lists'!A2:I1000"],email,key),
  ]);
  const[dailyCache=[],sohCache=[]]=dashboard,[copas=[],master=[],deviceMeta=[],accessoryMeta=[]]=source;
  const salesRows=dailyCache.filter(row=>isoDate(row[0])&&text(row[1]));
  const salesDate=latest(salesRows.map(row=>isoDate(row[0]))),salesUpdated=latest(salesRows.map(row=>text(row[24])));
  const validations=new Set(salesRows.map(row=>upper(row[25])).filter(Boolean));
  const salesProblems=[...validations].filter(value=>/MISMATCH|PENDING|ERROR|INVALID/.test(value)).length;
  const sohRows=sohCache.filter(row=>text(row[0]));
  const sohUpdated=latest(sohRows.map(row=>text(row[4]))),zeroStock=sohRows.filter(row=>number(row[2])<=0).length;
  const masterRows=master.filter(row=>text(row[1]));
  const masterArticles=new Set(masterRows.map(row=>upper(row[1])));
  const articleCounts=new Map<string,number>();
  for(const row of masterRows){const article=upper(row[1]);articleCounts.set(article,(articleCounts.get(article)||0)+1)}
  const duplicateMaster=[...articleCounts.values()].filter(count=>count>1).length;
  const incompleteDevice=masterRows.filter(row=>upper(row[5])==="DEVICES"&&(!text(row[4])||upper(row[4])==="N/A")).length;
  const copasRows=copas.filter(row=>isoDate(row[0])&&text(row[4]));
  const copasDate=latest(copasRows.map(row=>isoDate(row[0])));
  const copasNa=copasRows.filter(row=>upper(row[6])==="N/A"||upper(row[13])==="N/A").length;
  const missingMaster=new Set(copasRows.map(row=>upper(row[4])).filter(article=>article&&!masterArticles.has(article))).size;
  const device=newestMeta(deviceMeta),accessory=newestMeta(accessoryMeta);
  const checks:HealthCheck[]=[
   {id:"spw",label:"SPW & Daily Sales",status:state(!salesRows.length,daysOld(salesDate)>1,salesProblems),updatedAt:salesUpdated||salesDate,total:salesRows.length,issues:salesProblems,summary:salesRows.length?`${salesRows.length.toLocaleString("id-ID")} baris cache aktif`:"Cache penjualan belum tersedia",detail:salesProblems?`${salesProblems} status validasi perlu diperiksa`:`Data terakhir ${salesDate||"belum ada"}`,action:"spw-upload"},
   {id:"copas",label:"Data Copas",status:state(!copasRows.length,daysOld(copasDate)>1,copasNa+missingMaster),updatedAt:copasDate,total:copasRows.length,issues:copasNa+missingMaster,summary:`${copasRows.length.toLocaleString("id-ID")} baris transaksi`,detail:copasNa||missingMaster?`${copasNa} N/A · ${missingMaster} artikel belum di Master`:`Klasifikasi aktif terbaca normal`,action:"copas-repair"},
   {id:"master",label:"Master Produk",status:state(!masterRows.length,false,duplicateMaster+incompleteDevice),updatedAt:null,total:masterRows.length,issues:duplicateMaster+incompleteDevice,summary:`${masterRows.length.toLocaleString("id-ID")} produk terdaftar`,detail:duplicateMaster||incompleteDevice?`${duplicateMaster} SAP duplikat · ${incompleteDevice} Type Device kosong`:`SAP dan Type Device terbaca normal`,action:"device-pricelist"},
   {id:"soh",label:"SOH",status:state(!sohRows.length,daysOld(sohUpdated)>2),updatedAt:sohUpdated,total:sohRows.length,issues:0,summary:`${sohRows.length.toLocaleString("id-ID")} artikel stok aktif`,detail:`${zeroStock.toLocaleString("id-ID")} artikel stok 0 · bukan error data`,action:"soh-upload"},
   {id:"device-pricelist",label:"Pricelist Device Aktif",status:device?"healthy":"warning",updatedAt:device?text(device[3]):null,total:device?number(device[5]):0,issues:device?0:1,summary:device?`${number(device[5]).toLocaleString("id-ID")} SKU · ${text(device[1])}`:"Belum ada pricelist aktif",detail:device?`Tanggal pricelist ${text(device[2])||"tidak dicantumkan"}`:"Upload dan aktifkan pricelist Device",action:"device-pricelist"},
   {id:"accessory-pricelist",label:"Pricelist Accessories Aktif",status:accessory?"healthy":"warning",updatedAt:accessory?text(accessory[3]):null,total:accessory?number(accessory[5]):0,issues:accessory?0:1,summary:accessory?`${number(accessory[5]).toLocaleString("id-ID")} SKU · ${text(accessory[1])}`:"Belum ada pricelist aktif",detail:accessory?`${number(accessory[6]).toLocaleString("id-ID")} brand · ${number(accessory[7]).toLocaleString("id-ID")} kategori`:`Upload dan aktifkan pricelist Accessories`,action:"pricelist"},
  ];
  const summary={healthy:checks.filter(item=>item.status==="healthy").length,warning:checks.filter(item=>item.status==="warning").length,critical:checks.filter(item=>item.status==="critical").length,issues:checks.reduce((sum,item)=>sum+item.issues,0)};
  return NextResponse.json({ok:true,summary,checks,generatedAt:new Date().toISOString()},{headers:{"cache-control":"private, max-age=30, stale-while-revalidate=120"}});
 }catch(error){
  console.error("M238_DATA_HEALTH_ERROR",error);
  return NextResponse.json({error:error instanceof Error?error.message:"Pemeriksaan kesehatan data gagal."},{status:500,headers:{"cache-control":"no-store"}});
 }
}
