import * as XLSX from "xlsx"

export type SpwCell=string|number|boolean

function excelDate(value:unknown){
  if(value instanceof Date&&!Number.isNaN(value.getTime())){
    const day=String(value.getUTCDate()).padStart(2,"0")
    const month=String(value.getUTCMonth()+1).padStart(2,"0")
    return `${day}-${month}-${value.getUTCFullYear()}`
  }
  if(typeof value==="number")return XLSX.SSF.format("dd-mm-yyyy",value)
  return String(value??"")
}

function cleanText(value:unknown){
  return String(value??"")
    .replace(/\u00a0/g," ")
    .replace(/[\u0000-\u001f\u007f]+/g," ")
    .replace(/\s+/g," ")
    .trim()
}

function cellValue(cell:XLSX.CellObject|undefined):SpwCell{
  if(!cell||cell.v===undefined||cell.v===null)return ""
  if(cell.t==="d"||(cell.t==="n"&&cell.z&&XLSX.SSF.is_date(cell.z)))return excelDate(cell.v)
  if(cell.t==="n")return Number(cell.v)
  if(cell.t==="b")return Boolean(cell.v)
  return cleanText(cell.v)
}

function rowsFromSheet(sheet:XLSX.WorkSheet){
  if(!sheet["!ref"])return []
  const range=XLSX.utils.decode_range(sheet["!ref"])
  const rows:SpwCell[][]=[]
  for(let row=range.s.r;row<=range.e.r;row++){
    rows.push([0,1,2].map(column=>cellValue(sheet[XLSX.utils.encode_cell({r:row,c:column})])))
  }
  while(rows.length&&rows.at(-1)?.every(value=>value===""))rows.pop()
  return rows
}

function reportScore(rows:SpwCell[][]){
  const cells=rows.flat()
  const dates=cells.filter(value=>typeof value==="string"&&/^\d{2}-\d{2}-\d{4}$/.test(value)).length
  const staff=cells.filter(value=>typeof value==="string"&&/^\d{6,}\s*\/\s*\S+/.test(value)).length
  const totals=cells.filter(value=>typeof value==="string"&&/^Total For\b/i.test(value)).length
  const numbers=cells.filter(value=>typeof value==="number"&&Number.isFinite(value)).length
  return{score:dates*4+staff*5+totals*4+Math.min(numbers,20),dates,staff,totals,numbers}
}

function validateSales(rows:SpwCell[][]){
  const detailTotal=rows.reduce((sum,row)=>sum+(typeof row[2]==="number"&&Number.isFinite(row[2])?row[2]:0),0)
  const totalLines=rows.filter(row=>typeof row[0]==="string"&&/^Total For\b/i.test(row[0])&&typeof row[1]==="number")
  const expectedTotal=totalLines.reduce((sum,row)=>sum+Number(row[1]),0)
  if(totalLines.length&&Math.abs(detailTotal-expectedTotal)>1){
    throw new Error(`Total file SPW tidak konsisten. Detail ${Math.round(detailTotal).toLocaleString("id-ID")} berbeda dengan total report ${Math.round(expectedTotal).toLocaleString("id-ID")}. Upload dibatalkan agar dashboard tidak salah.`)
  }
  return{detailTotal,expectedTotal:totalLines.length?expectedTotal:detailTotal,validatedTotals:totalLines.length}
}

export function parseSpwWorkbook(buffer:ArrayBuffer){
  const workbook=XLSX.read(buffer,{type:"array",cellDates:true,cellNF:true,raw:true})
  const candidates=workbook.SheetNames.map(sheetName=>{
    const rows=rowsFromSheet(workbook.Sheets[sheetName])
    return{sheetName,rows,...reportScore(rows)}
  }).sort((a,b)=>b.score-a.score)
  const report=candidates[0]
  if(!report?.rows.length)throw new Error("File Excel tidak memiliki data.")
  if(!report.dates||!report.staff||!report.numbers)throw new Error("Format file belum dikenali sebagai laporan SPW. Pastikan file yang dipilih adalah file SPW asli.")
  const validation=validateSales(report.rows)
  return{...report,...validation}
}
