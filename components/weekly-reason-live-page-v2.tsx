"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {exportReportPdf} from "@/lib/dashboard-export";

const money=new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
const num=new Intl.NumberFormat("id-ID");
const pct=(v:number)=>`${new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(Number.isFinite(v)?v:0)}%`;
type Agg={qty:number;amount:number};
type Analysis={review:string;actionPlan:string;target:number;achievement:number;gap:number};
type Weekly={labelA:string;labelB:string;availableWeeks:string[];a:{lob:Record<string,Record<string,Agg>>};b:{lob:Record<string,Record<string,Agg>>};analysis:Record<string,Analysis>;feedbackSummary:string;error?:string};
type Side={label:string;period:{start:string;end:string};traffic:number;transactions:number;qty:number;upt:number;sales:number};
type Product={article:string;description:string;type:string;lob:string;prevQty:number;currQty:number;stockQty:number};
type Metrics={a:Side;b:Side;products:Product[];error?:string};
type Theme={key:string;count:number};
type Lost={label:string;qty:number;status:string};
type LobContext={feedbackCount:number;themes:Theme[];lostStock:Lost[];stockClaimAvailable:number;sohAvailable:boolean;rawFeedback?:string[]};
type Context={byLob:Record<string,LobContext>;feedbackCount:number;error?:string};
type Saved={data?:Weekly;snapshot?:{data?:Weekly};found?:boolean};
const lobOrder:[string,string][]=[["AIRPODS","AirPods"],["APPLE WATCH","Apple Watch"],["IPAD","iPad"],["IPHONE","iPhone"],["MAC","MacBook"]];
const rank=(label:string)=>{const m=label.match(/Week\s*(\d+)\s*Q(\d+)/i);return Number(m?.[2]||0)*100+Number(m?.[1]||0)};
const previousWeek=(weeks:string[],week:string)=>{const sorted=[...weeks].sort((a,b)=>rank(a)-rank(b)),i=sorted.indexOf(week);return i>0?sorted[i-1]:(sorted[0]||week)};
const growth=(a:number,b:number)=>a?(b-a)/a*100:0;
const sum=(r:Record<string,Agg>={})=>Object.values(r).reduce((a,x)=>({qty:a.qty+(x.qty||0),amount:a.amount+(x.amount||0)}),{qty:0,amount:0});
function movers(a:Record<string,Agg>={},b:Record<string,Agg>={}){return [...new Set([...Object.keys(a),...Object.keys(b)])].map(name=>({name,diff:(b[name]?.qty||0)-(a[name]?.qty||0)})).filter(x=>x.diff!==0).sort((x,y)=>Math.abs(y.diff)-Math.abs(x.diff))}
const productStop=new Set(["APPLE","WATCH","IPHONE","IPAD","MACBOOK","AIRPODS","AIR","PRO","MAX","GB","TB","INCH","WI","FI","SPACE","BLACK","SILVER","GPS","IND"]);
function productTokens(v:string){return v.toUpperCase().replace(/[^A-Z0-9]+/g," ").split(/\s+/).filter(x=>x&&!productStop.has(x))}
function relatedProduct(a:string,b:string){
 const tokens=(v:string)=>v.toUpperCase()
  .replace(/\bS(\d+)\b/g,"$1")
  .replace(/\bGEN\s*(\d+)\b/g,"$1")
  .replace(/[^A-Z0-9]+/g," ")
  .trim()
  .split(/\s+/)
  .filter(Boolean);

 const A=tokens(a),B=tokens(b);

 const numsA=A.filter(x=>/^\d+$/.test(x));
 const numsB=B.filter(x=>/^\d+$/.test(x));

 // Generasi utama harus sama
 const generationA=numsA[0]||"";
 const generationB=numsB[0]||"";
 if(generationA&&generationB&&generationA!==generationB)return false;

 const qualifiers=["PRO","MAX","PLUS","AIR","SE","ULTRA","MINI","NEO"];

 const qa=qualifiers.filter(x=>A.includes(x));
 const qb=qualifiers.filter(x=>B.includes(x));

 // Kalau salah satu type punya qualifier, struktur qualifier harus sama.
 // 16 PLUS != 16 PRO MAX
 // iPad AIR != iPad PRO
 if(qa.length||qb.length){
  if(qa.length!==qb.length)return false;
  if(!qa.every(x=>qb.includes(x)))return false;
 }

 return true;
}

function relevantLostStock(a:Record<string,Agg>,b:Record<string,Agg>,ctx:LobContext|undefined){
 if(!ctx?.lostStock?.length)return[];
 const down=movers(a,b).filter(x=>x.diff<0);
 if(!down.length)return[];
 return ctx.lostStock.filter(stock=>down.some(item=>relatedProduct(item.name,stock.label)))
}
function selectedThemeKeys(g:number,ctx:LobContext|undefined){
 const available=new Set((ctx?.themes||[]).map(x=>x.key));
 const priority=g<0
  ?["price","survey","waiting","shifting","installment","traffic","promo","tryon","bundling"]
  :["promo","tryon","bundling","price","survey","shifting","waiting","installment","traffic"];
 return priority.filter(x=>available.has(x)).slice(0,3)
}

