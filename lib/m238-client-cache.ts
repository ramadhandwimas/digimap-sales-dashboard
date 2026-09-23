"use client";

type CacheEntry<T=unknown>={data:T;at:number;ttl:number;key:string;url:string};
type CacheOptions={
  scope?:string;
  timeoutMs?:number;
  retries?:number;
  persist?:boolean;
  signal?:AbortSignal;
  onRefreshError?:(error:Error)=>void;
};
type SwrOptions=CacheOptions&{force?:boolean};

const PREFIX="m238-cache-v3:";
const DB_NAME="m238-dashboard-cache";
const DB_STORE="responses";
const memory=new Map<string,CacheEntry>();
const inflight=new Map<string,Promise<unknown>>();
const scopes=new Map<string,{key:string;controller:AbortController}>();
const perf={requests:0,network:0,cacheHits:0,deduped:0,aborted:0,failed:0};

function debugEnabled(){
  if(typeof window==="undefined")return false;
  return process.env.NODE_ENV!=="production"||window.localStorage.getItem("m238-perf-debug")==="1";
}
function debug(event:string,detail:Record<string,unknown>={}){
  if(debugEnabled())console.debug("[M238 PERF]",event,detail);
}
export function getM238PerfStats(){return {...perf,inflight:inflight.size,memory:memory.size}}

function normalizeUrl(url:string){
  try{
    const u=new URL(url,typeof window!=="undefined"?window.location.origin:"https://m238.local");
    u.searchParams.delete("t");
    u.searchParams.delete("refresh");
    const pairs=[...u.searchParams.entries()].sort(([a,av],[b,bv])=>a.localeCompare(b)||av.localeCompare(bv));
    const q=new URLSearchParams();
    for(const[k,v]of pairs)q.append(k,v);
    return u.pathname+(q.size?"?"+q.toString():"");
  }catch{return url}
}
export function cacheKeyForUrl(url:string){return "M238:"+normalizeUrl(url)}

function storageKey(key:string){return PREFIX+key}
function safeParse(raw:string|null):CacheEntry|undefined{
  if(!raw)return;
  try{
    const x=JSON.parse(raw) as CacheEntry;
    if(!x||typeof x.at!=="number"||!("data" in x))return;
    return x;
  }catch{return}
}
function readLocal<T>(key:string):CacheEntry<T>|undefined{
  if(typeof window==="undefined")return;
  const hit=safeParse(window.localStorage.getItem(storageKey(key))) as CacheEntry<T>|undefined;
  if(hit)memory.set(key,hit);
  return hit;
}
function writeLocal(entry:CacheEntry){
  if(typeof window==="undefined")return;
  try{
    const raw=JSON.stringify(entry);
    // Keep the synchronous warm-start tier small to avoid blocking Safari's main thread.
    // Larger payloads still persist in IndexedDB below.
    if(raw.length<=180000)window.localStorage.setItem(storageKey(entry.key),raw);
  }catch{}
}
function openDb():Promise<IDBDatabase|null>{
  if(typeof indexedDB==="undefined")return Promise.resolve(null);
  return new Promise(resolve=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(DB_STORE))req.result.createObjectStore(DB_STORE,{keyPath:"key"})};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>resolve(null);
  });
}
async function readIdb<T>(key:string):Promise<CacheEntry<T>|undefined>{
  const db=await openDb();if(!db)return;
  return new Promise(resolve=>{
    const tx=db.transaction(DB_STORE,"readonly"),req=tx.objectStore(DB_STORE).get(key);
    req.onsuccess=()=>resolve(req.result as CacheEntry<T>|undefined);
    req.onerror=()=>resolve(undefined);
    tx.oncomplete=()=>db.close();
  });
}
async function writeIdb(entry:CacheEntry){
  const db=await openDb();if(!db)return;
  await new Promise<void>(resolve=>{
    const tx=db.transaction(DB_STORE,"readwrite");
    tx.objectStore(DB_STORE).put(entry);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>resolve();
  });
  db.close();
}
function save<T>(key:string,url:string,data:T,ttl:number,persist=true){
  const entry:CacheEntry<T>={key,url,data,ttl,at:Date.now()};
  memory.set(key,entry);
  if(persist){writeLocal(entry);void writeIdb(entry)}
  return entry;
}
export function peekJsonCache<T>(urlOrKey:string){
  const key=urlOrKey.startsWith("M238:")?urlOrKey:cacheKeyForUrl(urlOrKey);
  const entry=(memory.get(key) as CacheEntry<T>|undefined)||readLocal<T>(key);
  if(!entry)return null;
  perf.cacheHits++;
  return {data:entry.data,age:Date.now()-entry.at,stale:Date.now()-entry.at>entry.ttl,at:entry.at};
}
export async function hydrateJsonCache<T>(urlOrKey:string){
  const key=urlOrKey.startsWith("M238:")?urlOrKey:cacheKeyForUrl(urlOrKey);
  const hot=peekJsonCache<T>(key);if(hot)return hot;
  const entry=await readIdb<T>(key);
  if(!entry)return null;
  memory.set(key,entry);writeLocal(entry);
  perf.cacheHits++;
  return {data:entry.data,age:Date.now()-entry.at,stale:Date.now()-entry.at>entry.ttl,at:entry.at};
}
export function abortCacheScope(scope:string){
  const active=scopes.get(scope);
  if(active){active.controller.abort();scopes.delete(scope);perf.aborted++}
}

