"use server";
import {NextRequest,NextResponse} from "next/server";
import {getSheetRanges} from "@/lib/google-sheets";

const ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0",STORE="M238";
const s=(v:unknown)=>String(v??"").replace(/\u00a0/g," ").trim();
const up=(v:unknown)=>s(v).toUpperCase();
const n=(v:unknown)=>typeof v==="number"?v:Number(String(v??"").replace(/\./g,"").replace(/,/g,".").replace(/[^0-9.-]/g,""))||0;
const iso=(v:unknown)=>{const x=s(v);if(/^\d{2}-\d{2}-\d{4}$/.test(x)){const p=x.split("-");return p[2]+"-"+p[1]+"-"+p[0]}if(/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);if(typeof v==="number")return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);return""};
const today=()=>new Intl.DateTimeFormat("sv-SE",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date());

function kind(scheme:string,category:string,type:string,desc:string){
 const sc=up(scheme),text=[up(category),up(type),up(desc)].join(" ");
 if(sc==="VAS")return"vas";
 if(sc==="ACCESSORIES")return"accessories";
 if(sc==="DEVICES"||/IPHONE|IPAD|MACBOOK|APPLE WATCH|AIRPODS/.test(text))return"device";
 return"other";
}
function lobKey(category:string,type:string,desc:string){
 const x=[up(category),up(type),up(desc)].join(" ");
 if(/IPHONE/.test(x))return"iPhone";
 if(/MACBOOK|\bMAC\b/.test(x))return"MacBook";
 if(/IPAD/.test(x))return"iPad";
 if(/APPLE WATCH|WATCH SERIES|WATCH SE|WATCH ULTRA/.test(x))return"Apple Watch";
 if(/AIRPODS/.test(x))return"AirPods";
 return"";
}
function productName(type:string,desc:string,category:string){
 const x=[type,desc,category].join(" ").toUpperCase().replace(/\s+/g," ");
 if(/IPHONE\s*17\s*PRO\s*MAX/.test(x))return"iPhone 17 Pro Max";
 if(/IPHONE\s*17\s*PRO/.test(x))return"iPhone 17 Pro";
 if(/IPHONE\s*17(?!\s*PRO)/.test(x))return"iPhone 17";
 if(/IPHONE\s*AIR/.test(x))return"iPhone Air";
 if(/IPHONE\s*16\s*PLUS/.test(x))return"iPhone 16 Plus";
 if(/IPHONE\s*16\s*PRO\s*MAX/.test(x))return"iPhone 16 Pro Max";
 if(/IPHONE\s*16\s*PRO/.test(x))return"iPhone 16 Pro";
 if(/IPHONE\s*16/.test(x))return"iPhone 16";
 if(/IPHONE\s*15\s*PLUS/.test(x))return"iPhone 15 Plus";
 if(/IPHONE\s*15\s*PRO\s*MAX/.test(x))return"iPhone 15 Pro Max";
 if(/IPHONE\s*15\s*PRO/.test(x))return"iPhone 15 Pro";
 if(/IPHONE\s*15/.test(x))return"iPhone 15";
 if(/MACBOOK.*NEO|\bMBN\b/.test(x))return"MacBook Neo";
 if(/MACBOOK\s*AIR.*M5|MBA.*M5/.test(x))return"MacBook Air M5";
 if(/MACBOOK\s*AIR.*M4|MBA.*M4/.test(x))return"MacBook Air M4";
 if(/MACBOOK\s*AIR.*M3|MBA.*M3/.test(x))return"MacBook Air M3";
 if(/MACBOOK\s*AIR.*M2|MBA.*M2/.test(x))return"MacBook Air M2";
 if(/MACBOOK\s*PRO.*M5|MBP.*M5/.test(x))return"MacBook Pro M5";
 if(/MACBOOK\s*PRO.*M4|MBP.*M4/.test(x))return"MacBook Pro M4";
 if(/IPAD\s*AIR.*13.*M4/.test(x))return"iPad Air 13 M4";
 if(/IPAD\s*AIR.*11.*M4/.test(x))return"iPad Air 11 M4";
 if(/IPAD\s*PRO.*13/.test(x))return"iPad Pro 13";
 if(/IPAD\s*PRO.*11/.test(x))return"iPad Pro 11";
 if(/IPAD\s*MINI/.test(x))return"iPad mini";
 if(/\bIPAD\s*(?:11|11TH)\b/.test(x))return"iPad 11";
 if(/WATCH.*ULTRA.*3|AW.*ULTRA.*3/.test(x))return"Apple Watch Ultra 3";
 if(/WATCH.*SE.*3|AW.*SE.*3/.test(x))return"Apple Watch SE 3";
 if(/WATCH.*SERIES.*11|WATCH.*S11|AW.*S11/.test(x))return"Apple Watch Series 11";
 if(/AIRPODS.*PRO.*3|APP.*PRO.*3/.test(x))return"AirPods Pro 3";
 if(/AIRPODS.*4.*ANC|AIRPODS.*ANC.*4/.test(x))return"AirPods 4 ANC";
 if(/AIRPODS.*4/.test(x))return"AirPods 4";
 return s(type)||s(desc)||s(category)||"Produk";
}
function provider(article:string,brand:string,vendor:string,desc:string){
 const t=[article,brand,vendor,desc].join(" ").toUpperCase();
 if(t.includes("QOALA")||t.includes("PROTEKSI")||/(^|\s)KLA/.test(t))return"qoala";
 if(t.includes("TELKOMSEL")||/(^|\s)TSL(\s|$)/.test(t))return"telkomsel";
 if(t.includes("INDOSAT")||/(^|\s)IDT(\s|$)/.test(t))return"indosat";
 if(/(^|\s)XL(\s|$)|XXL/.test(t))return"xl";
 return"";
}
function vasLabel(kind:string,article:string,desc:string){
 if(kind==="qoala"){
  const raw=s(desc).replace(/^PROTEKSI\s+/i,"").trim();
  return raw?"Qoala "+raw:"Qoala";
 }
 return s(desc)||s(article)||kind.toUpperCase();
}

