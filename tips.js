/* tips.js 说明文字统一改为问号或感叹号提示 点击才显示 */
(function(){
'use strict';
var ICON={help:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',alert:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>'};
var pop=null,active=null;
function ensurePop(){if(pop)return pop;pop=document.createElement('div');pop.className='tip-pop';pop.setAttribute('role','tooltip');document.body.appendChild(pop);return pop;}
function show(btn){
  var p=ensurePop();p.textContent=btn.dataset.tip;p.classList.add('show');active=btn;
  var r=btn.getBoundingClientRect(),w=Math.min(280,innerWidth-24);p.style.width=w+'px';
  var left=Math.max(12,Math.min(innerWidth-w-12,r.left+r.width/2-w/2));
  p.style.left=left+'px';
  var below=r.bottom+10+p.offsetHeight<innerHeight-12;
  p.style.top=(below?r.bottom+10:Math.max(12,r.top-10-p.offsetHeight))+'px';
  p.style.setProperty('--ax',(r.left+r.width/2-left)+'px');p.dataset.dir=below?'down':'up';
}
function hide(){if(pop)pop.classList.remove('show');active=null;}
document.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('.tip-btn');
  if(b){e.preventDefault();e.stopPropagation();if(active===b)hide();else show(b);return;}
  if(active&&!e.target.closest('.tip-pop'))hide();
},true);
window.addEventListener('scroll',hide,true);window.addEventListener('resize',hide);
document.addEventListener('keydown',function(e){if(e.key==='Escape')hide();});
function make(text,kind){var b=document.createElement('button');b.type='button';b.className='tip-btn';b.dataset.tip=text;b.setAttribute('aria-label','查看说明');b.innerHTML=ICON[kind||'help'];return b;}
function txt(el){return String(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim();}
function done(el){el.dataset.tipped='1';}
function merge(host,text,kind){
  var ex=host.querySelector(':scope > .tip-btn');
  if(ex){ex.dataset.tip+='\n'+text;return;}
  host.appendChild(make(text,kind));
}
function convert(root){
  root=root||document;
  /* 地点详情页 来源 编辑说明 照片说明 实用信息说明 */
  var dc=root.querySelector&&root.querySelector('#detail-content');
  if(dc){
    var head=dc.querySelector('.detail-head h2');
    dc.querySelectorAll('.detail-card').forEach(function(card){
      if(card.dataset.tipped)return;var h=card.querySelector('h3'),p=card.querySelector('p'),name=h?h.textContent.replace(/[+＋]/g,'').trim():'';
      if(/编辑当前行程/.test(name)&&p){if(head)merge(head,txt(p),'help');card.remove();return;}
      if(/^照片/.test(name)&&p){merge(h,txt(p),'help');p.remove();done(card);return;}
      if(/实用信息|入住准备/.test(name)&&p&&/^开放、票价和预约规则以官方公告为准$/.test(txt(p))){merge(h,txt(p),'alert');p.remove();done(card);}
    });
    dc.querySelectorAll('.detail-note').forEach(function(n){if(head)merge(head,txt(n),'alert');n.remove();});
  }
  /* 行程页 滑动说明与住宿提示 */
  var ic=root.querySelector&&root.querySelector('#itinerary-content');
  if(ic){
    var sp=ic.querySelector('.ab-spacer')||ic.querySelector('.itinerary-top');
    ic.querySelectorAll('.app-note,.lodging-tip').forEach(function(n){if(sp)merge(sp,txt(n),'help');n.remove();});
    ic.querySelectorAll('.sync-box p').forEach(function(p){var h=p.parentNode.querySelector('h3,b,strong');if(h)merge(h,txt(p),'help');else p.parentNode.insertBefore(make(txt(p),'help'),p);p.remove();});
  }
  /* 弹出面板里的说明文字 */
  document.querySelectorAll('.trip-sheet > p,.planner-sheet > p').forEach(function(p){
    if(p.dataset.tipped||p.closest('.tip-pop'))return;var tx=txt(p);if(tx.length<8)return;
    var h=p.previousElementSibling;if(!h||!/^H[1-4]$/.test(h.tagName)){h=p.parentNode.querySelector('h1,h2,h3,h4');}
    if(h){merge(h,tx,'help');p.remove();}
  });
  /* 其他常见提示类元素 */
  (root.querySelectorAll?root.querySelectorAll('.planner-hint,.sheet-hint,.form-hint,.field-hint,.hint,.sheet-note,.planner-note,[data-explain]'):[]).forEach(function(n){
    if(n.dataset.tipped||n.closest('.tip-pop'))return;var t=txt(n);if(t.length<6)return;n.parentNode.insertBefore(make(t,'help'),n);n.style.display='none';done(n);
  });
}
var raf=0;new MutationObserver(function(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;try{convert(document);}catch(e){}});}).observe(document.body,{childList:true,subtree:true});
convert(document);
window.Tips={make:make,convert:convert};
})();
