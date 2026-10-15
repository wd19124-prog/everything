/* poi-source.js 开源地点数据层 数据来自 OpenStreetMap Overpass 与 Photon 地名搜索 */
(function(){
'use strict';
var CITY_TABLE='北京 39.9042 116.4074;上海 31.2304 121.4737;天津 39.0842 117.2009;重庆 29.5630 106.5516;广州 23.1291 113.2644;深圳 22.5431 114.0579;成都 30.5728 104.0668;杭州 30.2741 120.1551;南京 32.0603 118.7969;武汉 30.5928 114.3055;西安 34.3416 108.9398;长沙 28.2282 112.9388;郑州 34.7466 113.6253;济南 36.6512 117.1201;青岛 36.0671 120.3826;沈阳 41.8057 123.4315;大连 38.9140 121.6147;哈尔滨 45.8038 126.5350;长春 43.8171 125.3235;石家庄 38.0428 114.5149;太原 37.8706 112.5489;呼和浩特 40.8426 111.7492;兰州 36.0611 103.8343;西宁 36.6171 101.7782;银川 38.4872 106.2309;乌鲁木齐 43.8256 87.6168;拉萨 29.6525 91.1721;昆明 25.0389 102.7183;贵阳 26.6470 106.6302;南宁 22.8170 108.3665;海口 20.0440 110.1999;三亚 18.2528 109.5120;福州 26.0745 119.2965;厦门 24.4798 118.0894;南昌 28.6820 115.8579;合肥 31.8206 117.2272;苏州 31.2989 120.5853;无锡 31.4912 120.3119;宁波 29.8683 121.5440;温州 28.0006 120.6994;珠海 22.2707 113.5767;东莞 23.0207 113.7518;佛山 23.0218 113.1219;桂林 25.2736 110.2900;丽江 26.8721 100.2299;大理 25.6065 100.2676;张家界 29.1170 110.4792;黄山 29.7144 118.3376;洛阳 34.6197 112.4540;开封 34.7972 114.3075;敦煌 40.1421 94.6618;烟台 37.4638 121.4479;威海 37.5130 122.1217;秦皇岛 39.9354 119.6005;承德 40.9515 117.9633;大同 40.0768 113.3001;景德镇 29.2688 117.1783;泉州 24.8741 118.6759;北海 21.4813 109.1201;鞍山 41.1087 122.9946;本溪 41.2971 123.7706;抚顺 41.8800 123.9570;丹东 40.0005 124.3547;锦州 41.0951 121.1270;营口 40.6670 122.2350;吉林 43.8378 126.5493;延吉 42.8913 129.5091;扬州 32.3932 119.4130;绍兴 30.0023 120.5792;嘉兴 30.7468 120.7555;常州 31.8112 119.9740;徐州 34.2058 117.2841;镇江 32.1877 119.4250;南通 31.9802 120.8943;惠州 23.1115 114.4152;中山 22.5176 113.3926;汕头 23.3541 116.6819;湛江 21.2707 110.3594;柳州 24.3264 109.4281;遵义 27.7254 106.9272;绵阳 31.4675 104.6796;乐山 29.5521 103.7656;宜昌 30.6919 111.2865;襄阳 32.0090 112.1226;岳阳 29.3570 113.1290;赣州 25.8310 114.9335;九江 29.7052 116.0019;潍坊 36.7069 119.1619;临沂 35.1041 118.3564;泰安 36.2003 117.0875;保定 38.8740 115.4646;唐山 39.6309 118.1802';
var CITIES={};CITY_TABLE.split(';').forEach(function(s){var p=s.split(' ');CITIES[p[0]]=[+p[1],+p[2]];});
var HOSTS=['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter','https://overpass.private.coffee/api/interpreter','https://overpass.openstreetmap.fr/api/interpreter','https://overpass.osm.ch/api/interpreter'];
var CACHE_KEY='sy-poi-cache-v2',mem={};
function norm(s){return String(s||'').trim().replace(/(特别行政区|自治州|地区|市|省)$/,'');}
function cacheGet(k){try{var c=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}')[k];return c&&Date.now()-c.t<24*36e5?c.v:null;}catch(e){return null;}}
function cacheSet(k,v){try{var c=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}'),ks=Object.keys(c);if(ks.length>12)delete c[ks[0]];c[k]={t:Date.now(),v:v};localStorage.setItem(CACHE_KEY,JSON.stringify(c));}catch(e){}}
function withTimeout(url,ms,opt){var c=new AbortController(),t=setTimeout(function(){c.abort();},ms);return fetch(url,Object.assign({signal:c.signal},opt||{})).finally(function(){clearTimeout(t);});}
function firstOk(tasks,ok){return new Promise(function(res){var n=tasks.length,done=false;if(!n)return res(null);tasks.forEach(function(p){Promise.resolve(p).then(function(v){if(!done&&ok(v)){done=true;res(v);}else if(!done&&--n===0)res(null);},function(){if(!done&&--n===0)res(null);});});});}

/* 查询语句 不再强制要求官网等标签 中国大陆的数据很少带这些标签 */
function query(lat,lng,r,cap){
  var a='(around:'+r+','+lat+','+lng+')';
  return '[out:json][timeout:12];('
   +'nwr'+a+'[tourism~"^(attraction|museum|gallery|zoo|theme_park|aquarium|viewpoint)$"][name];'
   +'nwr'+a+'[historic~"^(monument|memorial|castle|ruins|archaeological_site|building|city_gate|temple|tomb|wayside_shrine|fort|manor)$"][name];'
   +'nwr'+a+'[amenity=place_of_worship][name][~"^(wikidata|wikipedia|website|tourism|heritage|building)$"~"."];'
   +'nwr'+a+'[amenity~"^(restaurant|cafe|food_court|marketplace)$"][name];'
   +'nwr'+a+'[amenity~"^(theatre|arts_centre|cinema)$"][name];'
   +'nwr'+a+'[leisure~"^(park|garden|nature_reserve|water_park|spa|sauna)$"][name];'
   +'nwr'+a+'[natural~"^(peak|beach|waterfall|hot_spring|cave_entrance)$"][name];'
   +'nwr'+a+'[man_made~"^(tower|lighthouse|observatory)$"][name][tourism];'
   +'nwr'+a+'[shop=mall][name];'
   +');out center tags '+(cap||300)+';';
}
function overpass(lat,lng,r,cap){
  var q=encodeURIComponent(query(lat,lng,r,cap)),ctrls=HOSTS.map(function(){return new AbortController();});
  /* 错开发出请求 前两个立即发 其余每隔一秒再发 先返回的生效 其余取消 既快又不过度占用公共服务器 */
  var tasks=HOSTS.map(function(h,i){return new Promise(function(res){setTimeout(function(){
    if(ctrls[i].signal.aborted)return res(null);var t=setTimeout(function(){ctrls[i].abort();},9000);
    fetch(h+'?data='+q,{signal:ctrls[i].signal}).then(function(x){return x.ok?x.json():null;}).catch(function(){return null;}).finally(function(){clearTimeout(t);}).then(res);
  },i<2?0:(i-1)*1000);});});
  return firstOk(tasks,function(v){return v&&Array.isArray(v.elements)&&v.elements.length>0;}).then(function(d){ctrls.forEach(function(c){c.abort();});return d?d.elements:[];});
}
var CAT_W={museum:3,history:3,nature:2,district:2,leisure:1,food:0};
function score(t){var s=0;['wikidata','wikipedia','website','opening_hours','name:en','name:zh','description','heritage','operator','brand'].forEach(function(k){if(t[k])s+=1;});
  if(t.wikidata||t.wikipedia)s+=3;if(t.tourism==='attraction'||t.tourism==='museum'||t.tourism==='theme_park'||t.tourism==='zoo')s+=3;if(t.heritage)s+=2;if(/(5A|4A)/.test(t['tourism:level']||t.rating||''))s+=4;return s;}
function toPlace(el){var t=el.tags||{},name=t['name:zh']||t.name,lat=+(el.lat!=null?el.lat:el.center&&el.center.lat),lng=+(el.lon!=null?el.lon:el.center&&el.center.lon);
  if(!name||!isFinite(lat)||!isFinite(lng))return null;var c=nearbyCategory(t);if(!c)return null;if(t.amenity==='place_of_worship'||t.amenity==='cinema')c=t.amenity==='cinema'?'leisure':'history';if(t.leisure==='sauna')c='leisure';
  return {n:name,c:c,lat:lat,lng:lng,qualityScore:score(t),tags:t};}
/* 去重并按类别配额排序 保证景点 美食 休闲都有 */
function pick(list,limit){var seen={},out=[];list.forEach(function(p){if(p&&!seen[p.n]){seen[p.n]=1;out.push(p);}});
  out.sort(function(a,b){return b.qualityScore-a.qualityScore;});
  var quota={food:Math.round(limit*.35),leisure:Math.round(limit*.2)},cnt={},res=[],rest=[];
  out.forEach(function(p){var q=quota[p.c];cnt[p.c]=(cnt[p.c]||0);if(q!=null&&cnt[p.c]>=q){rest.push(p);return;}cnt[p.c]++;res.push(p);});
  return res.concat(rest).slice(0,limit);}
/* 逐级扩大范围直到够数 */
async function around(lat,lng,opt){
  opt=opt||{};var radii=opt.radii||[3000,9000,25000],want=opt.want||40,limit=opt.limit||90,key=lat.toFixed(2)+','+lng.toFixed(2)+','+radii.join('-');
  if(mem[key])return mem[key];var hit=cacheGet(key);if(hit&&hit.length)return hit;
  var all=[];for(var i=0;i<radii.length;i++){var els=await overpass(lat,lng,radii[i],opt.cap||300);all=all.concat(els.map(toPlace));var got=pick(all,limit);if(got.length>=want){all=got;break;}}
  var res=pick(all,limit);if(res.length){mem[key]=res;cacheSet(key,res);}return res;}
/* 地名转坐标 内置城市表即时返回 其余用 Photon 与 Nominatim 同时查询 */
async function geocode(name){
  var n=norm(name);if(CITIES[n])return {lat:CITIES[n][0],lng:CITIES[n][1],source:'内置'};
  for(var k in CITIES){if(n&&(k.indexOf(n)===0||n.indexOf(k)===0))return {lat:CITIES[k][0],lng:CITIES[k][1],source:'内置'};}
  var q=encodeURIComponent(name);
  var t1=withTimeout('https://photon.komoot.io/api/?limit=1&q='+q,6000).then(function(r){return r.json();}).then(function(d){var f=d.features&&d.features[0];return f?{lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0],source:'photon'}:null;});
  var t2=withTimeout('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=zh-CN&q='+q,6000).then(function(r){return r.json();}).then(function(d){return d&&d[0]?{lat:+d[0].lat,lng:+d[0].lon,source:'nominatim'}:null;});
  return firstOk([t1,t2],function(v){return !!v;});}
window.PoiSource={around:around,geocode:geocode,CITIES:CITIES,toPlace:toPlace,pick:pick};
})();
