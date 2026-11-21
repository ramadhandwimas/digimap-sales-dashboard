import {getSheetRanges} from "./google-sheets";
const SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
export async function isStoreSpv(nik:string,email:string,key:string){
 const [rows]=await getSheetRanges(SOURCE_ID,["Config!H28:L60"],email,key);
 return rows.some(row=>String(row[0]??"").trim().toUpperCase()==="M238"&&String(row[1]??"").trim()===nik&&/\bSPV\b|SUPERVISOR/i.test(String(row[3]??"")));
}

export function canClearStoreData(position:unknown){
 const role=String(position??"").trim().replace(/\s+/g," ").toUpperCase();
 return /^(?:STORE SUPERVISOR|SPV|SUPERVISOR|STORE TRAINER|ST|CASHIER|KASIR|MT)$/.test(role);
}

export async function isStoreClearOperator(nik:string,email:string,key:string){
 const [rows]=await getSheetRanges(SOURCE_ID,["Config!H28:L60"],email,key);
 return rows.some(row=>String(row[0]??"").trim().toUpperCase()==="M238"&&String(row[1]??"").trim()===nik&&canClearStoreData(row[3]));
}
