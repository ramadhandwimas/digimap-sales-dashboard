import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const SALES:Record<string,string>={
  "2025":"1NnRW70VyrtV8c89_M08gTnOGbtzeldSy8gL-gm4GjJ0",
  "2026":"151Qfrz3RZnDMgZjKOPt5s_aS-zscSiOTCWodbUDWM1k"
};
const OPS="1BjLDXdi_5BgZCUUJAKba-xYRFf0RDmRTT0FW1be03WE";
const STORE_CODES=["M117","M118","M124","M127","M217","M227","M238","M255","M264"] as const;

type Row=unknown[];
function n(v:unknown){if(typeof v==="number")return Number.isFinite(v)?v:0;const s=String(v??"").trim();if(!s)return 0;const x=Number(s.replace(/\s/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(",",".").replace(/[^0-9.-]/g,""));return Number.isFinite(x)?x:0}
function dateKey(v:unknown){if(typeof v==="number"&&v>20000){const d=new Date(Date.UTC(1899,11,30)+v*86400000);return d.toISOString().slice(0,10)}const s=String(v??"").trim();let m=s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);if(m)return `${m[3]}-${m[2]}-${m[1]}`;m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:""}
function parseStaffMaster(rows:Row[]){const out:Record<string,{id:string;name:string;store:string}>={};for(const row of rows.slice(1)){const store=String(row[0]??"").trim();if(!STORE_CODES.includes(store as any))continue;const id=String(row[1]??"").replace(/\.0$/,"").trim(),name=String(row[2]??"").trim();if(name){const key=id||`${store}|${name.toUpperCase()}`;out[key]={id:key,name,store}}}return out}
function accRate(price:number){return price<1315000?15000:30000}
function qoalaRate(price:number){return price<1315000?15000:50000}

export async function GET(req:NextRequest){
  const period=req.nextUrl.searchParams.get("period")||"2026-09";
  if(!/^(2025|2026)-(0[1-9]|1[0-2])$/.test(period))return NextResponse.json({error:"Periode tidak valid"},{status:400});
  const year=period.slice(0,4),salesId=SALES[year];
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
  if(!salesId||!email||!key)return NextResponse.json({error:"Source belum tersedia"},{status:503});
  try{
    const [sales,ops]=await Promise.all([
      getSheetRanges(salesId,STORE_CODES.map(c=>`'${c}'!A:O`),email,key),
      getSheetRanges(OPS,["'Master Data'!S1:X130"],email,key)
    ]);
    const master=parseStaffMaster(ops[0]??[]),agg:Record<string,any>={};
    for(let si=0;si<STORE_CODES.length;si++){
      const store=STORE_CODES[si],rows=(sales[si]??[]) as Row[];
      for(const row of rows.slice(1)){
        const d=dateKey(row[1]);if(!d.startsWith(period))continue;
        const rawId=String(row[4]??"").replace(/\.0$/,"").trim(),staffName=String(row[5]??"").trim();
        const m=master[rawId]||Object.values(master).find(x=>x.store===store&&x.name.trim().toUpperCase()===staffName.toUpperCase());
        if(!m)continue;
        const cat=String(row[6]??"").toUpperCase(),group=String(row[8]??"").toUpperCase(),desc=String(row[10]??"").toUpperCase();
        const qty=Math.max(0,n(row[11])),normalPrice=Math.abs(n(row[12])),localAmount=n(row[13]);
        const unitPrice=normalPrice>0?normalPrice:(qty>0?Math.abs(localAmount/qty):0);
        const a=agg[m.id]??{id:m.id,name:m.name,store:m.store,airpods:0,incentive:{iphone:0,macbook:0,ipad:0,watch:0,accessories:0,qoala:0,total:0}};agg[m.id]=a;
        if(cat.includes("AIRPODS"))a.airpods+=qty;
        if(cat.includes("IPHONE"))a.incentive.iphone+=qty*15000;
        else if(cat==="MAC"||cat.includes("MACBOOK"))a.incentive.macbook+=qty*30000;
        else if(cat.includes("IPAD"))a.incentive.ipad+=qty*10000;
        else if(cat.includes("WATCH"))a.incentive.watch+=qty*10000;
        if(group==="ACCESSORIES"&&qty>0)a.incentive.accessories+=accRate(unitPrice)*qty;
        if((cat.includes("PROTEKSI")||desc.includes("QOALA"))&&qty>0)a.incentive.qoala+=qoalaRate(unitPrice)*qty;
      }
    }
    const rows=Object.values(agg).map((x:any)=>({...x,incentive:{...x.incentive,total:x.incentive.iphone+x.incentive.macbook+x.incentive.ipad+x.incentive.watch+x.incentive.accessories+x.incentive.qoala}}));
    return NextResponse.json({period,rows,rules:{iphone:15000,macbook:30000,ipad:10000,watch:10000,accessories:{below1315000:15000,atOrAbove1315000:30000},qoala:{below1315000:15000,atOrAbove1315000:50000},priceBasis:"Harga Normal per unit"}},{headers:{"cache-control":"no-store"}});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal audit staff Jakarta 1"},{status:500})}
}
