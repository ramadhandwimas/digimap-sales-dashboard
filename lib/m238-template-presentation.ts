import JSZip from "jszip";
import {finalizeOfficePresentation} from "./presentation-office-compat";
import * as XLSX from "xlsx";
import {DOMParser,XMLSerializer,type Document,type Element} from "@xmldom/xmldom";
import {readFileSync} from "node:fs";
import path from "node:path";
import {presentationTypeRows,weeklyPresentationModel,type WeeklyPresentationData} from "./weekly-presentation";
import type {ReferencePeriod,ReferenceTotals} from "./presentation-reference-source";

const A="http://schemas.openxmlformats.org/drawingml/2006/main";
const P="http://schemas.openxmlformats.org/presentationml/2006/main";
const C="http://schemas.openxmlformats.org/drawingml/2006/chart";
const descendants=(root:Document|Element,ns:string,name:string)=>Array.from(root.getElementsByTagNameNS(ns,name));
const children=(root:Element,ns:string,name:string)=>Array.from(root.childNodes).filter(n=>n.nodeType===1&&n.namespaceURI===ns&&n.localName===name) as Element[];
const text=(root:Element)=>descendants(root,A,"t").map(node=>node.textContent||"").join("");
const parse=(xml:string)=>new DOMParser().parseFromString(xml,"application/xml");
const serialize=(doc:Document)=>new XMLSerializer().serializeToString(doc);
const number=(n:number)=>Math.round(n).toLocaleString("id-ID");
const percent=(before:number,after:number)=>before?`${((after-before)/before*100).toLocaleString("id-ID",{maximumFractionDigits:1})}%`:after?"Baru":"0%";
const lines=(value?:string)=>String(value||"").split(/\n+/).map(v=>v.trim()).filter(Boolean);
const sum=(values:Record<string,{qty:number;amount:number}>)=>Object.values(values).reduce((s,v)=>({qty:s.qty+v.qty,amount:s.amount+v.amount}),{qty:0,amount:0});

