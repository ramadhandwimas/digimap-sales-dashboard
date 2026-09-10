import {NextRequest,NextResponse} from "next/server";
import {appendSheetValues,clearAndWrite,ensureSheet,getSheetRanges} from "@/lib/google-sheets";

const ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const SHEET="BNPL_TradeIn";
const HEAD=["ID","Date","Category","Provider","Qty","Amount","Notes","Updated By","Updated At"];
const PROVIDERS={BNPL:["HCI","Indodana","Kredivo","Akulaku","SPayLater"],"Trade-In":["Laku6 Master Device","OnePulse"]} as const;
type Category=keyof typeof PROVIDERS;

const text=(v:unknown)=>String(v??"").trim();
const number=(v:unknown)=>{const x=typeof v==="number"?v:Number(String(v??"").replace(/[^0-9.-]/g,""));return Number.isFinite(x)?x:0};
function isoDate(v:unknown){
 if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);
 const x=text(v);
 if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);
 const m=x.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
 return m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:"";
}
function validDate(v:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(`${v}T00:00:00Z`);return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v}
function category(v:unknown):Category|null{const x=text(v).toUpperCase().replace(/[_\s]+/g,"-");if(x==="BNPL")return"BNPL";if(x==="TRADE-IN"||x==="TRADEIN")return"Trade-In";return null}
function canonicalProvider(cat:Category,v:unknown){const raw=text(v),match=PROVIDERS[cat].find(x=>x.toLowerCase()===raw.toLowerCase());return match||""}
function toRecord(row:unknown[],rowNumber:number){return{id:text(row[0]),date:isoDate(row[1]),category:category(row[2])||"BNPL",provider:text(row[3]),qty:number(row[4]),amount:number(row[5]),notes:text(row[6]),updatedBy:text(row[7]),updatedAt:text(row[8]),rowNumber}}
async function context(){const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)throw new Error("Google Sheets belum dikonfigurasi");await ensureSheet(ID,SHEET,HEAD,email,key);return{email,key}}
async function allRows(email:string,key:string){const[r]=await getSheetRanges(ID,[`'${SHEET}'!A2:I5000`],email,key);return(r||[]).map((row,i)=>toRecord(row,i+2)).filter(x=>x.id)}
function validate(body:any){const d=text(body.date),cat=category(body.category??body.group),provider=cat?canonicalProvider(cat,body.provider??body.type):"",qty=Number(body.qty),amount=Number(body.amount),notes=text(body.notes),updatedBy=text(body.updatedBy)||"Dashboard User";if(!validDate(d)||!cat||!provider||!Number.isFinite(qty)||qty<0||!Number.isFinite(amount)||amount<0)return{error:"Data BNPL/Trade-In tidak valid. Periksa tanggal, kategori, provider, qty, dan amount."} as const;return{date:d,category:cat,provider,qty,amount,notes,updatedBy} as const}
function summarize(rows:Awaited<ReturnType<typeof allRows>>){const providers=[...PROVIDERS.BNPL,...PROVIDERS["Trade-In"]];const providerSummary=providers.map(provider=>{const source=rows.filter(r=>r.provider.toLowerCase()===provider.toLowerCase());return{provider,category:(PROVIDERS.BNPL as readonly string[]).includes(provider)?"BNPL":"Trade-In",qty:source.reduce((a,r)=>a+r.qty,0),amount:source.reduce((a,r)=>a+r.amount,0)}});const total=rows.reduce((a,r)=>({qty:a.qty+r.qty,amount:a.amount+r.amount}),{qty:0,amount:0});const bnpl=rows.filter(r=>r.category==="BNPL").reduce((a,r)=>({qty:a.qty+r.qty,amount:a.amount+r.amount}),{qty:0,amount:0});const tradeIn=rows.filter(r=>r.category==="Trade-In").reduce((a,r)=>({qty:a.qty+r.qty,amount:a.amount+r.amount}),{qty:0,amount:0});return{providerSummary,total,bnpl,tradeIn}}

export async function GET(req:NextRequest){
 try{const{email,key}=await context(),period=req.nextUrl.searchParams.get("period")||"",selected=req.nextUrl.searchParams.get("date")||"";if(period&&!/^\d{4}-\d{2}$/.test(period))return NextResponse.json({error:"Format bulan tidak valid"},{status:400});const rows=(await allRows(email,key)).filter(x=>(!period||x.date.startsWith(period))&&(!selected||x.date===selected)).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));return NextResponse.json({rows,...summarize(rows),providers:PROVIDERS},{headers:{"Cache-Control":"private, max-age=0, must-revalidate"}})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca BNPL & Trade-In"},{status:500})}
}

export async function POST(req:NextRequest){
 try{const{email,key}=await context(),body=await req.json(),v=validate(body);if("error"in v)return NextResponse.json({error:v.error},{status:400});const id=`BNPL-${v.date.replaceAll("-","")}-${crypto.randomUUID().slice(0,8).toUpperCase()}`,updatedAt=new Date().toISOString();await appendSheetValues(ID,`'${SHEET}'!A:I`,[[id,v.date,v.category,v.provider,v.qty,v.amount,v.notes,v.updatedBy,updatedAt]],email,key);return NextResponse.json({ok:true,id})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal menyimpan data"},{status:500})}
}

export async function PUT(req:NextRequest){
 try{const{email,key}=await context(),body=await req.json(),id=text(body.id),v=validate(body);if(!id)return NextResponse.json({error:"ID record tidak valid"},{status:400});if("error"in v)return NextResponse.json({error:v.error},{status:400});const rows=await allRows(email,key),found=rows.find(x=>x.id===id);if(!found)return NextResponse.json({error:"Record tidak ditemukan"},{status:404});const updatedAt=new Date().toISOString();await clearAndWrite(ID,null,`'${SHEET}'!A${found.rowNumber}:I${found.rowNumber}`,[[id,v.date,v.category,v.provider,v.qty,v.amount,v.notes,v.updatedBy,updatedAt]],email,key,"USER_ENTERED");return NextResponse.json({ok:true,id})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal mengubah data"},{status:500})}
}

export async function DELETE(req:NextRequest){
 try{const{email,key}=await context(),body=await req.json(),id=text(body.id);if(!id)return NextResponse.json({error:"ID record tidak valid"},{status:400});const rows=await allRows(email,key),found=rows.find(x=>x.id===id);if(!found)return NextResponse.json({error:"Record tidak ditemukan"},{status:404});await clearAndWrite(ID,null,`'${SHEET}'!A${found.rowNumber}:I${found.rowNumber}`,[["","","","","","","","",""]],email,key,"RAW");return NextResponse.json({ok:true,id})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal menghapus data"},{status:500})}
}