const rawHas=(ctx:LobContext|undefined,p:RegExp)=>
 (ctx?.rawFeedback||[]).some(x=>p.test(x));

const themeCount=(ctx:LobContext|undefined,key:string)=>
 ctx?.themes?.find(x=>x.key===key)?.count||0;

const shortMoney=(v:number)=>{
 if(v>=1_000_000_000)
  return `Rp${new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(v/1_000_000_000)} M`;
 if(v>=1_000_000)
  return `Rp${new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(v/1_000_000)} juta`;
 return money.format(v);
};

function movementNotes(
 label:string,
 a:Record<string,Agg>,
 b:Record<string,Agg>,
 g:number
){
 const mv=movers(a,b);

 const up=mv
  .filter(x=>x.diff>0)
  .sort((x,y)=>y.diff-x.diff);

 const down=mv
  .filter(x=>x.diff<0)
  .sort((x,y)=>x.diff-y.diff);

 const A=sum(a);
 const B=sum(b);

 const amountGrowth=A.amount
  ?((B.amount-A.amount)/A.amount)*100
  :B.amount>0?100:0;

 const out:string[]=[];

 // Jika total LOB turun, mulai dari penurunan terbesar.
 if(g<0){
  if(down.length){
   const x=down[0];
   const prev=a[x.name]?.qty||0;
   const curr=b[x.name]?.qty||0;

   out.push(
    `Penurunan terbesar terjadi pada ${x.name}, dari ${prev} menjadi ${curr} unit atau turun ${Math.abs(x.diff)} unit.`
   );

   if(down.length>1){
    const y=down[1];
    out.push(
     `${y.name} juga turun dari ${a[y.name]?.qty||0} menjadi ${b[y.name]?.qty||0} unit.`
    );
   }
  }

  if(up.length){
   const x=up[0];
   out.push(
    `Di sisi lain ${x.name} naik dari ${a[x.name]?.qty||0} menjadi ${b[x.name]?.qty||0} unit, namun belum menutup penurunan secara total.`
   );
  }
 }

 // Jika total LOB naik, mulai dari driver kenaikan.
 else {
  if(up.length){
   const x=up[0];

   out.push(
    `Kenaikan paling signifikan terjadi pada ${x.name}, dari ${a[x.name]?.qty||0} menjadi ${b[x.name]?.qty||0} unit atau naik ${x.diff} unit.`
   );

   for(const y of up.slice(1,3)){
    out.push(
     `${y.name} juga naik dari ${a[y.name]?.qty||0} menjadi ${b[y.name]?.qty||0} unit.`
    );
   }
  }

  if(down.length){
   const x=down[0];
   const curr=b[x.name]?.qty||0;

   out.push(
    `Namun ${x.name} turun ${Math.abs(x.diff)} unit, dari ${a[x.name]?.qty||0} menjadi ${curr} unit${curr===0?" dan week ini tidak ada penjualan":""}.`
   );
  }
 }

 // Tambahkan insight amount hanya jika bermakna.
 if(g<0 && amountGrowth>0){
  out.push(
   `Walaupun qty turun, secara amount masih naik ${pct(amountGrowth)} dibanding week sebelumnya.`
  );
 }

 else if(g>0 && amountGrowth<0){
  out.push(
   `Secara qty naik, namun amount turun ${pct(Math.abs(amountGrowth))} dibanding week sebelumnya.`
  );
 }

 return out;
}

function conditionalReasons(
 label:string,
 g:number,
 ctx:LobContext|undefined,
 relevantLost:Lost[]
){
 const out:string[]=[];

 // FAKTOR SPESIFIK: hanya muncul jika benar-benar ada di feedback Week tersebut.
 if(label==="iPhone" && rawHas(ctx,/personal\s*shopper|\bPS\b/i))
  out.push("Penjualan week ini terbantu oleh transaksi Personal Shopper yang tercatat pada feedback team.");

 if(label==="iPhone" && rawHas(ctx,/free\s*adaptor|adaptor\s*gratis/i))
  out.push("Promo Free Adaptor yang berjalan ikut membantu customer dalam mengambil keputusan pembelian.");

 if((label==="iPad"||label==="MacBook") && rawHas(ctx,/\bBTS\b|back\s*to\s*school/i))
  out.push("Promo BTS yang berjalan ikut membantu opportunity customer pada week ini.");

 if(label==="iPhone" && rawHas(ctx,/iphone\s*18|\bip\s*18\b/i))
  out.push("Sebagian customer masih compare atau memilih menunggu iPhone 18 sehingga belum langsung menentukan pembelian.");

 if(
  (label==="AirPods" && rawHas(ctx,/try\s*on|samudra/i)) ||
  (label==="iPad" && rawHas(ctx,/try\s*on|aksara/i)) ||
  (label==="MacBook" && rawHas(ctx,/try\s*on|cakrawala/i)) ||
  (label==="Apple Watch" && rawHas(ctx,/demo/i))
 )
  out.push("Try On atau demo product membantu customer memahami produk dan memperkuat buying signal.");

 // Reason umum juga hanya jika memang muncul pada feedback.
 if(themeCount(ctx,"price"))
  out.push("Masih terdapat customer yang compare harga atau menyesuaikan budget sebelum menentukan pembelian.");

 if(themeCount(ctx,"survey"))
  out.push("Sebagian customer masih survey dan belum langsung menentukan pilihan.");

 if(themeCount(ctx,"shifting"))
  out.push("Beberapa customer berhasil diarahkan ke type alternatif yang lebih sesuai dengan kebutuhan atau budget.");

 if(themeCount(ctx,"installment"))
  out.push("Metode pembayaran atau cicilan masih menjadi pertimbangan sebagian customer sebelum closing.");

 if(
  themeCount(ctx,"waiting") &&
  !(label==="iPhone" && rawHas(ctx,/iphone\s*18|\bip\s*18\b/i))
 )
  out.push("Sebagian customer masih menunggu product atau momentum pembelian sebelum closing.");

 if(relevantLost.length)
  out.push(`Kendala stok tervalidasi pada ${relevantLost.map(x=>x.label).slice(0,2).join(" dan ")}.`);

 if(!out.length && ctx?.feedbackCount)
  out.push(
   g>=0
    ?"Feedback staff menunjukkan opportunity week ini tetap dapat dikonversi, namun belum terdapat satu faktor dominan yang cukup kuat untuk dijadikan reason utama."
    :"Feedback staff belum menunjukkan satu kendala dominan, sehingga type yang turun perlu digali lebih detail pada opportunity berikutnya."
  );

 return [...new Set(out)].slice(0,3);
}

