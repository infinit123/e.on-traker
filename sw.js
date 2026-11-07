const APP_VERSION='2.0.1';
const STATIC_CACHE=`revizio-static-${APP_VERSION}`; const RUNTIME_CACHE=`revizio-runtime-${APP_VERSION}`;
const SHELL=['./','./index.html','./manifest.json','./apple-touch-icon.png','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(STATIC_CACHE).then(c=>c.addAll(SHELL))));
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>![STATIC_CACHE,RUNTIME_CACHE].includes(k)).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(r=>{const x=r.clone();caches.open(STATIC_CACHE).then(c=>c.put('./index.html',x));return r;}).catch(()=>caches.match('./index.html')));return;}if(u.origin===location.origin){e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{const x=r.clone();caches.open(STATIC_CACHE).then(k=>k.put(e.request,x));return r;})));}else{e.respondWith(fetch(e.request).then(r=>{const x=r.clone();caches.open(RUNTIME_CACHE).then(c=>c.put(e.request,x));return r;}).catch(()=>caches.match(e.request)));}});
