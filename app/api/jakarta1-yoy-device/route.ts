import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const SALES:Record<string,string>={
  "2025":"1NnRW70VyrtV8c89_M08gTnOGbtzeldSy8gL-gm4GjJ0",
  "2026":"151Qfrz3RZnDMgZjKOPt5s_aS-zscSiOTCWodbUDWM1k"
};
const STORES=["M117","M118","M124","M127","M217","M227","M238","M255","M264"] as const;
const NAMES:Record<string,string>={M117:"Plaza Senayan",M118:"Pondok Indah Mall 3",M124:"Pacific Place",M127:"Lotte Avenue",M217:"Blok M Plaza",M227:"Aeon Tanjung Barat",M238:"Pondok Indah Mall 2",M255:"Antasari Place",M264:"Plaza Semanggi"};
const MONTHS=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
type Row=unknown[];
type Lob="iPhone"|"Mac"|"iPad"|"Apple Watch";

type Bucket={amount:number;qty:number};
const empty=():Bucket=>({amount:0,qty:0});
function n(v:unknown){if(typeof v==="number")return Number.isFinite(v)?v:0;const s=String(v??"").trim();if(!s)return 0;const x=Number(s.replace(/\s/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(",",".").replace(/[^0-9.-]/g,""));return Number.isFinite(x)?x:0}
function dateKey(v:unknown){if(typeof v==="number"&&v>20000){const d=new Date(Date.UTC(1899,11,30)+v*86400000);return d.toISOString().slice(0,10)}const s=String(v??"").trim();let m=s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);if(m)return `${m[3]}-${m[2]}-${m[1]}`;m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[1]}-${m[2]}-${m[3]}`:""}
function voucher(row:Row){return row.some(v=>String(v??"").toUpperCase().includes("VOUCHER"))}
function lobOf(cat:string,desc:string):Lob|null{const x=`${cat} ${desc}`.toUpperCase();if(x.includes("IPHONE"))return"iPhone";if(x.includes("MACBOOK")||cat.toUpperCase()==="MAC")return"Mac";if(x.includes("IPAD"))return"iPad";if(x.includes("WATCH"))return"Apple Watch";return null}
function growth(cur:number,prev:number){return prev?(cur-prev)/prev*100:null}

export async function GET(req:NextRequest){
  const endMonth=Math.min(12,Math.max(1,Number(req.nextUrl.searchParams.get("endMonth")||9)));
  const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
  if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
  try{
    const [r25,r26]=await Promise.all([
      getSheetRanges(SALES["2025"],STORES.map(s=>`'${s}'!A:O`),email,key),
      getSheetRanges(SALES["2026"],STORES.map(s=>`'${s}'!A:O`),email,key)
    ]);
    const years:Record<string,Record<string,{total:Bucket;months:Bucket[];lobs:Record<Lob,Bucket>}>>={};
    for(const year of ["2025","2026"]){
      years[year]={};
      for(const s of STORES)years[year][s]={total:empty(),months:Array.from({length:12},empty),lobs:{iPhone:empty(),Mac:empty(),iPad:empty(),"Apple Watch":empty()}};
      const ranges=year==="2025"?r25:r26;
      for(let si=0;si<STORES.length;si++){
        const store=STORES[si],rows=(ranges[si]??[]) as Row[];
        for(const row of rows.slice(1)){
          if(voucher(row))continue;
          const d=dateKey(row[1]);if(!d||!d.startsWith(`${year}-`))continue;
          const m=Number(d.slice(5,7));if(m<1||m>endMonth)continue;
          const group=String(row[8]??"").toUpperCase();if(group!=="DEVICES")continue;
          const cat=String(row[6]??""),desc=String(row[10]??"");const lob=lobOf(cat,desc);if(!lob)continue;
          const qty=n(row[11]),amount=n(row[13]),x=years[year][store];
          x.total.amount+=amount;x.total.qty+=qty;x.months[m-1].amount+=amount;x.months[m-1].qty+=qty;x.lobs[lob].amount+=amount;x.lobs[lob].qty+=qty;
        }
      }
    }
    const area=(year:string)=>STORES.reduce((a,s)=>{a.amount+=years[year][s].total.amount;a.qty+=years[year][s].total.qty;return a},empty());
    const a25=area("2025"),a26=area("2026");
    const stores=STORES.map(code=>{const y25=years["2025"][code].total,y26=years["2026"][code].total;return{code,name:NAMES[code],y2025:y25.amount,y2026:y26.amount,qty2025:y25.qty,qty2026:y26.qty,gap:y26.amount-y25.amount,yoy:growth(y26.amount,y25.amount)}}).sort((a,b)=>a.gap-b.gap);
    const months=Array.from({length:endMonth},(_,i)=>{const sum=(year:string)=>STORES.reduce((a,s)=>{a.amount+=years[year][s].months[i].amount;a.qty+=years[year][s].months[i].qty;return a},empty());const p=sum("2025"),c=sum("2026");return{month:i+1,label:MONTHS[i],y2025:p.amount,y2026:c.amount,qty2025:p.qty,qty2026:c.qty,gap:c.amount-p.amount,yoy:growth(c.amount,p.amount)}});
    const lobs=(['iPhone','Mac','iPad','Apple Watch'] as Lob[]).map(lob=>{const sum=(year:string)=>STORES.reduce((a,s)=>{a.amount+=years[year][s].lobs[lob].amount;a.qty+=years[year][s].lobs[lob].qty;return a},empty());const p=sum("2025"),c=sum("2026");return{lob,y2025:p.amount,y2026:c.amount,qty2025:p.qty,qty2026:c.qty,gap:c.amount-p.amount,yoy:growth(c.amount,p.amount)}}).sort((a,b)=>a.gap-b.gap);
    return NextResponse.json({endMonth,summary:{y2025:a25.amount,y2026:a26.amount,qty2025:a25.qty,qty2026:a26.qty,gap:a26.amount-a25.amount,yoy:growth(a26.amount,a25.amount),qtyYoy:growth(a26.qty,a25.qty),growthStores:stores.filter(s=>(s.yoy??0)>=0).length,disgrowthStores:stores.filter(s=>(s.yoy??0)<0).length},stores,months,lobs,meta:{scope:"Apple Device only",includedLobs:["iPhone","Mac","iPad","Apple Watch"],excluded:["Accessories","VAS","AirPods","Voucher"]}},{headers:{"Cache-Control":"private, max-age=60"}});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal memuat YoY Apple Device"},{status:500})}
}
