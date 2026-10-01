"use server";
import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const STORE="M238";
const s=(v:unknown)=>String(v??"").replace(/\u00a0/g," ").trim();
const up=(v:unknown)=>s(v).toUpperCase();
const n=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/\./g,"").replace(/,/g,".").replace(/[^0-9.-]/g,""))||0;
const iso=(v:unknown)=>{const x=s(v);if(/^\d{2}-\d{2}-\d{4}$/.test(x)){const p=x.split("-");return `${p[2]}-${p[1]}-${p[0]}`}if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);return""};
const today=()=>new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());

export async function GET(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Koneksi Google Sheets belum tersedia"},{status:503});
 const date=req.nextUrl.searchParams.get("date")||today();
 try{
  const first=await getSheetRanges(ID,["'RAW SalesPerson'!AB2:AB65536"],email,key),dates=first[0]||[],matches:number[]=[];
  dates.forEach((r,i)=>{if(iso(r[0])===date)matches.push(i+2)});
  let raw:unknown[][]=[];
  if(matches.length){const data=await getSheetRanges(ID,[`'RAW SalesPerson'!AB${matches[0]}:AR${matches[matches.length-1]}`],email,key);raw=data[0]||[]}
  else{const data=await getSheetRanges(ID,["'Data Copas'!A2:S50000"],email,key);raw=(data[0]||[]).filter(r=>iso(r[0])===date&&up(r[15])===STORE)}
  const rows=raw.map(r=>({date:iso(r[0]),id:s(r[1]),name:s(r[2]),invoice:s(r[3]),qty:n(r[7]),amount:n(r[8]),scheme:s(r[12]),store:up(r[15])})).filter(r=>r.date===date&&(!r.store||r.store===STORE)&&up(r.scheme)!=="VOUCHER");
  const staffMap=new Map<string,{id:string;name:string;qty:number;amount:number;invoices:Set<string>}>();
  const invoiceMap=new Map<string,{invoice:string;staffId:string;staff:string;qty:number;value:number}>();
  for(const r of rows){
   if(r.id){let st=staffMap.get(r.id);if(!st){st={id:r.id,name:r.name,qty:0,amount:0,invoices:new Set()};staffMap.set(r.id,st)}st.qty+=r.qty;st.amount+=r.amount;if(r.invoice)st.invoices.add(r.invoice)}
   if(r.invoice){const x=invoiceMap.get(r.invoice)||{invoice:r.invoice,staffId:r.id,staff:r.name,qty:0,value:0};x.qty+=r.qty;x.value+=r.amount;invoiceMap.set(r.invoice,x)}
  }
  const staff=[...staffMap.values()].map(x=>({id:x.id,name:x.name,qty:x.qty,invoices:x.invoices.size,upt:x.invoices.size?x.qty/x.invoices.size:0,amount:x.amount})).sort((a,b)=>b.upt-a.upt||b.qty-a.qty||b.amount-a.amount);
  const invoices=[...invoiceMap.values()].sort((a,b)=>b.value-a.value||a.invoice.localeCompare(b.invoice));
  return NextResponse.json({date,staff,invoices,total:{qty:staff.reduce((a,x)=>a+x.qty,0),invoices:invoices.length,upt:invoices.length?staff.reduce((a,x)=>a+x.qty,0)/invoices.length:0}},{headers:{"cache-control":"private, max-age=30, stale-while-revalidate=60"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca detail KPI harian"},{status:500})}
}