function conditionalPlans(
 label:string,
 g:number,
 ctx:LobContext|undefined,
 relevantLost:Lost[]
){
 const out:string[]=[];

 // Action plan selalu mengikuti reason yang benar-benar terdeteksi.
 if(relevantLost.length){
  out.push("Lakukan request atau konsolidasi stok untuk varian yang benar-benar terkait dengan lost sales.");
  out.push("Follow up kembali customer setelah stok terkait tersedia.");
 }

 if(themeCount(ctx,"price"))
  out.push("Maksimalkan promo bank, BNPL, Trade In atau benefit aktif yang relevan untuk customer yang concern di harga.");

 if(themeCount(ctx,"installment"))
  out.push("Berikan simulasi cicilan dan tenor sesuai kemampuan serta kebutuhan customer.");

 if(themeCount(ctx,"survey"))
  out.push("Perkuat probing dan follow up customer yang masih survey atau belum menentukan pilihan.");

 if(themeCount(ctx,"shifting"))
  out.push("Gali kebutuhan customer dan lakukan upselling atau downselling ke type yang paling sesuai.");

 if(
  (label==="AirPods" && rawHas(ctx,/try\s*on|samudra/i)) ||
  (label==="iPad" && rawHas(ctx,/try\s*on|aksara/i)) ||
  (label==="MacBook" && rawHas(ctx,/try\s*on|cakrawala/i)) ||
  (label==="Apple Watch" && rawHas(ctx,/demo/i))
 )
  out.push("Pertahankan aktivitas Try On atau demo product pada customer yang relevan.");

 if((label==="iPad"||label==="MacBook") && rawHas(ctx,/\bBTS\b|back\s*to\s*school/i))
  out.push("Maksimalkan penyampaian promo BTS selama program masih berjalan.");

 if(label==="iPhone" && rawHas(ctx,/iphone\s*18|\bip\s*18\b/i))
  out.push("Untuk customer yang menunggu product baru, gali urgensi kebutuhan saat ini dan lakukan follow up terjadwal.");

 if(label==="iPhone" && rawHas(ctx,/free\s*adaptor|adaptor\s*gratis/i))
  out.push("Pastikan benefit Free Adaptor tersampaikan pada customer yang memenuhi program selama promo masih aktif.");

 if(!out.length)
  out.push(
   g>=0
    ?"Pertahankan momentum type yang tumbuh dan monitoring opportunity agar kontribusi tetap terjaga."
    :"Fokus pada type yang turun, perkuat probing, dan follow up seluruh customer potensial."
  );

 return [...new Set(out)].slice(0,5);
}

