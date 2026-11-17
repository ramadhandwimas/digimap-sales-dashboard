import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {MASTER_ID} from "@/lib/accessory-pricelist-store";
import {appendSheetValues,ensureSheet,getSheetRangesFresh} from "@/lib/google-sheets";

const TAB=process.env.VERCEL_ENV==="production"?"ACC Barcode Map":"ACC Barcode Map Preview";
const HEADERS=["Barcode","SAP Article","Updated At","Updated By"];
const headers={"cache-control":"no-store"};
const clean=(value:unknown)=>String(value??"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"");

function authorize(req:NextRequest){
 const session=verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
 if(!session)return {error:"Sesi login berakhir.",status:401} as const;
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return {error:"Koneksi penyimpanan belum tersedia.",status:503} as const;
 return {session,email,key};
}

async function readMap(email:string,key:string){
 await ensureSheet(MASTER_ID,TAB,HEADERS,email,key);
 const[rows]=await getSheetRangesFresh(MASTER_ID,[`'${TAB}'!A2:D100000`],email,key);
 const map:Record<string,string>={};
 for(const row of rows??[]){const barcode=clean(row[0]),article=clean(row[1]);if(barcode&&article)map[barcode]=article}
 return map;
}

export async function GET(req:NextRequest){try{
 const auth=authorize(req);if("error"in auth)return NextResponse.json({error:auth.error},{status:auth.status,headers});
 return NextResponse.json({map:await readMap(auth.email,auth.key),isolated:process.env.VERCEL_ENV!=="production"},{headers});
 }catch{return NextResponse.json({error:"Daftar barcode belum dapat dibaca."},{status:503,headers})}}

export async function POST(req:NextRequest){try{
 const auth=authorize(req);if("error"in auth)return NextResponse.json({error:auth.error},{status:auth.status,headers});
 if(req.headers.get("origin")&&req.headers.get("origin")!==req.nextUrl.origin)return NextResponse.json({error:"Permintaan tidak diizinkan."},{status:403,headers});
 const body=await req.json().catch(()=>null),barcode=clean(body?.barcode),sapArticle=clean(body?.sapArticle);
 if(!/^\d{8,14}$/.test(barcode)||!sapArticle||sapArticle.length>80)return NextResponse.json({error:"UPC/EAN atau SAP Article tidak valid."},{status:400,headers});
 await ensureSheet(MASTER_ID,TAB,HEADERS,auth.email,auth.key);
 await appendSheetValues(MASTER_ID,`'${TAB}'!A:D`,[[barcode,sapArticle,new Date().toISOString(),auth.session.name]],auth.email,auth.key,"RAW");
 return NextResponse.json({barcode,sapArticle,isolated:process.env.VERCEL_ENV!=="production"},{headers});
 }catch{return NextResponse.json({error:"Mapping barcode belum berhasil disimpan."},{status:503,headers})}}
