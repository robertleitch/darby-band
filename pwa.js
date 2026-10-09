/* Darby Band: home-screen + alerts helper.
   Shows ONE small card that fits the situation:
   computer -> nothing; Facebook/Instagram in-app -> "open in browser";
   iPhone browser -> Add to Home Screen steps; Android -> Install app;
   home-screen app, alerts off -> Turn on alerts; alerts blocked -> how to turn on in Settings. */
(function(){
if(window.__darbyPWA)return;window.__darbyPWA=1;
var VAPID='BBL6mikX5n6-9w_mzQWbEio9YN_F78TQrFIta4fYCuunIpsGB75Nh-KA1oY7wb5rutzHcEtoFxdYvfQGEw64S4g';
var DB='https://darbyseating-default-rtdb.firebaseio.com';
var ua=navigator.userAgent||'';
var isIOS=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);
var isAndroid=/Android/i.test(ua);
var mobile=isIOS||isAndroid;
var inApp=/FBAN|FBAV|FB_IAB|Instagram|Messenger|Snapchat|TikTok|LinkedInApp|Twitter/i.test(ua);
var iosChrome=/CriOS/.test(ua), iosFirefox=/FxiOS/.test(ua), iosEdge=/EdgiOS/.test(ua);
var standalone=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
var canPush='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(x){return null}}
function snoozed(k){var t=+ls('darby-snooze-'+k)||0;return Date.now()<t}
function snooze(k,days){ls('darby-snooze-'+k,String(Date.now()+days*864e5))}
function track(n){try{window.goatcounter&&goatcounter.count&&goatcounter.count({path:'pwa-'+n,title:n,event:true})}catch(x){}}

// register the service worker everywhere (needed for install + alerts + offline)
if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}

var deferred=null;
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;if(isAndroid&&!standalone)render()});
window.addEventListener('appinstalled',function(){deferred=null;close();track('installed')});

var css='#dpwa{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:90;max-width:520px;margin:0 auto;background:#0d2240;color:#fff;border-radius:16px;border:2px solid #8bb8e8;box-shadow:0 12px 36px rgba(0,0,0,.45);padding:14px 14px 12px;font-family:"Source Sans 3","Segoe UI",system-ui,sans-serif;font-size:15px;line-height:1.35;animation:dpwaIn .35s ease-out}'+
'@keyframes dpwaIn{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}'+
'#dpwa .h{display:flex;gap:12px;align-items:center;padding-right:24px}#dpwa .ic{width:44px;height:44px;border-radius:10px;flex:none;background:#0d2240 url(/icon-192.png) center/cover;border:1px solid #2a4a75}'+
'#dpwa b.t{display:block;font-family:"Barlow Condensed","Arial Narrow",sans-serif;font-size:20px;letter-spacing:.04em;text-transform:uppercase}#dpwa .s{color:#cfe0f3;font-size:14px}'+
'#dpwa ol{margin:10px 0 2px;padding-left:22px}#dpwa li{margin:3px 0}#dpwa .k{display:inline-flex;vertical-align:-4px;background:#fff;border-radius:6px;padding:1px 4px;margin:0 2px}'+
'#dpwa .row{display:flex;gap:8px;justify-content:flex-end;margin-top:10px;flex-wrap:wrap}#dpwa button{font:inherit;font-weight:700;border-radius:999px;padding:8px 16px;border:0;cursor:pointer}'+
'#dpwa .go{background:#8bb8e8;color:#0d2240}#dpwa .no{background:transparent;color:#cfe0f3;border:1px solid #2a4a75}#dpwa .x{position:absolute;top:6px;right:8px;background:none;color:#9fb6d3;font-size:22px;padding:2px 8px}'+
'#dpwa .arrow{position:fixed;left:50%;bottom:6px;transform:translateX(-50%);font-size:28px;color:#8bb8e8;animation:dpwaB 1s infinite alternate}@keyframes dpwaB{to{transform:translate(-50%,6px)}}';
var SHARE='<span class="k"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg></span>';
var PLUS='<span class="k"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/></svg></span>';
var DOTS='<span class="k" style="color:#111;font-weight:800">&middot;&middot;&middot;</span>';

var el=null;
function close(){if(el){el.remove();el=null}}
function card(key,title,sub,body,buttons,arrow){
  close();if(!document.getElementById('dpwa-css')){var st=document.createElement('style');st.id='dpwa-css';st.textContent=css;document.head.appendChild(st)}
  el=document.createElement('div');el.id='dpwa';el.setAttribute('role','dialog');el.setAttribute('aria-label',title);
  el.innerHTML='<button class="x" aria-label="Close">&times;</button><div class="h"><div class="ic"></div><div><b class="t">'+title+'</b><div class="s">'+sub+'</div></div></div>'+(body||'')+
   '<div class="row">'+buttons.map(function(b,i){return '<button class="'+b[1]+'" data-i="'+i+'">'+b[0]+'</button>'}).join('')+'</div>'+(arrow?'<div class="arrow">&#8595;</div>':'');
  document.body.appendChild(el);
  el.querySelector('.x').onclick=function(){snooze(key,14);close();track(key+'-close')};
  el.querySelectorAll('.row button').forEach(function(btn){btn.onclick=function(){buttons[+btn.dataset.i][2]()}});
  track(key+'-shown');
}