function setText(container:Element,value:string,scale=1){
 // An empty run can inherit the master font in Office readers and enlarge a row.
 if(container.localName==="tc"&&!value)value="\u00a0";
 const body=container.localName==="txBody"?container:descendants(container,A,"txBody")[0]||descendants(container,P,"txBody")[0];
 if(!body)throw Error("Template tidak memiliki tempat teks yang diperlukan.");
 const doc=container.ownerDocument!,source=children(body,A,"p")[0]||doc.createElementNS(A,"a:p");
 const paragraph=source.cloneNode(true) as Element;
 const sampleRun=descendants(source,A,"r")[0];
 const run=(sampleRun?.cloneNode(true)||doc.createElementNS(A,"a:r")) as Element;
 for(const node of Array.from(paragraph.childNodes))if(!(node.nodeType===1&&["pPr","endParaRPr"].includes(node.localName||"")))paragraph.removeChild(node);
 for(const node of Array.from(run.childNodes))if(!(node.nodeType===1&&node.localName==="rPr"))run.removeChild(node);
 for(const node of children(body,A,"p"))body.removeChild(node);
 for(const line of value.split("\n")){
  const next=paragraph.cloneNode(true) as Element,nextRun=run.cloneNode(true) as Element,t=doc.createElementNS(A,"a:t");
  t.appendChild(doc.createTextNode(line));nextRun.appendChild(t);next.insertBefore(nextRun,children(next,A,"endParaRPr")[0]||null);body.appendChild(next);
 }
 if(scale<1)for(const properties of [...descendants(body,A,"rPr"),...descendants(body,A,"endParaRPr"),...descendants(body,A,"defRPr")]){const size=Number(properties.getAttribute("sz"));if(size)properties.setAttribute("sz",String(Math.max(100,Math.round(size*scale))))}
}
function fitCellText(cell:Element,width:number,height:number){
 const body=descendants(cell,A,"txBody")[0],properties=children(body,A,"bodyPr")[0],padding=children(cell,A,"tcPr")[0];
 if(properties){for(const inset of ["lIns","rIns","tIns","bIns"])properties.setAttribute(inset,"0");properties.setAttribute("wrap","square")}
 const availableWidth=Math.max(1,(width-Number(padding?.getAttribute("marL")||0)-Number(padding?.getAttribute("marR")||0))/12700),availableHeight=Math.max(1,(height-Number(padding?.getAttribute("marT")||0)-Number(padding?.getAttribute("marB")||0))/12700);
 const runs=[...descendants(body,A,"rPr"),...descendants(body,A,"endParaRPr"),...descendants(body,A,"defRPr")],original=Math.max(1,...runs.map(run=>Number(run.getAttribute("sz")||0)/100));
 const widthUnits=(value:string)=>[...value].reduce((sum,char)=>sum+(/[MW@%]/.test(char)?0.85:/[ilI1.,:;| ]/.test(char)?0.3:0.57),0);
 const lineCount=(size:number)=>children(body,A,"p").reduce((count,paragraph)=>{let length=0,lines=1;for(const word of text(paragraph).split(/\s+/)){const next=widthUnits(word)*size;if(length&&length+size*0.3+next>availableWidth){lines++;length=0}if(next>availableWidth){lines+=Math.ceil(next/availableWidth)-1;length=next%availableWidth}else length+=(length?size*0.3:0)+next}return count+lines},0);
 let size=original;while(size>1&&lineCount(size)*size*1.25>availableHeight)size-=0.25;
 for(const run of runs){const oldSize=Number(run.getAttribute("sz"));run.setAttribute("sz",String(Math.max(200,Math.floor((oldSize||original*100)*Math.min(1,size/original)))))}
 // Empty table cells otherwise inherit the large master paragraph font and expand rows.
 for(const paragraph of children(body,A,"p")){
  let end=children(paragraph,A,"endParaRPr")[0];if(!end){end=cell.ownerDocument!.createElementNS(A,"a:endParaRPr");paragraph.appendChild(end)}
  end.setAttribute("sz",String(Math.max(200,Math.floor(size*100))));
  const paragraphProperties=children(paragraph,A,"pPr")[0];if(paragraphProperties){let defaults=children(paragraphProperties,A,"defRPr")[0];if(!defaults){defaults=cell.ownerDocument!.createElementNS(A,"a:defRPr");paragraphProperties.appendChild(defaults)}defaults.setAttribute("sz",String(Math.max(200,Math.floor(size*100))))}
 }
}
type TableRow={values:string[];total?:boolean;mergeLabel?:boolean;amountSpan?:number};
function fillTable(table:Element,headers:string[],rows:TableRow[]){
 const old=children(table,A,"tr"),head=old[0].cloneNode(true) as Element,body=old[1]||old[0];
 const totalTemplate=old.slice(1).find(row=>/TOTAL/i.test(text(row)))||old.at(-1)!;
 const count=children(head,A,"tc").length;
 if(headers.length!==count||rows.some(row=>row.values.length!==count))throw Error("Jumlah kolom tidak sesuai template M238.");
 const widths=children(children(table,A,"tblGrid")[0],A,"gridCol").map(column=>Number(column.getAttribute("w")));
 children(head,A,"tc").forEach((cell,i)=>{setText(cell,headers[i]);fitCellText(cell,widths.slice(i,i+Number(cell.getAttribute("gridSpan")||1)).reduce((s,n)=>s+n,0),Number(head.getAttribute("h")))})
 const height=old.slice(1).reduce((s,row)=>s+Number(row.getAttribute("h")||0),0),rowHeight=Math.floor(height/Math.max(1,rows.length));
 const scale=Math.min(1,(old.length-1)/Math.max(1,rows.length));
 for(const row of old)table.removeChild(row);table.appendChild(head);
 const newRows=rows.map((row,index)=>{
  const copy=(row.total?totalTemplate:body).cloneNode(true) as Element;
  copy.setAttribute("h",String(index===rows.length-1?height-rowHeight*index:rowHeight));
  const cells=children(copy,A,"tc");
  cells.forEach((cell,i)=>{for(const attribute of ["gridSpan","rowSpan","hMerge","vMerge"])cell.removeAttribute(attribute);setText(cell,row.values[i],scale);fitCellText(cell,widths[i],rowHeight)});
  if(row.mergeLabel){cells[0].setAttribute("gridSpan","2");cells[1].setAttribute("hMerge","1");setText(cells[1],"")}
  table.appendChild(copy);return copy;
 });
 rows.forEach((row,index)=>{if(!row.amountSpan||row.amountSpan<2)return;const column=count-1;children(newRows[index],A,"tc")[column].setAttribute("rowSpan",String(row.amountSpan));for(let offset=1;offset<row.amountSpan;offset++){const cell=children(newRows[index+offset],A,"tc")[column];cell.setAttribute("vMerge","1");setText(cell,"")}});
}
const row=(values:string[],total=false,mergeLabel=false):TableRow=>({values,total,mergeLabel});
const monthName=(period:string)=>new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(`${period}-01T00:00:00Z`)).toUpperCase();
const periodName=(period:ReferencePeriod|null|undefined,prefix:string)=>period?`${prefix} 1-${Number(period.end.slice(8))} ${monthName(period.period)}`:`${prefix}\nBelum tersedia`;
const amount=(period:ReferencePeriod|null|undefined,key:keyof Pick<ReferenceTotals,"device"|"accessories"|"vas"|"total">)=>period?.available?number(period.totals[key]):"—";
function replaceTitle(doc:Document,prefix:string,value:string){const shape=descendants(doc,P,"sp").find(shape=>text(shape).trim().startsWith(prefix));if(!shape)throw Error(`Judul ${prefix} tidak ditemukan di template.`);setText(shape,value)}
function fillBody(doc:Document,title:string,values:string[]){const shapes=descendants(doc,P,"sp").filter(shape=>text(shape).trim()&&text(shape).trim()!==title);if(!shapes.length)throw Error(`Isi ${title} tidak ditemukan di template.`);const content=values.length?values:["Belum diisi untuk periode ini."];setText(shapes[0],content.join("\n"),Math.min(1,1300/content.join(" ").length));for(const shape of shapes.slice(1))setText(shape,"")}

