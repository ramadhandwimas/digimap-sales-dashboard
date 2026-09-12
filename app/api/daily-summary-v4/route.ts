import {unstable_cache} from "next/cache";
import {NextRequest,NextResponse} from "next/server";
import {getGoogleSheetRequestCount} from "@/lib/google-sheets";
import {getDailySummaryV4} from "@/lib/m238-daily-summary-v4";

type Credentials={email:string;key:string};

function credentials():Credentials{
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key=process.env.GOOGLE_PRIVATE_KEY;
  if(!email||!key)throw new Error("Google Sheets belum dikonfigurasi");
  return{email,key};
}

const getCachedMonthly=unstable_cache(
  async(period:string|undefined)=>getDailySummaryV4({mode:"monthly",period},credentials()),
  ["m238-daily-summary-v4","monthly"],
  {revalidate:45},
);

const getCachedRange=unstable_cache(
  async(from:string|undefined,to:string|undefined)=>getDailySummaryV4({mode:"range",from,to},credentials()),
  ["m238-daily-summary-v4","range"],
  {revalidate:45},
);

export async function GET(req:NextRequest){
  const started=Date.now();
  const before=getGoogleSheetRequestCount();
  const mode=req.nextUrl.searchParams.get("mode")==="range"?"range":"monthly";
  const period=req.nextUrl.searchParams.get("period")||undefined;
  const from=req.nextUrl.searchParams.get("from")||undefined;
  const to=req.nextUrl.searchParams.get("to")||undefined;
  const refresh=req.nextUrl.searchParams.get("refresh")==="1";

  try{
    const c=credentials();
    const data=refresh
      ?await getDailySummaryV4({mode,period,from,to,refresh:true},c)
      :mode==="range"
        ?await getCachedRange(from,to)
        :await getCachedMonthly(period);
    const requestMs=Date.now()-started;
    const body={
      ...data,
      performance:{
        ...data.metrics,
        sourceBackendMs:data.metrics.backendMs,
        backendMs:requestMs,
        googleApiRequests:getGoogleSheetRequestCount()-before,
        totalMs:requestMs,
        cacheMode:refresh?"bypass":"persistent-45s",
      },
    };
    const serialized=JSON.stringify(body);
    return new NextResponse(serialized,{headers:{
      "content-type":"application/json; charset=utf-8",
      "cache-control":"private, max-age=0, must-revalidate",
      "x-daily-summary-cache":refresh?"bypass":"persistent-45s",
      "x-daily-summary-rows":String(data.dailyRows.length),
      "x-daily-summary-bytes":String(Buffer.byteLength(serialized,"utf8")),
      "server-timing":`total;dur=${requestMs}`,
    }});
  }catch(error){
    const message=error instanceof Error?error.message:"unknown";
    console.error("M238_DAILY_SUMMARY_V4",{mode,period,from,to,error:message});
    if(message==="Google Sheets belum dikonfigurasi")return NextResponse.json({error:message},{status:503,headers:{"cache-control":"no-store"}});
    return NextResponse.json({error:"Data Daily Summary belum berhasil dimuat."},{status:500,headers:{"cache-control":"no-store"}});
  }
}
