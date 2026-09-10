import {NextRequest,NextResponse} from "next/server";
import * as XLSX from "xlsx";
import {appendSheetValues,clearAndWrite,ensureSheet,getSheetRanges} from "@/lib/google-sheets";

const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const TAB="Stokan";
const HEADERS=["No","Stocker","Artikel","Description","Total Stock","Backroom","Dropbox","Floor","StockDate","Period","UploadID","UploadedAt"];
const s=(v:unknown)=>String(v??"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim();
const n=(v:unknown)=>{if(typeof v==="number")return Number.isFinite(v)?v:0;const x=Number(s(v).replace(/[^\d.-]/g,""));return Number.isFinite(x)?x:0};
const norm=(v:unknown)=>s(v).toUpperCase().replace(/[^A-Z0-9]+/g," ").trim();
const safe=(v:unknown,max=120)=>s(v).replace(/[\r\n]/g," ").slice(0,max);
const isoDate=(v:unknown)=>/^\d{4}-\d{2}-\d{2}$/.test(s(v))?s(v):"";

type ParsedRow={article:string;description:string;totalStock:number;sourceNo:string};
type Staff={id:string;name:string;position:string};

async function salesAssistants(email:string,key:string){
 const[rows]=await getSheetRanges(SOURCE_ID,["Config!H1:L160"],email,key);
 const out=new Map<string,Staff>();
 for(const r of rows){
  const store=norm(r[0]),id=s(r[1]),name=s(r[2]),position=s(r[3]);
  if(store!=="M238"||!name||!norm(position).includes("SALES ASSISTANT"))continue;
  const k=id||name.toUpperCase();if(!out.has(k))out.set(k,{id,name,position});
 }
 return [...out.values()];
}

function findHeader(rows:unknown[][]){
 const articleAliases=["ARTIKEL","ARTICLE","ARTICLE NO","ARTICLE CODE","SKU","ITEM CODE","MATERIAL"];
 const descAliases=["DESCRIPTION","DESKRIPSI","NAMA AKSESORIS","NAMA ACCESSORIES","PRODUCT DESCRIPTION","ITEM DESCRIPTION"];
 const stockAliases=["TOTAL STOCK","STOCK","STOCK QTY","TOTAL QTY","QTY STOCK","SOH"];
 const noAliases=["NO","NO.","NUMBER"];
 for(let i=0;i<Math.min(rows.length,50);i++){
  const h=rows[i].map(norm),idx=(aliases:string[])=>h.findIndex(x=>aliases.includes(x));
  const article=idx(articleAliases),description=idx(descAliases),stock=idx(stockAliases),no=idx(noAliases);
  if(article>=0&&description>=0&&stock>=0)return{row:i,article,description,stock,no};
 }
 return null;
}

function parseWorkbook(file:File){
 const name=file.name.toLowerCase();
 if(!/\.(xlsx|xls|csv)$/.test(name))throw new Error("Gunakan file Excel .xlsx/.xls atau .csv");
 return file.arrayBuffer().then(buffer=>{
  const wb=XLSX.read(buffer,{type:"array",cellDates:true,raw:true});
  let best:{rows:ParsedRow[];sheet:string;missing?:string[]}|null=null;
  for(const sheet of wb.SheetNames){
   const raw=XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet],{header:1,defval:"",raw:true,blankrows:false});
   const header=findHeader(raw);
   if(!header)continue;
   const parsed:ParsedRow[]=[];
   for(let r=header.row+1;r<raw.length;r++){
    const row=raw[r]||[],article=s(row[header.article]),description=s(row[header.description]);
    if(!article&&!description)continue;
    parsed.push({article:safe(article,100),description:safe(description,240),totalStock:Math.max(0,n(row[header.stock])),sourceNo:header.no>=0?s(row[header.no]):String(parsed.length+1)});
   }
   if(parsed.length&&(!best||parsed.length>best.rows.length))best={rows:parsed,sheet};
  }
  if(!best)throw new Error("Format file stokan tidak sesuai. Kolom wajib: Artikel, Description / Nama Aksesoris, Total Stock.");
  if(best.rows.length>8000)throw new Error("Data stokan melebihi 8.000 artikel.");
  return best;
 });
}

function assign(rows:ParsedRow[],staff:Staff[]){
 const total=rows.length,count=staff.length,base=Math.floor(total/count),extra=total%count;
 let cursor=0;
 return staff.flatMap((person,index)=>{
  const take=base+(index<extra?1:0),slice=rows.slice(cursor,cursor+take);cursor+=take;
  return slice.map(row=>({...row,stocker:person.name}));
 });
}

function responseError(e:unknown,status=500){return NextResponse.json({error:e instanceof Error?e.message:"Proses stokan gagal"},{status})}

