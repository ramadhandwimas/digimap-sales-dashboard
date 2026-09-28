import {NextRequest} from "next/server";
import * as XLSX from "xlsx";

type MdGroup="iphone-ipad"|"mac-watch";
type Row={lob?:string;article?:string;description?:string;soldQty?:number;recentSoldQty?:number;soh?:number;lostCount?:number;requestQty?:number;priority?:string;reason?:string};

const allowed:Record<MdGroup,string[]>={"iphone-ipad":["iPhone","iPad"],"mac-watch":["MacBook","Apple Watch"]};
const s=(v:unknown)=>String(v??"").replace(/[\r\n\t]+/g," ").trim();
const n=(v:unknown)=>Number(v)||0;
function safeWeek(v:string){return v.replace(/[^A-Za-z0-9_-]+/g,"-").replace(/-+/g,"-")}

export async function POST(req:NextRequest){
 try{
  const body=await req.json() as{group?:MdGroup;week?:string;rows?:Row[]};
  const group=body.group;
  if(group!=="iphone-ipad"&&group!=="mac-watch")return Response.json({error:"Group MD tidak valid"},{status:400});
  const lobs=allowed[group];
  const rows=(body.rows||[]).filter(x=>lobs.includes(s(x.lob))&&s(x.article)&&n(x.requestQty)>0).slice(0,500);
  if(!rows.length)return Response.json({error:"Tidak ada item request"},{status:400});

  const workbook=XLSX.utils.book_new();
  for(const lob of lobs){
   const list=rows.filter(x=>s(x.lob)===lob).map((x,i)=>({
    No:i+1,
    Article:s(x.article),
    Description:s(x.description),
    "Week Sales":n(x.soldQty),
    "8W Sales":n(x.recentSoldQty),
    SOH:n(x.soh),
    Lost:n(x.lostCount),
    "Request Qty":n(x.requestQty),
    Priority:s(x.priority),
    Reason:s(x.reason),
   }));
   if(!list.length)continue;
   const ws=XLSX.utils.json_to_sheet(list);
   ws["!cols"]=[{wch:5},{wch:18},{wch:48},{wch:11},{wch:10},{wch:8},{wch:8},{wch:12},{wch:11},{wch:44}];
   ws["!autofilter"]={ref:`A1:J${list.length+1}`};
   ws["!freeze"]={xSplit:0,ySplit:1,topLeftCell:"A2",activePane:"bottomLeft",state:"frozen"};
   XLSX.utils.book_append_sheet(workbook,ws,lob.slice(0,31));
  }

  const buffer=XLSX.write(workbook,{type:"buffer",bookType:"xlsx",compression:true});
  const label=group==="iphone-ipad"?"iPhone-iPad":"MacBook-Watch";
  const fileName=`Request Stock M238 - ${label} - ${safeWeek(s(body.week)||"Week")}.xlsx`;
  return new Response(new Uint8Array(buffer),{headers:{
   "content-type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
   "content-disposition":`attachment; filename="${fileName}"`,
   "cache-control":"no-store",
  }});
 }catch(e){return Response.json({error:e instanceof Error?e.message:"Gagal membuat Excel"},{status:500})}
}
