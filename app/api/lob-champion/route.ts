import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {getCachedSalesSource} from "@/lib/m238-sales-source-cache";
import {buildLobChampion,validChampionDate} from "@/lib/lob-champion";
export const dynamic="force-dynamic";
export const maxDuration=60;
export async function GET(request:NextRequest){
 if(!verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value))return NextResponse.json({error:"Sesi login berakhir."},{status:401});
 const from=request.nextUrl.searchParams.get("from")||"",to=request.nextUrl.searchParams.get("to")||"",today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta"}).format(new Date());
 if(!validChampionDate(from)||!validChampionDate(to)||from>to||to>today||(Date.parse(to)-Date.parse(from))/86400000>365)return NextResponse.json({error:"Pilih tanggal yang valid, maksimal 366 hari dan tidak melewati hari ini."},{status:400});
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Koneksi data belum tersedia."},{status:503});
 try{const source=await getCachedSalesSource(email,key,request.nextUrl.searchParams.get("refresh")==="1");return NextResponse.json(buildLobChampion(source,from,to,today),{headers:{"cache-control":"no-store"}})}
 catch(error){console.warn("lob-champion",error instanceof Error?error.message:"Report gagal");return NextResponse.json({error:error instanceof Error?error.message:"Report LOB Champion belum dapat dimuat. Coba lagi."},{status:503,headers:{"cache-control":"no-store"}})}
}
