const CACHE="m238-pwa-v2";
const STATIC_ASSETS=["/manifest.webmanifest"];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC_ASSETS)).catch(()=>undefined));
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
  if(url.origin!==self.location.origin)return;

  // Dashboard pages and every API request always go straight to network.
  // This keeps Google Sheets / Daily Sales / Feedback / CX data live and avoids
  // service-worker work on the heaviest requests.
  if(req.mode==="navigate"||url.pathname.startsWith("/api/"))return;

  // Cache only lightweight PWA assets. Next.js chunks/styles use the browser's
  // normal HTTP cache, which is faster and simpler on iOS Safari.
  if(url.pathname==="/manifest.webmanifest"||url.pathname.startsWith("/pwa-icon/")){
    event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{
      if(res.ok){
        const copy=res.clone();
        event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>undefined));
      }
      return res;
    })));
  }
});
