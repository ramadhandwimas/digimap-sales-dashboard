// Short-lived, memory-only reuse. Never persist a customer's quote or an old price.
const cache=new Map<string,{at:number;data:unknown}>();
const inflight=new Map<string,Promise<unknown>>();
const TTL=30000;
let generation=0;
export function peekPromo<T>(url:string):T|undefined{const hit=cache.get(url);return hit&&Date.now()-hit.at<TTL?hit.data as T:undefined}
export function clearPromoCache(){generation++;cache.clear();inflight.clear()}
export async function promoJson<T>(url:string):Promise<T>{
 const hit=peekPromo<T>(url);if(hit!==undefined)return hit;
 const pending=inflight.get(url);if(pending)return pending as Promise<T>;
 const current=generation;
 const request=fetch(url,{cache:"no-store"}).then(async r=>{const data=await r.json();if(!r.ok||data?.error)throw new Error(data?.error||"Data pricelist gagal dimuat.");if(generation===current)cache.set(url,{at:Date.now(),data});return data}).finally(()=>{if(inflight.get(url)===request)inflight.delete(url)});
 inflight.set(url,request);return request as Promise<T>;
}
