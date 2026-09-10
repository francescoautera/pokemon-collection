const DATA = window.APP_DATA;
const STORAGE='pokemon-collection-state-v5';
const TRAINER_STORAGE='pokemon-collection-trainers-v1';
const LEGACY_STORAGES=['pokemon-collection-state-v4','pokemon-collection-state-v3','pokemon-collection-state-v2','pokemon-collection-state'];
const APP_VERSION='11.0.0';
const state={tab:'pokemon',query:'',region:'Tutti',view:null,owned:{},trainerOwned:{}};
try{
  state.owned=JSON.parse(localStorage.getItem(STORAGE)||'null')||{};
  if(!Object.keys(state.owned).length){
    for(const legacy of LEGACY_STORAGES){const v=JSON.parse(localStorage.getItem(legacy)||'null');if(v&&Object.keys(v).length){state.owned=v;break}}
    if(Object.keys(state.owned).length)localStorage.setItem(STORAGE,JSON.stringify(state.owned));
  }
}catch(e){}
try{state.trainerOwned=JSON.parse(localStorage.getItem(TRAINER_STORAGE)||'{}')||{}}catch(e){state.trainerOwned={}}

function isTrainerOwned(t){return !!state.trainerOwned[t.id]}
function setTrainerOwned(t,val){state.trainerOwned[t.id]=!!val;localStorage.setItem(TRAINER_STORAGE,JSON.stringify(state.trainerOwned));render()}

function key(t,m){return `${t.id}:${m.slot}`}
function isOwned(t,m){const k=key(t,m);return k in state.owned ? !!state.owned[k] : !!m.owned}
function setOwned(t,m,val){state.owned[key(t,m)]=!!val;localStorage.setItem(STORAGE,JSON.stringify(state.owned));render()}
function initials(s){return s.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}

