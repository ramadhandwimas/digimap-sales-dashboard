import {NextRequest,NextResponse} from "next/server";
import {GET as legacyWeeklyGet} from "@/app/api/weekly/route";

function rank(label:string){const m=label.match(/Week\s*(\d+)\s*Q(\d+)/i);return Number(m?.[2]||0)*100+Number(m?.[1]||0)}
function sortedWeeks(values:unknown){return Array.isArray(values)?[...new Set(values.map(String).filter(v=>/^Week \d+ Q\d+$/i.test(v)))].sort((a,b)=>rank(a)-rank(b)):[]}
async function read(req:NextRequest){const response=await legacyWeeklyGet(req),body=await response.json();return{response,body}}
export async function GET(req:NextRequest){
 try{
  const requestedFrom=req.nextUrl.searchParams.get("from")||"",requestedTo=req.nextUrl.searchParams.get("to")||"";
  let {response,body}=await read(req);
  if(!response.ok)return NextResponse.json(body,{status:response.status,headers:{"cache-control":"no-store"}});
  let available=sortedWeeks(body.availableWeeks);
  if(!requestedFrom&&!requestedTo&&available.length){
   const to=available.at(-1)||"",from=available.at(-2)||to;
   if(body.labelA!==from||body.labelB!==to){
    const url=req.nextUrl.clone();url.searchParams.set("from",from);url.searchParams.set("to",to);url.searchParams.set("normalized","1");
    const rerun=await read(new NextRequest(url,req));response=rerun.response;body=rerun.body;
    if(!response.ok)return NextResponse.json(body,{status:response.status,headers:{"cache-control":"no-store"}});
    available=sortedWeeks(body.availableWeeks);
   }
  }
  return NextResponse.json({...body,availableWeeks:available},{headers:{"cache-control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Weekly Report gagal dibaca"},{status:500,headers:{"cache-control":"no-store"}})}
}
