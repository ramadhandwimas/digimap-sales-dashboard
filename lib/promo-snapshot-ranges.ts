// Match committed snapshot IDs instead of assuming uploads never left orphan rows.
export function promoSnapshotRanges(ids:unknown[][],wanted:Set<string>,sheet:string,lastColumn:string){
 const ranges:string[]=[];let start=-1;
 for(let i=0;i<=ids.length;i++){
  const selected=i<ids.length&&wanted.has(String(ids[i]?.[0]??"").trim());
  if(selected&&start<0)start=i;
  if(!selected&&start>=0){ranges.push(`'${sheet}'!A${start+2}:${lastColumn}${i+1}`);start=-1}
 }
 return ranges;
}
