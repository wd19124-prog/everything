/* place-info.js 地点概况与值得去的理由 先即时生成 再用高德资料补充 */
(function(){
'use strict';
var KEY='sy-place-info-v1',cache={};
try{cache=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){cache={};}
function save(){try{var ks=Object.keys(cache);if(ks.length>240)ks.slice(0,ks.length-240).forEach(function(k){delete cache[k];});localStorage.setItem(KEY,JSON.stringify(cache));}catch(e){}}
function key(p){return String(p.city||'')+'|'+p.n;}
var TW={nature:'景点',museum:'博物馆',history:'历史文化景点',district:'特色街区',food:'餐厅',leisure:'休闲场所'};
function catName(p){return TW[p.c]||'地点';}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function region(p){var c=String(p.city||'').replace(/^附近$/,'');return c+(p.district||'');}
function compose(p,info){
  info=info||cache[key(p)]||{};
  var type=info.type?String(info.type).split(';').pop():catName(p),r=region(p);
  var s=p.n+'是'+(r?r+'的':'')+type+(info.address?'，位于'+info.address:'')+'。';
  if(info.rating)s+='高德评分'+info.rating+'。';
  if(info.cost)s+='人均约'+info.cost+'元。';
  if(info.opentime)s+='开放或营业时间：'+String(info.opentime).slice(0,48)+'。';
  return s;
}
var BY_CAT={nature:'适合安排半天以内的游览与拍照，建议避开节假日高峰',museum:'适合了解当地历史与文化，建议提前确认预约和闭馆日',history:'有历史文化价值，适合慢慢逛并了解背景故事',district:'适合步行闲逛、品尝小吃，傍晚和夜间氛围更好',food:'适合安排正餐，高峰时段可能需要排队',leisure:'适合行程中途休息放松'};
function reasons(p,info){
  info=info||cache[key(p)]||{};var out=[];
  if(p.famous)out.push('当地知名度较高，常被列入热门景点或老字号清单');
  var rt=parseFloat(info.rating);if(rt>=4.5)out.push('用户评分 '+rt+'，在同类地点中较高');else if(rt>=4.0)out.push('用户评分 '+rt+'，口碑稳定');
  if(info.cost)out.push('人均消费约 '+info.cost+' 元');
  var o=null;try{o=userPosition||discoverOrigin;}catch(e){}
  if(o&&typeof distanceKm==='function'){var d=distanceKm(o,p);if(isFinite(d)&&d<60)out.push('距离当前位置约 '+(d<1?Math.round(d*1000)+' 米':d.toFixed(1)+' 公里'));}
  if(BY_CAT[p.c])out.push(BY_CAT[p.c]);
  return out.slice(0,4);
}
function sim(a,b){var k=String(b).replace(/[()（）\s·]/g,'').slice(0,2);return String(a).indexOf(k)>=0;}
var pending={};
function load(p){
  var k=key(p);if(cache[k])return Promise.resolve(cache[k]);if(pending[k])return pending[k];
  pending[k]=(async function(){
    var info=null;
    try{
      if(window.AmapKit&&AmapKit.usable()&&(!window.MapCoord||!MapCoord.outOfChina(p.lng,p.lat))){
        var city=p.city&&p.city!=='附近'?p.city:'全国';
        var pois=await AmapKit.search({city:city,citylimit:city!=='全国',pageSize:5,extensions:'all'},null,0,p.n);
        for(var i=0;i<(pois||[]).length;i++){var q=pois[i],pl=AmapKit.toPlace(q);if(!pl||!sim(pl.n,p.n))continue;if(isFinite(p.lat)&&distanceKm(p,pl)>3)continue;
          info={type:q.type||'',address:Array.isArray(q.address)?'':String(q.address||''),rating:q.rating||(q.biz_ext&&q.biz_ext.rating)||'',cost:q.cost||(q.biz_ext&&q.biz_ext.cost)||'',opentime:q.opentime||q.opentime_today||(q.biz_ext&&q.biz_ext.opentime2)||'',tel:q.tel||'',photos:(q.photos||[]).map(function(x){return x.url;}).filter(Boolean).slice(0,6)};break;}
      }else{
        var c=new AbortController(),t=setTimeout(function(){c.abort();},2500);
        try{var r=await fetch('https://zh.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(p.n),{signal:c.signal});var d=r.ok?await r.json():null;if(d&&d.extract)info={type:'',address:'',summary:String(d.extract).slice(0,140)};}finally{clearTimeout(t);}
      }
    }catch(e){}
    if(!info)info={type:'',address:''};
    cache[k]=info;save();delete pending[k];return info;
  })();
  return pending[k];
}
window.PlaceInfo={compose:compose,reasons:reasons,load:load,get:function(p){return cache[key(p)]||null;},esc:esc};
var basePI=placeIntro;
placeIntro=function(p){
  var info=cache[key(p)];if(info)return info.summary||compose(p,info);
  var t='';try{t=basePI(p);}catch(e){}
  if(t&&!/正在|建议出发前查看|位于.*公开地图资料/.test(t)&&t.length>12)return t;
  return compose(p);
};
/* 地点详情页 即时显示概况与理由 后台补充 */
function decorate(p){
  var card=[].slice.call(document.querySelectorAll('#detail-content .detail-card')).find(function(c){var h=c.querySelector('h3');return h&&/推荐评价|地点概况/.test(h.textContent);});if(!card)return;
  var info=cache[key(p)],para=card.querySelector('p');
  card.querySelector('h3').textContent='地点概况';
  if(para)para.textContent=info&&info.summary?info.summary:compose(p,info);
  var ul=card.querySelector('.reason-list');if(!ul){ul=document.createElement('ul');ul.className='reason-list';var h4=document.createElement('h4');h4.className='reason-title';h4.textContent='值得去的理由';(para||card.lastChild).insertAdjacentElement('afterend',h4);h4.insertAdjacentElement('afterend',ul);}
  ul.innerHTML=reasons(p,info).map(function(r){return '<li>'+esc(r)+'</li>';}).join('');
}
var baseOpen=openDetail;
openDetail=function(name){baseOpen(name);var p=placeByName(name);if(!p)return;decorate(p);if(!cache[key(p)])load(p).then(function(){if(document.getElementById('detail-view')&&document.getElementById('detail-view').classList.contains('active'))decorate(p);});};
})();
