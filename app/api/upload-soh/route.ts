import {NextRequest,NextResponse} from "next/server";
import * as XLSX from "xlsx";
import {clearAndWrite} from "@/lib/google-sheets";
const ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";

type Cell=string|number|boolean;
function normalizeCell(cell:XLSX.CellObject|undefined):Cell{
  if(!cell||cell.v===undefined||cell.v===null)return "";
  if(cell.t==="d"&&cell.v instanceof Date){const d=cell.v;return `${String(d.getUTCDate()).padStart(2,"0")}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${d.getUTCFullYear()}`}
  if(cell.t==="n"&&cell.z&&XLSX.SSF.is_date(cell.z))return XLSX.SSF.format("dd-mm-yyyy",Number(cell.v));
  if(cell.t==="n")return Number(cell.v);
  if(cell.t==="b")return Boolean(cell.v);
  return String(cell.v).replace(/\u00a0/g," ").trim();
}
function rowsFromSheet(ws:XLSX.WorkSheet){
  if(!ws["!ref"])return [] as Cell[][];
  const range=XLSX.utils.decode_range(ws["!ref"]),rows:Cell[][]=[];
  for(let r=range.s.r;r<=range.e.r;r++){
    const row=Array.from({length:9},(_,i)=>normalizeCell(ws[XLSX.utils.encode_cell({r,c:range.s.c+i})]));
    if(row.some(v=>String(v).trim()))rows.push(row);
  }
  return rows;
}
export async function POST(req:NextRequest){
  const e=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,k=process.env.GOOGLE_PRIVATE_KEY;
  if(!e||!k)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
  try{
    const f=(await req.formData()).get("file");
    if(!(f instanceof File)||!/\.xlsx?$/i.test(f.name))return NextResponse.json({error:"Pilih file SOH Excel .xlsx/.xls"},{status:400});
    const wb=XLSX.read(await f.arrayBuffer(),{type:"array",cellDates:true,cellNF:true});
    const candidates=wb.SheetNames.map(name=>({name,rows:rowsFromSheet(wb.Sheets[name])})).filter(x=>x.rows.length).sort((a,b)=>b.rows.length-a.rows.length);
    const report=candidates[0];
    if(!report)return NextResponse.json({error:"File SOH kosong"},{status:400});
    if(report.rows.length>10000)return NextResponse.json({error:"Data SOH melebihi 10.000 baris"},{status:400});
    // USER_ENTERED meniru paste ke Google Sheets agar formula membaca angka/tanggal dengan benar.
    await clearAndWrite(ID,"'RAW StockPosition'!F:N","'RAW StockPosition'!F1",report.rows,e,k,"USER_ENTERED");
    return NextResponse.json({ok:true,rows:report.rows.length,sheet:report.name,message:`SOH berhasil di-upload (${report.rows.length} baris).`});
  }catch(err){return NextResponse.json({error:err instanceof Error?err.message:"Upload SOH gagal"},{status:500})}
}
