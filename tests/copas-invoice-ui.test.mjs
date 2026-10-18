import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import React from 'react';
import {act,create} from 'react-test-renderer';
import ts from 'typescript';
const require=createRequire(import.meta.url),source=fs.readFileSync(new URL('../components/copas-invoice-check.tsx',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,loaded={exports:{}};
new Function('require','module','exports',code)(require,loaded,loaded.exports);const InvoiceCheck=loaded.exports.default;
const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.children?text(node.children):'';
const button=(view,label)=>view.root.findAllByType('button').find(node=>text(node).includes(label));
const items=[{id:'first',row:2,date:'2026-10-18',staff:'Alice',invoice:'10005011',article:'APP001',description:'iPhone',qty:1,amount:20000000,store:'M238'},{id:'second',row:3,date:'2026-10-17',staff:'Bob',invoice:'10005011',article:'APP002',description:'iPhone Pro',qty:2,amount:40000000,store:'M996'}];
const result={planId:'reviewed-plan',groups:[{invoice:'10005011',sourceRows:[2,3],found:true,items,totalQty:3,totalAmount:60000000},{invoice:'10005099',sourceRows:[4],found:false,items:[],totalQty:0,totalAmount:0}],sourceInvoiceCount:2,foundInvoiceCount:1,notFoundInvoiceCount:1,totalRows:2,totalQty:3,totalAmount:60000000};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
test('one check reads the Y-driven list without manual invoice input, shows both statuses, and deletes only reviewed selections',async()=>{
 const originalFetch=globalThis.fetch,originalWindow=globalThis.window,calls=[],busy=[],confirmations=[];let view,approved=false,deleted=false;
 globalThis.window={confirm:message=>{confirmations.push(message);return approved}};
 globalThis.fetch=async(_url,options)=>{
  const body=JSON.parse(options.body);calls.push(body);
  if(body.action==='delete'){deleted=true;return{ok:true,json:async()=>({message:'1 baris dihapus.'})}}
  return{ok:true,json:async()=>deleted?{...result,planId:'fresh-plan',totalRows:1,groups:[{...result.groups[0],items:[items[1]],totalQty:2,totalAmount:40000000},result.groups[1]]}:result};
 };
 try{
  await act(async()=>{view=create(React.createElement(InvoiceCheck,{onBusyChange:value=>busy.push(value)}))});
  assert.equal(view.root.findAllByType('input').length,0);assert.ok(text(view.toJSON()).includes('RAW SalesPerson kolom Y'));
  await act(async()=>{button(view,'Cek Invoice dari Kolom Y').props.onClick();await tick()});
  assert.deepEqual(calls[0],{action:'check'});assert.ok(text(view.toJSON()).includes('Tidak ada di Data Copas'));assert.ok(text(view.toJSON()).includes('10005099'));assert.ok(text(view.toJSON()).includes('M996'));
  assert.equal(button(view,'Hapus').props.disabled,true);
  await act(async()=>view.root.findByProps({'aria-label':'Pilih baris 2'}).props.onChange({target:{checked:true}}));
  await act(async()=>button(view,'Hapus').props.onClick());assert.equal(calls.length,1);assert.equal(confirmations.length,1);
  approved=true;await act(async()=>view.root.findByProps({'aria-label':'Alasan penghapusan'}).props.onChange({target:{value:'cancel'}}));
  await act(async()=>{button(view,'Hapus').props.onClick();await tick()});
  assert.deepEqual(calls[1],{action:'delete',planId:'reviewed-plan',selectedIds:['first'],reason:'cancel'});assert.deepEqual(calls[2],{action:'check'});
  assert.ok(text(view.toJSON()).includes('1 baris dihapus.'));assert.equal(button(view,'Hapus').props.disabled,true);assert.equal(view.root.findAllByProps({'aria-label':'Pilih baris 2'}).length,0);assert.deepEqual(busy,[true,false,true,false]);
 }finally{if(view)await act(async()=>view.unmount());globalThis.fetch=originalFetch;globalThis.window=originalWindow}
});
test('when source Y changes, stale deletion results require checking the list again',async()=>{
 const originalFetch=globalThis.fetch,originalWindow=globalThis.window;let view;
 globalThis.window={confirm:()=>true};globalThis.fetch=async(_url,options)=>JSON.parse(options.body).action==='check'?{ok:true,json:async()=>result}:{ok:false,status:409,json:async()=>({error:'Kolom Y berubah. Cek ulang.'})};
 try{
  await act(async()=>{view=create(React.createElement(InvoiceCheck))});
  await act(async()=>{button(view,'Cek Invoice dari Kolom Y').props.onClick();await tick()});
  await act(async()=>view.root.findByProps({'aria-label':'Pilih baris 2'}).props.onChange({target:{checked:true}}));
  await act(async()=>{button(view,'Hapus').props.onClick();await tick()});
  assert.equal(button(view,'Hapus'),undefined);assert.ok(text(view.toJSON()).includes('Kolom Y berubah. Cek ulang.'));
 }finally{if(view)await act(async()=>view.unmount());globalThis.fetch=originalFetch;globalThis.window=originalWindow}
});
test('empty column Y reports no exchange invoices and never offers deletion',async()=>{
 const originalFetch=globalThis.fetch;let view;
 globalThis.fetch=async()=>({ok:true,json:async()=>({...result,groups:[],sourceInvoiceCount:0,foundInvoiceCount:0,notFoundInvoiceCount:0,totalRows:0})});
 try{
  await act(async()=>{view=create(React.createElement(InvoiceCheck))});
  await act(async()=>{button(view,'Cek Invoice dari Kolom Y').props.onClick();await tick()});
  assert.ok(text(view.toJSON()).includes('Belum ada nomor invoice di RAW SalesPerson kolom Y.'));assert.equal(button(view,'Hapus'),undefined);
 }finally{if(view)await act(async()=>view.unmount());globalThis.fetch=originalFetch}
});
