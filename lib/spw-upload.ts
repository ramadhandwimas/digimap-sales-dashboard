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

function cellValue(cell:XLSX.CellObject|undefined):SpwCell{
  if(!cell||cell.v===undefined||cell.v===null)return ""
  if(cell.t==="d"||(cell.t==="n"&&cell.z&&XLSX.SSF.is_date(cell.z)))return excelDate(cell.v)
  if(cell.t==="n")return Number(cell.v)
  if(cell.t==="b")return Boolean(cell.v)
  return String(cell.v).replace(/\u00a0/g," ").trim()
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
  const numbers=cells.filter(value=>typeof value==="number"&&Number.isFinite(value)).length
  return{score:dates*3+staff*3+Math.min(numbers,10),dates,staff,numbers}
}

export function parseSpwWorkbook(buffer:ArrayBuffer){
  const workbook=XLSX.read(buffer,{type:"array",cellDates:true,cellNF:true})
  const candidates=workbook.SheetNames.map(sheetName=>{
    const rows=rowsFromSheet(workbook.Sheets[sheetName])
    return{sheetName,rows,...reportScore(rows)}
  }).sort((a,b)=>b.score-a.score)
  const report=candidates[0]
  if(!report?.rows.length)throw new Error("File Excel tidak memiliki data.")
  if(!report.dates||!report.staff||!report.numbers)throw new Error("Format file belum dikenali sebagai laporan SPW. Pastikan file yang dipilih adalah file SPW asli.")
  return report
}