function sleep(ms:number,signal?:AbortSignal){
  return new Promise<void>((resolve,reject)=>{
    const id=setTimeout(resolve,ms);
    signal?.addEventListener("abort",()=>{clearTimeout(id);reject(new DOMException("Aborted","AbortError"))},{once:true});
  });
}
async function fetchOnce<T>(url:string,controller:AbortController,timeoutMs:number,external?:AbortSignal){
  const timeout=setTimeout(()=>controller.abort("timeout"),timeoutMs);
  const abort=()=>controller.abort(external?.reason);
  external?.addEventListener("abort",abort,{once:true});
  try{
    const started=performance.now();
    const r=await fetch(url,{cache:"no-store",signal:controller.signal,headers:{"x-m238-client-cache":"1"}});
    const text=await r.text();
    const parsedAt=performance.now();
    const json=JSON.parse(text) as T&{error?:string};
    if(!r.ok||json?.error)throw new Error(json?.error||"Data gagal dimuat");
    debug("api",{url:normalizeUrl(url),ms:Math.round(performance.now()-started),parseMs:Math.round(performance.now()-parsedAt),bytes:text.length});
    return json as T;
  }finally{
    clearTimeout(timeout);external?.removeEventListener("abort",abort);
  }
}
async function networkJson<T>(key:string,url:string,ttl:number,force:boolean,opts:CacheOptions){
  if(typeof navigator!=="undefined"&&!navigator.onLine)throw new Error("OFFLINE");
  const existing=inflight.get(key) as Promise<T>|undefined;
  if(existing){perf.deduped++;debug("dedupe",{key});return existing}
  if(opts.scope){
    const active=scopes.get(opts.scope);
    if(active&&active.key!==key){active.controller.abort();perf.aborted++}
  }
  const controller=new AbortController();
  if(opts.scope)scopes.set(opts.scope,{key,controller});
  perf.requests++;perf.network++;
  const task=(async()=>{
    const retries=Math.max(0,opts.retries??1),timeoutMs=opts.timeoutMs??12000;
    let last:unknown;
    for(let attempt=0;attempt<=retries;attempt++){
      try{
        const data=await fetchOnce<T>(url,controller,timeoutMs,opts.signal);
        save(key,url,data,ttl,opts.persist!==false);
        return data;
      }catch(e){
        last=e;
        if(controller.signal.aborted||(e instanceof DOMException&&e.name==="AbortError"))throw e;
        if(attempt<retries){
          if(typeof navigator!=="undefined"&&!navigator.onLine)break;
          await sleep(350*(attempt+1),controller.signal);
        }
      }
    }
    perf.failed++;
    throw last instanceof Error?last:new Error("Data gagal dimuat");
  })().finally(()=>{
    inflight.delete(key);
    if(opts.scope&&scopes.get(opts.scope)?.controller===controller)scopes.delete(opts.scope);
  });
  inflight.set(key,task);
  return task;
}

export async function cachedJson<T>(url:string,ttl=180000,force=false,opts:CacheOptions={}):Promise<T>{
  const key=cacheKeyForUrl(url),hot=peekJsonCache<T>(key);
  if(hot&&!force&&!hot.stale)return hot.data;
  let cached=hot;
  if(!cached)cached=await hydrateJsonCache<T>(key);
  if(cached&&!force&&!cached.stale)return cached.data;
  try{return await networkJson<T>(key,url,ttl,force,opts)}
  catch(e){
    const err=e instanceof Error?e:new Error("Data gagal dimuat");
    if(cached){opts.onRefreshError?.(err);debug("stale-fallback",{key,error:err.message});return cached.data}
    throw err;
  }
}

export async function swrJson<T>(url:string,ttl:number,onData:(data:T,meta:{source:"cache"|"network";stale:boolean})=>void,opts:SwrOptions={}):Promise<T>{
  const key=cacheKeyForUrl(url);
  let cached=peekJsonCache<T>(key);
  if(!cached)cached=await hydrateJsonCache<T>(key);
  if(cached)onData(cached.data,{source:"cache",stale:cached.stale});
  if(cached&&!cached.stale&&!opts.force)return cached.data;
  try{
    const data=await networkJson<T>(key,url,ttl,!!opts.force,opts);
    onData(data,{source:"network",stale:false});
    return data;
  }catch(e){
    const err=e instanceof Error?e:new Error("Data gagal dimuat");
    if(cached){opts.onRefreshError?.(err);return cached.data}
    throw err;
  }
}
export function prefetchJson<T>(url:string,ttl=180000,opts:CacheOptions={}){
  const hot=peekJsonCache<T>(url);
  if(hot&&!hot.stale)return Promise.resolve(hot.data);
  return cachedJson<T>(url,ttl,false,opts).catch(()=>undefined);
}
export function clearExpiredLocalCache(maxAgeMs=1000*60*60*24*3){
  if(typeof window==="undefined")return;
  try{
    const now=Date.now(),remove:string[]=[];
    for(let i=0;i<window.localStorage.length;i++){
      const k=window.localStorage.key(i);if(!k?.startsWith(PREFIX))continue;
      const e=safeParse(window.localStorage.getItem(k));
      if(!e||now-e.at>maxAgeMs)remove.push(k);
    }
    remove.forEach(k=>window.localStorage.removeItem(k));
  }catch{}
}
