import {achievementText,REPORT_LABELS,staffAchievementModeLabel,type AchievementReport,type ReportCategory} from "./staff-achievement-report";
export type StaffReportContent="achievement"|"recovery";
const money=(v:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v);
export async function staffReportPicture(data:AchievementReport,category:ReportCategory,content:StaffReportContent){
 const next=data.recovery?.status==="READY"?data.recovery.days[0]:undefined;
 if(content==="recovery"&&!next)throw Error("Rencana target berikutnya belum tersedia. Periksa status cutoff.");
 const recoveryRows=data.recoveryStaff||[],rows=content==="achievement"?[...data.staff,data.total]:[...recoveryRows,{id:"STORE",name:"TOTAL TOKO",base:next!.base,target:next!.target}];
 const c=document.createElement("canvas"),w=1440,p=36,rowH=80,tableTop=284,headerH=56;
 c.width=w;c.height=tableTop+headerH+rows.length*rowH+126+(data.warnings.length?48:0);
 const x=c.getContext("2d");if(!x)throw Error("Gambar belum dapat dibuat.");
 x.fillStyle="#f3f6fc";x.fillRect(0,0,w,c.height);x.fillStyle="#fff";x.fillRect(16,16,w-32,c.height-32);
 x.fillStyle="#0759f9";x.font="800 24px Arial";x.fillText("M238 · DIGIMAP PIM 2",p,62);
 x.fillStyle="#10172b";x.font="800 40px Arial";x.fillText(content==="achievement"?"Pencapaian Staff":"Target Staff Berikutnya",p,118);
 x.fillStyle="#0759f9";x.font="800 36px Arial";x.fillText(REPORT_LABELS[category],p,172);
 x.fillStyle="#64748b";x.font="500 24px Arial";x.fillText(content==="achievement"?`${data.mode==="day"?data.to:`${data.from} s.d. ${data.to}`} · ${staffAchievementModeLabel(data.mode)}`:`Berlaku ${next!.date} · Cutoff ${data.recovery!.cutoff}`,p,216);
 x.font="500 21px Arial";x.fillText(content==="achievement"?data.mode==="day"?"Penjualan tanggal pilihan · Target harian · Staff M238 selain SPV":"Penjualan setelah cutoff · Target periode laporan · Staff M238 selain SPV":"Target awal + penyesuaian = target baru · Sesuai jadwal staff",p,252);
 const fit=(text:string,right:number,y:number,width:number,size=30,weight=600)=>{let font=size;x.textAlign="right";x.font=`${weight} ${font}px Arial`;while(x.measureText(text).width>width&&font>21){font--;x.font=`${weight} ${font}px Arial`}x.fillText(text,right,y);x.textAlign="left"};
 const name=(text:string,y:number,bold=false)=>{x.font=`${bold?800:600} 27px Arial`;const words=text.split(/\s+/),lines:string[]=[];let line="";for(const word of words){const candidate=line?`${line} ${word}`:word;if(x.measureText(candidate).width>382&&line){lines.push(line);line=word}else line=candidate}if(line)lines.push(line);const shown=lines.slice(0,2);if(lines.length>2)shown[1]+="…";shown.forEach((value,i)=>{while(x.measureText(value).width>382)value=value.slice(0,-2)+"…";x.fillText(value,p+14,y+(shown.length===1?48:31+i*31))})};
 x.fillStyle="#e9f0ff";x.fillRect(p,tableTop,w-p*2,headerH);x.fillStyle="#10172b";x.font="800 22px Arial";x.fillText("STAFF",p+14,tableTop+36);
 if(content==="achievement"){
  const right=[744,1014,1134,w-p-14],headers=["PENJUALAN","TARGET","ACH","GAP"],widths=[290,250,110,250];headers.forEach((label,i)=>fit(label,right[i],tableTop+36,widths[i],22,800));
  [...data.staff,data.total].forEach((person,i)=>{const y=tableTop+headerH+i*rowH,total=person.id==="TOTAL",v=achievementText(person,category);x.fillStyle=total?"#e9f0ff":i%2?"#fff":"#f8fafc";x.fillRect(p,y,w-p*2,rowH-1);x.fillStyle="#10172b";name(person.name,y,total);[v.actual,v.target,v.achievement,v.gap].forEach((value,col)=>fit(value,right[col],y+48,widths[col],30,total?800:600))});
 }else{
  const right=[744,1074,w-p-14],headers=["TARGET AWAL","PENYESUAIAN","TARGET BARU"],widths=[290,310,300];headers.forEach((label,i)=>fit(label,right[i],tableTop+36,widths[i],22,800));
  [...recoveryRows,{id:"STORE",name:"TOTAL TOKO",base:next!.base,target:next!.target}].forEach((person,i)=>{const y=tableTop+headerH+i*rowH,total=person.id==="STORE",delta=person.target[category]-person.base[category];x.fillStyle=total?"#e9f0ff":i%2?"#fff":"#f8fafc";x.fillRect(p,y,w-p*2,rowH-1);x.fillStyle="#10172b";name(person.name,y,total);[money(person.base[category]),`${delta>0?"+":""}${money(delta)}`,money(person.target[category])].forEach((value,col)=>fit(value,right[col],y+48,widths[col],30,total?800:600))});
 }
 const foot=tableTop+headerH+rows.length*rowH+42;x.fillStyle="#64748b";x.font="500 20px Arial";
 x.fillText(content==="achievement"?"Achievement = penjualan ÷ target. Gap minimum Rp0. Tanpa target ditampilkan —.":"Pengejaran mengikuti sisa hari bulan ini. Target bulanan dan pencapaian periode lalu tetap.",p,foot);
 if(data.warnings.length)x.fillText(`Ada ${data.warnings.length} catatan data. Periksa catatan pada dashboard sebelum membagikan.`,p,foot+38);
 return new Promise<Blob>((resolve,reject)=>c.toBlob(blob=>blob?resolve(blob):reject(Error("Gambar gagal dibuat.")),"image/png"));
}
