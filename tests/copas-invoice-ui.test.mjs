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
const result={invoice:'10005011',planId:'reviewed-plan',items:[{id:'first',row:2,date:'2026-10-18',staff:'Alice',invoice:'10005011',article:'APP001',description:'iPhone',qty:1,amount:20000000,store:'M238'},{id:'second',row:3,date:'2026-10-17',staff:'Bob',invoice:'10005011',article:'APP002',description:'iPhone Pro',qty:2,amount:40000000,store:'M996'}],totalQty:3,totalAmount:60000000};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
test('invoice UI reviews exact search results, requires selected rows and confirmation, and submits only selected IDs',async()=>{
 const originalFetch=globalThis.fetch,originalWindow=globalThis.window,calls=[],busy=[],confirmations=[];let view,approved=false;
 globalThis.window={confirm:message=>{confirmations.push(message);return approved}};
 globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);calls.push(body);return{ok:true,json:async()=>body.action==='search'?result:{message:'1 baris dihapus.'}}};
 try{
  await act(async()=>{view=create(React.createElement(InvoiceCheck,{onBusyChange:value=>busy.push(value)}))});
  await act(async()=>view.root.findByType('input').props.onChange({target:{value:'10005011'}}));
  await act(async()=>{view.root.findByType('form').props.onSubmit({preventDefault(){}});await tick()});
  assert.ok(text(view.toJSON()).includes('M996'));assert.ok(text(view.toJSON()).includes('2026-10-17'));
  assert.equal(button(view,'Hapus').props.disabled,true);
  await act(async()=>view.root.findByProps({'aria-label':'Pilih baris 2'}).props.onChange({target:{checked:true}}));
  await act(async()=>button(view,'Hapus').props.onClick());assert.equal(calls.length,1);assert.equal(confirmations.length,1);
  approved=true;
  await act(async()=>view.root.findByProps({'aria-label':'Alasan penghapusan'}).props.onChange({target:{value:'cancel'}}));
  await act(async()=>{button(view,'Hapus').props.onClick();await tick()});
  assert.deepEqual(calls[1],{action:'delete',invoice:'10005011',planId:'reviewed-plan',selectedIds:['first'],reason:'cancel'});
  assert.ok(text(view.toJSON()).includes('1 baris dihapus.'));assert.equal(button(view,'Hapus'),undefined);assert.deepEqual(busy,[true,false,true,false]);
 }finally{if(view)await act(async()=>view.unmount());globalThis.fetch=originalFetch;globalThis.window=originalWindow}
});
test('a changed query clears the reviewed selection and a stale plan requires a fresh search',async()=>{
 const originalFetch=globalThis.fetch,originalWindow=globalThis.window;let view;
 globalThis.window={confirm:()=>true};globalThis.fetch=async(_url,options)=>JSON.parse(options.body).action==='search'?{ok:true,json:async()=>result}:{ok:false,status:409,json:async()=>({error:'Cari ulang invoice.'})};
 try{
  await act(async()=>{view=create(React.createElement(InvoiceCheck))});
  const search=async()=>{await act(async()=>{view.root.findByType('form').props.onSubmit({preventDefault(){}});await tick()})};
  await act(async()=>view.root.findByType('input').props.onChange({target:{value:'10005011'}}));await search();
  await act(async()=>view.root.findByProps({'aria-label':'Pilih baris 2'}).props.onChange({target:{checked:true}}));
  await act(async()=>view.root.findAllByType('input').find(node=>node.props.type!=='checkbox').props.onChange({target:{value:'10005012'}}));assert.equal(button(view,'Hapus'),undefined);
  await search();await act(async()=>view.root.findByProps({'aria-label':'Pilih baris 2'}).props.onChange({target:{checked:true}}));
  await act(async()=>{button(view,'Hapus').props.onClick();await tick()});
  assert.equal(button(view,'Hapus'),undefined);assert.ok(text(view.toJSON()).includes('Cari ulang invoice.'));
 }finally{if(view)await act(async()=>view.unmount());globalThis.fetch=originalFetch;globalThis.window=originalWindow}
});