function reviewFor(label:string,a:Record<string,Agg>,b:Record<string,Agg>,ctx:LobContext|undefined,relevantLost:Lost[]){
 const A=sum(a),B=sum(b),qg=growth(A.qty,B.qty),ag=growth(A.amount,B.amount),mv=movers(a,b),
 down=mv.filter(x=>x.diff<0).slice(0,2),up=mv.filter(x=>x.diff>0).slice(0,2);
 let text=`Penjualan ${label} week ini ${B.qty>A.qty?"mengalami kenaikan":B.qty<A.qty?"mengalami penurunan":"stabil"} ${B.qty===A.qty?"0%":`${qg>=0?"+":""}${pct(qg)}`} dibanding week sebelumnya, dari ${A.qty} menjadi ${B.qty} unit.`;
 if(A.amount)text+=` Secara amount ${ag>=0?"naik":"turun"} ${pct(Math.abs(ag))}.`;
 if(B.qty<A.qty&&down.length){
  text+=` Penurunan terbesar terjadi pada ${down.map(x=>`${x.name} ${Math.abs(x.diff)} unit`).join(" dan ")}.`;
  if(up.length)text+=` Di sisi lain ${up.map(x=>`${x.name} naik ${x.diff} unit`).join(" dan ")}, namun belum menutup penurunan.`
 }else if(B.qty>A.qty&&up.length){
  text+=` Kenaikan terbesar terbantu oleh ${up.map(x=>`${x.name} +${x.diff} unit`).join(" dan ")}.`;
  if(down.length)text+=` Namun masih terdapat penurunan pada ${down.map(x=>`${x.name} ${Math.abs(x.diff)} unit`).join(" dan ")}.`
 }else if(up.length&&down.length){
  text+=` ${up[0].name} naik ${up[0].diff} unit, namun tertahan penurunan ${down[0].name} ${Math.abs(down[0].diff)} unit.`
 }
 if(relevantLost.length){
  text+=` Reason staff terkait stok tervalidasi dan berkaitan dengan type yang mengalami penurunan pada ${relevantLost.map(x=>x.label).slice(0,2).join(" dan ")}.`
 }else if(ctx?.lostStock?.length){
  text+=""
 }
 return text
}

function cleanProductName(v:string){
 let x=v
  .replace(/-IND\b/gi,"")
  .replace(/\bSTL\b/gi,"Starlight")
  .replace(/\bMDN\b/gi,"Midnight")
  .replace(/\bSLV\b/gi,"Silver")
  .replace(/\bSGR\b/gi,"Space Gray")
  .replace(/\b13\.6\b/g,'13"')
  .replace(/\b15\.3\b/g,'15"')
  .replace(/\b14\.2\b/g,'14"')
  .replace(/\b16\.2\b/g,'16"')
  .replace(/\b8C GPU\b/gi,"")
  .replace(/\b10C GPU\b/gi,"")
  .replace(/\b16GB\/512GB\b/gi,"16/512")
  .replace(/\b16GB\/256GB\b/gi,"16/256")
  .replace(/\b24GB\/512GB\b/gi,"24/512")
  .replace(/\s+/g," ")
  .trim();

 return x;
}

function positiveDriverReason(
 label:string,
 a:Record<string,Agg>,
 b:Record<string,Agg>,
 g:number
){
 if(g<=0)return "";

 const mv=movers(a,b)
  .filter(x=>x.diff>0)
  .sort((x,y)=>y.diff-x.diff);

 if(!mv.length)return "";

 const x=mv[0];
 const prev=a[x.name]?.qty||0;
 const curr=b[x.name]?.qty||0;

 if(label==="Apple Watch"){
  return `${x.name} menjadi salah satu driver utama kenaikan Apple Watch week ini, naik dari ${prev} menjadi ${curr} unit.`;
 }

 if(label==="iPad"){
  return `${x.name} menjadi driver utama kenaikan iPad week ini, naik dari ${prev} menjadi ${curr} unit dan memberi kontribusi terbesar terhadap pertumbuhan qty.`;
 }

 if(label==="iPhone"){
  return `${x.name} menjadi driver terbesar kenaikan iPhone week ini, naik dari ${prev} menjadi ${curr} unit.`;
 }

 if(label==="MacBook"){
  return `${x.name} menjadi kontributor utama kenaikan qty MacBook week ini, naik dari ${prev} menjadi ${curr} unit.`;
 }

 return "";
}

function reasonLines(
 label:string,
 g:number,
 ctx:LobContext|undefined,
 relevantLost:Lost[],
 amountDown=false,
 a:Record<string,Agg>={},
 b:Record<string,Agg>={}
){
 const out:string[]=[];

 const driver=positiveDriverReason(label,a,b,g);
 if(driver)out.push(driver);

 if(
  label==="iPhone" &&
  rawHas(ctx,/iphone\s*18|\bip\s*18\b/i)
 ){
  out.push(
   "Sebagian customer iPhone masih compare atau memilih menunggu iPhone 18 sehingga belum langsung menentukan pembelian."
  );
 }

 if(label==="MacBook" && g>0 && amountDown){
  out.push(
   "Secara qty MacBook tumbuh, namun amount turun karena kontribusi penjualan week ini lebih banyak berasal dari type dengan value yang lebih rendah."
  );
 }

 if(relevantLost.length){
  out.push(
   `Ketersediaan stok menjadi kendala pada ${relevantLost.map(x=>cleanProductName(x.label)).slice(0,2).join(" dan ")}.`
  );
 }

 const themes=[...(ctx?.themes||[])]
  .sort((a,b)=>b.count-a.count);

 for(const t of themes){
  if(out.length>=3)break;

  if(t.key==="price"){
   out.push(
    "Masih terdapat customer yang compare harga atau menyesuaikan budget sebelum menentukan pembelian."
   );
  }

  else if(t.key==="survey"){
   out.push(
    "Sebagian customer masih survey dan belum langsung menentukan pilihan."
   );
  }

  else if(t.key==="shifting"){
   out.push(
    "Beberapa customer berhasil diarahkan ke type alternatif yang lebih sesuai dengan kebutuhan atau budget."
   );
  }

  else if(t.key==="installment"){
   out.push(
    "Metode pembayaran atau cicilan masih menjadi pertimbangan sebagian customer sebelum closing."
   );
  }
 }

 return [...new Set(out)].slice(0,3);
}

