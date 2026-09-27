import {NextRequest,NextResponse} from "next/server";
import {GET as originalGET} from "@/app/api/daily/route";
import {getSheetRanges} from "@/lib/google-sheets";
import {aggregateSales,isValidSale,parseSalesRow} from "@/lib/m238-sales-sanitize";

const SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";

export async function GET(req:NextRequest){
 const original=await originalGET(req);
 if(!original.ok)return original;
 const data:any=await original.json();
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json(data,{headers:{"cache-control":"no-store"}});
 const date=req.nextUrl.searchParams.get("date")||data.date;
 try{
  const[raw]=await getSheetRanges(SOURCE_ID,["'Data Copas'!A2:S50000"],email,key);
  const rows=(raw||[]).map(parseSalesRow).filter(r=>r.date===date&&isValidSale(r));
  const byId=new Map<string,ReturnType<typeof aggregateSales>>();
  for(const id of new Set(rows.map(r=>r.id).filter(Boolean)))byId.set(id,aggregateSales(rows.filter(r=>r.id===id)));
  data.staff=(data.staff||[]).map((st:any)=>{
   const a=byId.get(String(st.id));if(!a)return{...st,amount:0,device:0,accessories:0,vas:0,qty:0,invoices:0,upt:0,atv:0,lob:{iphone:0,mac:0,ipad:0,watch:0,airpods:0},vasDetail:{qoala:{qty:0,value:0},telkomsel:{qty:0,value:0},xl:{qty:0,value:0},indosat:{qty:0,value:0}}};
   return{...st,amount:a.amount,device:a.device,accessories:a.accessories,vas:a.vas,qty:a.qty,invoices:a.invoices,upt:a.upt,atv:a.atv,lob:a.lob,vasDetail:a.vasDetail};
  });
  const total=aggregateSales(rows);
  data.total={...data.total,amount:total.amount,accessories:total.accessories,vas:total.vas,qty:total.qty,invoices:total.invoices,upt:total.upt};
  data.fastSource="Data Copas • voucher excluded • AirPods fixed";
  data.fastUpdatedAt=new Date().toISOString();
  return NextResponse.json(data,{headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json(data,{headers:{"cache-control":"no-store"}})}
}