const POKEMON_ALIASES={
  'swelllow':'swellow','breelom':'breloom','conckeldurr':'conkeldurr','cofarigius':'cofagrigus','semsitoad':'seismitoad',
  'tokicroak':'toxicroak','kingklang':'klinklang','rimbombee':'ribombee','corvinight':'corviknight','alolan-ninetales':'ninetales-alola'
};
function baseSlug(name){return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\([^)]*\)/g,'').replace(/^mega\s+/,'').replace(/\b(forma|tera|gigamax|gmax)\b.*$/,'').replace(/[.'’]/g,'').trim().replace(/\s+/g,'-')}
function apiSlug(name){const s=baseSlug(name);return POKEMON_ALIASES[s]||s}
function imageSlug(name){let s=apiSlug(name);if(s==='ninetales-alola')s='ninetales-alolan';return s}
function imgUrl(name){return `https://img.pokemondb.net/sprites/home/normal/${imageSlug(name)}.png`}
function img(name,cls='poke-img'){return `<img class="${cls}" src="${imgUrl(name)}" alt="${esc(name)}" loading="lazy" decoding="async" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"> <div class="img-fallback" style="display:none">${esc(name[0]||'?')}</div>`}

const TRAINER_SPRITES={
'Rosso (Red)':['red'],'Blu (Blue)':['blue'],'Brock':['brock'],'Lorelei':['lorelei-gen1','lorelei-gen3','lorelei-lgpe'],'Bruno':['bruno'],'Agatha':['agatha-gen1','agatha-gen3'],'Lance':['lance'],'Giovanni':['giovanni'],'Prof. OAK':['oak'],
'Chiara':['whitney'],'Jasmine':['jasmine'],'Karen':['karen'],'Argento (Silver)':['silver'],'Armonio':['eusine'],'Adriano':['wallace'],
'Fosco':['sidney'],'Vera':['may-gen3','may'],'Drake':['drake-gen3'],'Rocco':['steven'],'Ivan':['archie-gen6','archie-gen3'],'Max':['maxie-gen6','maxie-gen3'],'Lino':['wally-gen3','wally'],'Omar il Distruttore':['crasherwake'],
'Corrado':['volkner'],'Vulcano':['flint'],'Luciano':['lucian'],'Camilla (Cynthia)':['cynthia'],'Ciro (Cyrus)':['cyrus'],
'Antemia':['shauntal'],'Marzio':['marshal'],'Mirton':['grimsley'],'Catleya':['caitlin'],'Nardo':['alder'],'Ghecis':['ghetsis'],'N':['n'],
'Diantha':['diantha'],'Elisio (Lysandre)':['lysandre'],'Serena':['serena'],'Hoopa':['psychic-gen6','psychic'],'Prof. Kukui':['kukui'],'Samina':['lusamine'],'Lilya':['lillie'],
'Azzurra':['nessa'],'Ginepro':['piers'],'Laburno':['raihan'],'Dandel (Leon)':['leon'],'Hop':['hop'],'Penny':['penny']
};
function trainerCandidates(name){return TRAINER_SPRITES[name]||[]}
function trainerAvatar(name,cls='avatar'){
 const c=trainerCandidates(name);
 if(!c.length)return `<div class="${cls} trainer-fallback">${initials(name)}</div>`;
 const encoded=esc(JSON.stringify(c));
 return `<div class="${cls} trainer-avatar"><img src="https://play.pokemonshowdown.com/sprites/trainers/${c[0]}.png" data-candidates='${encoded}' data-index="0" alt="${esc(name)}" loading="lazy" decoding="async" onerror="trainerImgError(this,'${esc(initials(name))}')"></div>`
}
window.trainerImgError=function(el,fallback){try{const a=JSON.parse(el.dataset.candidates||'[]');let i=Number(el.dataset.index||0)+1;if(i<a.length){el.dataset.index=i;el.src=`https://play.pokemonshowdown.com/sprites/trainers/${a[i]}.png`;return}}catch(e){}el.parentElement.classList.remove('trainer-avatar');el.parentElement.classList.add('trainer-fallback');el.parentElement.innerHTML=fallback}

/* v11: warm every sprite once into the Service Worker cache.
   This happens in the background; subsequent scrolling/opens use local Cache Storage. */
let spriteWarmStarted=false;
function allSpriteUrls(){
  const urls=new Set();
  pokemonIndex().forEach(p=>urls.add(imgUrl(p.name)));
  Object.values(TRAINER_SPRITES).flat().forEach(s=>urls.add(`https://play.pokemonshowdown.com/sprites/trainers/${s}.png`));
  return [...urls];
}
function warmSpriteCache(){
  if(spriteWarmStarted||!('serviceWorker' in navigator))return;
  spriteWarmStarted=true;
  const send=()=>navigator.serviceWorker.ready.then(reg=>{
    const sw=navigator.serviceWorker.controller||reg.active;
    if(sw)sw.postMessage({type:'PRECACHE_SPRITES',urls:allSpriteUrls()});
  }).catch(()=>{});
  if('requestIdleCallback' in window)requestIdleCallback(send,{timeout:1800});
  else setTimeout(send,500);
}

const TYPE_META={
 normal:['#8e9aa6','#596673'],fire:['#ff6b35','#b6252a'],water:['#46a6ff','#2456c7'],electric:['#ffd84a','#b77a08'],grass:['#56d778','#1c8d59'],ice:['#76e5f7','#2c91c4'],
 fighting:['#e0565b','#7b2734'],poison:['#b266db','#632a92'],ground:['#d9a55d','#8b5b2c'],flying:['#8fb7ff','#665cc7'],psychic:['#ff6d9f','#ad2d75'],bug:['#9ecb43','#517b26'],
 rock:['#c6aa62','#78612e'],ghost:['#7669c9','#373064'],dragon:['#6e71ff','#4230a8'],dark:['#6d6671','#302d34'],steel:['#9eb4c4','#596b78'],fairy:['#f39acb','#a74b88']
};
const typeCache={};
try{Object.assign(typeCache,JSON.parse(localStorage.getItem('pokemon-type-cache-v1')||'{}'))}catch(e){}
function typeVars(types){const t1=TYPE_META[types?.[0]]||['#27475b','#122735'];const t2=TYPE_META[types?.[1]]||t1;return `--type1:${t1[0]};--type1d:${t1[1]};--type2:${t2[0]};--type2d:${t2[1]}`}
function cachedTypes(name){return typeCache[apiSlug(name)]||null}
async function fetchType(name){const s=apiSlug(name);if(typeCache[s])return typeCache[s];try{const r=await fetch(`https://pokeapi.co/api/v2/pokemon/${s}`);if(!r.ok)throw 0;const j=await r.json();const types=j.types.sort((a,b)=>a.slot-b.slot).map(x=>x.type.name);typeCache[s]=types;localStorage.setItem('pokemon-type-cache-v1',JSON.stringify(typeCache));return types}catch(e){return null}}
function hydrateTypes(){document.querySelectorAll('[data-type-pokemon]').forEach(async el=>{const name=decodeURIComponent(el.dataset.typePokemon);let types=cachedTypes(name)||await fetchType(name);if(types){el.setAttribute('style',typeVars(types));el.dataset.types=types.join(',')}})}
function typeBadges(name){const types=cachedTypes(name);if(!types)return '';return `<div class="type-badges">${types.map(t=>`<span class="type-badge type-${t}">${t}</span>`).join('')}</div>`}

const TRAINER_THEMES={
 'Brock':'rock','Lorelei':'ice','Bruno':'fighting','Agatha':'ghost','Lance':'dragon','Giovanni':'ground','Chiara':'fairy','Jasmine':'steel','Karen':'dark','Adriano':'water','Fosco':'dark','Drake':'dragon',
 'Rocco':'steel','Ivan':'water','Max':'fire','Corrado':'electric','Vulcano':'fire','Luciano':'psychic','Camilla (Cynthia)':'champion','Ciro (Cyrus)':'galaxy','Antemia':'ghost','Marzio':'fighting','Mirton':'dark',
 'Catleya':'psychic','Nardo':'bug','Ghecis':'plasma','Diantha':'fairy','Elisio (Lysandre)':'fire','Prof. Kukui':'tropical','Samina':'aether','Azzurra':'water','Ginepro':'dark','Laburno':'dragon','Dandel (Leon)':'champion','Penny':'fairy'
};
function trainerTheme(t){return TRAINER_THEMES[t.name]||({'Kanto':'kanto','Johto':'johto','Hoenn':'hoenn','Sinnoh':'sinnoh','Unima':'unima','Kalos':'kalos','Alola':'alola','Galar':'galar','Paldea':'paldea'}[t.region]||'default')}

function allRegions(){return ['Tutti',...new Set(DATA.trainers.map(t=>t.region))]}
function pokemonIndex(){const map=new Map();DATA.trainers.forEach(t=>t.pokemon.forEach(m=>{const n=m.name.trim();const id=n.toLowerCase();if(!map.has(id))map.set(id,{name:n,entries:[]});map.get(id).entries.push({t,m})}));return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'it'))}
function completion(entries){const got=entries.filter(x=>isOwned(x.t,x.m)).length;return {got,total:entries.length,pct:entries.length?Math.round(got/entries.length*100):0}}
function progress(c){let cl=c.got===0?'zero':c.got<c.total?'warn':'';return `<div class="progress ${cl}"><i style="width:${c.pct}%"></i></div><div class="progress-label">${c.got}/${c.total}</div>`}
function nav(){return `<nav class="nav"><button data-tab="pokemon" class="${state.tab==='pokemon'?'active':''}"><span class="ico">◉</span>Pokémon</button><button data-tab="trainers" class="${state.tab==='trainers'?'active':''}"><span class="ico">♟</span>Allenatori</button></nav>`}
function chips(){return `<div class="filters">${allRegions().map(r=>`<button class="chip ${state.region===r?'active':''}" data-region="${esc(r)}">${esc(r)}</button>`).join('')}</div>`}
function pokemonScreen(){
 const items=pokemonIndex().filter(p=>(!state.query||p.name.toLowerCase().includes(state.query.toLowerCase())) && (state.region==='Tutti'||p.entries.some(e=>e.t.region===state.region)));
 const total=pokemonIndex(); const complete=total.filter(p=>completion(p.entries).got===p.entries.length).length;
 return `<main class="app"><div class="topbar"><div><div class="title">Pokémon</div><div class="subtitle">${complete} specie completate su ${total.length} · v${APP_VERSION} · ${esc(DATA.sourceSheet)}</div></div></div><div class="search">⌕<input id="search" placeholder="Cerca un Pokémon…" value="${esc(state.query)}"></div>${chips()}<div class="grid">${items.map(p=>{const c=completion(p.entries),types=cachedTypes(p.name);return `<article class="card poke-card typed-card" style="${typeVars(types)}" data-type-pokemon="${encodeURIComponent(p.name)}" data-pokemon="${encodeURIComponent(p.name)}"><div class="poke-img-wrap">${img(p.name)}</div><div class="poke-name">${esc(p.name)}</div>${progress(c)}</article>`}).join('')}</div>${items.length?'':'<div class="empty">Nessun Pokémon trovato.</div>'}${nav()}</main>`
}
function trainerCompletion(t){const got=t.pokemon.filter(m=>isOwned(t,m)).length;return {got,total:t.pokemon.length,pct:Math.round(got/t.pokemon.length*100)}}
function trainersScreen(){const items=DATA.trainers.filter(t=>(!state.query||t.name.toLowerCase().includes(state.query.toLowerCase()))&&(state.region==='Tutti'||t.region===state.region));const ownedCount=DATA.trainers.filter(isTrainerOwned).length;return `<main class="app"><div class="topbar"><div><div class="title">Allenatori</div><div class="subtitle">${ownedCount}/${DATA.trainers.length} posseduti · v${APP_VERSION} · ${esc(DATA.sourceSheet)}</div></div></div><div class="search">⌕<input id="search" placeholder="Cerca un allenatore…" value="${esc(state.query)}"></div>${chips()}<div class="grid">${items.map(t=>{const c=trainerCompletion(t),owned=isTrainerOwned(t);return `<article class="card trainer-card trainer-theme-${trainerTheme(t)} ${owned?'trainer-owned':'trainer-missing'}" data-trainer="${t.id}">${trainerAvatar(t.name)}<button class="trainer-owned-toggle ${owned?'on':''}" data-trainer-owned="${t.id}" aria-label="${owned?'Segna allenatore come non posseduto':'Segna allenatore come posseduto'}">${owned?'✓':'○'}</button><div class="trainer-name">${esc(t.name)}</div><div class="trainer-region">${esc(t.region)}</div>${progress(c)}</article>`}).join('')}</div>${items.length?'':'<div class="empty">Nessun allenatore trovato.</div>'}${nav()}</main>`}
function trainerDetail(id){const t=DATA.trainers.find(x=>x.id===id);if(!t)return pokemonScreen();const c=trainerCompletion(t),owned=isTrainerOwned(t);return `<main class="app trainer-detail-page trainer-theme-${trainerTheme(t)}"><div class="detail-header"><button class="back" data-back>‹</button><div class="heading"><h1>${esc(t.name)}</h1><p>${esc(t.region)} · ${c.got}/${c.total} Pokémon</p></div><button class="trainer-detail-owned ${owned?'on':''}" data-trainer-owned="${t.id}">${owned?'✓ Posseduto':'○ Non posseduto'}</button></div><section class="hall"><div class="trainer-center">${trainerAvatar(t.name,'avatar')}<b>${esc(t.name)}</b><small>${c.pct}% squadra</small></div>${t.pokemon.map((m,i)=>`<button class="orb o${i+1} ${isOwned(t,m)?'owned':'locked'}" data-slot="${m.slot}">${img(m.name,'')}<span>${esc(m.name)}</span></button>`).join('')}</section><p class="note">Tocca direttamente un Pokémon nella sala per segnarlo come posseduto o mancante.</p></main>`}
function pokemonDetail(name){const p=pokemonIndex().find(x=>x.name===name);if(!p)return pokemonScreen();const c=completion(p.entries),types=cachedTypes(p.name);return `<main class="app pokemon-detail-page typed-page" style="${typeVars(types)}" data-type-pokemon="${encodeURIComponent(p.name)}"><div class="detail-header"><button class="back" data-back>‹</button><div class="heading"><h1>${esc(p.name)}</h1>${typeBadges(p.name)}<p>Assegnazioni agli allenatori</p></div><div class="pct">${c.got}/${c.total}</div></div><div class="poke-detail"><div class="hero-poke">${img(p.name,'')}</div><div class="big-count">${c.got} / ${c.total}</div><div class="progress ${c.got===0?'zero':c.got<c.total?'warn':''}" style="height:18px"><i style="width:${c.pct}%"></i></div></div><section class="owners"><h3>Allenatori che possono averlo</h3>${p.entries.map(({t,m})=>`<div class="owner-row">${trainerAvatar(t.name)}<div class="who"><b>${esc(t.name)}</b><br><small>${esc(t.region)}</small></div><button class="toggle ${isOwned(t,m)?'on':''}" data-owner-trainer="${t.id}" data-owner-slot="${m.slot}">${isOwned(t,m)?'✓':'○'}</button></div>`).join('')}</section><p class="note">Assegna o rimuovi ${esc(p.name)} dall'allenatore corretto: il conteggio si aggiorna automaticamente.</p></main>`}
function render(){let html;if(state.view?.type==='trainer')html=trainerDetail(state.view.id);else if(state.view?.type==='pokemon')html=pokemonDetail(state.view.name);else html=state.tab==='pokemon'?pokemonScreen():trainersScreen();document.getElementById('app').innerHTML=html;bind();hydrateTypes()}
function bind(){document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;state.query='';state.region='Tutti';state.view=null;render()});document.querySelectorAll('[data-region]').forEach(b=>b.onclick=()=>{state.region=b.dataset.region;render()});const s=document.getElementById('search');if(s)s.oninput=e=>{const caret=e.target.selectionStart??e.target.value.length;state.query=e.target.value;render();const next=document.getElementById('search');if(next){next.focus({preventScroll:true});const pos=Math.min(caret,next.value.length);try{next.setSelectionRange(pos,pos)}catch(_){}}};document.querySelectorAll('[data-pokemon]').forEach(x=>x.onclick=()=>{state.view={type:'pokemon',name:decodeURIComponent(x.dataset.pokemon)};render()});document.querySelectorAll('[data-trainer-owned]').forEach(x=>x.onclick=e=>{e.stopPropagation();const t=DATA.trainers.find(y=>y.id===x.dataset.trainerOwned);if(t)setTrainerOwned(t,!isTrainerOwned(t))});document.querySelectorAll('[data-trainer]').forEach(x=>x.onclick=()=>{state.view={type:'trainer',id:x.dataset.trainer};render()});document.querySelectorAll('[data-back]').forEach(x=>x.onclick=()=>{state.view=null;render()});if(state.view?.type==='trainer'){const t=DATA.trainers.find(x=>x.id===state.view.id);document.querySelectorAll('[data-slot]').forEach(x=>x.onclick=()=>{const m=t.pokemon.find(y=>String(y.slot)===String(x.dataset.slot));setOwned(t,m,!isOwned(t,m))})}document.querySelectorAll('[data-owner-trainer]').forEach(x=>x.onclick=()=>{const t=DATA.trainers.find(y=>y.id===x.dataset.ownerTrainer);const m=t.pokemon.find(y=>String(y.slot)===String(x.dataset.ownerSlot));setOwned(t,m,!isOwned(t,m))})}
render();
if('serviceWorker' in navigator){window.addEventListener('load',async()=>{try{const reg=await navigator.serviceWorker.register('./sw.js?v='+APP_VERSION);await reg.update()}catch(e){}})}

window.addEventListener('load',()=>warmSpriteCache(),{once:true});
