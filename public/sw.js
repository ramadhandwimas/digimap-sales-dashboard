const CACHE="m238-pwa-v1";
const SHELL=["/","/daily-summary","/manifest.webmanifest"];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).catch(()=>undefined));
  self.skipWaiting();
});

self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin||url.pathname.startsWith("/api/"))return;

  if(req.mode==="navigate"){
    event.respondWith(fetch(req).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(cache=>cache.put(req,copy));
      return res;
    }).catch(()=>caches.match(req).then(hit=>hit||caches.match("/"))));
    return;
  }

  if(url.pathname.startsWith("/_next/static/")||url.pathname.startsWith("/pwa-icon/")){
    event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(cache=>cache.put(req,copy));
      return res;
    })));
  }
});
