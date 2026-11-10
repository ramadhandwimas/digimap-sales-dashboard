import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {act,create} from 'react-test-renderer';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function load(file,mocks={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(id=>id in mocks?mocks[id]:require(id),m,m.exports);return m.exports}
const {sharePettyCashFile}=load('lib/petty-cash-share.ts');
test('sharing passes the named PDF file synchronously within the original tap',async()=>{
 const file=new File(['%PDF-test'],'PC-M238-11.pdf',{type:'application/pdf'}),calls=[];
 const pending=sharePettyCashFile(file,{canShare:({files})=>{assert.equal(files[0],file);calls.push('canShare');return true},share:async data=>{assert.equal(data.files[0],file);assert.equal(data.title,file.name);calls.push('share')}});
 assert.deepEqual(calls,['canShare','share']);assert.equal(await pending,'shared');
});
test('cancel and unsupported browsers preserve the file for another save attempt',async()=>{
 const file=new File(['pdf'],'PC.pdf',{type:'application/pdf'});
 assert.equal(await sharePettyCashFile(file,{canShare:()=>false,share:()=>{throw Error('Should not share')}}),'unsupported');
 assert.equal(await sharePettyCashFile(file,{canShare:()=>true,share:async()=>{throw new DOMException('Cancelled','AbortError')}}),'cancelled');
});
test('PDF generation stays on the form and only shares after a separate explicit tap',async()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let exported=0,shared=0;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{canShare:()=>true,share:async data=>{shared++;assert.equal(data.files[0].type,'application/pdf');assert.equal(data.files[0].name,'PC-M238-11.pdf')}}});
 const Panel=load('components/petty-cash-receipts.tsx',{'@/lib/petty-cash-pdf':{exportPettyCashPdf:async()=>new Blob(['%PDF-test'],{type:'application/pdf'})},'@/lib/petty-cash-import':{MAX_RECEIPT_PAGES:24},'@/lib/petty-cash-share':{sharePettyCashFile}}).default;
 let view;await act(async()=>{view=create(React.createElement(Panel,{data:{pcrs:'11'},photos:[],onChange:()=>{},onExported:()=>exported++,onBusy:()=>{}}))});
 const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.children?text(node.children):'';
 const button=label=>view.root.findAllByType('button').find(node=>text(node).includes(label));
 await act(async()=>{button('Buat PDF Gabungan').props.onClick()});
 assert.equal(shared,0);assert.equal(exported,0);assert.ok(button('Bagikan / Simpan PDF'));const link=view.root.findByType('a');assert.equal(link.props.download,'PC-M238-11.pdf');assert.equal(link.props.target,'_blank');
 await act(async()=>{button('Bagikan / Simpan PDF').props.onClick()});assert.equal(shared,1);assert.equal(exported,1);
 await act(async()=>view.unmount());
});
