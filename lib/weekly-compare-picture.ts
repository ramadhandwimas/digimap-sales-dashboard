export type WeeklyCompareAgg={qty:number;amount:number};
export type WeeklyCompareSide={scheme:Record<string,WeeklyCompareAgg>;vas:Record<string,WeeklyCompareAgg>;lob:Record<string,Record<string,WeeklyCompareAgg>>};
export type WeeklyCompareData={yearA?:string;yearB?:string;labelA:string;labelB:string;periodA:{start:string;end:string};periodB:{start:string;end:string};a:WeeklyCompareSide;b:WeeklyCompareSide};

const format=new Intl.NumberFormat("id-ID",{maximumFractionDigits:0});
const lobOrder=["AIRPODS","APPLE WATCH","IPAD","IPHONE","MAC"];
const categoryLabel:Record<string,string>={AIRPODS:"AIRPODS","APPLE WATCH":"APPLE WATCH",IPAD:"IPAD",IPHONE:"IPHONE",MAC:"MAC"};
const schemeLabel=(value:string)=>/ACC|ACCESSOR/i.test(value)?"ACCESSORIES":/DEVICE/i.test(value)?"DEVICES":value.toUpperCase();
const values=(left:Record<string,WeeklyCompareAgg>={},right:Record<string,WeeklyCompareAgg>={})=>[...new Set([...Object.keys(left),...Object.keys(right)])].map(key=>({key,a:left[key]||{qty:0,amount:0},b:right[key]||{qty:0,amount:0}}));
const total=(rows:Array<{a:WeeklyCompareAgg;b:WeeklyCompareAgg}>)=>rows.reduce((sum,row)=>({a:{qty:sum.a.qty+row.a.qty,amount:sum.a.amount+row.a.amount},b:{qty:sum.b.qty+row.b.qty,amount:sum.b.amount+row.b.amount}}),{a:{qty:0,amount:0},b:{qty:0,amount:0}});
const growth=(a:number,b:number)=>a?`${Math.round((b-a)/a*100)}%`:b?"NEW":"0%";
const weekLabel=(data:WeeklyCompareData,side:"A"|"B")=>{const label=side==="A"?data.labelA:data.labelB,year=side==="A"?data.yearA:data.yearB;return `${label}${year?` / ${year}`:""}`};

export function weeklyCompareCaption(data:WeeklyCompareData){return `${weekLabel(data,"A")} vs ${weekLabel(data,"B")}`}

