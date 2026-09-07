import {NextRequest,NextResponse} from "next/server";
import {appendSheetValues,clearAndWrite,getSheetRanges} from "@/lib/google-sheets";
const DASHBOARD_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0",MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk",MASTER_URL=`https://docs.google.com/spreadsheets/d/${MASTER_ID}/edit`;
const text=(v:unknown)=>String(v??"").trim();
function rowKey(r:unknown[]){return [r[0],r[1],r[3],r[4],r[7],r[8]].map(text).join("|")}
function fingerprint(rows:unknown[][]){const keys=rows.map(rowKey);const amount=rows.reduce((a,r)=>a+(Number(r[8])||0),0);return `${rows.length}|${keys[0]||""}|${keys.at(-1)||""}|${Math.round(amount)}`}
function jakartaTime(v:unknown){const d=new Date(text(v));if(Number.isNaN(d.getTime()))return "waktu sebelumnya";return new Intl.DateTimeFormat("id-ID",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"short",year:"numeric",timeZone:"Asia/Jakarta"}).format(d)}
export async function POST(req:NextRequest){const e=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,k=process.env.GOOGLE_PRIVATE_KEY;if(!e||!k)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});const b=await req.json(),action=String(b.action||"");try{
 if(action==="cutoff-spw"){
  const[r,current,logs]=await getSheetRanges(DASHBOARD_ID,["'RAW SalesPerson'!AB2:AR65536","'Data Copas'!A2:Q50000"],e,k).then(async x=>[x[0],x[1],(await getSheetRanges(MASTER_ID,["'UPLOAD LOG'!A1:H5000"],e,k))[0]]);
  const rows=r.filter(x=>x.some(v=>text(v)));if(!rows.length)return NextResponse.json({error:"Belum ada data SPW yang dapat di-cut off"},{status:400});
  const fp=fingerprint(rows),existingKeys=new Set(current.filter(x=>x.some(v=>text(v))).map(rowKey)),newRows=rows.filter(x=>!existingKeys.has(rowKey(x)));
  const prior=[...logs].reverse().find(x=>text(x[1]).toUpperCase()==="CUTOFF SPW"&&text(x[7])===fp);
  if(!newRows.length){const when=prior?jakartaTime(prior[0]):"sebelumnya";return NextResponse.json({error:`Data SPW ini sudah pernah di-cut off pada ${when}. Cut Off ditolak agar Data Copas tidak double.`,alreadyCutOff:true,cutoffAt:prior?.[0]||null},{status:409})}
  await appendSheetValues(DASHBOARD_ID,"'Data Copas'!A:Q",newRows,e,k);
  const ts=new Date().toISOString();await appendSheetValues(MASTER_ID,"'UPLOAD LOG'!A:H",[[ts,"CUTOFF SPW","RAW SalesPerson AB:AR",newRows.length,newRows.reduce((a,r)=>a+(Number(r[8])||0),0),rows.length,"SUCCESS",fp]],e,k);
  return NextResponse.json({ok:true,rows:newRows.length,skipped:rows.length-newRows.length,cutoffAt:ts,message:`Cut Off SPW berhasil pukul ${jakartaTime(ts)}. ${newRows.length} baris baru ditambahkan ke Data Copas${rows.length-newRows.length?`; ${rows.length-newRows.length} baris duplikat dilewati`:""}.`})
 }
 if(["clear-spw","clear-soh","open-master"].includes(action)){const pin=process.env.ADMIN_PASSCODE;if(!pin)return NextResponse.json({error:"ADMIN_PASSCODE belum dipasang di Vercel"},{status:503});if(String(b.passcode||"")!==pin)return NextResponse.json({error:"Passcode admin salah"},{status:403});if(action==="open-master")return NextResponse.json({ok:true,url:MASTER_URL});if(action==="clear-spw"){await Promise.all([clearAndWrite(MASTER_ID,"'SPW'!A:C","'SPW'!A1",[["","",""]],e,k,"RAW"),clearAndWrite(DASHBOARD_ID,"'RAW SalesPerson'!R:T","'RAW SalesPerson'!R1",[["","",""]],e,k,"RAW")]);return NextResponse.json({ok:true,message:"Clear SPW berhasil. MASTER DATA M238 / SPW dan mirror RAW SalesPerson R–T sudah dibersihkan."})}await Promise.all([clearAndWrite(MASTER_ID,"'SOH'!A:I","'SOH'!A1",[["","","","","","","","",""]],e,k,"RAW"),clearAndWrite(DASHBOARD_ID,"'RAW StockPosition'!F:N","'RAW StockPosition'!F1",[["","","","","","","","",""]],e,k,"RAW")]);return NextResponse.json({ok:true,message:"Clear SOH berhasil. MASTER DATA M238 / SOH dan mirror RAW StockPosition F–N sudah dibersihkan."})}
 return NextResponse.json({error:"Action tidak dikenal"},{status:400});
 }catch(err){return NextResponse.json({error:err instanceof Error?err.message:"Operasi gagal"},{status:500})}}
