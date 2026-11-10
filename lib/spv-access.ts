import {getSheetRanges} from "./google-sheets";
const SOURCE_ID="160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
export async function isStoreSpv(nik:string,email:string,key:string){
 const [rows]=await getSheetRanges(SOURCE_ID,["Config!H28:L60"],email,key);
 return rows.some(row=>String(row[0]??"").trim().toUpperCase()==="M238"&&String(row[1]??"").trim()===nik&&/\bSPV\b|SUPERVISOR/i.test(String(row[3]??"")));
}