export async function weeklyComparePicture(data:WeeklyCompareData):Promise<File>{
 const aLabel=weekLabel(data,"A"),bLabel=weekLabel(data,"B"),scheme=values(data.a.scheme,data.b.scheme).sort((x,y)=>["ACCESSORIES","DEVICES","VAS"].indexOf(schemeLabel(x.key))-["ACCESSORIES","DEVICES","VAS"].indexOf(schemeLabel(y.key))),vas=values(data.a.vas,data.b.vas).sort((x,y)=>x.key.localeCompare(y.key));
 const categories=[...lobOrder,...Object.keys({...data.a.lob,...data.b.lob}).filter(key=>!lobOrder.includes(key))];
 const lob=categories.map(category=>({category,rows:values(data.a.lob[category],data.b.lob[category])})).filter(group=>group.rows.length);
 const rowH=42,titleH=64,headH=76,gap=70,margin=26,width=1430;
 const firstH=titleH+headH+(scheme.length+1)*rowH,vasH=titleH+headH+(vas.length+1)*rowH,lobRows=lob.reduce((count,group)=>count+group.rows.length+1,0)+1,lobH=titleH+headH+lobRows*rowH;
 const height=margin+firstH+gap+vasH+gap+lobH+margin;
 const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const c=canvas.getContext("2d");if(!c)throw Error("Gambar report belum dapat dibuat di perangkat ini.");
 c.fillStyle="#ffffff";c.fillRect(0,0,width,height);
 const text=(value:string,x:number,y:number,size=20,bold=false,italic=false,align:CanvasTextAlign="left",color="#111827")=>{c.font=`${italic?"italic ":""}${bold?"700":"400"} ${size}px Arial, sans-serif`;c.textAlign=align;c.fillStyle=color;c.fillText(value,x,y)};
 const cell=(x:number,y:number,w:number,h:number,value:string,bg="#f3f4f6",align:CanvasTextAlign="left",bold=false,color="#111827",size=18)=>{c.fillStyle=bg;c.fillRect(x,y,w,h);c.strokeStyle="#ffffff";c.lineWidth=2;c.strokeRect(x,y,w,h);text(value,align==="right"?x+w-10:align==="center"?x+w/2:x+10,y+h/2+7,size,bold,false,align,color)};
 const sectionTitle=(title:string,y:number)=>text(title,margin,y+42,34,true,true);
 const amount=(n:number)=>format.format(Math.round(n));
 let y=margin;

 sectionTitle("Week to Week M238",y);y+=titleH;
 const one=[170,390,270,270,260],x1=[margin];one.forEach(w=>x1.push(x1.at(-1)!+w));
 cell(x1[0],y,one[0]+one[1],34,"Store / Product Scheme","#dbe1ea","left",false,"#111827",16);cell(x1[2],y,one[2],34,aLabel,"#879bbb","center",true,"#ffffff",16);cell(x1[3],y,one[3],34,bLabel,"#879bbb","center",true,"#ffffff",16);cell(x1[4],y,one[4],34,"Selisih","#879bbb","center",true,"#ffffff",16);y+=34;
 ["Store","Product Scheme",aLabel,bLabel,"Amount +/-"].forEach((label,i)=>cell(x1[i],y,one[i],42,label,i<2?"#dbe1ea":"#a9b7cd",i<2?"left":"center",true,i<2?"#111827":"#ffffff",15));y+=42;
 scheme.forEach((row,index)=>{cell(x1[0],y,one[0],rowH,index?"":"M238","#eef0f3","left",index===0);cell(x1[1],y,one[1],rowH,schemeLabel(row.key),"#eef0f3");cell(x1[2],y,one[2],rowH,amount(row.a.amount),"#ffffff","right");cell(x1[3],y,one[3],rowH,amount(row.b.amount),"#ffffff","right");cell(x1[4],y,one[4],rowH,amount(row.b.amount-row.a.amount),"#ffffff","right");y+=rowH});
 const schemeTotal=total(scheme);cell(x1[0],y,one[0]+one[1],rowH,"M238 Total","#dbe1ea","left",true);cell(x1[2],y,one[2],rowH,amount(schemeTotal.a.amount),"#dbe1ea","right",true);cell(x1[3],y,one[3],rowH,amount(schemeTotal.b.amount),"#dbe1ea","right",true);cell(x1[4],y,one[4],rowH,amount(schemeTotal.b.amount-schemeTotal.a.amount),"#ffffff","right",true);y+=rowH+gap;

 sectionTitle("VAS M238",y);y+=titleH;
 const many=[230,300,105,220,105,220,180],xm=[margin];many.forEach(w=>xm.push(xm.at(-1)!+w));
 cell(xm[0],y,many[0]+many[1],34,"Store / Brand Name","#dbe1ea","left",false,"#111827",16);cell(xm[2],y,many[2]+many[3],34,aLabel,"#879bbb","center",true,"#ffffff",16);cell(xm[4],y,many[4]+many[5],34,bLabel,"#879bbb","center",true,"#ffffff",16);cell(xm[6],y,many[6],34,"Selisih","#879bbb","center",true,"#ffffff",16);y+=34;
 ["Store","Brand Name","Qty","Amount","Qty","Amount","Amount +/-"].forEach((label,i)=>cell(xm[i],y,many[i],42,label,i<2?"#dbe1ea":"#a9b7cd",i<2?"left":"center",true,i<2?"#111827":"#ffffff",15));y+=42;
 vas.forEach((row,index)=>{const data=[index?"":"M238",row.key.toUpperCase(),format.format(row.a.qty),amount(row.a.amount),format.format(row.b.qty),amount(row.b.amount),amount(row.b.amount-row.a.amount)];data.forEach((value,i)=>cell(xm[i],y,many[i],rowH,value,i<2?"#eef0f3":"#ffffff",i<2?"left":"right",i===0));y+=rowH});
 const vasTotal=total(vas);const vt=["M238 Total","",format.format(vasTotal.a.qty),amount(vasTotal.a.amount),format.format(vasTotal.b.qty),amount(vasTotal.b.amount),amount(vasTotal.b.amount-vasTotal.a.amount)];vt.forEach((value,i)=>cell(xm[i],y,many[i],rowH,value,i<6?"#dbe1ea":"#ffffff",i<2?"left":"right",true));y+=rowH+gap;

 sectionTitle("WEEKLY LOB M238",y);y+=titleH;
 cell(xm[0],y,many[0]+many[1],34,"Product Category / Type","#dbe1ea","left",false,"#111827",16);cell(xm[2],y,many[2]+many[3],34,aLabel,"#879bbb","center",true,"#ffffff",16);cell(xm[4],y,many[4]+many[5],34,bLabel,"#879bbb","center",true,"#ffffff",16);cell(xm[6],y,many[6],34,"Growth","#879bbb","center",true,"#ffffff",16);y+=34;
 ["Product Category","Type","Qty","Amount","Qty","Amount","Qty %"].forEach((label,i)=>cell(xm[i],y,many[i],42,label,i<2?"#dbe1ea":"#a9b7cd",i<2?"left":"center",true,i<2?"#111827":"#ffffff",15));y+=42;
 const allLobRows:Array<{a:WeeklyCompareAgg;b:WeeklyCompareAgg}>=[];
 lob.forEach(group=>{group.rows.forEach((row,index)=>{allLobRows.push(row);const data=[index?"":categoryLabel[group.category]||group.category,row.key,format.format(row.a.qty),amount(row.a.amount),format.format(row.b.qty),amount(row.b.amount),growth(row.a.qty,row.b.qty)];data.forEach((value,i)=>cell(xm[i],y,many[i],rowH,value,i<2?"#eef0f3":"#ffffff",i<2?"left":"right",i===0));y+=rowH});const subtotal=total(group.rows),label=`${categoryLabel[group.category]||group.category} Total`,data=[label,"",format.format(subtotal.a.qty),amount(subtotal.a.amount),format.format(subtotal.b.qty),amount(subtotal.b.amount),growth(subtotal.a.qty,subtotal.b.qty)];data.forEach((value,i)=>cell(xm[i],y,many[i],rowH,value,i<6?"#dbe1ea":"#ffffff",i<2?"left":"right",true));y+=rowH});
 const grand=total(allLobRows),grandData=["Grand Total","",format.format(grand.a.qty),amount(grand.a.amount),format.format(grand.b.qty),amount(grand.b.amount),growth(grand.a.qty,grand.b.qty)];grandData.forEach((value,i)=>cell(xm[i],y,many[i],rowH,value,i<6?"#cfd7e4":"#ffffff",i<2?"left":"right",true));
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error("PNG report gagal dibuat.")),"image/png"));const safe=weeklyCompareCaption(data).replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-|-$/g,"");return new File([blob],`M238-Weekly-${safe}.png`,{type:"image/png"});
}