function setChartCache(parent:Element,values:Array<string|number>){
 const doc=parent.ownerDocument!,cache=descendants(parent,C,"strCache")[0]||descendants(parent,C,"numCache")[0];
 if(!cache)throw Error("Data grafik template tidak ditemukan.");
 for(const item of [...children(cache,C,"pt"),...children(cache,C,"ptCount")])cache.removeChild(item);
 const count=doc.createElementNS(C,"c:ptCount");count.setAttribute("val",String(values.length));cache.appendChild(count);
 values.forEach((value,index)=>{const point=doc.createElementNS(C,"c:pt"),v=doc.createElementNS(C,"c:v");point.setAttribute("idx",String(index));v.appendChild(doc.createTextNode(String(value)));point.appendChild(v);cache.appendChild(point)});
 return descendants(parent,C,"f")[0]?.textContent||"";
}
async function fillChart(zip:JSZip,data:WeeklyPresentationData){
 const chart=parse(await zip.file("ppt/charts/chart1.xml")!.async("string")),weekdayNames=["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Average"];
 const values=(rows:Array<{date:string;sales:number}>,start:string,end:string)=>{const daily=weekdayNames.slice(0,7).map((_,day)=>rows.filter(r=>new Date(`${r.date}T00:00:00Z`).getUTCDay()===day).reduce((s,r)=>s+r.sales,0)),days=Math.max(1,Math.min(7,Math.floor((Date.parse(`${end}T00:00:00Z`)-Date.parse(`${start}T00:00:00Z`))/86400000)+1));return [...daily,daily.reduce((s,n)=>s+n,0)/days]};
 const seriesValues=[values(data.report?.dailyA||[],data.periodA.start,data.periodA.end),values(data.report?.daily||[],data.periodB.start,data.report?.cutoff||data.periodB.end)];
 const updates:Array<{formula:string;values:Array<string|number>}>=[];
 descendants(chart,C,"ser").forEach((series,index)=>{const tx=children(series,C,"tx")[0],cat=children(series,C,"cat")[0],val=children(series,C,"val")[0];if(!tx||!cat||!val)throw Error("Struktur grafik M238 berubah.");updates.push({formula:setChartCache(tx,[index===0?data.labelA:data.labelB]),values:[index===0?data.labelA:data.labelB]},{formula:setChartCache(cat,weekdayNames),values:weekdayNames},{formula:setChartCache(val,seriesValues[index]),values:seriesValues[index]})});
 for(const name of ["max","majorUnit","minorUnit"])for(const element of descendants(chart,C,name))element.parentNode!.removeChild(element);
 zip.file("ppt/charts/chart1.xml",serialize(chart));
 const embedded="ppt/embeddings/Microsoft_Excel_Worksheet.xlsx",workbook=XLSX.read(await zip.file(embedded)!.async("nodebuffer"),{type:"buffer"});
 for(const name of workbook.SheetNames)for(const key of Object.keys(workbook.Sheets[name]))if(!key.startsWith("!"))delete workbook.Sheets[name][key];
 for(const update of updates){const split=update.formula.lastIndexOf("!");if(split<0)continue;const name=update.formula.slice(0,split).replace(/^'|'$/g,""),range=XLSX.utils.decode_range(update.formula.slice(split+1).replace(/\$/g,"")),sheet=workbook.Sheets[name];if(!sheet)throw Error("Worksheet grafik tidak ditemukan.");update.values.forEach((value,index)=>{sheet[XLSX.utils.encode_cell({c:range.s.c,r:range.s.r+index})]={t:typeof value==="number"?"n":"s",v:value}})}
 zip.file(embedded,XLSX.write(workbook,{type:"buffer",bookType:"xlsx",compression:true}));
}

