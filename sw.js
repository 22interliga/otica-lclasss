'use strict';
// Cache fechado: apenas arquivos estáticos enumerados. Nunca JSON, fotos de clientes, APIs ou backups.
const CACHE='otica-lclass-static-documentos-20261128';
const FILES=['./','./index.html','./logo-lclass-original.jpeg','./manifest.webmanifest','./assets/logo-192.png','./assets/logo-512.png','./assets/logo-180.png','./assets/logo-32.png','./assets/receita-core.js','./assets/comercial-core.js','./assets/documentos-locais.js','./assets/comercial-ui.js','./evolucao.css','./evolucao-core.js','./evolucao-ui.js','./pupilometro-local.js','./pwa.js','./seguranca-local.js','./firebase-preparacao/arquitetura.js'];
const ALLOWED=new Set(FILES.map(f=>new URL(f,self.registration.scope).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(f=>new Request(new URL(f,self.registration.scope),{cache:'reload'}))))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('otica-lclass-static-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='ATUALIZAR_CONFIRMADO')event.waitUntil((async()=>{const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});if(clients.length>1){event.source?.postMessage({type:'FECHAR_OUTRAS_ABAS'});return;}await self.skipWaiting();})());});
self.addEventListener('fetch',event=>{const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.search||url.origin!==self.location.origin||!ALLOWED.has(url.href)||req.headers.has('Authorization'))return;
 // O shell é versionado na instalação; nenhum conteúdo gerado em execução entra no cache.
 event.respondWith(caches.open(CACHE).then(async cache=>{const saved=await cache.match(req);return saved||fetch(req);}));
});
