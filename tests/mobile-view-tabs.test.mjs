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
const tab=(view,id)=>view.root.findByProps({id:`m238-view-tab-${id}`});
test('mobile version tabs switch in both directions, persist the choice, and support arrow-key navigation',async()=>{
 const browserState=browser();let view;
 try{
  await act(async()=>{view=create(React.createElement(Entry))});
  assert.equal(view.root.findAllByProps({role:'tab'}).length,2);assert.equal(tab(view,'new').props['aria-selected'],true);assert.equal(view.root.findAllByType('mobile-dashboard').length,1);
  await act(async()=>tab(view,'classic').props.onClick());assert.equal(browserState.values.get('m238-mobile-view'),'classic');assert.equal(view.root.findAllByType('desktop-dashboard').length,1);assert.equal(tab(view,'classic').props['aria-selected'],true);
  await act(async()=>tab(view,'classic').props.onKeyDown({key:'ArrowLeft',preventDefault(){}}));assert.equal(tab(view,'new').props['aria-selected'],true);assert.deepEqual(browserState.focus,['m238-view-tab-new']);
  assert.equal(view.root.findByProps({role:'tabpanel'}).props['aria-labelledby'],'m238-view-tab-new');
  await act(async()=>view.root.findByType('mobile-dashboard').props.onBusyChange(true));assert.equal(tab(view,'classic').props.disabled,true);
  await act(async()=>tab(view,'classic').props.onClick());assert.equal(view.root.findAllByType('mobile-dashboard').length,1);
  await act(async()=>view.root.findByType('mobile-dashboard').props.onBusyChange(false));assert.equal(tab(view,'classic').props.disabled,false);
 }finally{if(view)await act(async()=>view.unmount());browserState.restore()}
});
test('saved classic opens with top tabs while desktop screens keep their existing dashboard',async()=>{
 const browserState=browser(true,'classic');let view;
 try{
  await act(async()=>{view=create(React.createElement(Entry))});assert.equal(tab(view,'classic').props['aria-selected'],true);
  browserState.media.matches=false;await act(async()=>browserState.resize());assert.equal(view.root.findAllByProps({role:'tablist'}).length,0);assert.equal(view.root.findAllByType('desktop-dashboard').length,1);
  browserState.media.matches=true;await act(async()=>browserState.resize());assert.equal(tab(view,'classic').props['aria-selected'],true);
 }finally{if(view)await act(async()=>view.unmount());browserState.restore()}
});
