import {NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";
const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const s=(v:unknown)=>String(v??"").trim();
export async function GET(){const e=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,k=process.env.GOOGLE_PRIVATE_KEY;if(!e||!k)return NextResponse.json({spw:null,soh:null});try{const[rows]=await getSheetRanges(MASTER_ID,["'UPLOAD LOG'!A2:H5000"],e,k);const latest=(type:string)=>{const found=rows.filter(r=>s(r[1]).toUpperCase()===type&&s(r[6]).toUpperCase()==="SUCCESS"&&s(r[0])).sort((a,b)=>s(a[0]).localeCompare(s(b[0]))).at(-1);return found?{timestamp:s(found[0]),fileName:s(found[2]),rows:Number(found[3])||0}:null};return NextResponse.json({spw:latest("SPW"),soh:latest("SOH")},{headers:{"cache-control":"no-store"}})}catch(err){return NextResponse.json({spw:null,soh:null,error:err instanceof Error?err.message:"Gagal membaca upload log"},{status:500})}}
