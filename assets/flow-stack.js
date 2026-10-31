/* A single accessible stack for the existing site notifications in Flow mode. */
(() => {
  const root = document.documentElement;
  const seen = new WeakSet();
  const notices = [];
  const lifetime = 8000;
  let container, trigger, frontIcon, frontText, badge, closeFront, list, live;
  let timer = 0, paused = false, hovering = false, keyboardFocus = false, keyboardInput = false, pinned = false;
  const flowOn = () => root.dataset.glass === 'on';
  const en = () => root.lang === 'en';
  const tr = (ar, english) => en() ? english : ar;
  function icon(type, source) {
    const original = type === 'battery' && source && source.querySelector('svg');
    if (original) { const copy = original.cloneNode(true); copy.removeAttribute('id'); copy.setAttribute('aria-hidden', 'true'); return copy; }
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true');
    const circle = document.createElementNS(ns,'circle');
    circle.setAttribute('cx','12'); circle.setAttribute('cy','12'); circle.setAttribute('r','10'); circle.setAttribute('fill','currentColor');
    const path = document.createElementNS(ns,'path');
    path.setAttribute('d', type === 'error' ? 'M8.5 8.5l7 7m0-7-7 7' : 'M7.5 12l3 3 6-6');
    path.setAttribute('fill','none'); path.setAttribute('stroke','#fff'); path.setAttribute('stroke-width','2'); path.setAttribute('stroke-linecap','round'); path.setAttribute('stroke-linejoin','round');
    svg.append(circle,path); return svg;
  }
  function make(tag, cls) { const e=document.createElement(tag); if(cls)e.className=cls; return e; }
  function removeEntry(id) {
    const index=notices.findIndex(n=>n.id===id);
    if(index<0)return;
    const [removed]=notices.splice(index,1);
    if (removed.source && removed.source.classList.contains('sg-toast') && removed.source.isConnected) removed.source.remove();
    if(notices.length<=1)pinned=false;
    render(); updatePause();
  }
  function syncExpanded() {
    if(!container)return;
    const expanded=notices.length>1 && (hovering || keyboardFocus || pinned);
    container.classList.toggle('is-expanded',expanded);
    trigger.setAttribute('aria-expanded',String(expanded));
    list.hidden=!expanded;
    updatePause();
  }
  function updatePause() {
    const shouldPause=notices.length>0 && (hovering || keyboardFocus || pinned);
    if(shouldPause && !paused){
      const now=Date.now(); for(const n of notices)n.remaining=Math.max(0,n.expires-now);
      paused=true; clearTimeout(timer);
    } else if(!shouldPause && paused){
      paused=false; const now=Date.now(); for(const n of notices)n.expires=now+n.remaining;
    }
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if(paused || !notices.length)return;
    const next=Math.min(...notices.map(n=>n.expires));
    timer=setTimeout(()=>{
      const now=Date.now();
      for(let i=notices.length-1;i>=0;i--)if(notices[i].expires<=now)notices.splice(i,1);
      if(notices.length<=1)pinned=false;
      render(); updatePause();
    },Math.max(0,next-Date.now()));
  }
  function build() {
    if(container)return;
    container=make('section','sg-flow-stack');
    container.setAttribute('aria-label',tr('إشعارات الموقع','Site notifications'));
    const front=make('div','sg-flow-stack-front');
    trigger=make('button','sg-flow-stack-trigger'); trigger.type='button';
    trigger.setAttribute('aria-controls','sg-flow-stack-list'); trigger.setAttribute('aria-expanded','false');
    frontIcon=make('span','sg-flow-stack-icon'); frontText=make('span','sg-flow-stack-text'); frontText.setAttribute('dir','auto'); badge=make('span','sg-flow-stack-count');
    trigger.append(frontIcon,frontText,badge);
    closeFront=make('button','sg-flow-stack-close'); closeFront.type='button'; closeFront.textContent='×';
    closeFront.addEventListener('click',()=>{if(notices[0])removeEntry(notices[0].id);});
    front.append(trigger,closeFront);
    list=make('div','sg-flow-stack-list'); list.id='sg-flow-stack-list'; list.hidden=true;
    live=make('span','sg-flow-stack-live'); live.setAttribute('role','status'); live.setAttribute('aria-live','polite');
    container.append(front,list,live);
    trigger.addEventListener('click',()=>{ if(notices.length<2)return; pinned=!pinned; syncExpanded(); });
    container.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'||event.pointerType==='pen'){hovering=true;syncExpanded();}});
    container.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'||event.pointerType==='pen'){hovering=false;syncExpanded();}});
    container.addEventListener('focusin',()=>{if(keyboardInput){keyboardFocus=true;syncExpanded();}});
    container.addEventListener('focusout',event=>{if(container && !container.contains(event.relatedTarget)){keyboardFocus=false;syncExpanded();}});
    document.body.append(container);
  }
  function render() {
    if(!notices.length){
      if(container){container.remove(); container=trigger=frontIcon=frontText=badge=closeFront=list=live=null;}
      clearTimeout(timer); paused=hovering=keyboardFocus=pinned=false;
      return;
    }
    build();
    const first=notices[0];
    container.dataset.stacked=String(notices.length>1);
    container.setAttribute('aria-label',tr('إشعارات الموقع','Site notifications'));
    trigger.disabled=notices.length<2;
    trigger.setAttribute('aria-label',notices.length>1 ? tr(`${notices.length} إشعارات، اضغط لعرضها`,`${notices.length} notifications, press to expand`) : first.text);
    frontIcon.replaceChildren(icon(first.type,first.source)); frontIcon.dataset.type=first.type;
    frontText.textContent=first.text; badge.textContent=notices.length>1 ? String(notices.length) : '';
    badge.hidden=notices.length<2;
    closeFront.setAttribute('aria-label',tr('إغلاق أحدث إشعار','Dismiss latest notification'));
    const children=notices.slice(1).map(n=>{
      const row=make('div','sg-flow-stack-item');
      const ico=make('span','sg-flow-stack-icon'); ico.dataset.type=n.type; ico.append(icon(n.type,n.source));
      const msg=make('span','sg-flow-stack-text'); msg.setAttribute('dir','auto'); msg.textContent=n.text;
      const close=make('button','sg-flow-stack-close'); close.type='button'; close.textContent='×';
      close.setAttribute('aria-label',tr('إغلاق الإشعار','Dismiss notification'));
      close.addEventListener('click',()=>removeEntry(n.id)); row.append(ico,msg,close); return row;
    });
    list.replaceChildren(...children);
    syncExpanded();
  }
  let serial=0;
  function add(source) {
    if(seen.has(source))return;
    seen.add(source);
    const title=source.querySelector('[data-title]');
    const description=source.querySelector('[data-description]');
    const text=title ? [title.textContent,description && description.textContent].filter(Boolean).join(' — ').trim() : source.textContent.trim();
    if(!text)return;
    const type=source.classList.contains('sg-power-toast') ? 'battery' : source.getAttribute('data-type') === 'error' ? 'error' : 'success';
    const n={id:++serial,text,type,source,remaining:lifetime,expires:Date.now()+lifetime};
    notices.unshift(n); render(); if(live)live.textContent=text; updatePause();
  }
  function inspect(node) {
    if(node.nodeType!==1)return;
    if(node.matches('.sg-toast,[data-sonner-toast]'))add(node);
    node.querySelectorAll('.sg-toast,[data-sonner-toast]').forEach(add);
  }
  function reset() {
    notices.splice(0); clearTimeout(timer); paused=hovering=keyboardFocus=pinned=false;
    if(container)container.remove();
    container=trigger=frontIcon=frontText=badge=closeFront=list=live=null;
  }
  function start() {
    const observer=new MutationObserver(records=>{
      if(!flowOn())return;
      for(const record of records)for(const node of record.addedNodes)inspect(node);
    });
    observer.observe(document.body,{childList:true,subtree:true});
    new MutationObserver(()=>{if(!flowOn())reset();else if(container)render();}).observe(root,{attributes:true,attributeFilter:['data-glass','lang']});
    document.addEventListener('keydown',event=>{if(event.key==='Tab')keyboardInput=true;});
    document.addEventListener('pointerdown',()=>{keyboardInput=false;});
    root.classList.add('sg-flow-stack-ready');
  }
  if(document.body)start(); else document.addEventListener('DOMContentLoaded',start,{once:true});
})();