function planFor(
 label:string,
 g:number,
 ctx:LobContext|undefined,
 relevantLost:Lost[],
 amountDown=false
){
 const out:string[]=[];

 if(label==="AirPods"){
  if(themeCount(ctx,"price") || themeCount(ctx,"installment")){
   out.push(
    "Maksimalkan promo bank, BNPL atau cicilan untuk customer AirPods yang masih concern di budget."
   );
  }

  if(rawHas(ctx,/try\s*on|samudra/i)){
   out.push(
    "Maksimalkan Try On Samudra pada customer yang mencari AirPods."
   );
  }

  out.push(
   "Tetap offering AirPods pada setiap transaksi iPhone untuk membantu attachment dan UPT."
  );
 }

 else if(label==="Apple Watch"){
  out.push(
   "Pertahankan momentum Apple Watch SE 3 dan Ultra 3 dengan menggali kebutuhan customer serta mengarahkan ke series yang paling sesuai."
  );

  if(themeCount(ctx,"price")){
   out.push(
    "Untuk customer yang concern di budget, arahkan ke series yang sesuai dan manfaatkan metode pembayaran yang tersedia."
   );
  }

  if(themeCount(ctx,"survey")){
   out.push(
    "Follow up customer Apple Watch yang masih survey agar opportunity tidak lost."
   );
  }
 }

 else if(label==="iPad"){
  out.push(
   "Pertahankan momentum iPad 11 sebagai entry product dan gali opportunity upselling ke iPad Air atau iPad Pro sesuai kebutuhan."
  );

  if(themeCount(ctx,"shifting")){
   out.push(
    "Manfaatkan shifting dengan menawarkan type iPad alternatif yang ready dan tetap sesuai kebutuhan customer."
   );
  }

  if(themeCount(ctx,"survey")){
   out.push(
    "Follow up customer iPad yang masih survey dan perkuat demo berdasarkan kebutuhan penggunaan."
   );
  }
 }

 else if(label==="iPhone"){
  if(rawHas(ctx,/iphone\s*18|\bip\s*18\b/i)){
   out.push(
    "Untuk customer yang memilih menunggu iPhone 18, gali urgensi kebutuhan saat ini dan lakukan follow up terjadwal."
   );
  }

  if(themeCount(ctx,"price")){
   out.push(
    "Maksimalkan Trade In, promo bank atau BNPL untuk customer iPhone yang concern di harga."
   );
  }

  if(themeCount(ctx,"survey")){
   out.push(
    "Follow up customer iPhone yang masih compare atau survey dan belum menentukan pilihan."
   );
  }

  out.push(
   "Tetap push AirPods dan accessories pada transaksi iPhone untuk menjaga UPT."
  );
 }

 else if(label==="MacBook"){
  if(amountDown){
   out.push(
    "Dorong upselling dari MacBook entry product ke MBA atau MBP agar kenaikan qty juga mendorong pertumbuhan amount."
   );
  }

  out.push(
   "Perkuat demo berdasarkan use case customer untuk meningkatkan confidence terhadap type Mac dengan value lebih tinggi."
  );

  if(themeCount(ctx,"price")){
   out.push(
    "Manfaatkan promo bank atau BNPL untuk customer MacBook yang masih concern di budget."
   );
  }
 }

 if(relevantLost.length){
  out.push(
   "Monitoring dan konsolidasi stok untuk varian yang benar-benar berkaitan dengan lost sales."
  );
 }

 if(!out.length){
  out.push(
   g>=0
    ? "Pertahankan momentum type yang tumbuh dan follow up opportunity potensial."
    : "Fokus pada type yang turun, perkuat probing, dan follow up customer yang belum closing."
  );
 }

 return [...new Set(out)].slice(0,4);
}

