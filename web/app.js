const icons = {
  search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  moon:'<path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  newspaper:'<path d="M5 4h15v15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8h2zM5 8v11M9 8h7M9 12h7M9 16h3m2 0h2"/>',
  share:'<path d="M12 16V3m-4 4 4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/>',
  sparkles:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5zM20 2v4m-2-2h4"/>',
  'chevron-left':'<path d="m14 6-6 6 6 6"/>',
  'chevron-right':'<path d="m9 6 6 6-6 6"/>',
  'chevron-down':'<path d="m6 9 6 6 6-6"/>',
  chart:'<path d="M4 3v18h17M8 16v-4m5 4V7m5 9v-7"/>',
  coffee:'<path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zm13 1h2a3 3 0 1 1 0 6h-2M8 2v3m5-3v3M3 23h16"/>',
  history:'<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7m2-4v6l4 2"/>',
  rss:'<path d="M4 4a16 16 0 0 1 16 16M4 10a10 10 0 0 1 10 10"/><circle cx="5" cy="19" r="1"/>',
  external:'<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  bookmark:'<path d="M6 3h12v18l-6-4-6 4z"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  book:'<path d="M12 6c-3-2-6-2-10-1v14c4-1 7-1 10 1m0-14c3-2 6-2 10-1v14c-4-1-7-1-10 1z"/>',
  video:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/>',
  headphones:'<path d="M3 14v-2a9 9 0 0 1 18 0v2M3 13h4v8H5a2 2 0 0 1-2-2zm18 0h-4v8h2a2 2 0 0 0 2-2z"/>',
  tweet:'<path d="m4 3 16 18M20 3 4 21M4 3h5l11 18h-5z"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.book}</svg>`;
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = value => { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? esc(u.href) : ''; } catch { return ''; } };
const typeNames = {ARTICLE:'文章',VIDEO:'视频',PODCAST:'播客',TWITTER:'推文',TWEET:'推文',NEWSLETTER:'通讯'};
const typeIcons = {ARTICLE:'newspaper',VIDEO:'video',PODCAST:'headphones',TWITTER:'tweet',TWEET:'tweet',NEWSLETTER:'newspaper'};
const state = { payload:null, deep:false, type:'ALL', query:'', limit:10, request:0 };
let dataMode = 'live';
function stored(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } }
const saved = new Set(stored('brief-saved'));
const read = new Set(stored('brief-read'));
function persist() { try { localStorage.setItem('brief-saved',JSON.stringify([...saved])); localStorage.setItem('brief-read',JSON.stringify([...read])); } catch {} }
function toast(message) { $('toast').textContent = message; $('toast').hidden=false; clearTimeout(toast.timer); toast.timer=setTimeout(()=>{$('toast').hidden=true},2800); }
function dateLabel(date, withWeek=true) { const d=new Date(date+'T12:00:00+08:00'); return new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',...(withWeek?{weekday:'long'}:{})}).format(d); }
function dateLong(date) { return date.slice(0,4)+'年'+dateLabel(date); }
function currentDate() { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
function notice(message, retry=false) { $('notice').hidden=!message; $('notice').replaceChildren(document.createTextNode(message)); if(retry){const b=document.createElement('button');b.textContent='重新同步';b.onclick=()=>load(state.payload?.brief.date);$('notice').append(b);} }
function updateIcons(root=document) { root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon)); }
updateIcons();

function updateProgress() {
  const items=state.payload?.brief.items||[];
  const done=items.filter(x=>read.has(x.id)).length;
  $('progress-label').textContent=`${done} / ${items.length}`;
  $('progress-bar').style.width=items.length?`${done/items.length*100}%`:'0%';
  $('saved-count').textContent=saved.size?`已收藏 ${saved.size} 篇内容 · 保存在当前浏览器`:'点击书签，留待稍后阅读';
}

