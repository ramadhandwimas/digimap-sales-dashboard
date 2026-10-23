import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import React from 'react';
import {act,create} from 'react-test-renderer';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(file,mocks={}){const code=ts.transpileModule(fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;const loaded={exports:{}};new Function('require','module','exports',code)(id=>mocks[id]?{__esModule:true,...mocks[id]}:require(id),loaded,loaded.exports);return loaded.exports.default}
const stub=()=>null;
const Uploader=load('components/accessory-pricelist-upload.tsx',{'@/components/data-copas-repair':{default:props=>React.createElement('copas-check',props)},'@/components/accessory-master-repair':{default:stub}});
const More=load('components/mobile-dashboard-more.tsx',{'next/dynamic':{default:()=>props=>React.createElement('tool-page',props)},'@/components/stock-request-md':{default:stub},'@/components/mobile-version-switch':{default:load('components/mobile-version-switch.tsx')}});
const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.children?text(node.children):'';
const button=(view,label)=>view.root.findAllByType('button').find(node=>text(node).includes(label));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const values=new Map();
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
const browserEvents=new EventTarget();
globalThis.window={scrollTo:()=>{},addEventListener:(...args)=>browserEvents.addEventListener(...args),removeEventListener:(...args)=>browserEvents.removeEventListener(...args),dispatchEvent:event=>browserEvents.dispatchEvent(event)};
const preview={total:1,newCount:1,deviceCount:1,accessoryCount:0,vasCount:0,existing:0,duplicates:0,ignored:0,reviewCount:0,preview:[['APPLE','APP18','iPhone 18','IPHONE','IPHONE 18','DEVICES','APPLE']],review:[],planId:'plan-1'};
const response=(body,ok=true)=>({ok,json:async()=>body});

test('Settings opens independent tool pages, locks back while working, and groups appearance controls',async()=>{
 const changes=[],busy=[];let view;
 await act(async()=>{view=create(React.createElement(More,{theme:'classic',motion:'smooth',motionStyle:'clean',font:'system',onTheme:v=>changes.push(v),onMotion:()=>{},onMotionStyle:()=>{},onFont:()=>{},onAction:()=>{},onBusyChange:v=>busy.push(v)}))});
 assert.ok(button(view,'Versi Lama'));
 await act(async()=>button(view,'Settings').props.onClick());
 assert.equal(view.root.findAllByType('h1')[0].children.join(''),'Settings');
 assert.equal(view.root.findAllByType('tool-page').length,0);
 await act(async()=>button(view,'Pricelist Device').props.onClick());
 assert.equal(view.root.findByType('tool-page').props.kind,'device');
 assert.ok(!view.root.findByProps({className:'m238-settings m238-settings-tool'}).props.className.includes('m238m-more'));
 await act(async()=>view.root.findByType('tool-page').props.onBusyChange(true));
 assert.equal(view.root.findByProps({'aria-label':'Kembali ke Settings'}).props.disabled,true);
 await act(async()=>view.root.findByType('tool-page').props.onBusyChange(false));
 await act(async()=>view.root.findByProps({'aria-label':'Kembali ke Settings'}).props.onClick());
 await act(async()=>button(view,'Tampilan').props.onClick());
 assert.equal(view.root.findAllByType('h1')[0].children.join(''),'Tampilan');
 await act(async()=>button(view,'Midnight Pro').props.onClick());
 assert.deepEqual(changes,['midnight']);assert.deepEqual(busy,[true,false]);
 assert.ok(view.root.findAllByType('summary').some(n=>text(n)==='Pengaturan animasi lanjutan'));
 await act(async()=>view.unmount());
});

test('upload keeps file and preview on failure, requires a fresh check, and records successful import',async()=>{
 values.clear();const originalFetch=globalThis.fetch,busy=[],calls=[];let view;
 globalThis.fetch=async(url,options)=>{calls.push({url,mode:options.body.get('mode'),file:options.body.get('file').name});return response(preview)};
 try{
  await act(async()=>{view=create(React.createElement(Uploader,{kind:'device',onBusyChange:v=>busy.push(v)}))});
  const file=new File(['fake Excel'],'device.xlsx');
  await act(async()=>view.root.findByType('input').props.onChange({target:{files:[file]}}));
  await act(async()=>{button(view,'Cek Pricelist').props.onClick();await tick()});
  assert.ok(button(view,'Tambahkan 1 Produk'));assert.ok(view.root.findAllByType('details').some(node=>node.props.open===true));
  globalThis.fetch=async()=>{throw new Error('Koneksi terputus')};
  await act(async()=>{button(view,'Tambahkan 1 Produk').props.onClick();await tick()});
  assert.ok(text(view.toJSON()).includes('APP18'));assert.ok(text(view.toJSON()).includes('device.xlsx'));
  assert.equal(button(view,'Tambahkan 1 Produk').props.disabled,true);
  globalThis.fetch=async(_url,options)=>response(options.body.get('mode')==='preview'?preview:{...preview,imported:1,message:'1 produk berhasil ditambahkan'});
  await act(async()=>{button(view,'Cek Pricelist').props.onClick();await tick()});
  assert.equal(button(view,'Tambahkan 1 Produk').props.disabled,false);
  await act(async()=>{button(view,'Tambahkan 1 Produk').props.onClick();await tick()});
  assert.equal(button(view,'Tambahkan 1 Produk'),undefined);
  assert.equal(JSON.parse(values.get('m238-pricelist-import-device')).fileName,'device.xlsx');
  assert.ok(text(view.toJSON()).includes('Terakhir berhasil di perangkat ini'));
  assert.ok(busy.every((value,index)=>value===(index%2===0)));
  assert.equal(calls[0].url,'/api/upload-device-pricelist');
 }finally{globalThis.fetch=originalFetch;if(view)await act(async()=>view.unmount())}
});

test('double tapping check sends one request and busy controls unlock when it finishes',async()=>{
 const originalFetch=globalThis.fetch;let resolve,requests=0,view;
 globalThis.fetch=()=>{requests++;return new Promise(done=>{resolve=done})};
 try{
  await act(async()=>{view=create(React.createElement(Uploader))});
  await act(async()=>view.root.findByType('input').props.onChange({target:{files:[new File(['x'],'accessory.xlsx')]}}));
  const click=button(view,'Cek Pricelist').props.onClick;
  await act(async()=>{click();click()});
  assert.equal(requests,1);assert.equal(view.root.findByType('input').props.disabled,true);
  assert.ok(view.root.findByProps({role:'status'}));
  await act(async()=>{resolve(response(preview));await tick()});
  assert.equal(view.root.findByType('input').props.disabled,false);
 }finally{globalThis.fetch=originalFetch;if(view)await act(async()=>view.unmount())}
});

test('pricelist menus pass separate Device and Accessories/VAS scopes to the checker',async()=>{
 for(const [kind,scope] of [['device','device'],['accessory','accessory-vas']]){
  let view;await act(async()=>{view=create(React.createElement(Uploader,{kind}))});
  assert.equal(view.root.findByType('copas-check').props.scope,scope);
  await act(async()=>view.unmount());
 }
});

test('Settings exposes invoice exchange/cancel checking and blocks back navigation while it is running',async()=>{
 let view;await act(async()=>{view=create(React.createElement(More,{theme:'classic',motion:'smooth',motionStyle:'clean',font:'system',onTheme:()=>{},onMotion:()=>{},onMotionStyle:()=>{},onFont:()=>{},onAction:()=>{}}))});
 try{
  await act(async()=>button(view,'Settings').props.onClick());
  await act(async()=>button(view,'Cek Invoice Exchange/Cancel').props.onClick());
  assert.equal(view.root.findAllByType('h1')[0].children.join(''),'Cek Invoice Exchange/Cancel');
  await act(async()=>view.root.findByType('tool-page').props.onBusyChange(true));
  assert.equal(view.root.findByProps({'aria-label':'Kembali ke Settings'}).props.disabled,true);
  await act(async()=>view.root.findByType('tool-page').props.onBusyChange(false));
  assert.equal(view.root.findByProps({'aria-label':'Kembali ke Settings'}).props.disabled,false);
 }finally{await act(async()=>view.unmount())}
});


test('Settings groups all desktop data actions and opens each missing tool as a separate mobile page',async()=>{
 let view;const busy=[];
 await act(async()=>{view=create(React.createElement(More,{theme:'classic',motion:'smooth',motionStyle:'clean',font:'system',onTheme:()=>{},onMotion:()=>{},onMotionStyle:()=>{},onFont:()=>{},onAction:()=>{},onBusyChange:v=>busy.push(v)}))});
 try{
  await act(async()=>button(view,'Settings').props.onClick());
  assert.deepEqual(view.root.findAllByType('h2').map(node=>text(node)),['Data Penjualan','Data Master','Stok Toko','Preferensi','Admin']);
  for(const [label,tool] of [['Upload SPW','spw-upload'],['No Exchange Invoice',null],['Cut Off Data','cutoff'],['Clear SPW','spw-clear'],['Upload SOH','soh-upload'],['Clear SOH','soh-clear']]){
   await act(async()=>button(view,label).props.onClick());
   assert.equal(text(view.root.findByType('h1')),label);const page=view.root.findByType('tool-page');
   if(tool)assert.equal(page.props.tool,tool);
   await act(async()=>page.props.onBusyChange(true));assert.equal(view.root.findByProps({'aria-label':'Kembali ke Settings'}).props.disabled,true);
   await act(async()=>page.props.onBusyChange(false));await act(async()=>view.root.findByProps({'aria-label':'Kembali ke Settings'}).props.onClick());
  }
  assert.equal(busy.filter(Boolean).length,6);
 }finally{await act(async()=>view.unmount())}
});


test('compact version controls sit beside More heading and are absent from Settings and tool pages',async()=>{
 let view;await act(async()=>{view=create(React.createElement(More,{theme:'classic',motion:'smooth',motionStyle:'clean',font:'system',onTheme:()=>{},onMotion:()=>{},onMotionStyle:()=>{},onFont:()=>{},onAction:()=>{}}))});
 try{
  const heading=view.root.findByProps({className:'m238-more-heading'});assert.equal(heading.findAllByType('button').length,2);assert.equal(button(view,'Mobile').props['aria-pressed'],true);
  await act(async()=>button(view,'Settings').props.onClick());assert.equal(button(view,'Versi Lama'),undefined);assert.equal(button(view,'Mobile'),undefined);
  await act(async()=>button(view,'Pricelist Device').props.onClick());assert.equal(view.root.findAllByProps({className:'m238-settings-version'}).length,0);
 }finally{await act(async()=>view.unmount())}
});
