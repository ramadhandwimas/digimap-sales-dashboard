import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import React from 'react';
import {act,create} from 'react-test-renderer';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const source=fs.readFileSync(new URL('../components/responsive-dashboard-entry.tsx',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,loaded={exports:{}};
const mocks={'next/dynamic':{default:loader=>props=>React.createElement(loader.toString().includes('mobile-dashboard-app')?'mobile-dashboard':'desktop-dashboard',props)},'@/components/mobile-promo-panel':{default:()=>null},'@/components/m238-promo-board-navigation':{default:()=>null}};
new Function('require','module','exports',code)(id=>mocks[id]?{__esModule:true,...mocks[id]}:require(id),loaded,loaded.exports);const Entry=loaded.exports.default;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
function browser(mobile=true,saved=null){
 const original={window:globalThis.window,localStorage:globalThis.localStorage,document:globalThis.document},events=new EventTarget(),mediaEvents=new EventTarget(),values=new Map(saved?[['m238-mobile-view',saved]]:[]),focus=[];
 const media={matches:mobile,addEventListener:(...args)=>mediaEvents.addEventListener(...args),removeEventListener:(...args)=>mediaEvents.removeEventListener(...args)};
 globalThis.window={matchMedia:()=>media,addEventListener:(...args)=>events.addEventListener(...args),removeEventListener:(...args)=>events.removeEventListener(...args),dispatchEvent:event=>events.dispatchEvent(event),scrollTo:()=>{}};
 globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 globalThis.document={getElementById:id=>({focus:()=>focus.push(id)})};
 return{values,media,focus,resize:()=>mediaEvents.dispatchEvent(new Event('change')),restore:()=>Object.assign(globalThis,original)};
}

test('mobile pages have no global version tabs; Settings events still switch and persist the selected version',async()=>{
 const browserState=browser();let view;
 try{
  await act(async()=>{view=create(React.createElement(Entry))});
  assert.equal(view.root.findAllByProps({role:'tablist'}).length,0);assert.equal(view.root.findAllByType('button').length,0);assert.equal(view.root.findAllByType('mobile-dashboard').length,1);
  await act(async()=>window.dispatchEvent(new CustomEvent('m238:mobile-view-change',{detail:'classic'})));
  assert.equal(browserState.values.get('m238-mobile-view'),'classic');assert.equal(view.root.findAllByType('desktop-dashboard').length,1);assert.equal(view.root.findAllByType('button').length,0);
  await act(async()=>window.dispatchEvent(new CustomEvent('m238:mobile-view-change',{detail:'new'})));assert.equal(view.root.findAllByType('mobile-dashboard').length,1);
 }finally{if(view)await act(async()=>view.unmount());browserState.restore()}
});
test('saved classic choice is restored and desktop screens keep the existing dashboard',async()=>{
 const browserState=browser(true,'classic');let view;
 try{
  await act(async()=>{view=create(React.createElement(Entry))});assert.equal(view.root.findAllByType('desktop-dashboard').length,1);
  browserState.media.matches=false;await act(async()=>browserState.resize());assert.equal(view.root.findAllByType('desktop-dashboard').length,1);assert.equal(view.root.findAllByType('button').length,0);
 }finally{if(view)await act(async()=>view.unmount());browserState.restore()}
});
const switchCode=ts.transpileModule(fs.readFileSync(new URL('../components/mobile-version-switch.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,switchModule={exports:{}};
new Function('require','module','exports',switchCode)(require,switchModule,switchModule.exports);const Switch=switchModule.exports.default;
test('compact Settings controls work in either version and respect the disabled state',async()=>{
 const browserState=browser(),events=[];let view;
 window.addEventListener('m238:mobile-view-change',event=>events.push(event.detail));
 try{
  await act(async()=>{view=create(React.createElement(Switch,{value:'new'}))});
  assert.equal(view.root.findAllByType('button')[0].props['aria-pressed'],true);
  await act(async()=>view.root.findAllByType('button')[1].props.onClick());assert.deepEqual(events,['classic']);
  await act(async()=>view.update(React.createElement(Switch,{value:'classic',disabled:true})));
  await act(async()=>view.root.findAllByType('button')[0].props.onClick());assert.deepEqual(events,['classic']);
  await act(async()=>view.update(React.createElement(Switch,{value:'classic'})));
  await act(async()=>view.root.findAllByType('button')[0].props.onClick());assert.deepEqual(events,['classic','new']);
 }finally{if(view)await act(async()=>view.unmount());browserState.restore()}
});
