import {NextRequest,NextResponse} from "next/server";
import * as XLSX from "xlsx";
import {clearAndWrite,getSheetRanges} from "@/lib/google-sheets";
const ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";

type Cell=string|number|boolean;
function cleanText(v:unknown){return String(v??"").replace(/\u00a0/g," ").replace(/[\u0000-\u001f\u007f]+/g," ").replace(/\s+/g," ").trim()}
function normalizeCell(cell:XLSX.CellObject|undefined):Cell{
  if(!cell||cell.v===undefined||cell.v===null)return "";
  if(cell.t==="d"&&cell.v instanceof Date){const d=cell.v;return `${String(d.getUTCDate()).padStart(2,"0")}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${d.getUTCFullYear()}`}
  if(cell.t==="n"&&cell.z&&XLSX.SSF.is_date(cell.z))return XLSX.SSF.format("dd-mm-yyyy",Number(cell.v));
  if(cell.t==="n")return Number(cell.v);
  if(cell.t==="b")return Boolean(cell.v);
  return cleanText(cell.v);
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
function score(rows:Cell[][]){
  const flat=rows.flat().map(v=>String(v));
  const stockTitle=flat.some(v=>/Stock Position Report/i.test(v));
  const store=flat.some(v=>/Store\s*:/i.test(v));
  const productRows=rows.filter(r=>typeof r[6]==="number"&&typeof r[7]==="number"&&typeof r[8]==="number").length;
  return (stockTitle?1000:0)+(store?300:0)+productRows*3+Math.min(rows.length,500);
}
export async function POST(req:NextRequest){
  const e=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,k=process.env.GOOGLE_PRIVATE_KEY;
  if(!e||!k)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
  try{
    const f=(await req.formData()).get("file");
    if(!(f instanceof File)||!/\.xlsx?$/i.test(f.name))return NextResponse.json({error:"Pilih file SOH Excel .xlsx/.xls"},{status:400});
    const wb=XLSX.read(await f.arrayBuffer(),{type:"array",cellDates:true,cellNF:true,raw:true});
    const candidates=wb.SheetNames.map(name=>({name,rows:rowsFromSheet(wb.Sheets[name])})).filter(x=>x.rows.length).map(x=>({...x,score:score(x.rows)})).sort((a,b)=>b.score-a.score);
    const report=candidates[0];
    if(!report)return NextResponse.json({error:"File SOH kosong"},{status:400});
    if(report.score<300)return NextResponse.json({error:"Format SOH tidak dikenali. Pastikan file adalah Stock Position Report asli."},{status:400});
    if(report.rows.length>10000)return NextResponse.json({error:"Data SOH melebihi 10.000 baris"},{status:400});

    await clearAndWrite(ID,"'RAW StockPosition'!F:N","'RAW StockPosition'!F1",report.rows,e,k,"USER_ENTERED");

    // Verifikasi dari hasil baca Google Sheets. Untuk baris produk, L/M/N harus menjadi
    // number native Google Sheets: price, qty, total.
    const [written]=await getSheetRanges(ID,[`'RAW StockPosition'!L1:N${Math.max(1,report.rows.length)}`],e,k);
    const numericProductRows=written.filter(row=>typeof row[0]==="number"&&typeof row[1]==="number"&&typeof row[2]==="number").length;
    if(numericProductRows===0)return NextResponse.json({error:"SOH sudah ditulis tetapi Google Sheets belum mengenali kolom Price/Qty/Total sebagai angka. Upload dibatalkan untuk mencegah data stok salah."},{status:422});

    return NextResponse.json({ok:true,rows:report.rows.length,sheet:report.name,numericProductRows,storage:"google-sheets-native-values",message:`SOH berhasil. File Excel sudah dikonversi dan diverifikasi sebagai nilai Google Sheets (${report.rows.length} baris).`});
  }catch(err){return NextResponse.json({error:err instanceof Error?err.message:"Upload SOH gagal"},{status:500})}
}
