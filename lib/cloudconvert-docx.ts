import {createHash} from "node:crypto";

export class CloudConvertError extends Error{
  constructor(message:string,public status=502){super(message)}
}

type CloudConvertTask={
  name?:string;
  operation?:string;
  status?:string;
  message?:string|null;
  result?:{files?:Array<{filename?:string;url?:string}>}|null;
};

type CloudConvertResponse={
  data?:{status?:string;tasks?:CloudConvertTask[]};
  message?:string;
};

const cache=new Map<string,{expires:number;bytes:Buffer}>();
const CACHE_TTL=15*60*1000;

function failureMessage(body:CloudConvertResponse){
  const failed=body.data?.tasks?.find(task=>task.status==="error");
  return failed?.message||body.message||"CloudConvert gagal mengubah Word menjadi PDF.";
}

export async function convertDocxToPdf(bytes:Buffer,filename:string){
  const apiKey=process.env.CLOUDCONVERT_API_KEY;
  if(!apiKey)throw new CloudConvertError("Konverter Word ke PDF belum tersedia pada environment ini.",503);
  const hash=createHash("sha256").update(bytes).digest("hex"),now=Date.now(),hit=cache.get(hash);
  if(hit&&hit.expires>now)return hit.bytes;
  if(hit)cache.delete(hash);

  const response=await fetch("https://sync.api.cloudconvert.com/v2/jobs",{
    method:"POST",
    headers:{authorization:`Bearer ${apiKey}`,"content-type":"application/json"},
    body:JSON.stringify({
      tasks:{
        "import-word":{operation:"import/base64",file:bytes.toString("base64"),filename},
        "convert-word":{operation:"convert",input:"import-word",input_format:"docx",output_format:"pdf",optimize_print:true},
        "export-pdf":{operation:"export/url",input:"convert-word",inline:true},
      },
      tag:`m238-price-ticket-${hash.slice(0,12)}`,
    }),
    signal:AbortSignal.timeout(120_000),
  });
  const body=await response.json().catch(()=>({})) as CloudConvertResponse;
  if(!response.ok||body.data?.status!=="finished")throw new CloudConvertError(failureMessage(body),response.status>=400&&response.status<500?409:502);
  const url=body.data.tasks?.find(task=>task.operation==="export/url")?.result?.files?.[0]?.url;
  if(!url)throw new CloudConvertError("CloudConvert tidak mengembalikan file PDF.");
  const output=await fetch(url,{signal:AbortSignal.timeout(60_000)});
  if(!output.ok)throw new CloudConvertError("PDF hasil konversi tidak dapat diambil.");
  const pdf=Buffer.from(await output.arrayBuffer());
  if(pdf.subarray(0,5).toString()!=="%PDF-")throw new CloudConvertError("Hasil konversi bukan PDF yang valid.");
  cache.set(hash,{expires:now+CACHE_TTL,bytes:pdf});
  return pdf;
}
