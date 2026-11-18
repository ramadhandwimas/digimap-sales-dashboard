"use client";
import {useEffect,useRef,useState} from "react";

export default function PriceTicketPdfPreview({src,title}:{src:string;title:string}){
 const canvasRef=useRef<HTMLCanvasElement>(null),[error,setError]=useState("");
 useEffect(()=>{let stopped=false,task:{destroy:()=>Promise<void>;promise:Promise<any>}|null=null;(async()=>{try{
  setError("");const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs"),base=`/pdf-assets/${pdfjs.version}/`;
  pdfjs.GlobalWorkerOptions.workerSrc=`${base}pdf.worker.min.mjs`;
  const response=await fetch(src,{cache:"no-store"});if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||"Preview PDF gagal dimuat.")}
  task=pdfjs.getDocument({data:new Uint8Array(await response.arrayBuffer()),cMapUrl:`${base}cmaps/`,cMapPacked:true,standardFontDataUrl:`${base}standard_fonts/`,wasmUrl:`${base}wasm/`,iccUrl:`${base}iccs/`,enableXfa:false,stopAtErrors:true});
  const document=await task.promise,page=await document.getPage(1),viewport=page.getViewport({scale:1.65}),canvas=canvasRef.current;if(stopped||!canvas)return;
  canvas.width=Math.round(viewport.width);canvas.height=Math.round(viewport.height);const context=canvas.getContext("2d");if(!context)throw new Error("Canvas preview tidak tersedia.");
  await page.render({canvas,canvasContext:context,viewport}).promise;
 }catch(reason){if(!stopped)setError(reason instanceof Error?reason.message:"Preview PDF gagal dimuat.")}})();return()=>{stopped=true;void task?.destroy()}},[src]);
 return <div aria-label={`Preview ${title}`}>{error?<p>{error}</p>:null}<canvas ref={canvasRef}/></div>
}
