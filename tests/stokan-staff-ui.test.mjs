import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import React from 'react';
import {act,create} from 'react-test-renderer';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(path,mocks={}){
 const code=ts.transpileModule(fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const loaded={exports:{}};new Function('require','module','exports',code)(id=>mocks[id]??require(id),loaded,loaded.exports);return loaded.exports;
}
const assignment=load('lib/stokan-assignment.ts'),picker=load('components/stokan-staff-picker.tsx');
const context=load('lib/stokan-context.ts');
const clock=load('components/use-stokan-clock.ts',{'@/lib/stokan-context':context});
const mocks={'@/components/use-stokan-clock':clock,'@/lib/stokan-assignment':assignment,'@/components/stokan-staff-picker':picker};
const Desktop=load('components/stokan-page.tsx',mocks).default;
const Mobile=load('components/mobile-operations.tsx',{...mocks,'@/lib/m238-client-cache':{cachedJson:async()=>({}),peekJsonCache:()=>null}}).default;
const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.children?text(node.children):'';
const button=(view,label)=>view.root.findAllByType('button').find(node=>text(node).includes(label));
const staff=['Alice','Bob','Carol'].map((name,i)=>({id:String(i+1),name,position:'Sales Assistant'}));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const rows=Array.from({length:5},(_,i)=>({rowNumber:i+2,no:String(i+1),stocker:staff[i%3].name,brand:'Brand',article:`SAP${i}`,description:'Description',serial:'SN',totalStock:i+1,stockDate:'2026-10-18',period:'Week 3 Q1',uploadID:'STK-20261018-ABC12345',uploadedAt:'2026-10-18T00:00:00Z'}));
const data=()=>({history:[],selected:{uploadID:rows[0].uploadID,period:'Week 3 Q1',stockDate:'2026-10-18',totalArticles:5,totalStock:15,totalStockers:3},rows:structuredClone(rows),staff,schemaValid:true,readBackValid:true});
const response=body=>({ok:true,json:async()=>body});

for(const [name,Component,props] of [['desktop',Desktop,{}],['mobile',Mobile,{kind:'stokan',period:'2026-10',periodMode:'month',selectedWeek:'',activeRange:null}]]){
 test(`${name}: saved Stokan can exclude a staff member, preview balanced assignments, and save only selected staff`,async()=>{
  const originalFetch=globalThis.fetch,calls=[],current=data();let view;
  globalThis.fetch=async(_url,options={})=>{
   if(options.method==='POST'){
    const body=JSON.parse(options.body);calls.push(body);
    current.rows=body.rows.map(row=>({...row}));current.selected.totalStockers=2;
    return response({ok:true,verified:true,uploadID:rows[0].uploadID});
   }
   return response(current);
  };
  try{
   await act(async()=>{view=create(React.createElement(Component,props));await tick()});
   assert.equal(view.root.findByProps({type:'date'}).props.value,context.currentStokanContext().stockDate);
   await act(async()=>button(view,'Atur Staff').props.onClick());
   const bob=view.root.findAllByType('label').find(node=>text(node).startsWith('Bob')).findByType('input');
   await act(async()=>bob.props.onChange({target:{checked:false}}));
   assert.ok(text(view.toJSON()).includes('2 dari 3 staff dipilih'));
   await act(async()=>button(view,'Proses & Bagi Otomatis').props.onClick());
   assert.ok(!text(view.toJSON()).includes('Bob'));
   assert.ok(text(view.toJSON()).includes('3 Artikel')||text(view.toJSON()).includes('3 artikel'));
   await act(async()=>{button(view,'Simpan Pembagian').props.onClick();await tick()});
   assert.equal(calls.length,1);assert.equal(calls[0].action,'reassign');
   assert.deepEqual(calls[0].selectedStaff,['Alice','Carol']);assert.equal(calls[0].rows.length,5);
   assert.ok(calls[0].rows.every(row=>row.stocker!=='Bob'));
   assert.deepEqual(calls[0].rows.map(row=>row.rowNumber),rows.map(row=>row.rowNumber));
   assert.deepEqual(calls[0].rows.map(row=>row.totalStock),rows.map(row=>row.totalStock));
  }finally{if(view)await act(async()=>view.unmount());globalThis.fetch=originalFetch}
 });
 test(`${name}: selecting no staff blocks processing and cancellation writes nothing`,async()=>{
  const originalFetch=globalThis.fetch,calls=[];let view;
  globalThis.fetch=async(_url,options={})=>{calls.push(options.method||'GET');return response(data())};
  try{
   await act(async()=>{view=create(React.createElement(Component,props));await tick()});
   assert.equal(view.root.findByProps({type:'date'}).props.value,context.currentStokanContext().stockDate);
   await act(async()=>button(view,'Atur Staff').props.onClick());
   await act(async()=>button(view,'Kosongkan pilihan').props.onClick());
   assert.equal(button(view,'Proses & Bagi Otomatis').props.disabled,true);
   await act(async()=>button(view,'Batal').props.onClick());
   assert.ok(button(view,'Atur Staff'));assert.deepEqual(calls,['GET']);
  }finally{if(view)await act(async()=>view.unmount());globalThis.fetch=originalFetch}
 });
 test(`${name}: a new upload distributes only to manually selected staff`,async()=>{
  const originalFetch=globalThis.fetch,calls=[];let view;
  const parsedRows=rows.map(({brand,article,description,serial,totalStock},i)=>({brand,article,description,serial,totalStock,sourceNo:String(i+1)}));
  globalThis.fetch=async(_url,options={})=>{
   if(options.body instanceof FormData)return response({rows:parsedRows,staff,valid:true,totalArticles:5,totalStock:15,distribution:{min:1,max:2}});
   if(options.method==='POST'){calls.push(JSON.parse(options.body));return response({ok:true,verified:true,uploadID:rows[0].uploadID})}
   return response(data());
  };
  try{
   await act(async()=>{view=create(React.createElement(Component,props));await tick()});
   await act(async()=>{view.root.findByProps({type:'file'}).props.onChange({target:{files:[new File(['fixture'],'stock.xlsx')]}});await tick()});
   await act(async()=>view.root.findAllByType('label').find(node=>text(node).startsWith('Bob')).findByType('input').props.onChange({target:{checked:false}}));
   await act(async()=>button(view,'Proses & Bagi Otomatis').props.onClick());
   await act(async()=>{button(view,'Simpan Pembagian').props.onClick();await tick()});
   assert.equal(calls[0].action,'commit');assert.equal(calls[0].stockDate,context.currentStokanContext().stockDate);assert.equal(calls[0].period,context.currentStokanContext().period);assert.deepEqual(calls[0].selectedStaff,['Alice','Carol']);
   assert.equal(calls[0].rows.length,5);assert.ok(calls[0].rows.every(row=>row.stocker!=='Bob'));
  }finally{if(view)await act(async()=>view.unmount());globalThis.fetch=originalFetch}
 });

}

test('an open Stokan screen advances its Jakarta date and week automatically at the week boundary',async()=>{
 let instant='2026-10-24T16:59:59Z',update;
 const timedClock=load('components/use-stokan-clock.ts',{'@/lib/stokan-context':{currentStokanContext:()=>context.currentStokanContext(new Date(instant))}});
 const originalInterval=globalThis.setInterval,originalClear=globalThis.clearInterval;
 globalThis.setInterval=fn=>{update=fn;return 123};globalThis.clearInterval=()=>{};
 function Clock(){const value=timedClock.useStokanClock();return React.createElement('span',null,`${value.stockDate} ${value.period}`)}
 let view;
 try{
  await act(async()=>{view=create(React.createElement(Clock))});
  assert.equal(text(view.toJSON()),'2026-10-24 Week 4 Q1');
  instant='2026-10-24T17:00:00Z';
  await act(async()=>update());
  assert.equal(text(view.toJSON()),'2026-10-25 Week 5 Q1');
 }finally{if(view)await act(async()=>view.unmount());globalThis.setInterval=originalInterval;globalThis.clearInterval=originalClear}
});
