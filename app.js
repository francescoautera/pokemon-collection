const DATA = window.APP_DATA;
const STORAGE='pokemon-collection-state-v1';
const state={tab:'pokemon',query:'',region:'Tutti',view:null,owned:{}};
try{state.owned=JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch(e){}

function key(t,m){return `${t.id}:${m.slot}`}
function isOwned(t,m){const k=key(t,m);return k in state.owned ? !!state.owned[k] : !!m.owned}
function setOwned(t,m,val){state.owned[key(t,m)]=!!val;localStorage.setItem(STORAGE,JSON.stringify(state.owned));render()}
function initials(s){return s.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()}
function slug(name){return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\([^)]*\)/g,'').replace(/^mega\s+/,'').replace(/\b(forma|tera|gigamax|gmax)\b.*$/,'').replace(/[.'’]/g,'').trim().replace(/\s+/g,'-')}
function imgUrl(name){return `https://img.pokemondb.net/sprites/home/normal/${slug(name)}.png`}
function img(name,cls='poke-img'){return `<img class="${cls}" src="${imgUrl(name)}" alt="${esc(name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"> <div class="img-fallback" style="display:none">${esc(name[0]||'?')}</div>`}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function allRegions(){return ['Tutti',...new Set(DATA.trainers.map(t=>t.region))]}
function pokemonIndex(){
 const map=new Map();
 DATA.trainers.forEach(t=>t.pokemon.forEach(m=>{const n=m.name.trim();const id=n.toLowerCase();if(!map.has(id))map.set(id,{name:n,entries:[]});map.get(id).entries.push({t,m})}));
 return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'it'));
}
function completion(entries){const got=entries.filter(x=>isOwned(x.t,x.m)).length;return {got,total:entries.length,pct:entries.length?Math.round(got/entries.length*100):0}}
function progress(c){let cl=c.got===0?'zero':c.got<c.total?'warn':'';return `<div class="progress ${cl}"><i style="width:${c.pct}%"></i></div><div class="progress-label">${c.got}/${c.total}</div>`}
function nav(){return `<nav class="nav"><button data-tab="pokemon" class="${state.tab==='pokemon'?'active':''}"><span class="ico">◉</span>Pokémon</button><button data-tab="trainers" class="${state.tab==='trainers'?'active':''}"><span class="ico">♟</span>Allenatori</button></nav>`}
function chips(){return `<div class="filters">${allRegions().map(r=>`<button class="chip ${state.region===r?'active':''}" data-region="${esc(r)}">${esc(r)}</button>`).join('')}</div>`}
function pokemonScreen(){
 const items=pokemonIndex().filter(p=>(!state.query||p.name.toLowerCase().includes(state.query.toLowerCase())) && (state.region==='Tutti'||p.entries.some(e=>e.t.region===state.region)));
 const total=pokemonIndex(); const complete=total.filter(p=>completion(p.entries).got===p.entries.length).length;
 return `<main class="app"><div class="topbar"><div><div class="title">Pokémon</div><div class="subtitle">${complete} specie completate su ${total.length}</div></div></div><div class="search">⌕<input id="search" placeholder="Cerca un Pokémon…" value="${esc(state.query)}"></div>${chips()}<div class="grid">${items.map(p=>{const c=completion(p.entries);return `<article class="card poke-card" data-pokemon="${encodeURIComponent(p.name)}"><div class="poke-img-wrap">${img(p.name)}</div><div class="poke-name">${esc(p.name)}</div>${progress(c)}</article>`}).join('')}</div>${items.length?'':'<div class="empty">Nessun Pokémon trovato.</div>'}${nav()}</main>`
}
function trainerCompletion(t){const got=t.pokemon.filter(m=>isOwned(t,m)).length;return {got,total:t.pokemon.length,pct:Math.round(got/t.pokemon.length*100)}}
function trainersScreen(){
 const items=DATA.trainers.filter(t=>(!state.query||t.name.toLowerCase().includes(state.query.toLowerCase()))&&(state.region==='Tutti'||t.region===state.region));
 return `<main class="app"><div class="topbar"><div><div class="title">Allenatori</div><div class="subtitle">${DATA.trainers.length} allenatori</div></div></div><div class="search">⌕<input id="search" placeholder="Cerca un allenatore…" value="${esc(state.query)}"></div>${chips()}<div class="grid">${items.map(t=>{const c=trainerCompletion(t);return `<article class="card trainer-card" data-trainer="${t.id}"><div class="avatar">${initials(t.name)}</div><div class="trainer-name">${esc(t.name)}</div><div class="trainer-region">${esc(t.region)}</div>${progress(c)}</article>`}).join('')}</div>${items.length?'':'<div class="empty">Nessun allenatore trovato.</div>'}${nav()}</main>`
}
function trainerDetail(id){const t=DATA.trainers.find(x=>x.id===id);if(!t)return pokemonScreen();const c=trainerCompletion(t);
 return `<main class="app"><div class="detail-header"><button class="back" data-back>‹</button><div class="heading"><h1>${esc(t.name)}</h1><p>${esc(t.region)} · ${c.got}/${c.total}</p></div><div class="pct">${c.pct}%</div></div><section class="hall"><div class="trainer-center"><div class="avatar">${initials(t.name)}</div><b>${esc(t.name)}</b></div>${t.pokemon.map((m,i)=>`<button class="orb o${i+1} ${isOwned(t,m)?'':'locked'}" data-slot="${m.slot}">${img(m.name,'')}<span>${esc(m.name)}</span></button>`).join('')}</section><div class="team-list">${t.pokemon.map(m=>`<div class="team-row">${img(m.name,'')}<div class="name">${esc(m.name)}</div><button class="toggle ${isOwned(t,m)?'on':''}" data-slot="${m.slot}">${isOwned(t,m)?'✓':'○'}</button></div>`).join('')}</div><p class="note">Tocca un Pokémon nella sala o il cerchio nella lista per segnare se ${esc(t.name)} lo possiede.</p></main>`
}
function pokemonDetail(name){const p=pokemonIndex().find(x=>x.name===name);if(!p)return pokemonScreen();const c=completion(p.entries);
 return `<main class="app"><div class="detail-header"><button class="back" data-back>‹</button><div class="heading"><h1>${esc(p.name)}</h1><p>Assegnazioni agli allenatori</p></div><div class="pct">${c.pct}%</div></div><div class="poke-detail"><div class="hero-poke">${img(p.name,'')}</div><div class="big-count">${c.got} / ${c.total}</div><div class="progress ${c.got===0?'zero':c.got<c.total?'warn':''}" style="height:18px"><i style="width:${c.pct}%"></i></div></div><section class="owners"><h3>Allenatori che possono averlo</h3>${p.entries.map(({t,m})=>`<div class="owner-row"><div class="avatar">${initials(t.name)}</div><div class="who"><b>${esc(t.name)}</b><br><small>${esc(t.region)}</small></div><button class="toggle ${isOwned(t,m)?'on':''}" data-owner-trainer="${t.id}" data-owner-slot="${m.slot}">${isOwned(t,m)?'✓':'○'}</button></div>`).join('')}</section><p class="note">Qui puoi assegnare o rimuovere ${esc(p.name)} direttamente dall'allenatore corretto. Il conteggio sopra si aggiorna automaticamente.</p></main>`
}
function render(){let html;if(state.view?.type==='trainer')html=trainerDetail(state.view.id);else if(state.view?.type==='pokemon')html=pokemonDetail(state.view.name);else html=state.tab==='pokemon'?pokemonScreen():trainersScreen();document.getElementById('app').innerHTML=html;bind()}
function bind(){
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;state.query='';state.region='Tutti';state.view=null;render()});
 document.querySelectorAll('[data-region]').forEach(b=>b.onclick=()=>{state.region=b.dataset.region;render()});
 const s=document.getElementById('search');if(s)s.oninput=e=>{state.query=e.target.value;render();document.getElementById('search')?.focus()};
 document.querySelectorAll('[data-pokemon]').forEach(x=>x.onclick=()=>{state.view={type:'pokemon',name:decodeURIComponent(x.dataset.pokemon)};render()});
 document.querySelectorAll('[data-trainer]').forEach(x=>x.onclick=()=>{state.view={type:'trainer',id:x.dataset.trainer};render()});
 document.querySelectorAll('[data-back]').forEach(x=>x.onclick=()=>{state.view=null;render()});
 if(state.view?.type==='trainer'){
   const t=DATA.trainers.find(x=>x.id===state.view.id);
   document.querySelectorAll('[data-slot]').forEach(x=>x.onclick=()=>{const m=t.pokemon.find(y=>String(y.slot)===String(x.dataset.slot));setOwned(t,m,!isOwned(t,m))});
 }
 document.querySelectorAll('[data-owner-trainer]').forEach(x=>x.onclick=()=>{const t=DATA.trainers.find(y=>y.id===x.dataset.ownerTrainer);const m=t.pokemon.find(y=>String(y.slot)===String(x.dataset.ownerSlot));setOwned(t,m,!isOwned(t,m))});
}
render();
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
