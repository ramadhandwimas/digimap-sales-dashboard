export type CopasRepairChange = {
  column: "G" | "J" | "K" | "L" | "M" | "N";
  field: string;
  from: string;
  to: string;
};

export type CopasRepairCandidate = {
  row: number;
  article: string;
  description: string;
  date: string;
  values: unknown[];
  changes: CopasRepairChange[];
  hadNA: boolean;
};

export type CopasRepairPlan = {
  checkedRows: number;
  changedCells: number;
  naRows: number;
  correctedRows: number;
  unresolvedNARows: number;
  candidates: CopasRepairCandidate[];
  unresolvedSamples: Array<{row:number;article:string;description:string}>;
};

export type CopasRepairWrite = {range:string;values:unknown[][]};

const value = (input: unknown) => String(input ?? "")
  .replace(/\u00A0/g, " ")
  .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
  .replace(/[\t\r\n\f\v]+/g, " ")
  .replace(/ +/g, " ")
  .trim();

const key = (input: unknown) => value(input).toUpperCase();
const isNA = (input: unknown) => /^(?:#?N\/?A|NOT AVAILABLE)$/i.test(value(input));

function same(left: unknown, right: unknown) {
  return value(left) === value(right);
}

export function planDataCopasRepair(masterRows: unknown[][], copasRows: unknown[][]): CopasRepairPlan {
  const articleMap = new Map<string, unknown[]>();
  const supplierMap = new Map<string, string>();

  // Mirrors Google Sheets XLOOKUP: the first exact match is authoritative.
  for (const row of masterRows.slice(1)) {
    const article = key(row[1]);
    if (article && !articleMap.has(article)) articleMap.set(article, row);
    const supplierBrand = key(row[11]);
    if (supplierBrand && !supplierMap.has(supplierBrand)) supplierMap.set(supplierBrand, value(row[9]));
  }

  const candidates: CopasRepairCandidate[] = [];
  const unresolvedSamples: CopasRepairPlan["unresolvedSamples"] = [];
  let checkedRows = 0;
  let changedCells = 0;
  let naRows = 0;
  let correctedRows = 0;
  let unresolvedNARows = 0;

  for (let index = 0; index < copasRows.length; index += 1) {
    const current = Array.from({length:17}, (_, column) => copasRows[index]?.[column] ?? "");
    const article = key(current[4]);
    if (!article) continue;
    checkedRows += 1;
    const hasNA = [6,9,10,11,12,13].some(column => isNA(current[column]));
    const master = articleMap.get(article);
    if (!master) {
      if (hasNA) {
        unresolvedNARows += 1;
        if (unresolvedSamples.length < 8) unresolvedSamples.push({row:index+2,article:value(current[4]),description:value(current[5])});
      }
      continue;
    }

    const brand = value(master[0]);
    const desired = new Map<number, {column:CopasRepairChange["column"];field:string;value:string}>([
      [6, {column:"G", field:"Type", value:value(master[4])}],
      [9, {column:"J", field:"Product Category", value:value(master[3])}],
      [10,{column:"K", field:"Brand Name", value:brand}],
      [11,{column:"L", field:"Core Product", value:value(master[6])}],
      [12,{column:"M", field:"Product Scheme", value:value(master[5])}],
      [13,{column:"N", field:"Vendor", value:supplierMap.get(key(brand)) ?? ""}],
    ]);
    const repaired = current.slice(6,14);
    const changes: CopasRepairChange[] = [];
    for (const [column, target] of desired) {
      if (same(current[column], target.value)) continue;
      changes.push({column:target.column,field:target.field,from:value(current[column]),to:target.value});
      repaired[column-6] = target.value;
    }
    if (!changes.length) continue;
    changedCells += changes.length;
    if (hasNA) naRows += 1;
    else correctedRows += 1;
    candidates.push({
      row:index+2,
      article:value(current[4]),
      description:value(current[5]),
      date:value(current[0]),
      values:repaired,
      changes,
      hadNA:hasNA,
    });
  }

  return {checkedRows,changedCells,naRows,correctedRows,unresolvedNARows,candidates,unresolvedSamples};
}

export function buildDataCopasRepairWrites(candidates:CopasRepairCandidate[],sheetName="Data Copas",maxRows=500):CopasRepairWrite[]{
  const sorted=[...candidates].sort((left,right)=>left.row-right.row),writes:CopasRepairWrite[]=[];
  let start=0,end=0,values:unknown[][]=[];
  const flush=()=>{
    if(!values.length)return;
    writes.push({range:`'${sheetName.replace(/'/g,"''")}'!G${start}:N${end}`,values});
    start=0;end=0;values=[];
  };
  for(const candidate of sorted){
    const contiguous=values.length>0&&candidate.row===end+1&&values.length<maxRows;
    if(!contiguous)flush();
    if(!values.length)start=candidate.row;
    end=candidate.row;
    values.push(candidate.values);
  }
  flush();
  return writes;
}