export async function m238ReviewPresentationBytes(data:WeeklyPresentationData){
 const zip=await JSZip.loadAsync(readFileSync(path.join(process.cwd(),"assets/m238-review-template.pptx"))),docs=new Map<number,Document>();
 for(let index=1;index<=11;index++)docs.set(index,parse(await zip.file(`ppt/slides/slide${index}.xml`)!.async("string")));
 const tables=(index:number)=>descendants(docs.get(index)!,A,"tbl"),model=weeklyPresentationModel(data),reference=data.reference;
 if(!reference)throw Error("Data bulanan presentasi belum lengkap.");
 const details:TableRow[]=[],lobKeys=["AIRPODS","APPLE WATCH","IPAD","IPHONE","MAC"];
 for(const lob of lobKeys){const types=presentationTypeRows(data,lob).sort((a,b)=>a.name.localeCompare(b.name)),previous=sum(data.a.lob[lob]||{}),current=sum(data.b.lob[lob]||{});types.forEach((type,index)=>details.push({values:[index?"":lob,type.name,number(type.previous.qty),number(type.previous.amount),number(type.current.qty),number(type.current.amount),percent(type.previous.qty,type.current.qty),index?"":percent(previous.amount,current.amount)],amountSpan:index?undefined:types.length}));details.push(row([`${lob} Total`, "",number(previous.qty),number(previous.amount),number(current.qty),number(current.amount),percent(previous.qty,current.qty),""],true,true))}
 const previousDevices=sum(Object.fromEntries(lobKeys.map(key=>[key,sum(data.a.lob[key]||{})]))),currentDevices=sum(Object.fromEntries(lobKeys.map(key=>[key,sum(data.b.lob[key]||{})])));
 details.push(row(["Grand Total","",number(previousDevices.qty),number(previousDevices.amount),number(currentDevices.qty),number(currentDevices.amount),percent(previousDevices.qty,currentDevices.qty),percent(model.overall.previous.amount,model.overall.current.amount)],true,true));
 fillTable(tables(2)[0],["Product Category","Type",data.labelA,"",data.labelB,"","Qty %","Sales %"],details);
 const categoryRows=["ACC","DEVICE","VAS"].map(key=>{const item=model.categories.find(item=>item.name===key)!;return row(["M238",key==="ACC"?"ACCESSORIES":key==="DEVICE"?"DEVICES":key,number(item.previous.amount),number(item.current.amount),percent(item.previous.amount,item.current.amount)])});categoryRows.push(row(["M238 Total","",number(model.overall.previous.amount),number(model.overall.current.amount),percent(model.overall.previous.amount,model.overall.current.amount)],true,true));
 fillTable(tables(2)[1],["Store","Product Scheme",data.labelA,data.labelB,"%"],categoryRows);
 const providers=["INDOSAT","QOALA","TELKOMSEL","XL"],vasRows=providers.map(name=>{const a=data.a.vas[name]||{qty:0,amount:0},b=data.b.vas[name]||{qty:0,amount:0};return row(["M238",name,number(a.qty),number(a.amount),number(b.qty),number(b.amount),percent(a.amount,b.amount)])}),aVas=sum(data.a.vas),bVas=sum(data.b.vas);
 vasRows.push(row(["M238 Total","",number(aVas.qty),number(aVas.amount),number(bVas.qty),number(bVas.amount),percent(aVas.amount,bVas.amount)],true,true));fillTable(tables(2)[2],["Store","Brand Name",data.labelA,"",data.labelB,"","%"],vasRows);
 const comparisons=[reference.lfl,reference.mtm,reference.current],comparisonHeaders=["KATEGORI",periodName(reference.lfl,"LFL"),periodName(reference.mtm,"MTM"),periodName(reference.current,"MTD"),"LFL%","MTM%"];
 replaceTitle(docs.get(3)!,"LFL, MTM",`LFL, MTM dan MTD ${reference.cutoff.slice(0,4)}`);
 fillTable(tables(3)[0],comparisonHeaders,(["device","accessories","vas","total"] as const).map(key=>row([key.toUpperCase(),...comparisons.map(p=>amount(p,key)),reference.lfl?.available&&reference.current.available?percent(reference.lfl.totals[key],reference.current.totals[key]):"—",reference.mtm.available&&reference.current.available?percent(reference.mtm.totals[key],reference.current.totals[key]):"—"],key==="total")));
 fillTable(tables(3)[1],["Comparison","MacBook","iPhone","iPad","Apple Watch","AirPods","Value AirPods","Total Device"],comparisons.map((p,index)=>row([["LFL","MTM","MTD"][index],...["mac","iphone","ipad","watch","airpods"].map(key=>p?.available?number(p.totals.lob[key]||0):"—"),p?.available?number(p.totals.lobAmount.airpods||0):"—",p?.available?number(Object.values(p.totals.lob).reduce((s,n)=>s+n,0)):"—"])));
 const providerOrder=["QOALA","TELKOMSEL","XL","INDOSAT"];
 fillTable(tables(4)[0],comparisonHeaders,[...providerOrder,"TOTAL"].map(name=>{const amounts=comparisons.map(p=>p?.available?(name==="TOTAL"?p.totals.vas:p.totals.vasDetail[name]?.amount||0):null);return row([name,...amounts.map(v=>v===null?"—":number(v)),amounts[0]!==null&&amounts[2]!==null?percent(amounts[0],amounts[2]):"—",amounts[1]!==null&&amounts[2]!==null?percent(amounts[1],amounts[2]):"—"],name==="TOTAL")}));
 fillTable(tables(4)[1],["Comparison",...providerOrder,"TOTAL QTY"],comparisons.map((p,index)=>row([["LFL","MTM","MTD"][index],...providerOrder.map(name=>p?.available?number(p.totals.vasDetail[name]?.qty||0):"—"),p?.available?number(Object.values(p.totals.vasDetail).reduce((s,v)=>s+v.qty,0)):"—"])));
 const available=reference.history.filter(p=>p.available);
 fillTable(tables(5)[0],["Kategori",...reference.history.map(p=>monthName(p.period)),"Average sales"],(["device","accessories","vas","total"] as const).map(key=>row([key.toUpperCase(),...reference.history.map(p=>amount(p,key)),available.length?number(available.reduce((s,p)=>s+p.totals[key],0)/available.length):"—"],key==="total")));
 const ranked=[...reference.annual].filter(p=>p.available).sort((a,b)=>b.totals.total-a.totals.total),high=ranked[0],second=ranked[1],low=ranked.at(-1);
 replaceTitle(docs.get(6)!,"Performa Sales",`Performa Sales ${reference.cutoff.slice(0,4)}`);
 fillTable(tables(6)[0],["Kategori",`Sales Tertinggi\n${high?monthName(high.period):"Belum tersedia"}`,`Tertinggi Berikutnya\n${second?monthName(second.period):"Belum tersedia"}`,`Sales Terendah\n${low?monthName(low.period):"Belum tersedia"}`],(["device","accessories","vas","total"] as const).map(key=>row([key.toUpperCase(),amount(high,key),amount(second,key),amount(low,key)],key==="total")));
 replaceTitle(docs.get(7)!,"Performa Sales",`Performa Sales 1-${Number(reference.cutoff.slice(8))} ${monthName(reference.current.period)}`);
 const staffRows=reference.staff.map(person=>row([person.name,person.job||"—",number(person.lob.watch||0),number(person.lob.ipad||0),number(person.lob.iphone||0),number(person.lob.mac||0),number(person.accessories),number(person.device),number(person.vas),number(person.total)]));
 staffRows.push(row(["Grand Total","",...["watch","ipad","iphone","mac"].map(key=>number(reference.current.totals.lob[key]||0)),number(reference.current.totals.accessories),number(reference.current.totals.device),number(reference.current.totals.vas),number(reference.current.totals.total)],true,true));
 fillTable(tables(7)[0],["Sales Name","JOB","AW","IPAD","IPHONE","MAC","ACCESSORIES","DEVICES","VAS","Grand Total"],staffRows);
 const issueThemes=[[/stok|stock|kosong|habis/i,"Stok"],[/acc|aksesoris|accessor|vas|qoala|provider/i,"Accessories & VAS"],[/member|\bcx\b/i,"CX & New Member"],[/manpower|staff|schedule|jadwal/i,"Manpower"]] as const;
 const issues=issueThemes.map(([pattern,label])=>({label,count:(data.report?.feedback||[]).filter(item=>pattern.test(item)).length})).filter(item=>item.count).map(item=>`${item.label}: ${item.count} catatan feedback pada periode ini.`);
 fillBody(docs.get(8)!,"Issue",data.notes?.issues.trim()?lines(data.notes.issues):issues);
 const actionRows=data.notes?.actionPlan.trim()?lines(data.notes.actionPlan).map((line,index)=>{const parts=line.split("|").map(part=>part.trim());return row([String(index+1),parts[0]||"—",parts[1]||"—",parts.slice(2).join(" | ")||"—"])}):Object.entries(data.analysis||{}).map(([lob,analysis],index)=>row([String(index+1),`${lob} (Usulan)`,analysis.actionPlan||"—","Belum diisi"]));
 fillTable(tables(9)[0],["No","Plan","Do","Action"],actionRows.length?actionRows:[row(["1","Belum diisi","—","—"])]);
 fillBody(docs.get(10)!,"Support",lines(data.notes?.support));
 for(const[index,doc]of docs)zip.file(`ppt/slides/slide${index}.xml`,serialize(doc));
 await fillChart(zip,data);
 await finalizeOfficePresentation(zip,11);
 return await zip.generateAsync({type:"uint8array",compression:"DEFLATE"});
}
