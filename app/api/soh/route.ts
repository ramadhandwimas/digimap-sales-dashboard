import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";
const ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const s=(v:unknown)=>String(v??"").trim(),n=(v:unknown)=>Number(v)||0;
export async function GET(req:NextRequest){
  const e=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,k=process.env.GOOGLE_PRIVATE_KEY;
  if(!e||!k)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
  const[r]=await getSheetRanges(ID,["'RAW StockPosition'!A3:N10000"],e,k),q=(req.nextUrl.searchParams.get("q")||"").toLowerCase(),lob=(req.nextUrl.searchParams.get("lob")||"ALL").toUpperCase();
  const map=new Map<string,{article:string;description:string;qty:number;category:string}>();
  for(const x of r){
    const store=s(x[0]),article=s(x[2]),description=s(x[3]),brand=s(x[5]).toUpperCase(),scheme=s(x[7]).toUpperCase(),type=s(x[8]).toUpperCase(),qty=n(x[12]);
    if(store!=="M238"||!article||brand!=="APPLE"||scheme==="DEMO"||/DEMO|\-D(?:\b|$)/i.test(`${article} ${description}`))continue;
    const d=description.toUpperCase();
    let category="";
    if(scheme==="DEVICES"){
      category=type==="PHONE"||/IPHONE/.test(d)?"IPHONE":type==="TABLETS"||/IPAD/.test(d)?"IPAD":type==="LAPTOPS"||type==="DESKTOP"||/MACBOOK|MAC MINI|MAC STUDIO|IMAC|\bMBA\b|\bMBP\b|\bMBN\b/.test(d)?"MACBOOK":type==="WATCH"||/APPLE WATCH|\bWATCH\b/.test(d)?"APPLE WATCH":"";
    }else if(scheme==="ACCESSORIES"&&(/AIRPODS?\b/.test(d)||/APPLE PENCIL|\bPENCIL\b/.test(d)||type==="KEY BOARD"||/MAGIC KEYBOARD/.test(d))){
      category="AIRPODS, PENCIL & KEYBOARD";
    }
    if(!category)continue;
    const key=`${article}|${description}|${category}`;
    const old=map.get(key);if(old)old.qty+=qty;else map.set(key,{article,description,qty,category});
  }
  const rows=[...map.values()].filter(x=>x.qty>0&&(lob==="ALL"||x.category===lob)&&(!q||`${x.article} ${x.description}`.toLowerCase().includes(q))).sort((a,b)=>a.category.localeCompare(b.category)||a.description.localeCompare(b.description));
  return NextResponse.json({rows},{headers:{"Cache-Control":"no-store"}})
}