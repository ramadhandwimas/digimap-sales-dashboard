import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const DASHBOARD_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const s=(v:unknown)=>String(v??"").trim();
const n=(v:unknown)=>typeof v==="number"?v:Number(s(v).replace(/[^0-9.-]/g,""))||0;
const iso=(v:unknown)=>{if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);const x=s(v);if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);const m=x.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:""};
const mondayWindow=(anchor:string)=>{const d=new Date(`${anchor}T00:00:00Z`),offset=(d.getUTCDay()+6)%7,start=new Date(d.getTime()-offset*86400000),end=new Date(start.getTime()+6*86400000);return{start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)}};

type Product={article:string;description:string;type:string;lob:string;prevQty:number;currQty:number;stockQty:number};

type Side={label:string;period:{start:string;end:string};traffic:number;transactions:number;qty:number;upt:number;sales:number;products:Record<string,{article:string;description:string;type:string;qty:number}>};

function lobKey(category:string){const c=category.toUpperCase();if(c==="IPHONE")return"IPHONE";if(c==="IPAD")return"IPAD";if(c==="AIRPODS")return"AIRPODS";if(c==="APPLE WATCH")return"APPLE WATCH";if(c.includes("MAC"))return"MAC";return""}

export async function GET(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 const from=req.nextUrl.searchParams.get("from")||"",to=req.nextUrl.searchParams.get("to")||"";
 if(!from||!to)return NextResponse.json({error:"Week compare belum dipilih"},{status:400});
 try{
  const[[rows,iphone,ipad,mac,watch,airpods],[trafficRows]]=await Promise.all([
   getSheetRanges(DASHBOARD_ID,["'Data Copas'!A2:S50000","'SOH'!C10:E200","'SOH'!J10:L200","'SOH'!Q10:S200","'SOH'!X10:Z200","'SOH'!AE10:AG200"],email,key),
   getSheetRanges(MASTER_ID,["'Traffic'!A2:B1000"],email,key)
  ]);
  const storeRows=rows.filter(r=>s(r[15])==="M238"&&s(r[18])==="2026"&&(s(r[14])===from||s(r[14])===to));
  const makeSide=(label:string):Side=>{
   const rr=storeRows.filter(r=>s(r[14])===label),dates=rr.map(r=>iso(r[0])).filter(Boolean).sort();
   const period=dates.length?mondayWindow(dates[0]):{start:"",end:""};
   const invoices=new Set<string>();let qty=0,sales=0;const products:Side["products"]={};
   for(const r of rr){const invoice=s(r[3]),q=n(r[7]),amount=n(r[8]),scheme=s(r[12]).toUpperCase(),lob=lobKey(s(r[9]));if(invoice)invoices.add(invoice);if(q>0)qty+=q;if(["DEVICES","ACCESSORIES","VAS"].includes(scheme))sales+=amount;if(lob&&q){const article=s(r[4]),description=s(r[5]),type=s(r[6])||description,k=`${lob}|${article||description}`;const p=products[k]??{article,description,type,lob,qty:0};p.qty+=q;products[k]=p}}
   const traffic=trafficRows.reduce((a,r)=>{const d=iso(r[0]);return a+(d&&period.start&&d>=period.start&&d<=period.end?n(r[1]):0)},0),transactions=invoices.size;
   return{label,period,traffic,transactions,qty,upt:transactions?qty/transactions:0,sales,products};
  };
  const a=makeSide(from),b=makeSide(to);
  const stock=new Map<string,number>();for(const group of [iphone,ipad,mac,watch,airpods])for(const r of group){const article=s(r[0]).toUpperCase(),q=n(r[2]);if(article&&article!=="ARTICLE"&&article!=="GRAND TOTAL")stock.set(article,q)}
  const keys=new Set([...Object.keys(a.products),...Object.keys(b.products)]),productCompare:Product[]=[];
  for(const k of keys){const pa=a.products[k],pb=b.products[k],base=pb||pa;if(!base)continue;productCompare.push({article:base.article,description:base.description,type:base.type,lob:base.lob,prevQty:pa?.qty||0,currQty:pb?.qty||0,stockQty:base.article?stock.get(base.article.toUpperCase())||0:0})}
  productCompare.sort((x,y)=>(y.prevQty-y.currQty)-(x.prevQty-x.currQty));
  return NextResponse.json({a:{label:a.label,period:a.period,traffic:a.traffic,transactions:a.transactions,qty:a.qty,upt:a.upt,sales:a.sales},b:{label:b.label,period:b.period,traffic:b.traffic,transactions:b.transactions,qty:b.qty,upt:b.upt,sales:b.sales},products:productCompare},{headers:{"cache-control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca weekly metrics"},{status:500})}
}