export default function WeeklyReasonLivePageV2(){
 const reportRef=useRef<HTMLDivElement>(null),[weeks,setWeeks]=useState<string[]>([]),[selected,setSelected]=useState(""),[weekly,setWeekly]=useState<Weekly|null>(null),[metrics,setMetrics]=useState<Metrics|null>(null),[context,setContext]=useState<Context|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[source,setSource]=useState(""),[busy,setBusy]=useState("");
 const latest=weeks.length?[...weeks].sort((a,b)=>rank(a)-rank(b)).at(-1)||"":"";
 const load=useCallback(async(week:string,force=false,knownWeeks?:string[])=>{if(!week)return;setLoading(true);setError("");try{const list=knownWeeks||weeks,compare=previousWeek(list,week),isCurrent=week===(list.length?[...list].sort((a,b)=>rank(a)-rank(b)).at(-1):week);let reason:Weekly|null=null;if(!isCurrent&&!force){const saved=await fetch(`/api/weekly-reason-snapshot?week=${encodeURIComponent(week)}`,{cache:"no-store"}).then(r=>r.json()) as Saved;reason=(saved.snapshot?.data||saved.data||null) as Weekly|null;if(reason)setSource("Reason tersimpan • angka performa tetap membaca data terbaru")}if(!reason){reason=await fetch(`/api/weekly?from=${encodeURIComponent(compare)}&to=${encodeURIComponent(week)}&t=${Date.now()}`,{cache:"no-store"}).then(r=>r.json()) as Weekly;setSource(isCurrent?"Week berjalan • live":"Reason diperbarui dari data terbaru")}if(reason.error)throw new Error(reason.error);const [m,c]=await Promise.all([fetch(`/api/weekly-reason-metrics?from=${encodeURIComponent(compare)}&to=${encodeURIComponent(week)}&t=${Date.now()}`,{cache:"no-store"}).then(r=>r.json()) as Promise<Metrics>,fetch(`/api/weekly-reason-context?week=${encodeURIComponent(week)}&t=${Date.now()}`,{cache:"no-store"}).then(r=>r.json()) as Promise<Context>]);if(m.error)throw new Error(m.error);setWeekly(reason);setMetrics(m);setContext(c.error?{byLob:{},feedbackCount:0}:c);if(force||isCurrent)await fetch("/api/weekly-reason-snapshot",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({week:reason.labelB,compareWeek:reason.labelA,snapshot:{data:reason,trafficA:m.a.traffic,trafficB:m.b.traffic,dailyA:{qty:m.a.qty,invoices:m.a.transactions},dailyB:{qty:m.b.qty,invoices:m.b.transactions},savedAt:new Date().toISOString()}})}).catch(()=>{})}catch(e){setError(e instanceof Error?e.message:"Weekly Reason gagal dibaca")}finally{setLoading(false)}},[weeks]);
 useEffect(()=>{void(async()=>{try{const w=await fetch(`/api/weekly?t=${Date.now()}`,{cache:"no-store"}).then(r=>r.json()) as Weekly;if(w.error)throw new Error(w.error);const list=[...(w.availableWeeks||[])].sort((a,b)=>rank(a)-rank(b));setWeeks(list);const current=w.labelB||list.at(-1)||"";setSelected(current);await load(current,false,list)}catch(e){setError(e instanceof Error?e.message:"Weekly Reason gagal dibuka");setLoading(false)}})()},[]);
 useEffect(()=>{if(!selected||selected!==latest)return;const id=setInterval(()=>void load(selected,false),60000);return()=>clearInterval(id)},[selected,latest,load]);
 const cvrA=metrics?.a.traffic?metrics.a.transactions/metrics.a.traffic*100:0,cvrB=metrics?.b.traffic?metrics.b.transactions/metrics.b.traffic*100:0,salesGrowth=metrics?growth(metrics.a.sales,metrics.b.sales):0,trafficGrowth=metrics?growth(metrics.a.traffic,metrics.b.traffic):0;
 const blocks=useMemo(()=>lobOrder.map(([key,label])=>{
 const a=weekly?.a?.lob?.[key]||{};
 const b=weekly?.b?.lob?.[key]||{};

 const A=sum(a);
 const B=sum(b);

 const g=growth(A.qty,B.qty);
 const ctx=context?.byLob?.[key];

 const lost=relevantLostStock(a,b,ctx);

 const amountDown=B.amount<A.amount;

 const review=reviewFor(
  label,
  a,
  b,
  ctx,
  lost
 );

 const feedback=movementNotes(label,a,b,g);

 const reasons=reasonLines(
  label,
  g,
  ctx,
  lost,
  amountDown,
  a,
  b
 );

 const plans=planFor(
  label,
  g,
  ctx,
  lost,
  amountDown
 );

 return{
  key,
  label,
  A,
  B,
  g,
  ctx,
  lost,
  amountDown,
  review,
  feedback,
  reasons,
  plans
 };
}),[weekly,context]);
 const compiledStaffReasons=useMemo(()=>{
  const rows:string[]=[];
  for(const x of blocks){
   for(const reason of x.reasons){
    if(!rows.includes(`${x.label}: ${reason}`))
     rows.push(`${x.label}: ${reason}`);
   }
  }
  return rows;
 },[blocks]);
 const text=()=>{
 if(!weekly||!metrics)return"";

 const direction=salesGrowth>=0?"naik":"turun";

 const lines=[
  `*M238 DIGIMAP PIM 2*`,
  `*${weekly.labelB.toUpperCase()}*`,
  ``,
  `Penjualan ${weekly.labelB} sebesar Rp${num.format(metrics.b.sales)}, ${direction} ${pct(Math.abs(salesGrowth))} dibanding ${weekly.labelA} sebesar Rp${num.format(metrics.a.sales)}.`,
  ``,
  `*Traffic & Conversion*`,
  `*${weekly.labelA}*`,
  `• Traffic ${num.format(metrics.a.traffic)}`,
  `• ${num.format(metrics.a.transactions)} transaksi`,
  `• CVR ${pct(cvrA)}`,
  `• UPT ${metrics.a.upt.toFixed(1).replace(".",",")}`,
  ``,
  `*${weekly.labelB}*`,
  `• Traffic ${num.format(metrics.b.traffic)}`,
  `• ${num.format(metrics.b.transactions)} transaksi`,
  `• CVR ${pct(cvrB)}`,
  `• UPT ${metrics.b.upt.toFixed(1).replace(".",",")}`,
  ``,
  `*Feedback*`,
  `Traffic week ini ${metrics.b.traffic>=metrics.a.traffic?"naik":"turun"} dari ${num.format(metrics.a.traffic)} menjadi ${num.format(metrics.b.traffic)}, transaksi ${metrics.b.transactions>=metrics.a.transactions?"juga naik":"turun"} dari ${num.format(metrics.a.transactions)} menjadi ${num.format(metrics.b.transactions)} transaksi.`,
  cvrB<cvrA
   ? (
      Object.values(context?.byLob||{}).some(x =>
       (x.themes||[]).some(t => t.key==="survey" || t.key==="price")
      )
       ? `Untuk CVR turun dari ${pct(cvrA)} menjadi ${pct(cvrB)} karena masih terdapat customer yang survey dan compare terlebih dahulu sebelum menentukan pembelian.`
       : `Untuk CVR turun dari ${pct(cvrA)} menjadi ${pct(cvrB)}.`
     )
   : `Untuk CVR naik dari ${pct(cvrA)} menjadi ${pct(cvrB)}.`,
  metrics.b.upt>=metrics.a.upt
   ? (
      Object.values(context?.byLob||{}).some(x =>
       (x.themes||[]).some(t =>
        t.key==="bundling" || t.key==="vas" || t.key==="upsell"
       )
      )
       ? `UPT week ini naik dari ${metrics.a.upt.toFixed(1).replace(".",",")} menjadi ${metrics.b.upt.toFixed(1).replace(".",",")}. Team tetap memanfaatkan setiap transaksi dengan push accessories, VAS dan kebutuhan tambahan lainnya sesuai kebutuhan customer.`
       : `UPT week ini naik dari ${metrics.a.upt.toFixed(1).replace(".",",")} menjadi ${metrics.b.upt.toFixed(1).replace(".",",")}.`
     )
   : `UPT week ini turun dari ${metrics.a.upt.toFixed(1).replace(".",",")} menjadi ${metrics.b.upt.toFixed(1).replace(".",",")}.`
 ];

 for(const x of blocks){
  lines.push(
   "",
   `*${x.label.toUpperCase()}*`,
   `Penjualan ${x.label} week ini ${x.g>=0?"naik":"turun"} ${pct(Math.abs(x.g))} dengan total penjualan ${x.B.qty} unit.`,
   "",
   `*${weekly.labelA}*`,
   `• ${x.A.qty} unit`,
   `• ${shortMoney(x.A.amount)}`,
   "",
   `*${weekly.labelB}*`,
   `• ${x.B.qty} unit`,
   `• ${shortMoney(x.B.amount)}`,
   "",
   `*Feedback*`
  );

  for(const f of x.feedback)lines.push(f);

  if(x.reasons.length){
   lines.push("","*Reason*");
   for(const r of x.reasons)lines.push(r);
  }

  lines.push("","*Action Plan*");
  for(const p of x.plans)lines.push(`• ${p}`);
 }

 return lines.join("\n");
};
 const pdf=async()=>{if(!reportRef.current||!weekly)return;setBusy("PDF");try{await exportReportPdf(reportRef.current,`M238-Weekly-Reason-${weekly.labelB}`)}finally{setBusy("")}};const share=async()=>{const t=text();if(!t)return;setBusy("TEXT");try{if(navigator.share)await navigator.share({title:`M238 Weekly Reason ${weekly?.labelB||""}`,text:t});else{await navigator.clipboard.writeText(t);alert("Weekly Reason sudah disalin.")}}finally{setBusy("")}};const wa=()=>{const t=text();if(t)window.open(`https://wa.me/?text=${encodeURIComponent(t)}`,"_blank","noopener,noreferrer")};
 return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-600">M238 Reporting</p><h1 className="mt-1 text-3xl font-black">Weekly Reason</h1><p className="mt-1 text-sm text-slate-500">Weekly sales actual, reason staff, product movement dan kondisi SOH.</p></div>{weekly&&<div className="export-hide flex flex-wrap gap-2"><button onClick={()=>void pdf()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white">{busy==="PDF"?"Membuat...":"Unduh PDF"}</button><button onClick={()=>void share()} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-black">Share Text</button><button onClick={wa} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white">Share WhatsApp</button></div>}</div>
 <section className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950"><div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><label><span className="mb-1 block text-xs font-black uppercase text-slate-400">Pilih Week</span><select value={selected} onChange={e=>{setSelected(e.target.value);void load(e.target.value,false)}} className="h-11 w-full rounded-xl border bg-white px-3 dark:bg-slate-900">{weeks.map(w=><option key={w}>{w}</option>)}</select></label><div className="rounded-xl border bg-slate-50 px-4 py-2 dark:bg-slate-900"><span className="text-xs font-black uppercase text-slate-400">Compare</span><p className="mt-1 font-black">{selected?previousWeek(weeks,selected):"—"}</p></div><button onClick={()=>void load(selected,true)} disabled={loading} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{loading?"Memuat…":"Update Reason"}</button></div><p className="mt-3 text-xs font-semibold text-slate-500">{source}{selected===latest?" • otomatis refresh 60 detik":""}</p></section>
 {error&&<div className="rounded-2xl bg-rose-50 p-4 font-bold text-rose-700">{error}</div>}
 {weekly&&metrics&&<div ref={reportRef} className="space-y-5 bg-slate-50 p-1 dark:bg-slate-900"><section className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-950"><h2 className="text-xl font-black">M238 DIGIMAP PIM 2</h2><h3 className="mt-1 text-lg font-black">{weekly.labelB}</h3><p className="mt-4 leading-7">Total sales <b>{money.format(metrics.b.sales)}</b>, {salesGrowth>=0?"naik":"turun"} <b>{pct(Math.abs(salesGrowth))}</b> dibanding {weekly.labelA} <b>{money.format(metrics.a.sales)}</b>.</p></section>
 <section className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-950">
 <h3 className="font-black">Store Performance</h3>
 <div className="mt-4 grid gap-4 md:grid-cols-2">
  <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900">
   <p className="text-base font-black">{weekly.labelA}</p>
   <div className="mt-3 space-y-2 text-sm">
    <div className="flex justify-between gap-4"><span>Traffic</span><b>{num.format(metrics.a.traffic)}</b></div>
    <div className="flex justify-between gap-4"><span>Trx</span><b>{num.format(metrics.a.transactions)}</b></div>
    <div className="flex justify-between gap-4"><span>CVR</span><b>{pct(cvrA)}</b></div>
    <div className="flex justify-between gap-4"><span>UPT</span><b>{metrics.a.upt.toFixed(1)}</b></div>
   </div>
  </div>

  <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900">
   <p className="text-base font-black">{weekly.labelB}</p>
   <div className="mt-3 space-y-2 text-sm">
    <div className="flex justify-between gap-4"><span>Traffic</span><b>{num.format(metrics.b.traffic)}</b></div>
    <div className="flex justify-between gap-4"><span>Trx</span><b>{num.format(metrics.b.transactions)}</b></div>
    <div className="flex justify-between gap-4"><span>CVR</span><b>{pct(cvrB)}</b></div>
    <div className="flex justify-between gap-4"><span>UPT</span><b>{metrics.b.upt.toFixed(1)}</b></div>
   </div>
  </div>
 </div>

 <p className={`mt-4 text-sm font-black ${trafficGrowth>=0?"text-emerald-600":"text-rose-600"}`}>
  Traffic Growth {trafficGrowth>=0?"+":""}{pct(trafficGrowth)}
 </p>
</section>
 <section className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-950">
 <h3 className="font-black">Compile Reason Staff</h3>
 {context?.feedbackCount ? <>
  <p className="mt-2 text-xs font-semibold text-slate-500">
   {context.feedbackCount} feedback staff terbaca dari menu Feedback pada week ini.
  </p>
  {compiledStaffReasons.length ? (
   <ul className="mt-3 space-y-2 text-sm leading-6">
    {compiledStaffReasons.map((r,i)=><li key={i}>• {r}</li>)}
   </ul>
  ) : (
   <p className="mt-3 text-sm leading-7">Feedback staff sudah terbaca, namun belum ditemukan reason yang cukup dominan untuk dikompilasi.</p>
  )}
 </> : (
  <p className="mt-3 text-sm leading-7">Belum ada feedback staff yang tersimpan pada week ini.</p>
 )}
</section>
 {blocks.map(x=><section key={x.key} className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-950"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-black">{x.label}</h3><span className={`rounded-full px-3 py-1 text-xs font-black ${x.g>=0?"bg-emerald-50 text-emerald-700":"bg-rose-50 text-rose-700"}`}>{x.g>=0?"+":""}{pct(x.g)}</span></div><div className="mt-4"><p className="text-sm font-black">Weekly Review</p><p className="mt-1 text-sm leading-7">{x.review}</p></div>{x.ctx?.lostStock?.length?<div className="mt-4"><p className="text-sm font-black">Lost Stock</p><ul className="mt-1 space-y-1 text-sm leading-6">{x.ctx.lostStock.map((l,i)=><li key={`${l.label}-${i}`}>• {l.label} — {l.status}</li>)}</ul></div>:null}{x.reasons.length?<div className="mt-4"><p className="text-sm font-black">{x.g>=0?"Reason":"Kendala"}</p><ul className="mt-1 space-y-1 text-sm leading-6">{x.reasons.map((r,i)=><li key={i}>• {r}</li>)}</ul></div>:null}<div className="mt-4"><p className="text-sm font-black">Action Plan</p><ul className="mt-1 space-y-1 text-sm leading-6">{x.plans.map((p,i)=><li key={i}>• {p}</li>)}</ul></div></section>)}</div>}
 </div>
}
