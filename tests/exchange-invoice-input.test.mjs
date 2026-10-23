import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import React from 'react';
import {act,create} from 'react-test-renderer';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(path,mocks={}){const code=ts.transpileModule(fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;const loaded={exports:{}};new Function('require','module','exports',code)(id=>mocks[id]??require(id),loaded,loaded.exports);return loaded.exports}
const shared=load('components/exchange-invoice-input.tsx'),Input=shared.default;
const stub={default:()=>null};
const mocks={'@/components/exchange-invoice-input':shared,'@/components/spw-store-select':{SpwStoreSelect:()=>null},'@/components/copas-invoice-check':stub,'react-dom':{createPortal:children=>children}};
const Desktop=load('components/m238-data-actions.tsx',mocks).DailySalesDataActions;
const DataPage=load('app/data-tools/page.tsx',mocks).default;
const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.children?text(node.children):'';
const button=(view,label)=>view.root.findAllByType('button').find(node=>text(node).includes(label));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
for(const [name,Component] of [['Daily Sales modal',Desktop],['Data Upload page',DataPage]]){
 test(`${name} saves a pending exchange invoice from one input with no invoice search request`,async()=>{
  const originalFetch=globalThis.fetch,originalDocument=globalThis.document,originalWindow=globalThis.window,calls=[];let view;
  globalThis.document={body:{}};globalThis.window={dispatchEvent:()=>true};
  globalThis.fetch=async(url,options)=>{calls.push({url,method:options.method,body:JSON.parse(options.body)});return{ok:true,json:async()=>({added:true,noExchange:'100051953',message:'Nomor berhasil disimpan.'})}};
  try{
   await act(async()=>{view=create(React.createElement(Component,{onChanged:()=>{}}))});
   if(name==='Daily Sales modal'){await act(async()=>button(view,'Kelola Data').props.onClick());await act(async()=>button(view,'No Exchange Invoice').props.onClick())}
   assert.equal(button(view,'Cari Invoice'),undefined);
   const form=view.root.findByProps({'aria-label':'Input nomor invoice exchange'});assert.equal(form.findAllByType('input').length,1);
   await act(async()=>form.findByType('input').props.onChange({target:{value:'100051953'}}));
   await act(async()=>{form.props.onSubmit({preventDefault(){}});await tick()});
   assert.deepEqual(calls,[{url:'/api/data-upload-ops',method:'POST',body:{action:'exchange',noExchange:'100051953'}}]);
   assert.equal(view.root.findByProps({'aria-label':'Input nomor invoice exchange'}).findByType('input').props.value,'');
   assert.ok(text(view.toJSON()).includes('Nomor berhasil disimpan.'));
  }finally{if(view)await act(async()=>view.unmount());globalThis.fetch=originalFetch;globalThis.document=originalDocument;globalThis.window=originalWindow}
 });
}

test('failed save keeps the pending invoice and double tapping submits only once',async()=>{
 const originalFetch=globalThis.fetch,busy=[];let view,finish,calls=0;
 globalThis.fetch=()=>{calls++;return new Promise(resolve=>{finish=resolve})};
 try{
  await act(async()=>{view=create(React.createElement(Input,{onBusyChange:value=>busy.push(value)}))});
  assert.equal(button(view,'Simpan No Exchange').props.disabled,true);
  await act(async()=>view.root.findByType('input').props.onChange({target:{value:'00100051953'}}));
  await act(async()=>{view.root.findByType('form').props.onSubmit({preventDefault(){}});view.root.findByType('form').props.onSubmit({preventDefault(){}});await tick()});
  assert.equal(calls,1);assert.equal(view.root.findByType('input').props.disabled,true);
  await act(async()=>{finish({ok:false,json:async()=>({error:'Koneksi gagal.'})});await tick()});
  assert.equal(view.root.findByType('input').props.value,'00100051953');assert.equal(button(view,'Simpan No Exchange').props.disabled,false);assert.deepEqual(busy,[true,false]);
  assert.ok(text(view.toJSON()).includes('Koneksi gagal.'));
 }finally{if(view)await act(async()=>view.unmount());globalThis.fetch=originalFetch}
});
