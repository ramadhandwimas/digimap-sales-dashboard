import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";
import {readExchangeState} from "@/lib/exchange-detail-store";
import {adjustExchangeSales} from "@/lib/exchange-detail";
import {parseSalesRow} from "@/lib/m238-sales-sanitize";
import {buildQoalaStaffReport,VAS_REPORT_LABELS,type VasReportProvider} from "@/lib/qoala-staff-report";
const SOURCE="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
export async function GET(req:NextRequest){
 const from=req.nextUrl.searchParams.get("from")||"",to=req.nextUrl.searchParams.get("to")||"";
 const provider=req.nextUrl.searchParams.get("provider")||"qoala";
 if(!Object.hasOwn(VAS_REPORT_LABELS,provider))return NextResponse.json({error:"Provider report tidak valid."},{status:400});
 const valid=(v:string)=>/^202[56]-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(!valid(from)||!valid(to)||from>to||from.slice(0,4)!==to.slice(0,4))return NextResponse.json({error:"Periode report tidak valid."},{status:400});
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi."},{status:503});
 try{
  const range=from.startsWith("2025")?"'Data Copas Archive 2025'!A2:S32755":"'Data Copas'!A2:S50000";
  const [[raw,config],state]=await Promise.all([getSheetRanges(SOURCE,[range,"Config!H1:L120"],email,key),readExchangeState({email,key})]);
  const sales=adjustExchangeSales(raw.map(parseSalesRow),state);
  return NextResponse.json({...buildQoalaStaffReport(config,sales,from,to,provider as VasReportProvider),provider,providerLabel:VAS_REPORT_LABELS[provider as VasReportProvider],source:"Data Copas bersih · M238 · tanpa SPV",generatedAt:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Report VAS belum dapat dimuat."},{status:500})}
}
