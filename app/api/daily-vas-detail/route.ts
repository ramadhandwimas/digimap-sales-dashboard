import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const SHEET_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const STORE="M238";

const s=(v:unknown)=>String(v??"").replace(/\u00a0/g," ").trim();
const up=(v:unknown)=>s(v).toUpperCase();
const n=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/\./g,"").replace(/,/g,".").replace(/[^0-9.-]/g,""))||0;
function iso(v:unknown){const x=s(v);if(/^\d{2}-\d{2}-\d{4}$/.test(x)){const[d,m,y]=x.split("-");return`${y}-${m}-${d}`}if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);return""}
function today(){return new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date())}
function provider(article:string,brand:string,vendor:string,desc:string){
 const t=`${article} ${brand} ${vendor} ${desc}`.toUpperCase().replace(/\s+/g," ");
 if(t.includes("QOALA")||/(^|\s)KLA/.test(t)||t.includes("PROTEKSI"))return"qoala";
 if(t.includes("TELKOMSEL")||/(^|\s)TSL(\s|$)/.test(t))return"telkomsel";
 if(t.includes("INDOSAT")||/(^|\s)IDT(\s|$)/.test(t))return"indosat";
 if(/(^|\s)XL(\s|$)|XXL/.test(t))return"xl";
 return"";
}
function productLabel(kind:string,article:string,desc:string){
 const a=up(article),d=s(desc);
 if(kind==="qoala"){
  if(a.startsWith("KLA")&&a.length>=4)return a.slice(0,4);
  return a||d||"Qoala";
 }
 return d||a||kind.toUpperCase();
}

export async function GET(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Koneksi Google Sheets belum tersedia"},{status:503});
 const date=req.nextUrl.searchParams.get("date")||today();
 try{
  const[dateRows]=await getSheetRanges(SHEET_ID,["'RAW SalesPerson'!AB2:AB65536"],email,key);
  const matches:number[]=[];
  dateRows.forEach((r,i)=>{if(iso(r[0])===date)matches.push(i+2)});
  if(!matches.length)return NextResponse.json({date,staff:[],source:"RAW SalesPerson"},{headers:{"cache-control":"no-store"}});
  const range=`'RAW SalesPerson'!AB${matches[0]}:AR${matches.at(-1)}`;
  const[raw]=await getSheetRanges(SHEET_ID,[range],email,key);
  const staffMap=new Map<string,{id:string;name:string;providers:Record<string,{qty:number;value:number;products:Record<string,{label:string;article:string;description:string;qty:number;value:number;invoices:string[]}>}>}>();
  for(const r of raw){
   const rowDate=iso(r[0]),id=s(r[1]),name=s(r[2]),invoice=s(r[3]),article=s(r[4]),description=s(r[5]),qty=n(r[7]),amount=n(r[8]),brand=s(r[10]),scheme=up(r[12]),vendor=s(r[13]),store=up(r[15]);
   if(rowDate!==date||!id||scheme!=="VAS"||(store&&store!==STORE)||amount===0)continue;
   const kind=provider(article,brand,vendor,description);if(!kind)continue;
   let st=staffMap.get(id);if(!st){st={id,name,providers:{}};staffMap.set(id,st)}
   st.providers[kind]||={qty:0,value:0,products:{}};
   const p=st.providers[kind],label=productLabel(kind,article,description),key2=`${label}|${up(article)}`;
   p.qty+=qty;p.value+=amount;
   p.products[key2]||={label,article,description,qty:0,value:0,invoices:[]};
   const item=p.products[key2];item.qty+=qty;item.value+=amount;if(invoice&&!item.invoices.includes(invoice))item.invoices.push(invoice);
  }
  const staff=[...staffMap.values()].map(st=>({id:st.id,name:st.name,providers:Object.fromEntries(Object.entries(st.providers).map(([k,p])=>[k,{qty:p.qty,value:p.value,products:Object.values(p.products).sort((a,b)=>b.value-a.value)}]))}));
  return NextResponse.json({date,staff,source:"RAW SalesPerson"},{headers:{"cache-control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca detail VAS"},{status:500})}
}