function renderHeader() {
  const {brief,dates,syncedAt}=state.payload;
  $('intro-text').textContent=brief.intro||'今天的精选已准备好。挑一篇感兴趣的内容，开始阅读吧。';
  $('intro-text').classList.remove('loading-copy');
  $('keywords').innerHTML=brief.keywords.map(x=>`<span class="keyword"># ${esc(x)}</span>`).join('');
  $('date-select').innerHTML=dates.map(x=>`<option value="${esc(x)}" ${x===brief.date?'selected':''}>${dateLong(x)}</option>`).join('');
  $('date-badge').textContent=brief.date===currentDate()?'今日':dates[0]===brief.date?'最新一期':'往期';
  const i=dates.indexOf(brief.date);$('previous').disabled=i>=dates.length-1;$('next').disabled=i<=0;
  const time=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit'}).format(new Date(syncedAt));
  $('sync-status').innerHTML=`<span class="live-dot"></span>${esc(time)} 更新`;
  $('total-count').textContent=brief.items.length;$('deep-count').textContent=brief.items.filter(x=>x.deepRead).length;
  $('stat-total').textContent=brief.items.length;$('stat-sources').textContent=new Set(brief.items.map(x=>x.source).filter(Boolean)).size;
  const counts={};brief.items.forEach(x=>counts[x.type]=(counts[x.type]||0)+1);
  $('type-stats').innerHTML=Object.entries(counts).map(([type,n])=>`<div class="type-stat">${icon(typeIcons[type]||'book')}<span>${esc(typeNames[type]||type)}</span><strong>${n} 篇</strong></div>`).join('');
  $('archive-list').innerHTML=dates.slice(0,6).map((date,i)=>`<button class="archive-date ${date===brief.date?'current':''}" data-date="${esc(date)}"><span>${dateLabel(date,false)}</span><span>${i===0?'最新':date.slice(0,4)} ${icon('chevron-right')}</span></button>`).join('');
  updateProgress();
}

function card(item,index) {
  const href=safeUrl(item.url||item.readUrl);
  const img=safeUrl(item.cover);
  return `<article class="article-card" style="animation-delay:${Math.min(index,5)*25}ms" data-id="${esc(item.id)}">
    <div class="card-body"><div class="source-line"><span class="source-icon">${esc(item.source.slice(0,1)||'读')}</span><span class="source-name">${esc(item.source)}</span><span class="source-separator">·</span><span>${esc(typeNames[item.type]||'文章')}</span>${item.readTime?`<span class="source-separator">·</span><span>${esc(item.readTime)} 分钟</span>`:''}</div>
    <h3>${href?`<a href="${href}" target="_blank" rel="noopener noreferrer" data-action="open" data-id="${esc(item.id)}">${esc(item.title)}</a>`:`<button data-action="detail" data-id="${esc(item.id)}">${esc(item.title)}</button>`}</h3>
    <p class="article-summary">${esc(item.summary||(href?'打开原文，阅读这篇精选内容。':'BestBlogs 暂未返回这篇内容的摘要与原文链接。'))}</p>
    <div class="card-footer">${item.tags.slice(0,2).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}${item.deepRead?`<span class="deep-label">${icon('sparkles')}值得深读</span>`:''}<div class="card-actions"><button class="icon-button" data-action="detail" data-id="${esc(item.id)}" aria-label="阅读摘要：${esc(item.title)}" title="阅读摘要">${icon('book')}</button><button class="icon-button ${saved.has(item.id)?'saved':''}" data-action="save" data-id="${esc(item.id)}" aria-pressed="${saved.has(item.id)}" aria-label="${saved.has(item.id)?'取消收藏':'收藏'}：${esc(item.title)}" title="稍后阅读">${icon('bookmark')}</button><button class="icon-button ${read.has(item.id)?'read':''}" data-action="read" data-id="${esc(item.id)}" aria-pressed="${read.has(item.id)}" aria-label="${read.has(item.id)?'标记未读':'标记已读'}：${esc(item.title)}" title="标记已读">${icon('check')}</button></div></div></div>
    <div class="card-media">${img?`<img class="card-image" src="${img}" alt="" loading="lazy" referrerpolicy="no-referrer">`:`<div class="card-image-placeholder">${icon(typeIcons[item.type]||'book')}</div>`}${item.score!==null?`<div class="score">BestBlogs 评分 <strong>${esc(item.score)}</strong></div>`:''}</div></article>`;
}

