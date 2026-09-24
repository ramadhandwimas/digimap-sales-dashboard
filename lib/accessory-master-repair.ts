import {articleKey,cleanText,type MasterRow} from "./accessory-pricelist";

const key=(value:unknown)=>cleanText(value).toUpperCase();
const FIELDS=["Brand","SAP Article","SAP Description","Product Category","Type","Product Group","Core"] as const;
const INDEXES=[0,1,2,3,4,5,6] as const;

export type RepairChange={field:typeof FIELDS[number];before:string;after:string};
export type RepairCandidate={id:string;row:number;article:string;description:string;current:MasterRow;proposed:MasterRow;changes:RepairChange[];reasons:string[]};
export type RepairReview={row:number;article:string;description:string;reason:string};
export type RepairPlan={checked:number;duplicateArticles:number;candidates:RepairCandidate[];review:RepairReview[]};

type SupplierMatch={matched:boolean;brand:string;ambiguous:boolean};

export function planMasterRepairs(master:unknown[][],suppliers:unknown[][]):RepairPlan{
 const expected=["BRAND","SAP ARTICLE","SAP DESCRIPTION","PRODUCT CATEGORY","TYPE","PRODUCT GROUP","CORE"];
 if(!expected.every((v,i)=>key(master[0]?.[i])===v))throw new Error("Format Master A–G berubah. Pengecekan dihentikan agar kolom tidak tertukar.");
 if(!["VENDOR CODE","PT NAME","BRAND CODE","BRAND NAME"].every((v,i)=>key(suppliers[0]?.[i])===v))throw new Error("Referensi supplier I–L tidak sesuai format.");

 const vendorRows=suppliers.slice(1).map(row=>({code:articleKey(row[2]),brand:cleanText(row[3])})).filter(row=>row.code&&row.brand);
 const supplierBrand=(article:string):SupplierMatch=>{
  const matches=vendorRows.filter(row=>article.startsWith(row.code));
  const longest=Math.max(0,...matches.map(row=>row.code.length));
  const brands=[...new Set(matches.filter(row=>row.code.length===longest).map(row=>row.brand))];
  return{matched:matches.length>0,brand:brands.length===1?brands[0]:"",ambiguous:brands.length>1};
 };
 const rows=master.slice(1).map((source,index)=>{
  const raw=Array.from({length:7},(_,i)=>String(source[i]??"")) as MasterRow;
  return{row:index+2,raw,data:raw.map(cleanText) as MasterRow};
 });
 const duplicates=new Map<string,number[]>();
 for(const row of rows){const article=articleKey(row.data[1]);if(article){const list=duplicates.get(article)||[];list.push(row.row);duplicates.set(article,list)}}

 // Existing, complete accessory rows provide conservative fallbacks for Core.
 const brandCores=new Map<string,Set<string>>();
 for(const {data} of rows){
  if(key(data[5])!=="ACCESSORIES"||!data[0]||!data[6])continue;
  const mapped=supplierBrand(articleKey(data[1])).brand||data[0],set=brandCores.get(key(mapped))||new Set<string>();
  set.add(key(data[6]));brandCores.set(key(mapped),set);
 }
 const plan:RepairPlan={checked:0,duplicateArticles:[...duplicates.values()].filter(rows=>rows.length>1).length,candidates:[],review:[]};
 for(const {row,raw,data} of rows){
  if(data.every(value=>!value))continue;
  plan.checked++;
  const article=articleKey(data[1]),description=data[2];
  const text=key(data.join(" ")),isAppleCare=/APPLE\s*CARE|APPLECARE|AC\s*PLUS|HELP\s*DESK/.test(text);
  const mapped=supplierBrand(article),isAccessory=key(data[5])==="ACCESSORIES"||mapped.matched||isAppleCare;
  if(!isAccessory)continue;
  if(!article){plan.review.push({row,article:"",description,reason:"SAP Article kosong; baris tidak dapat diperbaiki otomatis."});continue}
  const duplicateRows=duplicates.get(article)||[];
  // Existing duplicate SAP rows are left untouched. They may be intentional
  // historical entries and are not treated as filling errors by this tool.
  if(duplicateRows.length>1)continue;
  if(mapped.ambiguous){plan.review.push({row,article,description,reason:"Kode SAP cocok dengan lebih dari satu brand supplier."});continue}

  const proposed=[...data] as MasterRow,reasons:string[]=[];
  if(raw.some((value,index)=>value!==data[index]))reasons.push("Spasi atau karakter tersembunyi dibersihkan.");
  // SAP Article is the immutable key. It is never replaced from another
  // source; only the same whitespace cleanup used by the importer is applied.
  proposed[1]=data[1];
  if(mapped.brand&&key(mapped.brand)!==key(proposed[0])){proposed[0]=mapped.brand;reasons.push("Brand disesuaikan dengan kode vendor I–L.")}
  if(key(proposed[5])!=="ACCESSORIES"){proposed[5]="ACCESSORIES";reasons.push("Product Group produk supplier/AppleCare harus ACCESSORIES.")}
  if(isAppleCare){
   if(key(proposed[3])!=="PROTECTION"){proposed[3]="PROTECTION";reasons.push("Kategori AppleCare diseragamkan menjadi PROTECTION.")}
   if(key(proposed[6])!=="APPLE"){proposed[6]="APPLE";reasons.push("Core AppleCare harus APPLE.")}
  }else{
   let core="";
   if(/SAMSUNG|GALAXY|Z\s*(?:FOLD|FLIP)|\bS2\d\b|\bA(?:3\d|5\d|7\d)\b/.test(text))core="ANDROID";
   else if(/IPHONE|IPAD|MACBOOK|\bMAC\b|AIRPODS|APPLE\s*WATCH|MAGSAFE|LIGHTNING/.test(text))core="APPLE";
   else{const known=[...(brandCores.get(key(proposed[0]))||[])];if(known.length===1)core=known[0]}
   if(core&&key(proposed[6])!==core){proposed[6]=core;reasons.push(`Core dikenali sebagai ${core}.`)}
  }
  if(!proposed[3])plan.review.push({row,article,description,reason:"Product Category kosong; perlu ditentukan manual."});
  if(!proposed[6])plan.review.push({row,article,description,reason:"Core belum dapat dipastikan sebagai APPLE atau ANDROID."});
  const changes:RepairChange[]=[];
  for(let i=0;i<INDEXES.length;i++){const index=INDEXES[i],before=raw[index],after=proposed[index];if(before!==after)changes.push({field:FIELDS[i],before,after})}
  if(changes.length)plan.candidates.push({id:`${row}:${article}`,row,article,description,current:raw,proposed,changes,reasons:[...new Set(reasons)]});
 }
 return plan;
}
