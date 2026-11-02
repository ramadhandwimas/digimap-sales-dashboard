import {readExchangeState} from "@/lib/exchange-detail-store";
import {adjustExchangeSales} from "@/lib/exchange-detail";
import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";
import {compileM996,m996QuantityOverrides,m996SaleFromValues} from "@/lib/m996-compile";

const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";

export async function GET(req:NextRequest){
 try{
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
  if(!email||!key)return NextResponse.json({error:"Koneksi Google Sheets belum dikonfigurasi."},{status:503});
  const period=String(req.nextUrl.searchParams.get("period")||"").trim();
  if(period&&!/^20\d{2}-\d{2}$/.test(period))return NextResponse.json({error:"Periode M996 tidak valid."},{status:400});
  const [values,spwRows]=await getSheetRanges(MASTER_ID,["'SALES DASHBOARD DATA'!A2:Q65537","'SPW M996'!A2:C65537"],email,key);
  const state=await readExchangeState({email,key}),selectedPeriod=period||values.map(r=>String(r[0]||"").slice(0,7)).filter(p=>/^20\d{2}-\d{2}$/.test(p)).sort().at(-1)||"";
  const overrides=m996QuantityOverrides(spwRows||[]),gross=(values||[]).map(m996SaleFromValues).filter((r):r is NonNullable<typeof r>=>Boolean(r)).map(r=>({...r,store:"M238",qty:overrides.get(r.sourceKey)||r.qty}));
  const adjusted=adjustExchangeSales(gross,state),asValues=(rows:typeof gross)=>rows.map(r=>[r.date,r.staffId,r.staffName,r.invoice,r.article,r.description,r.type,r.qty,r.amount,r.category,r.brand,r.core,r.scheme,r.vendor,r.week,"M238",r.sourceKey]);
  const before=compileM996(asValues(gross),selectedPeriod),result=compileM996(asValues(adjusted),selectedPeriod);
  const netByKey=new Map(adjusted.map(r=>[r.sourceKey,r])),changed=gross.filter(r=>r.date.startsWith(selectedPeriod)&&(!netByKey.has(r.sourceKey)||netByKey.get(r.sourceKey)!.qty!==r.qty));
  result.excluded={invoices:new Set(changed.map(r=>r.invoice)).size,rows:changed.length,qty:before.summary.qty-result.summary.qty,amount:before.summary.amount-result.summary.amount};
  return NextResponse.json(result,{headers:{"cache-control":"no-store"}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Gagal compile data M996."},{status:500})}
}
