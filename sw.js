// Darby Band service worker: lets the site install as an app, work offline with the last copy, and receive alerts.
const CACHE='darby-v1';
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})())});
// Pages: always try the network first so people get the newest scores; fall back to the last saved copy when offline.
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;
  if(r.mode==='navigate'||u.pathname.endsWith('.html')||/\.(png|webmanifest)$/.test(u.pathname)||u.pathname.startsWith('/photos/')){
    e.respondWith((async()=>{try{const res=await fetch(r);if(res&&res.ok){const c=await caches.open(CACHE);c.put(r,res.clone())}return res}
      catch(x){const hit=await caches.match(r,{ignoreSearch:r.mode==='navigate'});if(hit)return hit;throw x}})());
  }
});
self.addEventListener('push',e=>{
  let d={};try{d=e.data?e.data.json():{}}catch(x){d={body:e.data&&e.data.text()}}
  const title=d.title||'Darby Band';
  e.waitUntil(self.registration.showNotification(title,{body:d.body||'',icon:'/icon-192.png',badge:'/icon-192.png',tag:d.tag||undefined,data:{url:d.url||'/'}}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();const url=(e.notification.data&&e.notification.data.url)||'/';
  e.waitUntil((async()=>{const all=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const c of all){if('focus' in c){try{await c.navigate(url)}catch(x){}return c.focus()}}
    return self.clients.openWindow(url)})());
});
