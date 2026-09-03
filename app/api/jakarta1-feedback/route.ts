import {NextRequest,NextResponse} from "next/server";
import {appendSheetValues,ensureSheet,getSheetRanges} from "@/lib/google-sheets";

const OPS="1BjLDXdi_5BgZCUUJAKba-xYRFf0RDmRTT0FW1be03WE";
const TAB="Jakarta 1 Feedback";
const HEADERS=["Timestamp","Date","Store Code","Store Name","Category","Raw Feedback","Professional Feedback"];
const STORE_NAMES:Record<string,string>={M117:"DIGIMAP PLAZA SENAYAN",M118:"Digimap Pondok Indah Mall 3",M124:"DIGIMAP PACIFICPLACE",M127:"DIGIMAP APP Lotte Avenue",M217:"DIGIMAP BLOK - M PLAZA",M227:"Digimap Aeon Tanjung Barat",M238:"Digimap AAR Pondok Indah Mall 2",M255:"Digimap Antasari Place",M264:"Digimap Plaza Semanggi"};
const LABELS:Record<string,string>={external:"Faktor External",promo:"Promo yang Berjalan",staff:"Staff yang Tidak Perform",stock:"Ketersediaan Stok"};
const text=(v:unknown)=>String(v??"").trim();
function dateKey(v:unknown){if(typeof v==="number"&&v>20000)return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);const s=text(v);if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);if(/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(s)){const[a,b,c]=s.split(/[/-]/);return`${c}-${b.padStart(2,"0")}-${a.padStart(2,"0")}`}return s}
function professional(raw:string,category:string,store:string){const clean=raw.replace(/\s+/g," ").trim().replace(/[.!]+$/g,"");const lead=LABELS[category]??"Faktor Penjualan";return `${lead}: berdasarkan evaluasi ${store}, ${clean.charAt(0).toLowerCase()+clean.slice(1)}. Kondisi tersebut menjadi perhatian utama untuk tindak lanjut dan perbaikan pencapaian harian.`}
type Feedback={timestamp:string;date:string;store:string;name:string;category:string;raw:string;professional:string};
function mapRows(rows:unknown[][]):Feedback[]{return rows.map(r=>({timestamp:text(r[0]),date:dateKey(r[1]),store:text(r[2]),name:text(r[3]),category:text(r[4]),raw:text(r[5]),professional:text(r[6])})).filter(r=>r.date&&r.store)}

export async function GET(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({rows:[]});
 try{await ensureSheet(OPS,TAB,HEADERS,email,key);const[raw]=await getSheetRanges(OPS,[`'${TAB}'!A2:G5000`],email,key);const period=req.nextUrl.searchParams.get("period")||"",date=req.nextUrl.searchParams.get("date")||"";const rows=mapRows(raw).filter(r=>(!period||r.date.startsWith(period))&&(!date||r.date===date));return NextResponse.json({rows});}catch(e){return NextResponse.json({rows:[],error:e instanceof Error?e.message:"Gagal membaca feedback"});}
}

export async function POST(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;if(!email||!key)return NextResponse.json({error:"Google Sheets belum tersambung"},{status:503});
 try{const body=await req.json() as{date?:string;store?:string;category?:string;feedback?:string};const date=dateKey(body.date),store=text(body.store).toUpperCase(),category=text(body.category),raw=text(body.feedback),name=STORE_NAMES[store];if(!date||!name||!LABELS[category]||!raw)return NextResponse.json({error:"Data feedback belum lengkap"},{status:400});await ensureSheet(OPS,TAB,HEADERS,email,key);const[existingRaw]=await getSheetRanges(OPS,[`'${TAB}'!A2:G5000`],email,key),existing=mapRows(existingRaw);if(existing.some(r=>r.date===date&&r.store===store))return NextResponse.json({error:"Feedback store untuk tanggal ini sudah tersimpan.",alreadySubmitted:true},{status:409});const polished=professional(raw,category,name),timestamp=new Date().toISOString();await appendSheetValues(OPS,`'${TAB}'!A:G`,[[timestamp,date,store,name,LABELS[category],raw,polished]],email,key);return NextResponse.json({ok:true,row:{timestamp,date,store,name,category:LABELS[category],raw,professional:polished}});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal menyimpan feedback"},{status:500});}
}
