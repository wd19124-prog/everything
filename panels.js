/* panels.js 我的页面 花费 回忆 品味 统一返回按钮与排版 */
(function(){
'use strict';
var CHEV='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
var IMG='<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
var GO='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function unifyBack(){
  document.querySelectorAll('#expenses-back,#my-back,#taste-back,#album-back,.back-icon').forEach(function(b){
    if(b.dataset.panelBack)return;b.dataset.panelBack='1';b.classList.add('panel-back');b.innerHTML=CHEV;if(!b.getAttribute('aria-label'))b.setAttribute('aria-label','返回');
  });
}
var raf=0;new MutationObserver(function(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;unifyBack();});}).observe(document.body,{childList:true,subtree:true});unifyBack();
function photosOf(city){return Object.entries(placePhotos).filter(function(e){return placeCity(placeByName(e[0]))===city;}).reduce(function(a,e){return a.concat(e[1]);},[]);}
renderMemoryPanel=function(root){
  var cities=myCities(),total=Object.values(placePhotos).reduce(function(n,a){return n+a.length;},0);
  root.innerHTML='<div class="my-head"><h2>相册</h2><button id="my-back" type="button" aria-label="返回我的">‹</button></div>'
   +'<button type="button" class="album-all" data-memory-city="__all__"><span><b>全部城市</b><small>'+total+' 张照片</small></span>'+GO+'</button>'
   +(cities.length?'<div class="album-grid">'+cities.map(function(c){var ph=photosOf(c),cover=ph[0];return '<button type="button" class="album-city'+(cover?' has-cover':'')+'" data-memory-city="'+esc(c)+'"'+(cover?' style="background-image:url(\''+esc(cover)+'\')"':'')+'><span class="album-count">'+ph.length+'</span><b>'+esc(c)+'</b></button>';}).join('')+'</div>'
    :'<div class="album-empty">'+IMG+'<b>还没有照片</b><small>在地点详情里添加照片后 会按城市整理在这里</small></div>');
  var h=root.querySelector('.my-head h2');if(h&&window.Tips)h.appendChild(Tips.make('完成行程并添加照片后 这里会出现你的城市足迹','help'));
  root.querySelector('#my-back').onclick=renderMyHome;
  root.querySelectorAll('[data-memory-city]').forEach(function(x){x.onclick=function(){openCityAlbum(x.dataset.memoryCity);};});
  unifyBack();
};
})();