function filteredItems() {
  return (state.payload?.brief.items||[]).filter(x=>(!state.deep||x.deepRead)&&(state.type==='ALL'||x.type===state.type||(state.type==='TWITTER'&&x.type==='TWEET'))&&(!state.query||[x.title,x.summary,x.source,...x.tags].join(' ').toLowerCase().includes(state.query)));
}
function renderList() {
  const items=filteredItems();
  $('articles').innerHTML=items.length?items.slice(0,state.limit).map(card).join(''):`<div class="empty-state">${icon('search')}<p>没有找到匹配的内容</p><span>试试其他关键词，或切换内容类型。</span></div>`;
  $('articles').setAttribute('aria-busy','false');
  $('load-more').hidden=items.length<=state.limit;
  $('list-end').hidden=items.length===0||items.length>state.limit;
  $('all-tab').classList.toggle('active',!state.deep);$('all-tab').setAttribute('aria-selected',String(!state.deep));
  $('deep-tab').classList.toggle('active',state.deep);$('deep-tab').setAttribute('aria-selected',String(state.deep));
  $('articles').querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{const fallback=document.createElement('div');fallback.className='card-image-placeholder';fallback.innerHTML=icon('book');img.replaceWith(fallback);},{once:true}));
}

async function load(date, initial=false) {
  const request=++state.request;
  $('articles').setAttribute('aria-busy','true');
  $('sync-status').textContent='正在同步早报…';
  try {
    let response, payload;
    if(dataMode==='static') {
      response=await fetch('./briefs.json',{cache:'no-cache',signal:AbortSignal.timeout(20000)});
      const manifest=await response.json();
      payload=manifest;
      if(date&&date!==manifest.brief?.date){
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!manifest.dates.includes(date))throw new Error('这个日期还没有早报。');
        response=await fetch(`./data/${encodeURIComponent(date)}.json`,{signal:AbortSignal.timeout(20000)});
        payload={...await response.json(),dates:manifest.dates};
      }
    } else {
      response=await fetch(`./api/brief${date?'?date='+encodeURIComponent(date):''}`,{signal:AbortSignal.timeout(30000)});
      payload=await response.json();
    }
    if(!response.ok||!payload.brief)throw new Error(payload.error||'暂时无法同步早报。');
    if(request!==state.request)return;
    state.payload=payload;state.limit=10;notice('');
    try {localStorage.setItem('brief-cache',JSON.stringify(payload));}catch{}
    if(!date&&payload.brief.date!==currentDate())notice('今日早报尚未出刊，先读最近一期。');
  } catch(error) {
    if(request!==state.request)return;
    let fallback=null;
    if(initial){try{fallback=JSON.parse(localStorage.getItem('brief-cache'));}catch{}}
    if(!fallback&&initial){try{const r=await fetch('./briefs.json');if(r.ok)fallback=await r.json();}catch{}}
    if(request!==state.request)return;
    if(fallback?.brief&&(!date||fallback.brief.date===date))state.payload=fallback;
    if(!state.payload){
      $('intro-text').textContent='早报暂时还没准备好。请稍后再来看看。';
      $('articles').innerHTML=`<div class="empty-state">${icon('coffee')}<p>早报暂时无法同步</p></div>`;
      $('articles').setAttribute('aria-busy','false');$('sync-status').textContent='同步暂不可用';
      notice(error.message==='The operation was aborted due to timeout'?'同步超时，请稍后重试。':error.message,true);return;
    }
    notice(`同步暂不可用，正在显示 ${state.payload.brief.date} 的已保存早报。`,true);
  }
  if(request!==state.request)return;
  renderHeader();renderList();
  const u=new URL(location.href);u.searchParams.set('date',state.payload.brief.date);history.replaceState(null,'',u);
  document.title=`${state.payload.brief.date} · 我的早报`;
}

