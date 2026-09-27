import {NextRequest,NextResponse} from "next/server";
import {GET as originalGET} from "@/app/api/daily-summary-fast/route";
import {getSheetRanges} from "@/lib/google-sheets";
import {aggregateSales,isValidSale,parseSalesRow,vasKey,saleKind} from "@/lib/m238-sales-sanitize";

const SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";

export async function GET(req:NextRequest){
 const original=await originalGET(req);
 if(!original.ok)return original;
 const data:any=await original.json();
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 const from=req.nextUrl.searchParams.get("from")||data.from,to=req.nextUrl.searchParams.get("to")||data.to;
 if(!email||!key||!from||!to)return NextResponse.json(data,{headers:{"cache-control":"no-store"}});
 try{
  const[raw]=await getSheetRanges(SOURCE_ID,["'Data Copas'!A2:S50000"],email,key);
  const rows=(raw||[]).map(parseSalesRow).filter(r=>r.date>=from&&r.date<=to&&isValidSale(r));
  const existingByDate=new Map((data.dailyRows||[]).map((r:any)=>[r.date,r]));
  const dates=[...new Set([...rows.map(r=>r.date),...(data.dailyRows||[]).map((r:any)=>r.date)])].filter(Boolean).sort();
  data.dailyRows=dates.map(date=>{
    const prev:any=existingByDate.get(date)||{};const day=rows.filter(r=>r.date===date);const a=aggregateSales(day);
    const vas=(provider:string)=>day.filter(r=>saleKind(r)==="vas"&&vasKey(r)===provider).reduce((x,r)=>({qty:x.qty+r.qty,value:x.value+r.amount}),{qty:0,value:0});
    const q=vas("qoala"),t=vas("telkomsel"),x=vas("xl"),i=vas("indosat");
    const traffic=Number(prev.traffic||0),target=Number(prev.target||0),cvr=traffic?a.invoices/traffic*100:0;
    return{...prev,date,totalSales:a.amount,target,achievementPct:target?a.amount/target*100:0,transaction:a.invoices,invoice:a.invoices,qty:a.qty,upt:a.upt,atv:a.atv,cvr,breakdown:{device:a.device,accessories:a.accessories,vas:a.vas},lob:{iphoneQty:a.lob.iphone,macbookQty:a.lob.mac,ipadQty:a.lob.ipad,appleWatchQty:a.lob.watch,airpodsQty:a.lob.airpods},vas:{qoalaQty:q.qty,qoalaValue:q.value,telkomselQty:t.qty,telkomselValue:t.value,xlQty:x.qty,xlValue:x.value,indosatQty:i.qty,indosatValue:i.value}};
  });
  const all=aggregateSales(rows),traffic=(data.dailyRows||[]).reduce((a:number,r:any)=>a+Number(r.traffic||0),0),target=Number(data.summary?.target||0),cvr=traffic?all.invoices/traffic*100:0;
  data.summary={...data.summary,totalSales:all.amount,achievementPct:target?all.amount/target*100:0,transaction:all.invoices,invoice:all.invoices,qty:all.qty,upt:all.upt,atv:all.atv,traffic,cvr};
  data.breakdown={device:all.device,accessories:all.accessories,vas:all.vas,lob:{iphone:all.lob.iphone,macbook:all.lob.mac,ipad:all.lob.ipad,appleWatch:all.lob.watch,airpods:all.lob.airpods}};
  if(data.lobFocus?.lob){if(data.lobFocus.lob.iphone)data.lobFocus.lob.iphone.achievement=all.lob.iphone;if(data.lobFocus.lob.macbook)data.lobFocus.lob.macbook.achievement=all.lob.mac;if(data.lobFocus.lob.ipad)data.lobFocus.lob.ipad.achievement=all.lob.ipad;if(data.lobFocus.lob.appleWatch)data.lobFocus.lob.appleWatch.achievement=all.lob.watch;}
  data.source="Data Copas • voucher excluded • AirPods fixed";
  data.generatedAt=new Date().toISOString();
  return NextResponse.json(data,{headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json(data,{headers:{"cache-control":"no-store"}})}
}
