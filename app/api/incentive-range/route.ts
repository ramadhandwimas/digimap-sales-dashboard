import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0",STORE="M238";
const s=(v:unknown)=>String(v??"").trim(),up=(v:unknown)=>s(v).toUpperCase();
const n=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/\./g,"").replace(/,/g,".").replace(/[^0-9.-]/g,""))||0;
const iso=(v:unknown)=>{const x=s(v);if(/^\d{2}-\d{2}-\d{4}$/.test(x)){const[d,m,y]=x.split("-");return`${y}-${m}-${d}`}if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);return""};
const accRate=(price:number)=>price<=599000?5000:price<=2000000?10000:price<=4000000?20000:price<=6000000?40000:80000;
const vasType=(article:string,brand:string,vendor:string,description:string)=>{const t=`${article} ${brand} ${vendor} ${description}`.toUpperCase();if(t.includes("QOALA")||t.includes("KLA"))return"qoala";return""};
const today=()=>new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());

type Inc={mac:number;iphone:number;ipad:number;watch:number;accessories:number;qoala:number;total:number};
type Qty={mac:number;iphone:number;ipad:number;watch:number;accessories:number;qoala:number};
type RateMap=Record<string,number>;
type StaffCalc={id:string;name:string;incentive:Inc;qty:Qty;activeDates:Set<string>;rates:{accessories:RateMap;qoala:RateMap}};

export async function GET(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 try{
  const now=today(),from=req.nextUrl.searchParams.get("from")||`${now.slice(0,7)}-01`,to=req.nextUrl.searchParams.get("to")||now;
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(from)||!/^20\d{2}-\d{2}-\d{2}$/.test(to)||from>to)return NextResponse.json({error:"Range tanggal tidak valid"},{status:400});
  const[dataRows,config]=await getSheetRanges(ID,["'Data Copas'!A2:S50000","Config!A1:AZ120"],email,key);
  const roster=config.slice(27,55).filter(r=>s(r[7])===STORE&&s(r[8])&&s(r[9])&&!/SUPERVISOR|ONLINE/i.test(s(r[10]))).map(r=>({id:s(r[8]),name:s(r[9])}));
  const byId=new Map<string,StaffCalc>(roster.map(r=>[r.id,{...r,incentive:{mac:0,iphone:0,ipad:0,watch:0,accessories:0,qoala:0,total:0},qty:{mac:0,iphone:0,ipad:0,watch:0,accessories:0,qoala:0},activeDates:new Set<string>(),rates:{accessories:{},qoala:{}}}]));
  const addRate=(map:RateMap,rate:number,qty:number)=>{const k=String(rate);map[k]=(map[k]||0)+qty};
  for(const r of dataRows){
   const date=iso(r[0]);if(date<from||date>to)continue;
   const id=s(r[1]),row=byId.get(id);if(!row)continue;
   const qty=Math.max(0,n(r[7])),amount=n(r[8]),category=up(r[9]),brand=up(r[10]),scheme=up(r[12]),article=s(r[4]),description=s(r[5]),vendor=s(r[13]);
   if(qty<=0)continue;
   let eligible=false;
   if(brand==="APPLE"&&scheme==="DEVICES"){
    if(category==="IPHONE"){row.incentive.iphone+=qty*15000;row.qty.iphone+=qty;eligible=true}
    else if(category==="MAC"){row.incentive.mac+=qty*30000;row.qty.mac+=qty;eligible=true}
    else if(category==="IPAD"){row.incentive.ipad+=qty*10000;row.qty.ipad+=qty;eligible=true}
    else if(category==="APPLE WATCH"){row.incentive.watch+=qty*10000;row.qty.watch+=qty;eligible=true}
   }else if(scheme==="ACCESSORIES"){
    const unit=Math.abs(amount)/Math.max(1,qty),rate=accRate(unit);row.incentive.accessories+=rate*qty;row.qty.accessories+=qty;addRate(row.rates.accessories,rate,qty);eligible=true;
   }else if(scheme==="VAS"&&vasType(article,brand,vendor,description)==="qoala"){
    const unit=Math.abs(amount)/Math.max(1,qty),rate=unit>=1315000?50000:15000;row.incentive.qoala+=rate*qty;row.qty.qoala+=qty;addRate(row.rates.qoala,rate,qty);eligible=true;
   }
   if(eligible)row.activeDates.add(date);
  }
  const rows=[...byId.values()].map(r=>{
   r.incentive.total=r.incentive.mac+r.incentive.iphone+r.incentive.ipad+r.incentive.watch+r.incentive.accessories+r.incentive.qoala;
   return{id:r.id,name:r.name,incentive:r.incentive,qty:r.qty,activeDays:r.activeDates.size,rates:r.rates};
  }).sort((a,b)=>b.incentive.total-a.incentive.total);
  const total=rows.reduce((a,r)=>a+r.incentive.total,0);
  return NextResponse.json({from,to,rows,total},{headers:{"cache-control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca incentive range"},{status:500})}
}
