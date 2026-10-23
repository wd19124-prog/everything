/* pulse-button.js 点赞与收藏按钮 移植自 React Bits 的 PulseHeart 原生JS版本 */
(function(){
'use strict';
var OUT=.4;
function back(k,c){var u=k-1;return 1+(c+1)*Math.pow(u,3)+c*u*u;}
function swellOf(t,c){return t<=0?0:t<OUT?1-Math.pow(1-t/OUT,3):1-back((t-OUT)/(1-OUT),c);}
function fmt(n){return new Intl.NumberFormat().format(n);}
function reduced(){return !!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);}
var ICONS={
 heart:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" vector-effect="non-scaling-stroke"/>',
 star:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" vector-effect="non-scaling-stroke"/>'
};
function mount(host,o){
  o=Object.assign({count:0,liked:false,icon:'heart',showCount:true,idleOutline:true,size:24,corner:32,likedColor:'#ff4d6d',idleColor:'#8e8e93',pillColor:'#f5f5f7',textColor:'#1c1c1e',duration:560,dotSize:.3,overshoot:1.7,beat:3,rollDuration:350,label:'点赞',onChange:null},o||{});
  var liked=!!o.liked,total=+o.count||0,shown={liked:liked,count:total},raf=0,rollTimer=0,viaPointer=false;
  var btn=document.createElement('button');btn.type='button';btn.className='pulse-heart';
  btn.setAttribute('aria-pressed',String(liked));btn.setAttribute('aria-label',o.label);
  btn.dataset.liked=String(liked);if(!o.idleOutline)btn.dataset.solid='';if(!o.showCount)btn.dataset.noCount='';
  var st=btn.style;st.setProperty('--ph-size',o.size+'px');st.setProperty('--ph-corner',o.corner+'px');st.setProperty('--ph-pill',o.pillColor);st.setProperty('--ph-idle',o.idleColor);st.setProperty('--ph-liked',o.likedColor);st.setProperty('--ph-text',o.textColor);st.setProperty('--ph-roll',o.rollDuration+'ms');st.setProperty('--ph-stroke',(1.5*o.size/24)+'px');
  btn.innerHTML='<span class="pulse-heart__pill"><span class="pulse-heart__heart" aria-hidden="true"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g>'+(ICONS[o.icon]||ICONS.heart)+'</g></svg></span>'+(o.showCount?'<span class="pulse-heart__count" aria-hidden="true"></span>':'')+'</span>';
  var pill=btn.querySelector('.pulse-heart__pill'),heart=btn.querySelector('.pulse-heart__heart'),glyph=btn.querySelector('g'),countEl=btn.querySelector('.pulse-heart__count');
  function paintCount(n){if(!countEl)return;countEl.innerHTML=[].map.call(fmt(n),function(ch){return '<span>'+ch+'</span>';}).join('');}
  function startRoll(from,to){
    if(!countEl||from===to)return;var a=fmt(from),b=fmt(to),up=to>from,changed=[];
    if(a.length===b.length)for(var i=0;i<b.length;i++)if(b[i]!==a[i])changed.push(i);
    var one=changed.length===1,cells=one?[].map.call(b,function(ch,i){return i===changed[0]?{t:up?a[i]:ch,b:up?ch:a[i]}:{c:ch};}):[{t:up?a:b,b:up?b:a}];
    countEl.innerHTML=cells.map(function(c){return c.c!==undefined?'<span>'+c.c+'</span>':'<span class="pulse-heart__slot"><span class="pulse-heart__roll"><span>'+c.t+'</span><span>'+c.b+'</span></span></span>';}).join('');
    var r=countEl.querySelector('.pulse-heart__roll');
    if(r){r.style.transition='none';r.style.transform='translateY('+(up?'0':'-1em')+')';r.getBoundingClientRect();r.style.transition='';r.style.transform='translateY('+(up?'-1em':'0')+')';}
    clearTimeout(rollTimer);rollTimer=setTimeout(function(){paintCount(shown.count);},o.rollDuration);
  }
  function sync(l,n){shown={liked:l,count:n};btn.dataset.liked=String(l);btn.setAttribute('aria-pressed',String(l));paintCount(n);}
  function run(nl,nc){
    btn.dataset.running='';var swapped=false,prev=0,t0=performance.now();
    function tick(now){
      var t=Math.min(1,(now-t0)/o.duration),step=prev?now-prev:1000/60;prev=now;
      var s=swellOf(t,o.overshoot),k=1-(1-o.dotSize)*s;
      glyph.setAttribute('transform','translate(12 12) scale('+k+') translate(-12 -12)');
      pill.style.transform='scale('+(1-(o.beat/100)*s)+')';
      if(!swapped&&t+step/2/o.duration>=OUT){swapped=true;btn.dataset.liked=String(nl);btn.setAttribute('aria-pressed',String(nl));startRoll(shown.count,nc);shown={liked:nl,count:nc};}
      if(t<1){raf=requestAnimationFrame(tick);return;}
      raf=0;glyph.removeAttribute('transform');pill.style.transform='';delete btn.dataset.running;
    }
    raf=requestAnimationFrame(tick);
  }
  btn.addEventListener('pointerdown',function(e){if(e.button!==0)return;viaPointer=true;if(!reduced())btn.dataset.pressed='';});
  ['pointerup','pointerleave'].forEach(function(n){btn.addEventListener(n,function(){delete btn.dataset.pressed;});});
  btn.addEventListener('pointercancel',function(){viaPointer=false;delete btn.dataset.pressed;});
  btn.addEventListener('keydown',function(){viaPointer=false;});
  btn.addEventListener('click',function(e){
    if(raf)return;var pointer=viaPointer&&e.detail!==0;viaPointer=false;
    var nl=!liked,nc=total+(nl?1:-1);liked=nl;total=nc;
    if(o.onChange)try{o.onChange(nl,nc);}catch(x){}
    if(pointer&&!reduced())run(nl,nc);else sync(nl,nc);
  });
  paintCount(total);host.textContent='';host.appendChild(btn);
  return {set:function(l,n){liked=!!l;total=+n||0;sync(liked,total);}};
}
window.PulseButton={mount:mount};

/* 帖子卡片 点赞与收藏 */
var LIKE_KEY='sy-liked-posts';
function readLikes(){try{return JSON.parse(localStorage.getItem(LIKE_KEY)||'{}')||{};}catch(e){return {};}}
function mountPosts(root){
  var likes=readLikes();
  root.querySelectorAll('[data-pulse-like]').forEach(function(h){
    var id=h.dataset.pulseLike,post=socialPosts.find(function(p){return p.id===id;});if(!post)return;
    PulseButton.mount(h,{icon:'heart',label:'点赞',liked:!!likes[id],count:post.likes||0,onChange:function(l,n){var m=readLikes();if(l)m[id]=1;else delete m[id];try{localStorage.setItem(LIKE_KEY,JSON.stringify(m));}catch(e){}post.likes=Math.max(0,n);persistState();}});
  });
  root.querySelectorAll('[data-pulse-fav]').forEach(function(h){
    var id=h.dataset.pulseFav;
    PulseButton.mount(h,{icon:'star',label:'收藏',showCount:false,liked:!!favoritePosts[id],onChange:function(l){favoritePosts[id]=l;persistState();}});
  });
}
renderPostCard=function(post){
  var images=Array.isArray(post.images)?post.images:[];
  return '<article class="social-post" data-post-id="'+post.id+'"><div class="social-user"><span class="social-avatar">●</span><b>'+post.user+'</b><small>'+post.city+' · '+post.category+'</small></div><h3>'+post.title+'</h3><p>'+post.body+'</p>'
   +(images.length?'<div class="post-images">'+images.map(function(src,i){return '<img class="post-image" src="'+src+'" alt="'+post.title+' 图片 '+(i+1)+'">';}).join('')+'</div>':'')
   +'<div class="social-actions"><span class="pulse-slot" data-pulse-fav="'+post.id+'"></span><span class="pulse-slot" data-pulse-like="'+post.id+'"></span>'+(isOwnPost(post)?'<button type="button" class="post-delete" data-post-delete="'+post.id+'">删除</button>':'')+'</div></article>';
};
var baseBind=bindTastePostActions;
bindTastePostActions=function(root){baseBind(root);mountPosts(root);};
})();