function render(){
  if(!mobile)return;                                   // computers: nothing
  if(document.getElementById('splash'))return;          // wait until the splash is gone
  if(standalone){alertsCard();return}
  if(inApp){ if(snoozed('inapp'))return;
    card('inapp','Open in your browser','To add Darby to your home screen',
      '<ol><li>Tap the '+DOTS+' menu (top or bottom corner)</li><li>Choose <b>Open in browser</b> (or Open in Safari / Chrome)</li></ol>',
      [['Not now','no',function(){snooze('inapp',7);close()}]]);return}
  if(isAndroid){ if(snoozed('install'))return;
    if(deferred){card('install','Get the Darby app','One tap. No download from a store.','',
      [['Not now','no',function(){snooze('install',14);close()}],['Install app','go',function(){var d=deferred;deferred=null;d.prompt();d.userChoice.then(function(c){track('install-'+c.outcome);close()})}]]);}
    else{card('install','Get the Darby app','Add it to your home screen',
      '<ol><li>Tap the <span class="k" style="color:#111;font-weight:800">&#8942;</span> menu at the top right</li><li>Tap <b>Add to Home screen</b> or <b>Install app</b></li><li>Tap <b>Install</b></li></ol>',
      [['Not now','no',function(){snooze('install',14);close()}],['Got it','go',function(){snooze('install',3);close()}]]);}
    return}
  if(isIOS){ if(snoozed('install'))return;
    var where=iosChrome?'in the address bar':(iosFirefox||iosEdge?'in the menu':'at the bottom of the screen');
    card('install','Add Darby to your home screen','Works like an app. Get alerts, too.',
      '<ol><li>Tap Share '+SHARE+' '+where+'</li><li>Tap <b>Add to Home Screen</b> '+PLUS+(iosChrome?' (tap <b>More</b> if you don&#39;t see it)':' (scroll down if needed)')+'</li><li>Tap <b>Add</b>, then open Darby from your home screen</li></ol>'+
      '<div class="s" style="margin-top:6px">Already added? Open it from your home screen.</div>',
      [['Not now','no',function(){snooze('install',14);close()}],['Got it','go',function(){snooze('install',3);close()}]],!iosChrome);
  }
}

function alertsCard(){
  if(!canPush)return;
  var p=Notification.permission;
  if(p==='granted'){ensureSub(false);return}
  if(p==='denied'){ if(snoozed('blocked'))return;
    card('blocked','Alerts are off','You said no to alerts earlier',
      '<div class="s" style="margin-top:8px">To turn them on: '+(isIOS?'iPhone <b>Settings</b> &rarr; <b>Notifications</b> &rarr; <b>Darby Band</b> &rarr; Allow Notifications.':'phone <b>Settings</b> &rarr; <b>Apps</b> &rarr; <b>Darby Band</b> &rarr; <b>Notifications</b>.')+'</div>',
      [['OK','go',function(){snooze('blocked',30);close()}]]);return}
  if(snoozed('alerts'))return;
  card('alerts','Turn on alerts','Report-time reminders and "scores are up!"','',
    [['Not now','no',function(){snooze('alerts',7);close()}],['Turn on alerts','go',function(){
      Notification.requestPermission().then(function(r){track('alerts-'+r);
        if(r==='granted'){ensureSub(true)}else{close()}})}]]);
}

function b64u(s){var p='='.repeat((4-s.length%4)%4),b=atob((s+p).replace(/-/g,'+').replace(/_/g,'/')),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
function hex(buf){return Array.from(new Uint8Array(buf)).map(function(x){return x.toString(16).padStart(2,'0')}).join('')}
function ensureSub(show){
  navigator.serviceWorker.register('/sw.js').then(function(){return navigator.serviceWorker.ready}).then(function(reg){
    return reg.pushManager.getSubscription().then(function(s){return s||reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(VAPID)})});
  }).then(function(sub){
    var j=sub.toJSON();var saved=ls('darby-push-ep');
    if(saved===j.endpoint&&!show)return;
    return crypto.subtle.digest('SHA-256',new TextEncoder().encode(j.endpoint)).then(function(h){
      var id=hex(h).slice(0,32);
      return fetch(DB+'/push/'+id+'.json',{method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ep:j.endpoint,p256dh:j.keys.p256dh,auth:j.keys.auth,os:isIOS?'ios':(isAndroid?'android':'other'),
          topics:{report:true,scores:true,news:true},t:{'.sv':'timestamp'}})});
    }).then(function(r){if(r&&r.ok){ls('darby-push-ep',j.endpoint);if(show)done()}else if(show)fail()});
  }).catch(function(){if(show)fail()});
}
function done(){card('ok','Alerts are on','You&#39;ll get report-time reminders and score alerts.','',[['Great','go',close]]);setTimeout(close,6000);track('alerts-on')}
function fail(){card('err','Couldn&#39;t turn on alerts','Check your connection and try again later.','',[['OK','go',function(){snooze('alerts',1);close()}]])}

function start(){render();var n=0,t=setInterval(function(){if(!document.getElementById('splash')||++n>120){clearInterval(t);setTimeout(render,600)}},1000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
