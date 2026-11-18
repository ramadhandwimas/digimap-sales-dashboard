"use client";
import {useEffect,useRef,useState} from "react";

export default function PriceTicketPdfPreview({src,title}:{src:string;title:string}){
 const canvasRef=useRef<HTMLCanvasElement>(null),[error,setError]=useState("");
 useEffect(()=>{let stopped=false,task:{destroy:()=>Promise<void>;promise:Promise<any>}|null=null;(async()=>{try{
  setError("");const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs"),base=`/pdf-assets/${pdfjs.version}/`;
  pdfjs.GlobalWorkerOptions.workerSrc=`${base}pdf.worker.min.mjs`;
  const response=await fetch(src,{cache:"no-store"});if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||"Preview PDF gagal dimuat.")}
  task=pdfjs.getDocument({data:new Uint8Array(await response.arrayBuffer()),cMapUrl:`${base}cmaps/`,cMapPacked:true,standardFontDataUrl:`${base}standard_fonts/`,wasmUrl:`${base}wasm/`,iccUrl:`${base}iccs/`,enableXfa:false,stopAtErrors:true});
  const pdfDocument=await task.promise,page=await pdfDocument.getPage(1),viewport=page.getViewport({scale:1.8}),canvas=canvasRef.current;if(stopped||!canvas)return;
  const source=window.document.createElement("canvas"),sourceContext=source.getContext("2d");if(!sourceContext)throw new Error("Canvas preview tidak tersedia.");
  source.width=Math.round(viewport.width);source.height=Math.round(viewport.height);
  await page.render({canvas:source,canvasContext:sourceContext,viewport}).promise;
  // Seluruh master memakai halaman A4 yang sama, sedangkan object ticket berada
  // pada area atas. Preview hanya memfokuskan object; PDF cetak tetap halaman asli.
  const crop={x:Math.round(source.width*.045),y:Math.round(source.height*.04),width:Math.round(source.width*.91),height:Math.round(source.height*.52)};
  canvas.width=crop.width;canvas.height=crop.height;const context=canvas.getContext("2d");if(!context)throw new Error("Canvas preview tidak tersedia.");
  context.drawImage(source,crop.x,crop.y,crop.width,crop.height,0,0,crop.width,crop.height);
 }catch(reason){if(!stopped)setError(reason instanceof Error?reason.message:"Preview PDF gagal dimuat.")}})();return()=>{stopped=true;void task?.destroy()}},[src]);
 return <div aria-label={`Preview ${title}`}>{error?<p>{error}</p>:null}<canvas ref={canvasRef}/></div>
}
