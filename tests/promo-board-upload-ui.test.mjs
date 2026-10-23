import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import React from 'react';
import {act,create} from 'react-test-renderer';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const source=fs.readFileSync(new URL('../components/promo-board-v9.tsx',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,module={exports:{}};
const mocks={'@/lib/promo-board-insights':{activePromoPrice:p=>p.promotionPrice},'@/lib/promo-board-catalog':{buildPromoCatalog:()=>[]},'@/components/promo-board-promo-list':{default:()=>null},'@/components/promo-board-accessories':{default:()=>null}};
new Function('require','module','exports',code)(id=>mocks[id]?{__esModule:true,...mocks[id]}:require(id),module,module.exports);const Board=module.exports.default;
const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.children?text(node.children):'';
const button=(view,label)=>view.root.findAllByType('button').find(node=>text(node).includes(label));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const response=(body,ok=true,status=200)=>({ok,status,json:async()=>body});
const preview={fileName:'device.xlsx',products:[],issues:[],blockingErrors:0,totalSku:8,totalRows:8,priceListDate:'2026-10-23',warnings:[]};
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
async function openUpload(view){await act(async()=>view.root.findByProps({'aria-label':'Manage Pricelist'}).props.onClick());await act(async()=>button(view,'Update Device Pricelist').props.onClick())}

test('Device update uses a visible native file input, sends one preview then activates the same file',async()=>{
 const originalFetch=globalThis.fetch,calls=[];let view,finish,active=null;
 globalThis.fetch=async(url,options={})=>{
  if(!options.method)return response(url==='/api/promo-board'?{active,history:[]}:{rows:[]});
  const mode=options.body.get('mode');calls.push({url,mode,file:options.body.get('file').name});
  if(mode==='preview'){await new Promise(resolve=>{finish=resolve});return response({preview,identicalToActive:false})}
  active=preview;return response({active,message:'Pricelist berhasil diaktifkan.'});
 };
 try{
  await act(async()=>{view=create(React.createElement(Board));await tick()});await openUpload(view);
  const input=view.root.findByProps({'aria-label':'Pilih file pricelist Device'});assert.notEqual(input.props.className,'hidden');
  const file=new File(['fake'],'device.xlsx');
  await act(async()=>{input.props.onChange({target:{files:[file]}});input.props.onChange({target:{files:[file]}});await tick()});
  assert.equal(calls.length,1);assert.ok(text(view.toJSON()).includes('Membaca dan memeriksa pricelist'));assert.equal(view.root.findAllByProps({role:'dialog'}).length,0);
  await act(async()=>{finish();await tick()});
  await act(async()=>{button(view,'Aktifkan').props.onClick();button(view,'Aktifkan').props.onClick();await tick()});
  assert.deepEqual(calls,[{url:'/api/promo-board',mode:'preview',file:'device.xlsx'},{url:'/api/promo-board',mode:'activate',file:'device.xlsx'}]);assert.ok(text(view.toJSON()).includes('Pricelist berhasil diaktifkan.'));
 }finally{if(view)await act(async()=>view.unmount());globalThis.fetch=originalFetch}
});

test('blocking upload preview exposes the SAP, row and exact reason instead of an unexplained disabled activate button',async()=>{
 const originalFetch=globalThis.fetch;let view;
 const blocked={...preview,blockingErrors:1,issues:[{severity:'BLOCKING',row:178,sapArticle:'APPDUO',productName:'iPhone Duo',reason:'SAP Article memiliki harga berbeda.',value:'Baris 178 berbeda dengan 179'}]};
 globalThis.fetch=async(url,options={})=>response(options.method?{preview:blocked}:{rows:[],active:null,history:[]});
 try{
  await act(async()=>{view=create(React.createElement(Board));await tick()});await openUpload(view);
  await act(async()=>{view.root.findByProps({'aria-label':'Pilih file pricelist Device'}).props.onChange({target:{files:[new File(['x'],'device.xlsx')]}});await tick()});
  assert.equal(button(view,'Periksa Data').props.disabled,true);assert.ok(text(view.toJSON()).includes('Baris 178 · APPDUO'));assert.ok(text(view.toJSON()).includes('SAP Article memiliki harga berbeda.'));
 }finally{if(view)await act(async()=>view.unmount());globalThis.fetch=originalFetch}
});

test('failed preview retains its selected file for retry and explains a non-JSON server error',async()=>{
 const originalFetch=globalThis.fetch;let view,posts=0;
 globalThis.fetch=async(url,options={})=>{if(!options.method)return response({active:null,history:[],rows:[]});posts++;return{ok:false,status:413,json:async()=>{throw new Error('HTML body')}}};
 try{
  await act(async()=>{view=create(React.createElement(Board));await tick()});await openUpload(view);
  await act(async()=>{view.root.findByProps({'aria-label':'Pilih file pricelist Device'}).props.onChange({target:{files:[new File(['x'],'retry.xlsx')]}});await tick()});
  assert.ok(text(view.toJSON()).includes('File terlalu besar. Maksimal 8 MB.'));assert.ok(text(view.toJSON()).includes('retry.xlsx'));
  await act(async()=>{button(view,'Coba periksa lagi').props.onClick();await tick()});assert.equal(posts,2);
 }finally{if(view)await act(async()=>view.unmount());globalThis.fetch=originalFetch}
});
