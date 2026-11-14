import {Schedule,dates,rangeLabel,personCounts,shiftCounts,roleColor,shiftColor,SUMMARY_SHIFTS,validateSchedule} from "./spv-schedule";
/** Spreadsheet layout follows the store's reference, without moving the month, day notes or legend. */
export async function schedulePicture(value:Schedule):Promise<File>{
 const s=validateSchedule(value,true),columns=[150,360,160,...Array(7).fill(144),104,104,104,104,104],x=[0];for(const w of columns)x.push(x[x.length-1]+w);
 const width=x.at(-1)!;const canvas=document.createElement("canvas");canvas.width=width;
 const c=canvas.getContext("2d");if(!c)throw Error("Perangkat belum mendukung gambar schedule.");
 const text=(v:string,px:number,py:number,size=21,bold=false,color="#000",align:CanvasTextAlign="left")=>{c.font=`${bold?"700":"400"} ${size}px Arial, sans-serif`;c.fillStyle=color;c.textAlign=align;c.fillText(v,px,py)};
 const wrap=(v:string,max:number,size=20)=>{c.font=`700 ${size}px Arial, sans-serif`;const lines:string[]=[];let line="";for(const char of v){if(c.measureText(line+char).width>max&&line){lines.push(line.trim());line=""}line+=char}if(line.trim())lines.push(line.trim());return lines};
 const noteCells:{index:number;span:number;value:string}[]=[];for(let i=0;i<7;i++){const span=s.dayNotes[i]&&i<6&&!s.dayNotes[i+1]?2:1;noteCells.push({index:i,span,value:s.dayNotes[i]});i+=span-1}
 const noteH=Math.max(36,...noteCells.map(n=>wrap(n.value,144*n.span-10,20).length*22+10)),monthY=noteH,daysY=monthY+36,headerH=daysY+38;
 const heights=s.people.map(p=>Math.max(38,...[p.id,p.name,p.position].map((v,i)=>wrap(v,columns[i]-10,20).length*22+10)));
 const notes=wrap(s.note,width-40,20),height=headerH+heights.reduce((a,b)=>a+b,0)+SUMMARY_SHIFTS.length*38+90+notes.length*24;
 canvas.height=height;c.fillStyle="#fff";c.fillRect(0,0,width,height);
 const box=(left:number,y:number,w:number,h:number,bg:string)=>{c.fillStyle=bg;c.fillRect(left,y,w,h);c.strokeStyle="#111";c.lineWidth=1;c.strokeRect(left,y,w,h)};
 const cell=(i:number,y:number,h:number,value:string,bg="#fff",color="#000",bold=false,align:CanvasTextAlign="center",span=1)=>{const w=x[i+span]-x[i];box(x[i],y,w,h,bg);const lines=wrap(value,w-10,20);lines.forEach((line,j)=>text(line,align==="left"?x[i]+5:x[i]+w/2,y+h/2+(j-(lines.length-1)/2)*22+7,20,bold,color,align))};
 // Notes above the date, month in the left orange block, dates then weekday headers.
 noteCells.forEach(n=>cell(n.index+3,0,noteH,n.value,"#fff","#c00000",true,"left",n.span));
 const month=new Date(s.start+"T12:00:00Z").toLocaleDateString("en-US",{month:"long",timeZone:"UTC"});
 cell(0,monthY,36,month,"#ff9900","#000",true,"left",2);cell(2,monthY,36,"");
 dates(s.start).forEach((d,i)=>cell(i+3,monthY,36,String(Number(d.slice(8))),"#fff","#000",true));
 ["NIK","Name","Rank","Mon","Tue","Wed","Thu","Fri","Sat","Sun","D047","D103","D083","X&C","MT & TR"].forEach((v,i)=>cell(i,daysY,38,v,i===8||i===9?"#ff0000":"#fff",i===8||i===9?"#fff":i>=13?"#c0504d":"#000",true));
 let y=headerH;
 s.people.forEach((p,index)=>{const h=heights[index],bg=roleColor(p.position);[p.id,p.name,p.position].forEach((v,i)=>cell(i,y,h,v,bg,"#000",true,i===0?"center":"left"));
 p.shifts.forEach((code,j)=>cell(j+3,y,h,code==="NONE"?"":code==="TRAINING_IPHONE"?"TRAINING":code,["TRAINING_IPHONE","NONE"].includes(code)?shiftColor(code):bg,["OFF","CUTI","SAKIT","MEETING","TRAINING"].includes(code)?"#c00000":"#000",["OFF","CUTI","SAKIT","MEETING","TRAINING"].includes(code)));
 personCounts(p).forEach((n,j)=>cell(j+10,y,h,String(n),j<3?bg:"#fff",j>=3?"#c00000":"#000"));y+=h});
 const bottom=y;
 SUMMARY_SHIFTS.forEach(([code,label],i)=>{const sy=bottom+i*38,bg=shiftColor(code);cell(0,sy,38,/^D\d{3}$/.test(code)?`${code} (${label.replace("–"," - ")})`:code,bg,code==="OFF"?"#fff":"#000",true,"left",3);shiftCounts(s,code).forEach((v,j)=>cell(j+3,sy,38,String(v),bg,"#000",true))});
 // Training legend remains to the right of the totals, exactly as in the store sheet.
 [["TRAINING_IPHONE","Training Iphone for You"],["TRAINING","TRAINING"]].forEach(([code,label],i)=>{cell(11,bottom+i*38,38,"",shiftColor(code));cell(12,bottom+i*38,38,label,"#fff","#000",false,"left",3)});
 const footer=bottom+SUMMARY_SHIFTS.length*38;text(`SCHEDULE WEEK ${s.week}`,12,footer+35,25,true);text(rangeLabel(s.start),12,footer+65,20);notes.forEach((line,i)=>text(line,12,footer+91+i*24,20));
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error("Gambar belum dapat dibuat.")),"image/png"));
 return new File([blob],`M238-SCHEDULE-WEEK-${s.week}-${s.start}.png`,{type:"image/png"});
}
