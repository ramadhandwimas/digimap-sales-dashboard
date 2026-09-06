import {NextRequest,NextResponse} from "next/server";
import {appendSheetValues,ensureSheet,getSheetRanges} from "@/lib/google-sheets";

const SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const MASTER_ID="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk";
const TAB="Dashboard CX Member";
const HEADERS=["Timestamp","Date","Staff ID","Name","CX","New Member"];
const text=(v:unknown)=>String(v??"").trim();
const num=(v:unknown)=>Number(v)||0;
function isoDate(v:unknown){if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);const x=text(v);if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);if(/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(x)){const[a,b,c]=x.split(/[/-]/);return`${c}-${b.padStart(2,"0")}-${a.padStart(2,"0")}`}return x;}

type Row={timestamp:string;date:string;staffId:string;name:string;cx:number;member:number};
function mapRows(rows:unknown[][]):Row[]{return rows.map(r=>({timestamp:text(r[0]),date:isoDate(r[1]),staffId:text(r[2]),name:text(r[3]),cx:num(r[4]),member:num(r[5])})).filter(r=>r.date&&r.staffId)}
async function ensureMigrated(email:string,key:string){await ensureSheet(MASTER_ID,TAB,HEADERS,email,key);const[master]=await getSheetRanges(MASTER_ID,[`'${TAB}'!A2:F5000`],email,key);if(master.some(r=>text(r[0])||text(r[1])))return master;try{const[legacy]=await getSheetRanges(SOURCE_ID,[`'${TAB}'!A2:F5000`],email,key);const rows=legacy.filter(r=>r.some(v=>text(v)));if(rows.length)await appendSheetValues(MASTER_ID,`'${TAB}'!A:F`,rows,email,key);return rows}catch{return master}}

export async function GET(req:NextRequest){const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({rows:[]});try{const raw=await ensureMigrated(email,key),all=mapRows(raw);const period=req.nextUrl.searchParams.get("period")||"",date=req.nextUrl.searchParams.get("date")||"",filtered=all.filter(r=>(!period||r.date.startsWith(period))&&(!date||r.date===date));const rows=[...new Map(filtered.map(x=>[`${x.date}:${x.staffId}`,x])).values()];return NextResponse.json({rows,storage:"MASTER DATA M238"});}catch(e){return NextResponse.json({rows:[],error:e instanceof Error?e.message:"Gagal membaca CX dan member"});}}

export async function POST(req:NextRequest){const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({error:"Google Sheets belum tersambung"},{status:500});try{const body=await req.json()as{date?:string;staffId?:string;name?:string;cx?:number;member?:number};const date=isoDate(body.date),staffId=text(body.staffId),name=text(body.name),cx=Math.max(0,num(body.cx)),member=Math.max(0,num(body.member));if(!date||!staffId||!name)return NextResponse.json({error:"Staff dan tanggal wajib diisi"},{status:400});const existingRaw=await ensureMigrated(email,key),existing=mapRows(existingRaw);if(existing.some(r=>r.date===date&&r.staffId===staffId))return NextResponse.json({error:"Data CX/Member staff ini untuk tanggal tersebut sudah tersimpan.",alreadySubmitted:true},{status:409});const timestamp=new Date().toISOString();await appendSheetValues(MASTER_ID,`'${TAB}'!A:F`,[[timestamp,date,staffId,name,cx,member]],email,key);return NextResponse.json({ok:true,timestamp,date,staffId,name,cx,member,storage:"MASTER DATA M238"});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal menyimpan CX dan member"},{status:500});}}
