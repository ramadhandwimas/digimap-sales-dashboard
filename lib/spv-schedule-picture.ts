import {Schedule,DAYS,dates,rangeLabel,personCounts,shiftCounts,shiftText,roleColor,shiftColor,SHIFTS,validateSchedule} from "./spv-schedule";
export async function schedulePicture(value:Schedule):Promise<File>{
 const s=validateSchedule(value,true),width=2200;
 const canvas=document.createElement("canvas");canvas.width=width;
 const c=canvas.getContext("2d");if(!c)throw Error("Perangkat belum mendukung gambar schedule.");

 const text=(v:string,x:number,y:number,size=22,bold=false,color="#182238",align:CanvasTextAlign="left")=>{c.font=`${bold?"700":"400"} ${size}px Arial, sans-serif`;c.fillStyle=color;c.textAlign=align;c.fillText(v,x,y)};
 const wrap=(v:string,max:number,size=22)=>{c.font=`${size}px Arial, sans-serif`;const lines:string[]=[];let line="";for(const token of v.split(/\s+/)){const pieces:string[]=[];let piece="";for(const char of token){if(c.measureText(piece+char).width>max&&piece){pieces.push(piece);piece=""}piece+=char}if(piece)pieces.push(piece);for(const word of pieces){if(c.measureText(line+" "+word).width>max&&line){lines.push(line);line=word}else line+=(line?" ":"")+word}}if(line)lines.push(line);return lines};
 const columns=[140,360,210,...Array(7).fill(150),88,88,88,88,88];const x=[0];for(const w of columns)x.push(x[x.length-1]+w);
 const notes=wrap(s.note,2120,20),bannerH=120+notes.length*24;
 const dayNoteH=Math.max(38,...s.dayNotes.map(n=>wrap(n,138,19).length*22+16));
 const headerH=bannerH+48+dayNoteH;
 const rowHeights=s.people.map(p=>Math.max(58,...[p.id||"—",p.name,p.position].map((v,i)=>wrap(v,columns[i]-12,19).length*22+16)));
 const height=headerH+rowHeights.reduce((a,b)=>a+b,0)+SHIFTS.length*38+110;
 canvas.height=height;c.fillStyle="#fff";c.fillRect(0,0,width,height);
 c.fillStyle="#0d4f77";c.fillRect(0,0,width,bannerH);text(`SCHEDULE WEEK ${s.week}`,32,54,38,true,"#fff");text(`M238 · Digimap PIM 2 | ${rangeLabel(s.start)}`,32,96,25,false,"#fff");
 notes.forEach((line,i)=>text(line,32,123+i*24,20,false,"#fff"));
 const cell=(index:number,y:number,h:number,value:string,bg="#fff",color="#172033",bold=false)=>{c.fillStyle=bg;c.fillRect(x[index],y,columns[index],h);c.strokeStyle="#46505e";c.lineWidth=1;c.strokeRect(x[index],y,columns[index],h);const lines=wrap(value,columns[index]-12,19);const visible=lines;visible.forEach((line,j)=>text(line,x[index]+columns[index]/2,y+h/2+(j-(visible.length-1)/2)*22+7,19,bold,color,"center"))};
 ["NIK","Nama","Jabatan",...dates(s.start).map((d,i)=>`${DAYS[i]} ${d.slice(8)}/${d.slice(5,7)}`),"D047","D103","D083","X&C","MT&TR"].forEach((v,i)=>cell(i,bannerH,48,v,i===8||i===9?"#ff4747":"#e5eef8","#172033",true));
 for(let i=0;i<7;i++)cell(i+3,bannerH+48,dayNoteH,s.dayNotes[i],"#fff5d8","#a02c23");
 let rowY=headerH;
 for(const [i,p] of s.people.entries()){
  const y=rowY,rowH=rowHeights[i],bg=roleColor(p.position);rowY+=rowH;[p.id||"—",p.name,p.position].forEach((v,j)=>cell(j,y,rowH,v,bg));
  p.shifts.forEach((code,j)=>cell(j+3,y,rowH,shiftText(code),["TRAINING","TRAINING_IPHONE","NONE"].includes(code)?shiftColor(code):bg,code==="NONE"?"#fff":["OFF","CUTI","SAKIT"].includes(code)?"#bd1515":"#172033",true));
  personCounts(p).forEach((count,j)=>cell(j+10,y,rowH,String(count),bg));
 }
 const bottom=rowY;
 SHIFTS.forEach(([code,label],i)=>{const y=bottom+i*38,bg=shiftColor(code);c.fillStyle=bg;c.fillRect(0,y,x[3],38);c.strokeStyle="#46505e";c.strokeRect(0,y,x[3],38);text(`${code==="NONE"?"TIDAK DIJADWALKAN":code} ${/^D\d{3}$/.test(code)?`(${label})`:code==="TRAINING_IPHONE"?"· iPhone for You":""}`,12,y+26,20,true,code==="NONE"?"#fff":"#172033");shiftCounts(s,code).forEach((v,j)=>cell(j+3,y,38,String(v),bg,code==="NONE"?"#fff":"#172033"))});
 text("X&C: OFF, CUTI, RO, SAKIT · MT&TR: Meeting & Training",24,height-66,21);text("—: Tidak dijadwalkan · Jadwal siap dibagikan",24,height-30,21);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error("Gambar belum dapat dibuat.")),"image/png"));
 return new File([blob],`M238-SCHEDULE-WEEK-${s.week}-${s.start}.png`,{type:"image/png"});
}