const FOCUS_SUPPLIERS:Record<string,Array<[string,string,string[]]>>={
 Hastag:[["KTS","Kate Spade",["KATESPADE","KATE SPADE"]],["MUUM","Mutuall",["MUTUALL","MUTURAL"]],["FLTFT","Flaunt",["FLAUNT"]]],
 Dino:[["AMN","A.ELEMENTS",["A.ELEMENTS","AELEMENTS"]],["GE4","Gear4",["GEAR4"]],["MOK","MICROPACK",["MICROPACK"]],["MPI","MOPHIE",["MOPHIE"]],["ZAG","ZAAG",["ZAAG","ZAGG"]],["IFG","Ifrog",["IFROG","IFROGZ"]],["VBT","Verbatim",["VERBATIM"]],["AAV","AVANA",["AVANA"]],["INC","INCASE",["INCASE"]],["INP","INCIPIO",["INCIPIO"]],["ITS","ITSKIN",["ITSKIN"]],["RIV","RIVACASE",["RIVACASE"]],["TCA","TUCANO",["TUCANO"]],["UAQ","UAG",["UAG"]],["CRR","Care",["CARE"]]],
 IGA:[["ADP","ADIDAS",["ADIDAS"]],["ECS","ELEMENCASE",["ELEMENCASE"]],["GSH","GOSH",["GOSH"]],["INT","INTELIAMOR",["INTELIAMOR"]],["LFP","LIFEPROOF",["LIFEPROOF"]],["MDN","Master Dynamic",["MASTER DYNAMIC"]],["NIP","PINIT",["PINIT"]],["OTB","OTTERBOX",["OTTERBOX"]],["RPC","Raptic",["RAPTIC"]],["SD0","Sudio",["SUDIO"]],["ST1","STM",["STM"]],["RSQ","Rollingsquare",["ROLLING SQUARE","ROLLINGSQUARE"]],["ARU","ARC Pulse",["ARC PULSE"]],["RAT","Kratos",["KRATOS"]]],
 IBacks:[["IBS","Ibacks",["IBACKS"]]],
 Handal:[["CTU","CASESTUDI",["CASESTUDI"]],["IUV","ILUV",["ILUV"]],["MHO","MACHINO",["MACHINO"]],["UNQ","UNIQ",["UNIQ"]]],
 Omega:[["LYC","Lycus",["LYCUS"]],["OMZ","Optimuz",["OPTIMUZ"]]],
 Torras:[["TORRAS","Torras",["TORRAS"]]]
};
const norm=(v:string)=>up(v).replace(/[^A-Z0-9]/g,"");
function supplierHint(vendor:string){
 const v=up(vendor);
 if(v.includes("HASTAG"))return"Hastag";
 if(v==="DINO"||v.includes(" DINO"))return"Dino";
 if(v==="IGA"||v.includes(" IGA"))return"IGA";
 if(v.includes("IBACKS"))return"IBacks";
 if(v.includes("HANDAL"))return"Handal";
 if(v.includes("OMEGA"))return"Omega";
 if(v.includes("TORRAS"))return"Torras";
 return"";
}
function matchFocusSupplier(article:string,brand:string,vendor:string){
 const a=norm(article),b=norm(brand),preferred=supplierHint(vendor),order=preferred?[preferred,...Object.keys(FOCUS_SUPPLIERS).filter(x=>x!==preferred)]:Object.keys(FOCUS_SUPPLIERS);
 for(const supplier of order)for(const[code,name,aliases]of FOCUS_SUPPLIERS[supplier]){
  const cc=norm(code),aliasMatch=!!b&&aliases.some(x=>b===norm(x)||b.includes(norm(x))||norm(x).includes(b)),codeMatch=!!a&&a.startsWith(cc);
  if((codeMatch&&(!b||aliasMatch))||aliasMatch)return{supplier,brandCode:code,brandName:name};
 }
 return null;
}
function focusCell(v:unknown){return productName(s(v),s(v),s(v))}
function weekKey(v:unknown){const m=s(v).match(/Week\s*(\d+)\s*Q(\d+)/i);return m?"Week "+Number(m[1])+" Q"+Number(m[2]):""}
function activeFocusFromConfig(rows:unknown[][],week:string){
 const weekLocs:Array<{r:number;c:number}>=[],productLocs:Array<{r:number;c:number;name:string}>=[];
 for(let r=0;r<rows.length;r++)for(let c=0;c<(rows[r]?.length||0);c++){
  if(weekKey(rows[r][c])===week)weekLocs.push({r,c});
  const p=focusCell(rows[r][c]);if(p&&/^(iPhone|MacBook|iPad|Apple Watch|AirPods)/.test(p))productLocs.push({r,c,name:p});
 }
 const hits:string[]=[];
 for(const p of productLocs)if(weekLocs.some(w=>(w.r===p.r&&Math.abs(w.c-p.c)<=16)||(w.c===p.c&&Math.abs(w.r-p.r)<=18)||(Math.abs(w.r-p.r)+Math.abs(w.c-p.c)<=10))&&!hits.includes(p.name))hits.push(p.name);
 return hits;
}

