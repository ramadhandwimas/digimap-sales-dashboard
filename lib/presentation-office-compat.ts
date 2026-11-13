import type JSZip from "jszip";
import {DOMParser,XMLSerializer,type Element} from "@xmldom/xmldom";

const C="http://schemas.openxmlformats.org/drawingml/2006/chart";
const A="http://schemas.openxmlformats.org/drawingml/2006/main",P="http://schemas.openxmlformats.org/presentationml/2006/main";
const coordinateAttributes:Record<string,string[]>={off:["x","y"],ext:["cx","cy"],chOff:["x","y"],chExt:["cx","cy"],tr:["h"],gridCol:["w"],tcPr:["marL","marR","marT","marB"],bodyPr:["lIns","rIns","tIns","bIns"],pPr:["marL","marR","indent","defTabSz"],rPr:["sz","kern","spc"],defRPr:["sz","kern","spc"],endParaRPr:["sz","kern","spc"],tab:["pos"],spcPts:["val"],buSzPts:["val"],ln:["w"],outerShdw:["blurRad","dist"],innerShdw:["blurRad","dist"],glow:["rad"],softEdge:["rad"]};
const parse=(xml:string)=>new DOMParser().parseFromString(xml,"application/xml"),serialize=(doc:ReturnType<typeof parse>)=>new XMLSerializer().serializeToString(doc);
function scaleElement(element:Element,factor:number){
 if(element.namespaceURI!==A)return;
 if(element.localName==="bodyPr")for(const [name,value]of Object.entries({lIns:91440,rIns:91440,tIns:45720,bIns:45720}))if(!element.hasAttribute(name))element.setAttribute(name,String(value));
 for(const attribute of coordinateAttributes[element.localName||""]||[]){const value=element.getAttribute(attribute);if(value!==null&&value!==""&&Number.isFinite(Number(value)))element.setAttribute(attribute,String(Math.round(Number(value)*factor)))}
}
function fitSectionHeading(doc:ReturnType<typeof parse>){
 const shapes=Array.from(doc.getElementsByTagNameNS(P,"sp")),label=shapes.find(shape=>["Issue","Action Plan","Support"].includes(Array.from(shape.getElementsByTagNameNS(A,"t")).map(t=>t.textContent||"").join("")));
 if(!label)return;
 const background=shapes.find(shape=>shape.getElementsByTagNameNS(A,"prstGeom")[0]?.getAttribute("prst")==="roundRect");
 if(!background)return;
 const frame=background.getElementsByTagNameNS(A,"xfrm")[0],target=label.getElementsByTagNameNS(A,"xfrm")[0];
 if(!frame||!target)return;
 const offset=frame.getElementsByTagNameNS(A,"off")[0],extent=frame.getElementsByTagNameNS(A,"ext")[0],targetOffset=target.getElementsByTagNameNS(A,"off")[0],targetExtent=target.getElementsByTagNameNS(A,"ext")[0];
 targetOffset.setAttribute("x",String(Number(offset.getAttribute("x"))+152400));targetOffset.setAttribute("y",offset.getAttribute("y")||"0");targetExtent.setAttribute("cx",String(Number(extent.getAttribute("cx"))-304800));targetExtent.setAttribute("cy",extent.getAttribute("cy")||"0");
 const body=label.getElementsByTagNameNS(A,"bodyPr")[0];body.setAttribute("anchor","ctr");body.setAttribute("wrap","none");
 for(const node of Array.from(body.childNodes))if(node.nodeType===1&&["spAutoFit","normAutofit","noAutofit"].includes(node.localName||""))body.removeChild(node);
 body.appendChild(doc.createElementNS(A,"a:noAutofit"));
}
/** Keep the source design at standard widescreen dimensions and emit valid Office properties. */
export async function finalizeOfficePresentation(zip:JSZip,slideCount:number){
 const presentation=parse(await zip.file("ppt/presentation.xml")!.async("string")),size=presentation.getElementsByTagNameNS(P,"sldSz")[0],width=Number(size.getAttribute("cx")),height=Number(size.getAttribute("cy")),factor=12192000/width;
 if(Math.abs(width/height-16/9)>0.001)throw Error("Template M238 harus menggunakan rasio 16:9.");
 for(const name of Object.keys(zip.files).filter(name=>/^ppt\/(?:slides\/slide\d+|slideMasters\/slideMaster\d+|slideLayouts\/slideLayout\d+|theme\/theme\d+|charts\/(?:chart|style)\d+|presentation)\.xml$/.test(name))){
  const doc=name==="ppt/presentation.xml"?presentation:parse(await zip.file(name)!.async("string"));
  if(name.startsWith("ppt/slides/"))fitSectionHeading(doc);
  for(const element of Array.from(doc.getElementsByTagName("*")))scaleElement(element,factor);
  if(name.startsWith("ppt/charts/chart"))for(const extension of Array.from(doc.getElementsByTagNameNS(C,"extLst")))extension.parentNode!.removeChild(extension);
  if(name==="ppt/presentation.xml"){size.setAttribute("cx","12192000");size.setAttribute("cy","6858000");size.setAttribute("type","screen16x9")}
  zip.file(name,serialize(doc));
 }
 const timestamp=new Date().toISOString();
 zip.file("docProps/core.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>M238 Review Sales</dc:title><dc:creator>M238</dc:creator><cp:lastModifiedBy>M238</cp:lastModifiedBy><cp:revision>1</cp:revision><dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified></cp:coreProperties>`);
 zip.file("docProps/app.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>M238 Dashboard</Application><PresentationFormat>On-screen Show (16:9)</PresentationFormat><Slides>${slideCount}</Slides><Notes>0</Notes><HiddenSlides>0</HiddenSlides><ScaleCrop>false</ScaleCrop><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0000</AppVersion></Properties>`);
}
