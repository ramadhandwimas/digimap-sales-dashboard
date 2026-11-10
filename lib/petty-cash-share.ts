type FileSharing=Pick<Navigator,"canShare"|"share">;
const months=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
export function pettyCashFilename(submissionDate:string,now=new Date()){
 const date=submissionDate||new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error("Tanggal pengajuan tidak valid.");
 const year=Number(date.slice(0,4)),month=Number(date.slice(5,7));
 return `PC M238 ${months[(month+10)%12]} ${month===1?year-1:year}.pdf`;
}
export async function sharePettyCashFile(file:File,platform:FileSharing=navigator):Promise<"shared"|"cancelled"|"unsupported">{
 const data={files:[file],title:file.name};
 if(!platform.share||!platform.canShare?.({files:data.files}))return "unsupported";
 // Call before any await: iOS requires the original button-tap activation.
 try{await platform.share(data);return "shared"}catch(error){if(error instanceof Error&&error.name==="AbortError")return "cancelled";throw error}
}
