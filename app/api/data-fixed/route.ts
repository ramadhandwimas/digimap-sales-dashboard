import {NextRequest,NextResponse} from "next/server";
import {GET as originalGET} from "@/app/api/data/route";
import {getSheetRanges} from "@/lib/google-sheets";
import {aggregateSales,isValidSale,parseSalesRow,vasKey,saleKind} from "@/lib/m238-sales-sanitize";

const SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";

export async function GET(req:NextRequest){
 const original=await originalGET(req);
 if(!original.ok)return original;
 const data:any=await original.json();
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json(data,{headers:{"cache-control":"no-store"}});
 const period=req.nextUrl.searchParams.get("period")||data.period;
 try{
  const[monthRaw,rawToday]=await getSheetRanges(SOURCE_ID,["'Data Copas'!A2:S50000","'RAW SalesPerson'!AB2:AR65536"],email,key);
  const monthRows=(monthRaw||[]).map(parseSalesRow).filter(r=>r.date.startsWith(period)&&isValidSale(r));
  const latestDate=data.latestDate||monthRows.map(r=>r.date).sort().at(-1)||`${period}-01`;
  const todayRowsRaw=(rawToday||[]).map(parseSalesRow).filter(r=>r.date===latestDate&&isValidSale(r,false));
  const todayRows=todayRowsRaw.length?todayRowsRaw:monthRows.filter(r=>r.date===latestDate);
  const byId=(rows:any[])=>{const m=new Map<string,ReturnType<typeof aggregateSales>>();for(const id of new Set(rows.map(r=>r.id).filter(Boolean)))m.set(id,aggregateSales(rows.filter(r=>r.id===id)));return m};
  const monthById=byId(monthRows),todayById=byId(todayRows);
  const patchStaff=(st:any,a:ReturnType<typeof aggregateSales>|undefined)=>!a?{...st,lob:{iphone:0,mac:0,ipad:0,watch:0,airpods:0}}:{...st,amount:a.amount,device:a.device,accessories:a.accessories,vas:a.vas,qty:a.qty,invoices:a.invoices,upt:a.upt,atv:a.atv,lob:a.lob,vasDetail:a.vasDetail};
  data.monthlyStaff=(data.monthlyStaff||[]).map((st:any)=>patchStaff(st,monthById.get(String(st.id))));
  data.dailyStaff=(data.dailyStaff||[]).map((st:any)=>patchStaff(st,todayById.get(String(st.id))));
  const dateSet=[...new Set(monthRows.map(r=>r.date))].sort();
  data.daily=dateSet.map(date=>{const day=monthRows.filter(r=>r.date===date),a=aggregateSales(day),vas=(provider:string)=>day.filter(r=>saleKind(r)==="vas"&&vasKey(r)===provider).reduce((x,r)=>x+r.amount,0);return{date,amount:a.amount,device:a.device,accessories:a.accessories,vas:a.vas,invoices:a.invoices,qty:a.qty,upt:a.upt,atv:a.atv,mac:a.lob.mac,ipad:a.lob.ipad,iphone:a.lob.iphone,watch:a.lob.watch,airpods:a.lob.airpods,qoala:vas("qoala"),telkomsel:vas("telkomsel"),indosat:vas("indosat"),xl:vas("xl")}});
  const total=aggregateSales(monthRows),lastDay=Math.max(1,...dateSet.map(d=>Number(d.slice(8,10))||1)),dim=new Date(Number(period.slice(0,4)),Number(period.slice(5,7)),0).getDate(),target=data.target||{};
  const point=Math.min(target.device?total.device/target.device*60:0,60)+Math.min(target.accessories?total.accessories/target.accessories*30:0,30)+Math.min(target.vas?total.vas/target.vas*10:0,10);
  data.summary={...data.summary,amount:total.amount,device:total.device,accessories:total.accessories,vas:total.vas,invoices:total.invoices,qty:total.qty,upt:total.upt,atv:total.atv,estimate:total.amount/lastDay*dim,point,timegone:lastDay/dim*100};
  data.generatedAt=new Date().toISOString();
  data.mode="live";
  return NextResponse.json(data,{headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json(data,{headers:{"cache-control":"no-store"}})}
}
