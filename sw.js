const CACHE='pokemon-collection-v11';
const SPRITE_CACHE='pokemon-collection-sprites-v1';
const CORE=['./','./index.html','./styles.css?v=11.0.0','./data.js?v=11.0.0','./app.js?v=11.0.0','./manifest.webmanifest'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));
});

self.addEventListener('activate',e=>e.waitUntil(
  Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE && k!==SPRITE_CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ])
));

const isSpriteHost=u =>
  u.hostname==='img.pokemondb.net' ||
  u.hostname==='play.pokemonshowdown.com';

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);

  if(isSpriteHost(u)){
    e.respondWith(
      caches.open(SPRITE_CACHE).then(async cache=>{
        const hit=await cache.match(e.request,{ignoreVary:true});
        if(hit)return hit;
        try{
          const res=await fetch(e.request);
          if(res)await cache.put(e.request,res.clone());
          return res;
        }catch(err){
          return hit || Response.error();
        }
      })
    );
    return;
  }

  if(u.origin!==location.origin)return;
  e.respondWith(
    fetch(e.request).then(r=>{
      const copy=r.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy));
      return r;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html')))
  );
});

async function cacheSprite(url,cache){
  const req=new Request(url,{mode:'no-cors',credentials:'omit'});
  const hit=await cache.match(req,{ignoreVary:true});
  if(hit)return;
  try{
    const res=await fetch(req);
    if(res)await cache.put(req,res.clone());
  }catch(_){}
}

self.addEventListener('message',e=>{
  if(!e.data||e.data.type!=='PRECACHE_SPRITES'||!Array.isArray(e.data.urls))return;
  const urls=[...new Set(e.data.urls)].filter(Boolean);
  e.waitUntil((async()=>{
    const cache=await caches.open(SPRITE_CACHE);
    const workers=Array.from({length:8},async(_,worker)=>{
      for(let i=worker;i<urls.length;i+=8)await cacheSprite(urls[i],cache);
    });
    await Promise.all(workers);
  })());
});
