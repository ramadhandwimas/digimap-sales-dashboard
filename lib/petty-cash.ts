export const PETTY_CASH_FUND = 500_000;
export const CASH_CATEGORIES = ["transport", "freight", "stationery", "bankCharge", "sundries"] as const;
export const CASH_LABELS = {transport:"Transport",freight:"Freight",stationery:"Stationery",bankCharge:"Bank Chg",sundries:"Sundries"};
export type CashCategory = typeof CASH_CATEGORIES[number];
export type CashRow = {date:string;pcv:string;description:string} & Record<CashCategory,string>;
export type PettyCash = {pcrs:string;date:string;receivedDate:string;fund:string;inProcess:string;payment:string;preparedBy:string;approvedBy:string;rh:string;rows:CashRow[]};
export type CashRecord = {id:string;revision:string;updatedAt:string;updatedBy:string;data:PettyCash};
export const emptyCashRow = ():CashRow => ({date:"",pcv:"",description:"",transport:"",freight:"",stationery:"",bankCharge:"",sundries:""});
export const emptyPettyCash = ():PettyCash => ({pcrs:"",date:"",receivedDate:"",fund:String(PETTY_CASH_FUND),inProcess:"",payment:"",preparedBy:"",approvedBy:"",rh:"",rows:Array.from({length:14},emptyCashRow)});
export function cashAmount(value:string) {
 if(!value.trim()) return 0;
 if(!/^\d+(?:\.\d{3})*$/.test(value.trim())&&!/^\d+$/.test(value.trim())) throw Error("Nominal harus berupa rupiah bulat, contoh 181544 atau 181.544.");
 const number=Number(value.replace(/\./g,""));
 if(!Number.isSafeInteger(number)||number<0||number>1_000_000_000_000) throw Error("Nominal di luar batas yang diperbolehkan.");
 return number;
}
function validDate(value:string){return !value||(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value)}
export function validatePettyCash(input:unknown):PettyCash {
 if(!input||typeof input!=="object") throw Error("Form petty cash tidak valid.");
 const raw=input as Record<string,unknown>,data=emptyPettyCash();
 for(const key of ["pcrs","date","receivedDate","fund","inProcess","payment","preparedBy","approvedBy","rh"] as const){
  if(typeof raw[key]!=="string"||raw[key].length>100)throw Error("Isian header tidak valid.");
  data[key]=raw[key].trim();
 }
 data.fund=String(PETTY_CASH_FUND);data.inProcess="";
 if(!validDate(data.date)||!validDate(data.receivedDate))throw Error("Tanggal header tidak valid.");
 for(const key of ["fund","inProcess","payment"] as const)cashAmount(data[key]);
 if(!Array.isArray(raw.rows)||raw.rows.length<1||raw.rows.length>100)throw Error("Jumlah baris harus 1–100.");
 data.rows=raw.rows.map((value:unknown,index:number)=>{
  if(!value||typeof value!=="object")throw Error(`Baris ${index+1} tidak valid.`);
  const row=emptyCashRow(),source=value as Record<string,unknown>;
  for(const key of Object.keys(row) as (keyof CashRow)[]){if(typeof source[key]!=="string"||source[key].length>(key==="description"?250:100))throw Error(`Isian baris ${index+1} tidak valid.`);row[key]=(source[key] as string).trim()}
  if(!validDate(row.date))throw Error(`Tanggal baris ${index+1} tidak valid.`);
  for(const key of CASH_CATEGORIES)cashAmount(row[key]);
  return row;
 });
 if(JSON.stringify(data).length>45000)throw Error("Draft terlalu panjang. Pisahkan ke form baru agar seluruh data dapat tersimpan.");
 return data;
}
export function cashTotals(data:PettyCash){
 const categories=Object.fromEntries(CASH_CATEGORIES.map(key=>[key,data.rows.reduce((sum,row)=>sum+cashAmount(row[key]),0)])) as Record<CashCategory,number>;
 const grandTotal=Object.values(categories).reduce((sum,value)=>sum+value,0),payment=data.payment.trim()?cashAmount(data.payment):grandTotal;
 return {categories,grandTotal,payment,balance:PETTY_CASH_FUND-payment};
}
export function latestCashRecords(rows:unknown[][]):CashRecord[]{
 const records=new Map<string,CashRecord>();
 for(const row of rows){try{const data=validatePettyCash(JSON.parse(String(row[4])));records.set(String(row[0]),{id:String(row[0]),revision:String(row[1]),updatedAt:String(row[2]),updatedBy:String(row[3]),data})}catch{throw Error("Ada draft petty cash yang tidak dapat dibaca. Hubungi admin sebelum menyimpan perubahan.")}}
 return [...records.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
