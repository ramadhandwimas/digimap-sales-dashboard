import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import React from 'react';
import {act,create} from 'react-test-renderer';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(path,mocks={}){const code=ts.transpileModule(fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,loaded={exports:{}};new Function('require','module','exports',code)(id=>mocks[id]??require(id),loaded,loaded.exports);return loaded.exports}
const SpwStoreSelect=load('components/spw-store-select.tsx');
const {DailySalesDataActions:Daily,SohDataActions:Soh}=load('components/m238-data-actions.tsx',{'@/components/exchange-invoice-input':{default:()=>null},'@/components/copas-invoice-check':{default:()=>null},'@/components/spw-store-select':SpwStoreSelect});
const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.children?text(node.children):'';
const button=(view,label)=>view.root.findAllByType('button').find(node=>text(node).includes(label));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const response=body=>({ok:true,json:async()=>body});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;

test('embedded Cut Off uses a reviewed plan, locks inputs, and clears the plan when its date changes',async()=>{
 const originalFetch=globalThis.fetch,originalWindow=globalThis.window,calls=[],busy=[];let view,finish,changed=0;
 globalThis.window={dispatchEvent:()=>true};
 globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);calls.push({url,body});if(body.dryRun){await new Promise(resolve=>{finish=resolve});return response({planId:'plan',newCount:1,isBalanced:true,bulkSales:[],bulkSalesCount:0})}return response({rows:1})};
 try{
  await act(async()=>{view=create(React.createElement(Daily,{tool:'cutoff',onChanged:()=>{changed++},onBusyChange:v=>busy.push(v)}))});
  assert.equal(view.root.findAllByProps({role:'dialog'}).length,0);assert.equal(button(view,'Kelola Data'),undefined);
  await act(async()=>{button(view,'Cek Data Terlebih Dahulu').props.onClick();button(view,'Cek Data Terlebih Dahulu').props.onClick();await tick()});
  assert.equal(calls.length,1);assert.equal(view.root.findByProps({'aria-label':'Tanggal atau bulan Cut Off'}).props.disabled,true);
  await act(async()=>{finish();await tick()});assert.equal(button(view,'Konfirmasi Cut Off').props.disabled,false);
  await act(async()=>view.root.findByProps({'aria-label':'Tanggal atau bulan Cut Off'}).props.onChange({target:{value:'2026-10-01'}}));assert.equal(button(view,'Konfirmasi Cut Off'),undefined);
  await act(async()=>{button(view,'Cek Data Terlebih Dahulu').props.onClick();await tick()});await act(async()=>{finish();await tick()});
  await act(async()=>{button(view,'Konfirmasi Cut Off').props.onClick();await tick()});
  assert.deepEqual(calls.at(-1),{url:'/api/data-upload-ops',body:{action:'cutoff',mode:'date',value:'2026-10-01',planId:'plan'}});assert.equal(changed,1);assert.equal(busy[0],false);assert.equal(busy.at(-1),false);assert.ok(busy.includes(true));
 }finally{if(view)await act(async()=>view.unmount());globalThis.fetch=originalFetch;globalThis.window=originalWindow}
});

for(const [Component,tool] of [[Daily,'spw-clear'],[Soh,'soh-clear']])test(`${tool} remains inline, requires passcode and confirmation, and submits once`,async()=>{
 const originalFetch=globalThis.fetch,originalConfirm=globalThis.confirm,originalWindow=globalThis.window,calls=[];let view,approved=false,finish;
 globalThis.window={dispatchEvent:()=>true};globalThis.confirm=()=>approved;globalThis.fetch=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});await new Promise(resolve=>{finish=resolve});return response({message:'Selesai'})};
 try{
  await act(async()=>{view=create(React.createElement(Component,{tool,onChanged:()=>{}}))});
  assert.equal(view.root.findAllByProps({role:'dialog'}).length,0);assert.equal(button(view,'Ya, Clear').props.disabled,true);
  await act(async()=>view.root.findByProps({'aria-label':'Passcode Admin'}).props.onChange({target:{value:'test-passcode'}}));
  await act(async()=>button(view,'Ya, Clear').props.onClick());assert.equal(calls.length,0);
  approved=true;await act(async()=>{button(view,'Ya, Clear').props.onClick();button(view,'Ya, Clear').props.onClick();await tick()});
  assert.deepEqual(calls,[{url:'/api/data-tools',body:{action:tool==='spw-clear'?'clear-spw':'clear-soh',passcode:'test-passcode'}}]);assert.equal(view.root.findByType('input').props.disabled,true);
  await act(async()=>{finish();await tick()});assert.ok(text(view.toJSON()).includes('Selesai'));
 }finally{if(view)await act(async()=>view.unmount());globalThis.fetch=originalFetch;globalThis.confirm=originalConfirm;globalThis.window=originalWindow}
});

test('embedded SPW upload retains M238/M996 choices and sends the selected source store',async()=>{
 const originalFetch=globalThis.fetch,originalWindow=globalThis.window,calls=[];let view;
 globalThis.window={setTimeout,dispatchEvent:()=>true};globalThis.fetch=async(url,options)=>{calls.push({url,store:options.body.get('store'),file:options.body.get('file').name});return response({fast:{ok:true},combinedAmount:50,sources:[]})};
 const fileInput={files:[new File(['mock'],'m996.xlsx')],value:'m996.xlsx'};
 try{
  await act(async()=>{view=create(React.createElement(Daily,{tool:'spw-upload',onChanged:()=>{}}),{createNodeMock:element=>element.type==='input'?fileInput:null})});
  assert.deepEqual(view.root.findAllByType('option').map(node=>node.props.value),['M238','M996']);
  await act(async()=>view.root.findByType('select').props.onChange({target:{value:'M996'}}));
  await act(async()=>{button(view,'Upload SPW M996').props.onClick();await tick()});
  assert.deepEqual(calls,[{url:'/api/upload-spw',store:'M996',file:'m996.xlsx'}]);assert.equal(fileInput.value,'');
 }finally{if(view)await act(async()=>view.unmount());globalThis.fetch=originalFetch;globalThis.window=originalWindow}
});
