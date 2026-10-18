export type CopasRepairScope="all"|"device"|"accessory-vas";

export type CopasRepairColumn = "G" | "J" | "K" | "L" | "M" | "N";

export type CopasRepairChange = {
  column: CopasRepairColumn;
  field: string;
  from: string;
  to: string;
};

export type CopasRepairCandidate = {
  row: number;
  article: string;
  description: string;
  date: string;
  changes: CopasRepairChange[];
};

export type CopasRepairIssue = {
  row: number;
  article: string;
  description: string;
  reason: "missing-master" | "conflicting-master" | "incomplete-master";
  detail: string;
};

export type CopasRepairPlan = {
  checkedRows: number;
  rowsWithNA: number;
  naRepairRows: number;
  vendorRows: number;
  typeRows: number;
  rowsWithBlankType: number;
  changedCells: number;
  naRows: number;
  correctedRows: number;
  unresolvedNARows: number;
  candidates: CopasRepairCandidate[];
  issues: CopasRepairIssue[];
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
const same = (left: unknown, right: unknown) => key(left) === key(right);
// XL Apple is the XL/XXL VAS family; Vendor still comes from Master PT Name.
const isXlSupplier = (input:unknown) => ["XL","XXL","XLAPPLE","XXLAPPLE"].includes(key(input).replace(/[^A-Z0-9]/g,""));
const supplierKey = (input:unknown) => isXlSupplier(input)?"XXL":key(input);

type DesiredField = {column:CopasRepairColumn;field:string;value:string};

function classificationSignature(row:unknown[]){
  return [row[0],row[3],row[4],row[5],row[6]].map(key).join("|");
}

export function planDataCopasRepair(masterRows: unknown[][], copasRows: unknown[][], scope:CopasRepairScope="all"): CopasRepairPlan {
  const articleRows = new Map<string, unknown[][]>();
  const supplierRows = new Map<string, Set<string>>();

  for (const row of masterRows.slice(1)) {
    const article = key(row[1]);
    if (article) {
      const rows=articleRows.get(article)??[];
      rows.push(row);
      articleRows.set(article,rows);
    }
    const supplierBrand = key(row[11]);
    const supplierName = value(row[9]);
    if (supplierBrand && supplierName && !isNA(supplierBrand) && !isNA(supplierName)) {
      const suppliers=supplierRows.get(supplierBrand)??new Set<string>();
      suppliers.add(supplierName);
      supplierRows.set(supplierBrand,suppliers);
      if(isXlSupplier(supplierBrand)){
        const aliases=supplierRows.get(supplierKey(supplierBrand))??new Set<string>();
        aliases.add(supplierName);supplierRows.set(supplierKey(supplierBrand),aliases);
      }
    }
    // Some references use XXL in Brand Code with a different display name.
    if (isXlSupplier(row[10]) && supplierName && !isNA(supplierName)) {
      const suppliers=supplierRows.get("XXL")??new Set<string>();
      suppliers.add(supplierName);
      supplierRows.set("XXL",suppliers);
    }
  }

  const candidates: CopasRepairCandidate[] = [];
  const issues: CopasRepairIssue[] = [];
  let checkedRows = 0;
  let rowsWithNA = 0;
  let naRepairRows = 0;
  let vendorRows = 0;
  let typeRows = 0;
  let rowsWithBlankType = 0;
  let changedCells = 0;

  for (let index = 0; index < copasRows.length; index += 1) {
    const current = Array.from({length:17}, (_, column) => copasRows[index]?.[column] ?? "");
    const article = key(current[4]);
    if (!article) continue;
    const matches = articleRows.get(article)??[];
    const knownGroups=matches.map(row=>key(row[5])).filter(group=>["DEVICES","ACCESSORIES","VAS"].includes(group));
    const groups=knownGroups.length?knownGroups:[key(current[12])];
    if(scope==="device"&&!groups.includes("DEVICES"))continue;
    if(scope==="accessory-vas"&&!groups.some(group=>group==="ACCESSORIES"||group==="VAS"))continue;
    checkedRows += 1;
    const naColumns = [6,9,10,11,12,13].filter(column => isNA(current[column]));
    // A missing Vendor is optional until Master provides a usable reference.
    let hasNA = naColumns.some(column=>column!==13);
    const missingDeviceType=key(current[12])==="DEVICES"&&(!value(current[6])||isNA(current[6]));
    if (hasNA) rowsWithNA += 1;

    const issueBase={row:index+2,article:value(current[4]),description:value(current[5])};
    if (!matches.length) {
      if (hasNA||missingDeviceType) issues.push({...issueBase,reason:"missing-master",detail:"SAP Article belum ada di Master."});
      continue;
    }
    if (new Set(matches.map(classificationSignature)).size > 1) {
      if (hasNA||missingDeviceType) issues.push({...issueBase,reason:"conflicting-master",detail:"SAP Article mempunyai lebih dari satu klasifikasi berbeda di Master."});
      continue;
    }

    const master = matches[0];
    const brand = value(master[0]);
    const scheme=key(master[5]);
    const firstParty=key(brand)==="APPLE"||/APPLE\s*CARE|AC\s*PLUS|HELP\s*DESK/i.test(brand);
    const usesType=scheme==="DEVICES"||(firstParty&&(Boolean(value(master[4]))||key(master[3])==="AIRPODS"));
    const usesVendor=scheme==="VAS"||(scheme==="ACCESSORIES"&&!firstParty);
    const blankType=usesType&&!value(current[6]);
    if(blankType)rowsWithBlankType+=1;
    const vendorKey=scheme==="VAS"&&(isXlSupplier(brand)||/^X{1,2}LAPPLE/.test(article))?"XXL":key(brand);
    const suppliers=usesVendor?[...(supplierRows.get(vendorKey)??[])]:[];
    if (suppliers.length > 1) {
      issues.push({...issueBase,reason:"conflicting-master",detail:`Brand ${brand} mempunyai lebih dari satu supplier di Master.`});
      continue;
    }
    if(naColumns.includes(13)&&(!usesVendor||suppliers.length===1)&&!hasNA){hasNA=true;rowsWithNA+=1}
    const desired = new Map<number, DesiredField>([
      [6, {column:"G", field:"Type", value:usesType?value(master[4]):""}],
      [9, {column:"J", field:"Product Category", value:value(master[3])}],
      [10,{column:"K", field:"Brand Name", value:brand}],
      [11,{column:"L", field:"Core Product", value:value(master[6])}],
      [12,{column:"M", field:"Product Scheme", value:value(master[5])}],
      [13,{column:"N", field:"Vendor", value:usesVendor?(suppliers[0]??""):""}],
    ]);

    // Blank Type is a missing device model, not a valid empty classification.
    // Inapplicable placeholders (3PP Type / first-party Vendor) may be cleared,
    // without making either of them a prerequisite for the other fields.
    const repairColumns=naColumns.filter(column=>column!==13||!usesVendor||suppliers.length===1);
    if(blankType)repairColumns.push(6);
    if(usesVendor&&suppliers.length===1&&!value(current[13])&&!repairColumns.includes(13))repairColumns.push(13);
    const missing = repairColumns
      .map(column=>desired.get(column))
      .filter((field):field is DesiredField=>Boolean(field&&(!field.value||isNA(field.value))&&!(field.column==="G"&&!usesType)&&!(field.column==="N"&&!usesVendor)));
    if (missing.length) {
      issues.push({...issueBase,reason:"incomplete-master",detail:`Master belum memiliki ${missing.map(field=>field.field).join(", ")}.`});
      continue;
    }

    const changes: CopasRepairChange[] = [];
    for (const column of repairColumns) {
      const target=desired.get(column);
      if (!target||same(current[column],target.value)) continue;
      changes.push({column:target.column,field:target.field,from:value(current[column]),to:target.value});
    }
    const vendor=desired.get(13);
    if (vendor?.value&&!same(current[13],vendor.value)&&!changes.some(change=>change.column==="N")) {
      changes.push({column:"N",field:"Vendor",from:value(current[13]),to:vendor.value});
    }
    if (!changes.length) continue;
    changedCells += changes.length;
    if (hasNA) naRepairRows += 1;
    if (changes.some(change=>change.column==="N"&&change.to)) vendorRows += 1;
    if (changes.some(change=>change.column==="G"&&change.to)) typeRows += 1;
    candidates.push({...issueBase,date:value(current[0]),changes});
  }

  const unresolvedSamples=issues.slice(0,8).map(({row,article,description})=>({row,article,description}));
  return {
    checkedRows,
    rowsWithNA,
    naRepairRows,
    vendorRows,
    typeRows,
    rowsWithBlankType,
    changedCells,
    naRows:candidates.length,
    correctedRows:0,
    unresolvedNARows:issues.length,
    candidates,
    issues,
    unresolvedSamples,
  };
}

export function buildDataCopasRepairWrites(candidates:CopasRepairCandidate[],sheetName="Data Copas",maxRows=500):CopasRepairWrite[]{
  const escaped=sheetName.replace(/'/g,"''");
  const cells=candidates.flatMap(candidate=>candidate.changes.map(change=>({row:candidate.row,column:change.column,value:change.to})));
  const writes:CopasRepairWrite[]=[];
  for(const column of ["G","J","K","L","M","N"] as CopasRepairColumn[]){
    const selected=cells.filter(cell=>cell.column===column).sort((left,right)=>left.row-right.row);
    let start=0,end=0,values:unknown[][]=[];
    const flush=()=>{
      if(!values.length)return;
      writes.push({range:`'${escaped}'!${column}${start}:${column}${end}`,values});
      start=0;end=0;values=[];
    };
    for(const cell of selected){
      const contiguous=values.length>0&&cell.row===end+1&&values.length<maxRows;
      if(!contiguous)flush();
      if(!values.length)start=cell.row;
      end=cell.row;
      values.push([cell.value]);
    }
    flush();
  }
  return writes;
}
