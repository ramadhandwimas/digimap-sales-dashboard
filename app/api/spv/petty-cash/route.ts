import {NextRequest,NextResponse} from "next/server";
import {SESSION_COOKIE,verifySessionToken} from "@/lib/auth-session";
import {ensureSheet,getSheetRangesFresh,sheetRequestOnce} from "@/lib/google-sheets";
import {isStoreSpv} from "@/lib/spv-access";
import {latestCashRecords,validatePettyCash} from "@/lib/petty-cash";
const MASTER="1v479QFSArfDb-vt_YRGcw0o4RhYxCzFlNOCH6VMvCSk",TAB="SPV Petty Cash";
const headers={"cache-control":"no-store"};
async function authorize(req:NextRequest){
 const session=verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
 if(!session)return {error:"Sesi login berakhir.",status:401} as const;
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return {error:"Koneksi penyimpanan belum tersedia.",status:503} as const;
 if(!await isStoreSpv(session.nik,email,key))return {error:"Menu ini khusus SPV M238.",status:403} as const;
 return {session,email,key};
}
async function readRecords(email:string,key:string){
 await ensureSheet(MASTER,TAB,["ID","Revision","Updated At","Updated By","Form JSON"],email,key);
 const [rows]=await getSheetRangesFresh(MASTER,[`'${TAB}'!A2:E`],email,key);
 return latestCashRecords(rows.filter(row=>row.some(value=>value!==""&&value!==null)));
}
export async function GET(req:NextRequest){try{
 const auth=await authorize(req);if("error"in auth)return NextResponse.json({error:auth.error},{status:auth.status,headers});
 if(req.nextUrl.searchParams.get("access")==="1")return NextResponse.json({allowed:true},{headers});
 return NextResponse.json({records:await readRecords(auth.email,auth.key)},{headers});
 }catch{return NextResponse.json({error:"Draft belum dapat dibaca. Coba kembali; jangan tutup form yang belum disimpan."},{status:503,headers})}
}
export async function POST(req:NextRequest){try{
 const auth=await authorize(req);if("error"in auth)return NextResponse.json({error:auth.error},{status:auth.status,headers});
 if(req.headers.get("origin")&&req.headers.get("origin")!==req.nextUrl.origin)return NextResponse.json({error:"Permintaan tidak diizinkan."},{status:403,headers});
 const body=await req.json().catch(()=>null);
 if(!body||typeof body.id!=="string"||!/^[-a-zA-Z0-9]{12,80}$/.test(body.id)||typeof body.revision!=="string"||!/^[-a-zA-Z0-9]{12,80}$/.test(body.revision)||typeof body.baseRevision!=="string")return NextResponse.json({error:"Identitas draft tidak valid."},{status:400,headers});
 let data;try{data=validatePettyCash(body.data)}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Form tidak valid."},{status:400,headers})}
 const records=await readRecords(auth.email,auth.key),existing=records.find(row=>row.id===body.id);
 if(existing?.revision===body.revision)return NextResponse.json({record:existing},{headers});
 if((existing?.revision||"")!==body.baseRevision)return NextResponse.json({error:"Draft sudah berubah di perangkat lain. Simpan sebagai draft baru agar isianmu tetap tersimpan.",conflict:true},{status:409,headers});
 const record={id:body.id,revision:body.revision,updatedAt:new Date().toISOString(),updatedBy:auth.session.name,data};
 const response=await sheetRequestOnce(MASTER,`/values/${encodeURIComponent(`'${TAB}'!A:E`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,auth.email,auth.key,{method:"POST",body:JSON.stringify({majorDimension:"ROWS",values:[[record.id,record.revision,record.updatedAt,record.updatedBy,JSON.stringify(data)]]})});
 if(!response.ok)throw Error("Save failed");
 return NextResponse.json({record},{headers});
 }catch{return NextResponse.json({error:"Penyimpanan belum dapat dikonfirmasi. Isian tetap di layar; coba Simpan Draft lagi."},{status:503,headers})}
}
