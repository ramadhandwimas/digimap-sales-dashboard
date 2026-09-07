import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";
const SOURCE="1BjLDXdi_5BgZCUUJAKba-xYRFf0RDmRTT0FW1be03WE";
const months=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const text=(v:unknown)=>String(v??"").trim();
const num=(v:unknown)=>Number(text(v).replace(",","."))||0;
export async function GET(req:NextRequest){const period=req.nextUrl.searchParams.get("period")||new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());if(!/^\d{4}-\d{2}$/.test(period))return NextResponse.json({error:"Period tidak valid"},{status:400});const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({period,nps:0,error:"Google Sheets belum dikonfigurasi"},{status:503});try{const[rows]=await getSheetRanges(SOURCE,["'Data Nps'!A1:M30"],email,key);const row=rows.find(r=>text(r[0]).toUpperCase().startsWith("M238"));const idx=Number(period.slice(5,7));const nps=row?num(row[idx]):0;return NextResponse.json({period,nps,month:months[idx-1],store:"M238",source:"Data Nps"},{headers:{"Cache-Control":"no-store"}})}catch(e){return NextResponse.json({period,nps:0,error:e instanceof Error?e.message:"Gagal membaca NPS"},{status:500})}}