export async function GET(req:NextRequest){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY;
 if(!email||!key)return NextResponse.json({error:"Koneksi Google Sheets belum tersedia"},{status:503});
 const date=req.nextUrl.searchParams.get("date")||today(),staffId=s(req.nextUrl.searchParams.get("staffId"));
 try{
  const first=await getSheetRanges(ID,["'RAW SalesPerson'!AB2:AB65536"],email,key),dates=first[0]||[],matches:number[]=[];
  dates.forEach((r,i)=>{if(iso(r[0])===date)matches.push(i+2)});
  if(!matches.length)return NextResponse.json({date,staff:[],detail:null,source:"RAW SalesPerson"},{headers:{"cache-control":"private, max-age=30"}});
  const range="'RAW SalesPerson'!AB"+matches[0]+":AR"+matches[matches.length-1],ranges=[range];
  const data=await getSheetRanges(ID,ranges,email,key),raw=data[0]||[];
  const rows=raw.map(r=>({date:iso(r[0]),id:s(r[1]),name:s(r[2]),invoice:s(r[3]),article:s(r[4]),desc:s(r[5]),type:s(r[6]),qty:n(r[7]),amount:n(r[8]),category:s(r[9]),brand:s(r[10]),scheme:s(r[12]),vendor:s(r[13]),week:weekKey(r[14]),store:up(r[15])})).filter(r=>r.date===date&&(!r.store||r.store===STORE)&&up(r.scheme)!=="VOUCHER");

  const staffMap=new Map<string,{id:string;name:string;amount:number;device:number;accessories:number;vas:number;qty:number;invoices:Set<string>;lob:Record<string,number>}>();
  for(const r of rows){
   if(!r.id)continue;
   let st=staffMap.get(r.id);if(!st){st={id:r.id,name:r.name,amount:0,device:0,accessories:0,vas:0,qty:0,invoices:new Set(),lob:{"iPhone":0,"MacBook":0,"iPad":0,"Apple Watch":0,"AirPods":0}};staffMap.set(r.id,st)}
   st.amount+=r.amount;st.qty+=r.qty;if(r.invoice)st.invoices.add(r.invoice);
   const k=kind(r.scheme,r.category,r.type,r.desc);if(k==="device")st.device+=r.amount;else if(k==="accessories")st.accessories+=r.amount;else if(k==="vas")st.vas+=r.amount;
   const lob=lobKey(r.category,r.type,r.desc);if(lob)st.lob[lob]=(st.lob[lob]||0)+r.qty;
  }
  const staff=[...staffMap.values()].map(st=>({id:st.id,name:st.name,amount:st.amount,device:st.device,accessories:st.accessories,vas:st.vas,qty:st.qty,invoices:st.invoices.size,upt:st.invoices.size?st.qty/st.invoices.size:0,lob:st.lob})).sort((a,b)=>b.amount-a.amount);
  if(!staffId)return NextResponse.json({date,staff,detail:null,source:"RAW SalesPerson"},{headers:{"cache-control":"private, max-age=30, stale-while-revalidate=60"}});

  const mine=rows.filter(r=>r.id===staffId),person=staff.find(x=>x.id===staffId);
  if(!person)return NextResponse.json({date,staff,detail:null,source:"RAW SalesPerson"},{headers:{"cache-control":"private, max-age=30"}});

  const productMap=new Map<string,{name:string;lob:string;qty:number;value:number}>(),vasMap=new Map<string,{provider:string;name:string;qty:number;value:number}>(),focusMap=new Map<string,{supplier:string;brandCode:string;brandName:string;name:string;article:string;qty:number;value:number}>();
  for(const r of mine){
   const k=kind(r.scheme,r.category,r.type,r.desc);
   if(k==="device"||k==="accessories"){
    const name=productName(r.type,r.desc,r.category),lob=lobKey(r.category,r.type,r.desc)||"Accessories",key2=lob+"|"+name,x=productMap.get(key2)||{name,lob,qty:0,value:0};x.qty+=r.qty;x.value+=r.amount;productMap.set(key2,x);
    if(k==="accessories"){
      const hit=matchFocusSupplier(r.article,r.brand,r.vendor);
      if(hit){
        const focusName=s(r.type)||s(r.desc)||s(r.article),fk=hit.supplier+"|"+hit.brandCode+"|"+focusName+"|"+r.article;
        const fx=focusMap.get(fk)||{...hit,name:focusName,article:r.article,qty:0,value:0};fx.qty+=r.qty;fx.value+=r.amount;focusMap.set(fk,fx);
      }
    }
   }
   if(k==="vas"){
    const p=provider(r.article,r.brand,r.vendor,r.desc);if(!p)continue;const name=vasLabel(p,r.article,r.desc),key2=p+"|"+name,x=vasMap.get(key2)||{provider:p,name,qty:0,value:0};x.qty+=r.qty;x.value+=r.amount;vasMap.set(key2,x);
   }
  }
  const week=mine.map(r=>r.week).find(Boolean)||"",products=[...productMap.values()].sort((a,b)=>b.qty-a.qty||b.value-a.value),focusProducts=[...focusMap.values()].sort((a,b)=>a.supplier.localeCompare(b.supplier)||b.qty-a.qty||b.value-a.value),vas=[...vasMap.values()].sort((a,b)=>b.value-a.value);
  return NextResponse.json({date,staff,detail:{...person,products,vas,focusProducts,week},source:"RAW SalesPerson"},{headers:{"cache-control":"private, max-age=30, stale-while-revalidate=60"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Gagal membaca detail staff harian"},{status:500})}
}