export async function GET(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  await ensureSheet(MASTER_ID,TAB,HEADERS,email,key);
  const[raw]=await getSheetRanges(MASTER_ID,[`'${TAB}'!A2:L20000`],email,key);
  const batches=new Map<string,{uploadID:string;stockDate:string;period:string;uploadedAt:string;totalArticles:number;totalStock:number;stockers:Set<string>}>();
  raw.forEach((r)=>{const uploadID=s(r[10]);if(!uploadID)return;const b=batches.get(uploadID)||{uploadID,stockDate:s(r[8]),period:s(r[9]),uploadedAt:s(r[11]),totalArticles:0,totalStock:0,stockers:new Set<string>()};b.totalArticles++;b.totalStock+=n(r[4]);if(s(r[1]))b.stockers.add(s(r[1]));if(s(r[11])>b.uploadedAt)b.uploadedAt=s(r[11]);batches.set(uploadID,b)});
  const history=[...batches.values()].sort((a,b)=>b.uploadedAt.localeCompare(a.uploadedAt)).map(x=>({uploadID:x.uploadID,stockDate:x.stockDate,period:x.period,uploadedAt:x.uploadedAt,totalArticles:x.totalArticles,totalStock:x.totalStock,totalStockers:x.stockers.size}));
  const requested=s(req.nextUrl.searchParams.get("uploadID")),selectedID=requested||history[0]?.uploadID||"";
  const rows=raw.map((r,i)=>({rowNumber:i+2,no:s(r[0]),stocker:s(r[1]),article:s(r[2]),description:s(r[3]),totalStock:n(r[4]),backroom:s(r[5]),dropbox:s(r[6]),floor:s(r[7]),stockDate:s(r[8]),period:s(r[9]),uploadID:s(r[10]),uploadedAt:s(r[11])})).filter(r=>r.uploadID===selectedID);
  const staff=await salesAssistants(email,key);
  const selected=history.find(x=>x.uploadID===selectedID)||null;
  return NextResponse.json({history,selected,rows,staff},{headers:{"cache-control":"no-store"}});
 }catch(e){return responseError(e)}
}

export async function POST(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const type=req.headers.get("content-type")||"";
  if(type.includes("multipart/form-data")){
   const form=await req.formData(),action=s(form.get("action")||"preview"),file=form.get("file");
   if(action!=="preview"||!(file instanceof File))return NextResponse.json({error:"File stokan tidak ditemukan"},{status:400});
   const parsed=await parseWorkbook(file),staff=await salesAssistants(email,key);
   if(!staff.length)return NextResponse.json({error:"Tidak ada Sales Assistant yang tersedia untuk periode ini."},{status:422});
   const min=Math.floor(parsed.rows.length/staff.length),max=Math.ceil(parsed.rows.length/staff.length);
   return NextResponse.json({ok:true,fileName:file.name,sheet:parsed.sheet,rows:parsed.rows,totalArticles:parsed.rows.length,totalStock:parsed.rows.reduce((a,r)=>a+r.totalStock,0),staff,distribution:{min,max}});
  }

  const body=await req.json(),action=s(body.action);
  if(action==="commit"){
   const period=safe(body.period,80),stockDate=isoDate(body.stockDate),input=Array.isArray(body.rows)?body.rows:[];
   if(!period||!stockDate)return NextResponse.json({error:"Periode dan tanggal stokan wajib diisi."},{status:400});
   const rows:ParsedRow[]=input.map((r:Record<string,unknown>,i:number)=>({article:safe(r.article,100),description:safe(r.description,240),totalStock:Math.max(0,n(r.totalStock)),sourceNo:s(r.sourceNo)||String(i+1)})).filter((r:ParsedRow)=>r.article||r.description);
   if(!rows.length)return NextResponse.json({error:"Tidak ada artikel yang dapat diproses."},{status:400});
   if(rows.length>8000)return NextResponse.json({error:"Data stokan melebihi 8.000 artikel."},{status:400});
   const staff=await salesAssistants(email,key);if(!staff.length)return NextResponse.json({error:"Tidak ada Sales Assistant yang tersedia untuk periode ini."},{status:422});
   const assigned=assign(rows,staff),uploadID=`STK-${stockDate.replace(/-/g,"")}-${crypto.randomUUID().slice(0,8).toUpperCase()}`,uploadedAt=new Date().toISOString();
   await ensureSheet(MASTER_ID,TAB,HEADERS,email,key);
   const values=assigned.map((r,i)=>[i+1,r.stocker,r.article,r.description,r.totalStock,"","","",stockDate,period,uploadID,uploadedAt]);
   await appendSheetValues(MASTER_ID,`'${TAB}'!A:L`,values,email,key);
   return NextResponse.json({ok:true,uploadID,rows:values.length,message:`Stokan berhasil — ${values.length} artikel dibagi ke ${staff.length} Sales Assistant.`});
  }

  if(action==="override"){
   const rowNumber=Math.floor(n(body.rowNumber)),uploadID=s(body.uploadID),stocker=s(body.stocker);
   if(rowNumber<2||!uploadID||!stocker)return NextResponse.json({error:"Data override tidak valid."},{status:400});
   const staff=await salesAssistants(email,key);if(!staff.some(x=>x.name===stocker))return NextResponse.json({error:"Stocker harus berstatus Sales Assistant aktif."},{status:400});
   const[check]=await getSheetRanges(MASTER_ID,[`'${TAB}'!A${rowNumber}:L${rowNumber}`],email,key);
   if(s(check?.[0]?.[10])!==uploadID)return NextResponse.json({error:"Record stokan tidak cocok. Muat ulang data lalu coba lagi."},{status:409});
   await clearAndWrite(MASTER_ID,null,`'${TAB}'!B${rowNumber}`,[[stocker]],email,key,"RAW");
   return NextResponse.json({ok:true,message:"Stocker berhasil diubah."});
  }

  return NextResponse.json({error:"Action tidak dikenali."},{status:400});
 }catch(e){return responseError(e)}
}