function showDetail(id) {
  const item=state.payload.brief.items.find(x=>x.id===id);if(!item)return;
  const original=safeUrl(item.url);const bestblogs=safeUrl(item.readUrl);
  $('detail-content').innerHTML=`<div class="source-line">${esc(item.source)} <span>·</span> ${esc(typeNames[item.type]||'文章')} ${item.readTime?`<span>·</span> ${esc(item.readTime)} 分钟`:''}</div><h2>${esc(item.title)}</h2><p>${esc(item.fullSummary||item.summary||(original||bestblogs?'请打开原文阅读完整内容。':'BestBlogs 暂未返回这篇内容的详情或链接，请稍后再试。'))}</p>${item.points.length?`<h3>核心要点</h3><ul>${item.points.map(p=>`<li><strong>${esc(p.title)}</strong>${p.text?'：'+esc(p.text):''}</li>`).join('')}</ul>`:''}<div class="dialog-links">${original?`<a class="button primary" href="${original}" target="_blank" rel="noopener noreferrer" data-action="open" data-id="${esc(id)}">阅读原文 ${icon('external')}</a>`:''}${bestblogs?`<a class="button" href="${bestblogs}" target="_blank" rel="noopener noreferrer">在 BestBlogs 阅读 ${icon('external')}</a>`:''}</div>`;
  $('detail-dialog').showModal();read.add(id);persist();updateProgress();renderList();
}

document.addEventListener('click',event=>{
  const el=event.target.closest('[data-action]');if(!el)return;
  const {action,id}=el.dataset;
  if(action==='detail'){showDetail(id);return;}
  if(action==='save'){if(saved.has(id)){saved.delete(id);toast('已取消收藏');}else{saved.add(id);toast('已收藏，稍后慢慢读');}}
  if(action==='read'){if(read.has(id))read.delete(id);else read.add(id);}
  if(action==='open')read.add(id);
  persist();updateProgress();
  if(action!=='open')renderList();
});
$('archive-list').addEventListener('click',event=>{const b=event.target.closest('[data-date]');if(b)load(b.dataset.date);});
$('date-select').addEventListener('change',event=>load(event.target.value));
$('previous').onclick=()=>{const {dates,brief}=state.payload||{};if(dates){const date=dates[dates.indexOf(brief.date)+1];if(date)load(date);}};
$('next').onclick=()=>{const {dates,brief}=state.payload||{};if(dates){const date=dates[dates.indexOf(brief.date)-1];if(date)load(date);}};
$('search').addEventListener('input',event=>{state.query=event.target.value.trim().toLowerCase();state.limit=10;renderList();});
$('type-select').onchange=event=>{state.type=event.target.value;state.limit=10;renderList();};
$('all-tab').onclick=()=>{state.deep=false;state.limit=10;renderList();};
$('deep-tab').onclick=()=>{state.deep=true;state.limit=10;renderList();};
document.querySelector('.view-tabs').addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();state.deep=!state.deep;state.limit=10;renderList();$(state.deep?'deep-tab':'all-tab').focus();}});
$('load-more').onclick=()=>{state.limit+=10;renderList();};
$('close-dialog').onclick=()=>$('detail-dialog').close();
$('detail-dialog').addEventListener('click',event=>{if(event.target===$('detail-dialog')){const r=$('detail-dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('detail-dialog').close();}});
$('theme-toggle').onclick=()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';try{localStorage.setItem('brief-theme',dark?'dark':'light');}catch{}$('theme-toggle').innerHTML=icon(dark?'sun':'moon');};
$('share').onclick=async()=>{
  if(!state.payload)return toast('早报还在加载中');
  const url=new URL(location.href);url.searchParams.set('date',state.payload.brief.date);
  try{await navigator.clipboard.writeText(url.href);toast('本期早报链接已复制，分享给同事吧');}
  catch{const input=document.createElement('input');input.value=url.href;input.style.cssText='position:fixed;top:-100px';document.body.append(input);input.select();const ok=document.execCommand('copy');input.remove();if(ok)toast('本期早报链接已复制');else{notice('本期分享链接：'+url.href);toast('请复制页面上显示的分享链接');}}
};
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();$('search').focus();}});
try { const response=await fetch('./config.json'); if(response.ok)dataMode=(await response.json()).mode; } catch {}
await load(new URL(location.href).searchParams.get('date')||undefined,true);
