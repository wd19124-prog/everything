/* amap-kit.js 高德地点搜索 地理编码 路线时间 统一接入层 失败时自动回退开源数据 */
(function(){
'use strict';
var CFG=window.AMAP_CONFIG||{},enabled=!!(CFG.key&&CFG.securityJsCode),loading=null,disabledUntil=0,lastGap=0,chain=Promise.resolve();
var rawFetch=window.fetch.bind(window);
function inChina(lng,lat){return window.MapCoord?!window.MapCoord.outOfChina(lng,lat):(lng>72&&lng<137.9&&lat>0.8&&lat<55.9);}
function usable(){return enabled&&Date.now()>=disabledUntil;}
function disable(info,ms){disabledUntil=Date.now()+(ms||30*60*1000);window.__amapError=info;try{console.warn('高德服务暂不可用:',info);}catch(e){}}
function toGcj(lng,lat){return window.MapCoord?window.MapCoord.gcj(lng,lat):[lng,lat];}
function toWgs(lng,lat){var x=lng,y=lat;for(var i=0;i<3;i++){var g=toGcj(x,y);x+=lng-g[0];y+=lat-g[1];}return [x,y];}
function ll(o){if(!o)return null;var lng=typeof o.getLng==='function'?o.getLng():o.lng,lat=typeof o.getLat==='function'?o.getLat():o.lat;return isFinite(lng)&&isFinite(lat)?[+lng,+lat]:null;}
function load(){
  if(!enabled)return Promise.reject(new Error('no key'));
  if(window.AMap&&window.AMap.PlaceSearch)return Promise.resolve(window.AMap);
  if(loading)return loading;
  window._AMapSecurityConfig={securityJsCode:CFG.securityJsCode};
  loading=new Promise(function(res,rej){
    var s=document.createElement('script'),t=setTimeout(function(){rej(new Error('timeout'));},9000);
    s.src='https://webapi.amap.com/maps?v=2.0&key='+encodeURIComponent(CFG.key)+'&plugin=AMap.PlaceSearch,AMap.Geocoder,AMap.Driving,AMap.Walking,AMap.AutoComplete';
    s.async=true;
    s.onload=function(){clearTimeout(t);if(window.AMap&&AMap.plugin)AMap.plugin(['AMap.PlaceSearch','AMap.Geocoder','AMap.Driving','AMap.Walking','AMap.AutoComplete'],function(){res(window.AMap);});else rej(new Error('no AMap'));};
    s.onerror=function(){clearTimeout(t);rej(new Error('script error'));};
    document.head.appendChild(s);
  }).catch(function(e){loading=null;disable('load:'+e.message,10*60*1000);throw e;});
  return loading;
}
/* 串行排队 间隔150毫秒 避免超过个人Key的每秒请求限制 */
function queue(fn){var p=chain.then(function(){var w=Math.max(0,lastGap+150-Date.now());return new Promise(function(r){setTimeout(r,w);});}).then(function(){lastGap=Date.now();return fn();});chain=p.catch(function(){});return p;}
var FATAL=/INVALID_USER_KEY|USERKEY_PLAT_NOMATCH|INVALID_USER_SCODE|INVALID_USER_DOMAIN|DAILY_QUERY_OVER_LIMIT|ACCESS_TOO_FREQUENT|USER_DOMAIN_NOT_MATCH|OVER_QUOTA/;
function settle(status,result,ok){
  if(status==='complete')return ok(result);
  if(status==='no_data')return ok(null);
  var info=String((result&&(result.info||result))||'error');if(FATAL.test(info))disable(info);return Promise.reject(new Error(info));
}
function search(opt,center,radius,keyword){
  return load().then(function(AMap){return queue(function(){return new Promise(function(res,rej){
    var ps=new AMap.PlaceSearch(Object.assign({pageSize:50,pageIndex:1,extensions:'all',citylimit:false},opt));
    var cb=function(status,result){settle(status,result,function(r){res(r&&r.poiList?r.poiList.pois||[]:[]);}).catch(rej);};
    try{if(center)ps.searchNearBy(keyword||'',center,radius,cb);else ps.search(keyword,cb);}catch(e){rej(e);}
    setTimeout(function(){rej(new Error('search timeout'));},9000);});});});
}
function catOf(type,name){var s=type+' '+name;
  if(/餐饮/.test(type))return 'food';
  if(/博物馆|展览馆|美术馆|科技馆|纪念馆|图书馆|艺术馆/.test(s))return 'museum';
  if(/文物古迹|寺庙|道观|教堂|名人故居|古建|遗址|古城|故宫|祠|陵|塔/.test(s))return 'history';
  if(/步行街|美食街|商业街|夜市|老街|古街/.test(s))return 'district';
  if(/度假|休闲|娱乐|洗浴|温泉|影剧院|游乐|水上乐园/.test(s))return 'leisure';
  return 'nature';}
function toPlace(p){
  var c=ll(p.location);if(!c||!p.name)return null;var w=toWgs(c[0],c[1]),type=String(p.type||''),segs=type.split(';'),rating=parseFloat(p.rating||(p.biz_ext&&p.biz_ext.rating)||0)||0,cost=p.cost||(p.biz_ext&&p.biz_ext.cost)||'';
  var cat=catOf(type,p.name),desc=[segs[segs.length-1],String(p.address||'').slice(0,22),rating?'评分'+rating:'',cost?'人均'+cost+'元':''].filter(Boolean).join(' · ').slice(0,78);
  var score=(rating?(rating-3)*3:0)+((p.photos&&p.photos.length)?1:0)+(p.tel?1:0)+(/风景名胜/.test(type)?3:0)+(/5A|4A/.test(p.name)?3:0);
  return {n:p.name,c:cat,lat:w[1],lng:w[0],qualityScore:Math.max(0,Math.round(score*10)/10),tags:{'description:zh':desc,'addr:province':p.pname||'','addr:district':p.adname||'',website:p.website||'',amap:'1'}};
}
var TYPES=[['110000'],['050000'],['080300|080400|080500'],['140100|140200|140400|140600']];
async function around(lat,lng,opt){
  opt=opt||{};var radii=opt.radii||[3000],limit=opt.limit||90,want=opt.want||30,all=[],g=toGcj(lng,lat);
  for(var i=0;i<radii.length;i++){
    var r=Math.min(50000,radii[i]);
    var lists=await Promise.all(TYPES.map(function(t){return search({type:t[0]},g,r).catch(function(e){if(!usable())throw e;return [];});}));
    lists.forEach(function(l){(l||[]).forEach(function(p){all.push(toPlace(p));});});
    var got=window.PoiSource.pick(all,limit);if(got.length>=want){return got;}
  }
  return window.PoiSource.pick(all,limit);
}
function geocode(name,city){
  return load().then(function(AMap){return queue(function(){return new Promise(function(res,rej){
    var g=new AMap.Geocoder({city:city||'全国'});
    g.getLocation(name,function(status,result){settle(status,result,function(r){var x=r&&r.geocodes&&r.geocodes[0];var c=x&&ll(x.location);res(c?{x:x,c:c}:null);}).catch(rej);});
    setTimeout(function(){rej(new Error('geocode timeout'));},8000);});});});
}
function regeo(lng,lat){
  var g=toGcj(lng,lat);
  return load().then(function(AMap){return queue(function(){return new Promise(function(res,rej){
    var gc=new AMap.Geocoder({radius:500,extensions:'base'});
    gc.getAddress(g,function(status,result){settle(status,result,function(r){res(r&&r.regeocode?r.regeocode:null);}).catch(rej);});
    setTimeout(function(){rej(new Error('regeo timeout'));},8000);});});});
}
function drive(a,b){
  var ga=toGcj(a[0],a[1]),gb=toGcj(b[0],b[1]);
  return load().then(function(AMap){return queue(function(){return new Promise(function(res,rej){
    var d=new AMap.Driving({policy:AMap.DrivingPolicy?AMap.DrivingPolicy.LEAST_TIME:0});
    d.search(new AMap.LngLat(ga[0],ga[1]),new AMap.LngLat(gb[0],gb[1]),function(status,result){settle(status,result,function(r){var rt=r&&r.routes&&r.routes[0];res(rt?{duration:+rt.time,distance:+rt.distance}:null);}).catch(rej);});
    setTimeout(function(){rej(new Error('drive timeout'));},12000);});});});
}

/* 路线 返回耗时 距离 与沿路折线 折线坐标为高德坐标 */
function route(a,b,mode){
  var ga=toGcj(a[0],a[1]),gb=toGcj(b[0],b[1]);
  return load().then(function(AMap){return queue(function(){return new Promise(function(res,rej){
    var r=mode==='walk'?new AMap.Walking({}):new AMap.Driving({policy:AMap.DrivingPolicy?AMap.DrivingPolicy.LEAST_TIME:0});
    r.search(new AMap.LngLat(ga[0],ga[1]),new AMap.LngLat(gb[0],gb[1]),function(status,result){settle(status,result,function(x){
      var rt=x&&x.routes&&x.routes[0];if(!rt)return res(null);var path=[];(rt.steps||[]).forEach(function(st){(st.path||[]).forEach(function(p){var c=ll(p);if(c)path.push(c);});});
      res({duration:+rt.time,distance:+rt.distance,path:path});}).catch(rej);});
    setTimeout(function(){rej(new Error('route timeout'));},12000);});});});
}

/* 输入联想 全局匹配 优先名称完全一致 再按前缀 再按包含 分店与商场内门店靠后 */
var lastTips={};
function suggest(q,city){
  return load().then(function(AMap){return queue(function(){return new Promise(function(res,rej){
    var ac=new AMap.AutoComplete({city:city||'全国',citylimit:!!city,datatype:'poi'});
    ac.search(q,function(status,result){settle(status,result,function(r){res((r&&r.tips)||[]);}).catch(rej);});
    setTimeout(function(){rej(new Error('suggest timeout'));},7000);});});});
}
function rank(q,tips){
  var ql=String(q).toLowerCase();
  return (tips||[]).filter(function(t){return t&&t.name&&ll(t.location);}).map(function(t,i){
    var n=String(t.name).toLowerCase(),at=n.indexOf(ql),pi=n.search(/[(（]/),s=0;
    if(n===ql)s=100;else if(at===0)s=80;else if(at>0)s=50;
    if(at>0&&pi>=0&&at>pi)s-=35;
    if(/^05/.test(String(t.typecode||''))&&at!==0)s-=10;
    return {t:t,s:s,i:i};
  }).sort(function(a,b){return b.s-a.s||a.i-b.i;}).map(function(o){return o.t;});
}
function remember(t){if(t&&t.name)lastTips[t.name]=t;}
function parseDistrict(d){
  d=String(d||'');var m=d.match(/^(北京市|上海市|天津市|重庆市|香港特别行政区|澳门特别行政区|.+?省|.+?自治区)?(.+?市|.+?自治州|.+?盟|.+?地区)?(.+?[区县旗市])?$/)||[];
  var prov=m[1]||'',city=m[2]||'',dist=m[3]||'';
  if(/^(北京市|上海市|天津市|重庆市)/.test(d)){prov=d.slice(0,3);city=prov;dist=d.slice(3);}
  return {prov:prov,city:city,dist:dist};
}
/* 把 Nominatim 请求转成高德请求 其余代码无需改动 */
function nominatimShape(item){
  var c=ll(item.location)||[0,0],w=toWgs(c[0],c[1]),prov=item.pname||(item.addressComponent&&item.addressComponent.province)||'',city=item.cityname||'',dist=item.adname||'';
  return {lat:String(w[1]),lon:String(w[0]),name:item.name,display_name:[item.name,item.address,dist,city||prov,prov,'中国'].filter(Boolean).join(', '),type:'amap',class:'place',importance:.5,address:{road:String(item.address||''),city:city||prov,city_district:dist,district:dist,county:dist,state:prov,country:'中国'}};
}
async function handleSearch(u){
  var q=(u.searchParams.get('q')||'').trim();if(!q)return null;
  var tk=q.split(/\s+/),kw=tk[0],city=(tk[1]&&/[市州盟县区]$/.test(tk[1]))?tk[1]:'';if(tk.length>1&&!city)kw=q;
  var out=[],lim=Math.min(+u.searchParams.get('limit')||8,10),tip=lastTips[kw]||lastTips[q];
  if(tip){var pd=parseDistrict(tip.district);out.push(nominatimShape({name:tip.name,address:String(tip.address||''),location:tip.location,pname:pd.prov,cityname:pd.city,adname:pd.dist}));}
  try{var g=await geocode(city?kw+' '+city:q,city||undefined);if(g&&g.x){var x=g.x,ac=x.addressComponent||{};out.push(nominatimShape({name:kw,address:x.formattedAddress,location:x.location,pname:ac.province,cityname:Array.isArray(ac.city)?'':ac.city,adname:ac.district}));}}catch(e){if(!usable())return null;}
  try{var pois=await search({city:city||'全国',citylimit:!!city,pageSize:lim},null,0,kw);(pois||[]).forEach(function(p){if(ll(p.location))out.push(nominatimShape(p));});}catch(e){}
  var seen={},res=out.filter(function(x){var k=x.name+x.lat.slice(0,6);if(seen[k])return false;seen[k]=1;return true;}).slice(0,lim);
  return res.length?res:null;
}
async function handleReverse(u){
  var lat=+u.searchParams.get('lat'),lng=+u.searchParams.get('lon');if(!isFinite(lat)||!inChina(lng,lat))return null;
  var r=await regeo(lng,lat);if(!r)return null;var a=r.addressComponent||{},prov=a.province||'',city=Array.isArray(a.city)?'':a.city;
  return {display_name:r.formattedAddress||'',address:{state:prov,city:city||prov,municipality:city?'':prov,city_district:a.district||'',district:a.district||'',suburb:a.township||'',road:(a.street||'')+(a.streetNumber||''),country:'中国'}};
}
async function handleRoute(u){
  var m=u.pathname.match(/driving\/([\d.]+),([\d.]+);([\d.]+),([\d.]+)/);if(!m)return null;
  var a=[+m[1],+m[2]],b=[+m[3],+m[4]];if(!inChina(a[0],a[1])||!inChina(b[0],b[1]))return null;
  var d=await drive(a,b);return d&&d.duration>0?{code:'Ok',routes:[{duration:d.duration,distance:d.distance}]}:null;
}
function respond(obj){return new Response(JSON.stringify(obj),{status:200,headers:{'Content-Type':'application/json'}});}
window.fetch=function(input,init){
  var url=typeof input==='string'?input:(input&&input.url)||'';
  if(usable()&&/^https:\/\/(nominatim\.openstreetmap\.org\/(search|reverse)|router\.project-osrm\.org\/route\/v1\/driving\/)/.test(url)){
    var u=new URL(url),h=/reverse/.test(u.pathname)?handleReverse:/route\/v1/.test(u.pathname)?handleRoute:handleSearch;
    return h(u).then(function(o){return o?respond(o):rawFetch(input,init);}).catch(function(){return rawFetch(input,init);});
  }
  return rawFetch(input,init);
};
/* 接入地点数据层 */
function hook(){
  var P=window.PoiSource;if(!P)return;var baseAround=P.around;
  P.around=async function(lat,lng,opt){
    if(usable()&&inChina(lng,lat)){
      try{var a=await around(lat,lng,opt);if(a.length>=3)return a;var b=await baseAround(lat,lng,opt);return P.pick(a.concat(b),(opt&&opt.limit)||90);}catch(e){}
    }
    return baseAround(lat,lng,opt);
  };
}
hook();
window.AmapKit={suggest:suggest,rank:rank,remember:remember,parseDistrict:parseDistrict,route:route,usable:usable,load:load,around:around,geocode:geocode,regeo:regeo,drive:drive,toWgs:toWgs,status:function(){return {enabled:enabled,error:window.__amapError||'',disabledUntil:disabledUntil};}};
if(enabled)setTimeout(function(){if(!window.MapCoord||window.MapCoord.useAmap)load().catch(function(){});},700);
})();
