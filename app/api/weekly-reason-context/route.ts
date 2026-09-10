import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const DASHBOARD_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const STORE="M238";
const s=(v:unknown)=>String(v??"").trim();
const n=(v:unknown)=>typeof v==="number"?v:Number(s(v).replace(/[^0-9.-]/g,""))||0;
const up=(v:unknown)=>s(v).toUpperCase();
const iso=(v:unknown)=>{if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);const x=s(v);if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);const m=x.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:""};
const lobMatchers:Record<string,RegExp>={AIRPODS:/air\s*pods?/i,IPHONE:/iphone|\bip\s*(?:\d|air)/i,MAC:/macbook|\bmac\s*(?:air|pro|neo)/i,IPAD:/ipad/i,"APPLE WATCH":/apple watch|\bwatch\b|\baw\s*(?:s|se|ultra)/i};
const themeDefs=[
 {key:"stock",pattern:/stok|stock|kosong|habis|tidak tersedia|warna tidak|kapasitas tidak/i},
 {key:"price",pattern:/compare|banding|harga|mahal|budget|kompetitor|ibox/i},
 {key:"survey",pattern:/survey|masih lihat|masih liat|belum yakin|belum closing|pikir|pertimbang/i},
 {key:"shifting",pattern:/shifting|alih|pindah ke|switch|alternatif/i},
 {key:"promo",pattern:/promo|diskon|potongan|voucher|cashback/i},
 {key:"tryon",pattern:/try\s*on|demo|trial|coba produk|coba langsung/i},
 {key:"bundling",pattern:/bundling|bundle|attach|attachment/i},
 {key:"waiting",pattern:/menunggu|nunggu|waiting|launch|launching/i},
 {key:"installment",pattern:/cicilan|bnpl|paylater|kartu kredit|tenor/i},
 {key:"traffic",pattern:/traffic|trafic|sepi|minim customer|customer sedikit/i},
 {key:"followup",pattern:/follow\s*up|\bfu\b|save kontak|simpan kontak/i},
] as const;
type ThemeKey=typeof themeDefs[number]["key"];
type StockItem={lob:string;article:string;description:string;qty:number};
const stop=new Set(["IPHONE","IPAD","APPLE","WATCH","MACBOOK","AIRPODS","AIR","PRO","MAX","SE","ULTRA","GB","TB","THE","AND","WITH","FOR","CASE","CLEAR","MAGSAFE"]);
function tokens(v:string){return up(v).replace(/[^A-Z0-9]+/g," ").split(/\s+/).filter(x=>x.length>=2&&!stop.has(x));}
function stockStatus(q:number){return q<=0?"Stok Habis":q===1?"Stok Terbatas, sisa 1 unit":"Stok Tersedia"}
function bestStockMatch(raw:string,lob:string,items:StockItem[]){const rt=tokens(raw),rset=new Set(rt);let best:{item:StockItem;score:number}|null=null;for(const item of items){if(item.lob!==lob)continue;const it=tokens(`${item.article} ${item.description}`);let score=0;for(const t of it)if(rset.has(t))score+=/\d/.test(t)?2:1;if(score>(best?.score||0))best={item,score}}return best&&best.score>=2?best.item:null}
async function safeRanges(id:string,ranges:string[],email:string,key:string){try{return await getSheetRanges(id,ranges,email,key)}catch{return ranges.map(()=>[])}}
export async function GET(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Google Sheets belum dikonfigurasi"},{status:503});
 const week=req.nextUrl.searchParams.get("week")||"";
 if(!week)return NextResponse.json({error:"Week belum dipilih"},{status:400});
 try{
  const [dataRows,feedbackRows,...stockRanges]=await safeRanges(DASHBOARD_ID,["'Data Copas'!A2:S50000","'Dashboard Feedback'!A2:G5000","'SOH'!C10:E200","'SOH'!J10:L200","'SOH'!Q10:S200","'SOH'!X10:Z200","'SOH'!AE10:AG200"],email,key);
  const storeRows=(dataRows||[]).filter(r=>up(r[15])===STORE&&s(r[18])==="2026"&&s(r[14])===week),dates=[...new Set(storeRows.map(r=>iso(r[0])).filter(Boolean))].sort(),start=dates[0]||"",end=dates.at(-1)||"";
  const feedback=(feedbackRows||[]).filter(r=>{const d=iso(r[1]);return Boolean(d&&start&&d>=start&&d<=end)}).map(r=>s(r[5])).filter(Boolean);
  const stockItems:StockItem[]=[];const lobs=["IPHONE","IPAD","MAC","APPLE WATCH","AIRPODS"];
  stockRanges.forEach((rows,i)=>{for(const r of rows||[]){const article=s(r[0]),description=s(r[1]),qty=n(r[2]);if(!article||/^ARTICLE$|GRAND TOTAL/i.test(article))continue;stockItems.push({lob:lobs[i]||"",article,description,qty})}});
  const byLob:Record<string,unknown>={};
  for(const [lob,matcher] of Object.entries(lobMatchers)){
   const raws=feedback.filter(x=>matcher.test(x));const counts=new Map<ThemeKey,number>();
   for(const raw of raws)for(const t of themeDefs)if(t.pattern.test(raw))counts.set(t.key,(counts.get(t.key)||0)+1);
   const themes=[...counts.entries()].sort((a,b)=>b[1]-a[1]).map(([key,count])=>({key,count}));
   const lostMap=new Map<string,{label:string;qty:number;status:string}>();let stockClaimAvailable=0;
   for(const raw of raws.filter(x=>/stok|stock|kosong|habis|tidak tersedia|warna tidak|kapasitas tidak/i.test(x))){const match=bestStockMatch(raw,lob,stockItems);if(!match)continue;if(match.qty<=1){const label=(match.description||match.article).trim();lostMap.set(match.article,{label,qty:match.qty,status:stockStatus(match.qty)})}else stockClaimAvailable++}
   byLob[lob]={feedbackCount:raws.length,themes,lostStock:[...lostMap.values()],stockClaimAvailable,sohAvailable:stockItems.some(x=>x.lob===lob)};
  }
  return NextResponse.json({week,period:{start,end},feedbackCount:feedback.length,byLob},{headers:{"cache-control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca reason context"},{status:500})}
}
