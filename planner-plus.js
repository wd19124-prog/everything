/* planner-plus.js 行程规划增强 知名地点与顺路美食 交通详情填写 */
(function(){
'use strict';
var RAW='北京|故宫博物院,天安门广场,八达岭长城,颐和园,天坛公园,北海公园,景山公园,恭王府,南锣鼓巷,国家博物馆|全聚德,便宜坊,东来顺,护国寺小吃,四季民福烤鸭店\n上海|外滩,豫园,上海博物馆,东方明珠广播电视塔,武康路,田子坊,朱家角古镇,南京路步行街,静安寺|南翔馒头店,小杨生煎,老正兴菜馆,绿波廊,吉祥馄饨\n广州|广州塔,沙面,陈家祠,上下九步行街,越秀公园,白云山,北京路步行街,永庆坊|陶陶居,莲香楼,广州酒家,点都德,银记肠粉\n深圳|世界之窗,深圳湾公园,大梅沙,东门老街,莲花山公园,深圳博物馆,大鹏所城|点都德,润园四季,深圳东门老街小吃\n成都|宽窄巷子,锦里古街,武侯祠,杜甫草堂,成都大熊猫繁育研究基地,都江堰景区,春熙路,文殊院,人民公园|陈麻婆豆腐,钟水饺,龙抄手,夫妻肺片,蜀大侠火锅\n重庆|洪崖洞,解放碑,磁器口古镇,长江索道,人民大礼堂,李子坝轻轨穿楼,山城步道|小天鹅火锅,秦妈火锅,陶德砂锅,重庆小面\n杭州|西湖,灵隐寺,雷峰塔,河坊街,西溪国家湿地公园,宋城,龙井村,岳王庙|楼外楼,知味观,外婆家,奎元馆,新丰小吃\n西安|秦始皇帝陵博物院,西安城墙,大雁塔,钟楼,鼓楼,回民街,陕西历史博物馆,大唐不夜城,华清宫,小雁塔|老孙家泡馍,同盛祥泡馍,贾三灌汤包,子午路张记肉夹馍,樊记腊牛肉夹馍\n南京|中山陵,夫子庙,总统府,明孝陵,南京博物院,玄武湖,侵华日军南京大屠杀遇难同胞纪念馆,鸡鸣寺|南京大牌档,刘长兴,莲湖糕团店,夫子庙小吃\n苏州|拙政园,虎丘,寒山寺,平江路,山塘街,留园,苏州博物馆,周庄古镇,狮子林|松鹤楼,得月楼,朱鸿兴,同得兴,哑巴生煎\n武汉|黄鹤楼,东湖风景区,湖北省博物馆,户部巷,武汉长江大桥,汉口江滩,古琴台,归元寺|蔡林记,老通城,四季美汤包,户部巷小吃\n长沙|橘子洲,岳麓山,岳麓书院,湖南省博物馆,太平老街,坡子街,天心阁|火宫殿,文和友,茶颜悦色,杨裕兴\n厦门|鼓浪屿,南普陀寺,厦门大学,环岛路,曾厝垵,中山路步行街,胡里山炮台|黄则和花生汤,沙坡尾,中山路小吃\n青岛|栈桥,八大关,青岛啤酒博物馆,崂山风景区,五四广场,小青岛,青岛天主教堂|劈柴院,春和楼,船歌鱼水饺\n大连|星海广场,老虎滩海洋公园,金石滩,旅顺口,俄罗斯风情街,滨海路,大连森林动物园|天兴居,大连海鲜\n沈阳|沈阳故宫,张氏帅府,北陵公园,中街,九一八历史博物馆,辽宁省博物馆,棋盘山|老边饺子,马家烧麦,李连贵熏肉大饼,西塔朝鲜族美食\n哈尔滨|中央大街,圣索菲亚教堂,太阳岛,防洪纪念塔,冰雪大世界,东北虎林园|老厨家,华梅西餐厅,马迭尔\n天津|天津之眼,五大道,古文化街,意大利风情区,瓷房子,天津博物馆|狗不理,十八街麻花,耳朵眼炸糕,桂发祥\n郑州|河南博物院,少林寺,黄河风景名胜区,二七纪念塔,郑州城隍庙|合记烩面,蔡记蒸饺\n洛阳|龙门石窟,白马寺,洛阳博物馆,丽景门,老君山,应天门|真不同饭店,洛阳水席\n济南|趵突泉,大明湖,千佛山,曲水亭街,黑虎泉|聚丰德,老济南小吃\n昆明|滇池,石林,翠湖公园,云南民族村,昆明动物园,金马碧鸡坊|福照楼,官渡古镇小吃\n丽江|丽江古城,玉龙雪山,束河古镇,黑龙潭公园,木府|丽江古城小吃\n大理|大理古城,崇圣寺三塔,洱海,喜洲古镇,苍山|喜洲粑粑\n桂林|漓江,象鼻山,两江四湖,阳朔西街,龙脊梯田,独秀峰|崇善米粉,桂林米粉\n三亚|天涯海角,亚龙湾,南山文化旅游区,蜈支洲岛,大东海|第一市场海鲜,春园海鲜广场\n海口|骑楼老街,假日海滩,海口火山口公园|海口骑楼小吃\n贵阳|黔灵山公园,青岩古镇,甲秀楼|青岩古镇小吃\n拉萨|布达拉宫,大昭寺,八廓街,罗布林卡|八廓街藏餐\n兰州|中山桥,白塔山公园,甘肃省博物馆,水车博览园|马子禄牛肉面,兰州牛肉面\n乌鲁木齐|新疆国际大巴扎,红山公园,新疆维吾尔自治区博物馆|新疆国际大巴扎美食\n太原|晋祠,山西博物院,双塔寺|晋祠小吃\n大同|云冈石窟,悬空寺,华严寺,大同古城|大同刀削面\n南昌|滕王阁,八一起义纪念馆,秋水广场|南昌拌粉\n福州|三坊七巷,鼓山,西湖公园|三坊七巷小吃\n泉州|开元寺,清净寺,西街,洛阳桥|泉州西街小吃\n宁波|天一阁,老外滩,东钱湖,月湖|缸鸭狗\n无锡|灵山大佛,鼋头渚,无锡古运河,惠山古镇|王兴记,三凤桥\n扬州|瘦西湖,个园,东关街,何园|富春茶社,冶春茶社\n黄山|黄山风景区,宏村,西递,屯溪老街|屯溪老街小吃\n张家界|张家界国家森林公园,天门山,大峡谷玻璃桥|张家界三下锅\n呼和浩特|大召寺,内蒙古博物院,昭君博物院|烧麦\n银川|西夏王陵,镇北堡西部影城|银川手抓羊肉\n西宁|塔尔寺,青海湖,青海省博物馆|西宁小吃\n合肥|包公园,三河古镇,安徽博物院|合肥小吃\n石家庄|正定古城,赵州桥,西柏坡|正定小吃\n秦皇岛|山海关,北戴河,老龙头|秦皇岛海鲜\n承德|避暑山庄,外八庙|承德小吃\n烟台|蓬莱阁,烟台山|烟台海鲜\n威海|刘公岛,成山头|威海海鲜\n珠海|珠海渔女,长隆海洋王国,圆明新园|珠海海鲜\n潮州|广济桥,牌坊街|潮汕牛肉火锅\n北海|涠洲岛,银滩|北海海鲜';
var FAMOUS={};RAW.split('\n').forEach(function(l){var p=l.split('|');if(p.length<3)return;FAMOUS[p[0]]={see:p[1].split(','),eat:p[2].split(',')};});
window.FAMOUS_PLACES=FAMOUS;
function cityKey(dest){var d=String(dest||'').replace(/(市|地区|自治州)$/,'');return FAMOUS[d]?d:Object.keys(FAMOUS).find(function(k){return d.indexOf(k)===0||k.indexOf(d)===0&&d.length>1;})||'';}
function sim(a,b){a=String(a||'');b=String(b||'');var k=b.replace(/[()（）\s·]/g,'').slice(0,2);return a.indexOf(k)>=0;}
/* 查找某个知名地点 在目标城市里 取最相关的一条 */
async function find(name,city,center,radiusKm){
  try{
    var pois=await AmapKit.search({city:city,citylimit:true,pageSize:5},null,0,name);
    for(var i=0;i<(pois||[]).length;i++){var pl=AmapKit.toPlace(pois[i]);if(!pl||!sim(pl.n,name))continue;if(center&&distanceKm(center,pl)>(radiusKm||80))continue;return pl;}
  }catch(e){}
  return null;
}
/* 某个位置附近评分高的餐厅 */
async function nearFood(anchor){
  try{
    var g=window.AmapKit.toWgs?[anchor.lng,anchor.lat]:null;var c=MapCoord.gcj(anchor.lng,anchor.lat);
    var pois=await AmapKit.search({type:'050000',pageSize:20},c,1800,'');
    return (pois||[]).map(function(p){return AmapKit.toPlace(p);}).filter(Boolean).filter(function(p){return (p.qualityScore||0)>=2.4;}).sort(function(a,b){return b.qualityScore-a.qualityScore;}).slice(0,6);
  }catch(e){return [];}
}
function addPlace(x,dest,bonus,famous){
  var tg=x.tags||{};
  var exist=places.find(function(p){return !p.retired&&p.n===x.n&&String(p.city||'')===dest;});
  if(exist){if(famous)exist.qualityScore=Math.max(exist.qualityScore||0,x.qualityScore+bonus);return exist;}
  var p={n:x.n,c:x.c,lat:x.lat,lng:x.lng,city:dest,province:tg['addr:province']||'',district:tg['addr:district']||'',districtVerified:Boolean(tg['addr:district']),custom:true,famous:!!famous,qualityScore:(x.qualityScore||0)+(bonus||0),t:(window.tagIntro?tagIntro(tg):'')||(dest+' · '+((categories[x.c]||{}).name||'地点'))};
  p.i=places.length;places.push(p);try{addPlaceMarker(p);}catch(e){}return p;
}
var baseLoad=loadPlanningDestinationPlaces;
loadPlanningDestinationPlaces=async function(){
  var n0=await baseLoad();
  var dest=(planningState.destination||'').trim();
  if(!(window.AmapKit&&AmapKit.usable())||!dest)return n0;
  var key=cityKey(dest),geo=await PoiSource.geocode(dest),center=geo?{lat:geo.lat,lng:geo.lng}:null,added=0;
  try{
    var seeds=key?FAMOUS[key]:null,famousPlaces=[];
    if(seeds){
      var res=await Promise.all(seeds.see.map(function(nm){return find(nm,key+'市',center,60);}).concat(seeds.eat.map(function(nm){return find(nm,key+'市',center,40);})));
      res.forEach(function(x,i){if(x){var isSee=i<seeds.see.length;if(isSee)x.c=(x.c==='food'?'nature':x.c);else x.c='food';var p=addPlace(x,dest,isSee?9:7,true);famousPlaces.push(p);added++;}});
    }
    /* 以主要景点为中心 找附近评分高的餐厅 */
    var anchors=places.filter(function(p){return !p.retired&&String(p.city||'')===dest&&p.c!=='food';}).sort(function(a,b){return (b.qualityScore||0)-(a.qualityScore||0);}).slice(0,6);
    var foods=await Promise.all(anchors.map(nearFood));
    foods.forEach(function(list){list.forEach(function(x){addPlace(x,dest,1,false);added++;});});
  }catch(e){}
  planningState.lookupCount=(planningState.lookupCount||0)+added;planningState.lookupFailed=planningState.lookupCount===0;
  return planningState.lookupCount;
};


/* 景点候选只保留评分与知名度靠前的 避免推荐冷门地点 */
var basePDP=plannerDestinationPlaces,wantFoods=false;
plannerDestinationPlaces=function(){
  var all=basePDP(),foods=all.filter(function(p){return p.c==='food';}),sights=all.filter(function(p){return p.c!=='food';});
  sights.sort(function(a,b){return (b.qualityScore||0)-(a.qualityScore||0);});
  var days=(typeof planningDays==='function'?planningDays().length:3)||3;
  var moodFood=((planningState.answers||{}).mood||[]).join('').indexOf('当地美食')>=0;
  var top=sights.slice(0,Math.max(10,days*4));
  return (wantFoods||moodFood)?top.concat(foods):top;
};

/* 每日用餐 选择顺路并评分高的真实餐厅 */
function kindBonus(label,p){var x=String(p.n||'')+' '+String(p.t||'');if(label==='早餐')return (/早|包子|粥|面|豆浆|饼|小吃|汤包|煎饼|茶/.test(x)?4:0)-(/火锅|烧烤|烤鸭|海鲜|酒|烤肉|串/.test(x)?6:0);if(label==='午餐')return /早点|豆浆/.test(x)?-3:0;return /早点|豆浆|粥铺/.test(x)?-4:0;}
function parseHours(s){var m=String(s||'').match(/([0-9]+(?:\.[0-9]+)?)小时/);return m?+m[1]:0;}
function hm(t){var m=String(t||'').match(/(\d{1,2}):(\d{2})/);return m?(+m[1])*60+(+m[2]):0;}
addDailyMeals=function(plan,usedNames){
  var slots=[['早餐','08:00',480],['午餐','12:00',720],['晚餐','18:00',1080]];
  wantFoods=true;var foods;try{foods=plannerDestinationPlaces().filter(function(p){return p.c==='food'&&isFinite(+p.lat)&&isFinite(+p.lng);});}finally{wantFoods=false;}
  plan.forEach(function(day){
    var tr=day.events.filter(function(e){return e.type==='transport';}),drive=tr.some(function(e){return /^自驾交通/.test(e.name);});
    var spots=day.events.filter(function(e){return e.type!=='transport'&&e.type!=='meal'&&placeByName(e.name);}).map(function(e){var p=placeByName(e.name);return {e:e,p:p};});
    var first=tr.length?tr.slice().sort(function(a,b){return hm(a.time)-hm(b.time);})[0]:null;
    var outbound=first&&/去程/.test(first.name),back=first&&/返程/.test(first.name);
    var arrive=outbound?hm(first.time)+parseHours(first.duration)*60:0,leave=back?hm(first.time):1e9;
    var dayCenter=typeof dayPlanCentroid==='function'?dayPlanCentroid(day):null;
    slots.forEach(function(sl){
      var label=sl[0],time=sl[1],mins=sl[2];
      if(drive){day.events.push({time:time,name:label+' · 交通途中',duration:'约45分钟',note:'自驾途中就近安排 优先选择高速服务区或沿途县城里评价较好的餐厅',type:'meal-hint'});return;}
      if(mins<arrive||mins>leave-30)return;
      var anchor=null;
      var before=spots.filter(function(s){return hm(s.e.time)<=mins+30;}),after=spots.filter(function(s){return hm(s.e.time)>mins-30;});
      var pick=label==='早餐'?(spots[0]):(before.length?before[before.length-1]:spots[0]);
      if(label==='晚餐'&&spots.length)pick=spots[spots.length-1];
      anchor=pick?pick.p:dayCenter;
      var cand=foods.filter(function(p){return !usedNames.has(String(p.n||'').trim().toLowerCase());});
      var best=cand.map(function(p){var d=anchor?distance(anchor,p):0,sc=(Number(p.qualityScore||0))*(p.famous?1.4:1)-d*2.2+kindBonus(label,p);return {p:p,d:d,sc:sc};}).sort(function(a,b){return b.sc-a.sc;})[0];
      if(best&&(!anchor||best.d<=6)){
        usedNames.add(String(best.p.n).trim().toLowerCase());
        var km=anchor?(best.d).toFixed(1):'';
        day.events.push({time:time,name:best.p.n,duration:label+' · 约1小时',note:(best.p.t||'')+(km&&pick?' · 距'+pick.p.n+'约'+km+'公里':''),type:'meal'});
      }else if(!tr.length){
        day.events.push({time:time,name:label+' · 行程区域附近',duration:'约1小时',note:'当前没有查到合适的餐厅 请就近选择评价较好的店',type:'meal-hint'});
      }
    });
    day.events.sort(function(a,b){return String(a.time).localeCompare(String(b.time),'zh-CN');});
    day.route=day.events.map(function(e){return e.name;}).join(' → ');
  });
  return plan;
};
function distance(a,b){return distanceKm?distanceKm(a,b):0;}

/* 交通详情 可自行填写机票 高铁等信息与费用 */
var MODES=['飞机','高铁','火车','自驾','大巴','其他'];
function curEvent(name){var d=itinerary[typeof currentDay==='function'?currentDay():0];return d&&(d.events||[]).find(function(e){return e.name===name;});}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function defaultsOf(e){var t=e.transport||{},m=/飞机/.test(e.name)?'飞机':/火车/.test(e.name)?'高铁':/自驾/.test(e.name)?'自驾':'其他';
  var route=String(e.note||'').split('；')[0]||'',parts=route.split('→');
  return {mode:t.mode||m,no:t.no||'',from:t.from||(parts[0]||'').trim(),to:t.to||(parts[1]||'').trim(),dep:t.dep||e.time||'',arr:t.arr||'',cost:t.cost==null?'':t.cost,memo:t.memo||''};}
function openSheet(ev){
  closeSheet(true);var v=defaultsOf(ev),box=document.createElement('div');box.id='tp-sheet';box.className='tp-wrap';
  box.innerHTML='<div class="tp-backdrop"></div><section class="tp-sheet" role="dialog" aria-label="交通详情"><div class="tp-grip"></div><h3>'+esc(ev.name)+'</h3>'
   +'<div class="tp-modes">'+MODES.map(function(m){return '<button type="button" data-m="'+m+'" class="'+(m===v.mode?'on':'')+'">'+m+'</button>';}).join('')+'</div>'
   +'<label>航班号 或 车次<input id="tp-no" value="'+esc(v.no)+'" placeholder="例如 MU5101 或 G1234"></label>'
   +'<div class="tp-row"><label>出发地<input id="tp-from" value="'+esc(v.from)+'" placeholder="出发机场或车站"></label><label>到达地<input id="tp-to" value="'+esc(v.to)+'" placeholder="到达机场或车站"></label></div>'
   +'<div class="tp-row"><label>出发时间<input id="tp-dep" type="time" value="'+esc(v.dep)+'"></label><label>到达时间<input id="tp-arr" type="time" value="'+esc(v.arr)+'"></label></div>'
   +'<label>费用 元<input id="tp-cost" type="number" inputmode="decimal" min="0" step="0.01" value="'+esc(v.cost)+'" placeholder="机票或车票总费用"></label>'
   +'<label>备注<textarea id="tp-memo" rows="2" placeholder="座位 订单号 取票信息">'+esc(v.memo)+'</textarea></label>'
   +'<div class="tp-actions"><button type="button" class="tp-clear">清除</button><button type="button" class="tp-save">保存</button></div></section>';
  document.body.appendChild(box);requestAnimationFrame(function(){box.classList.add('open');});
  var mode=v.mode;
  box.querySelectorAll('[data-m]').forEach(function(b){b.onclick=function(){mode=b.dataset.m;box.querySelectorAll('[data-m]').forEach(function(x){x.classList.toggle('on',x===b);});};});
  box.querySelector('.tp-backdrop').onclick=function(){closeSheet();};
  box.querySelector('.tp-clear').onclick=function(){delete ev.transport;(function(){var rest=(expenses[ev.name]||[]).filter(function(x){return !x.transportCost;});if(rest.length)expenses[ev.name]=rest;else delete expenses[ev.name];})();persistState();closeSheet();renderItinerary();};
  box.querySelector('.tp-save').onclick=function(){
    var t={mode:mode,no:box.querySelector('#tp-no').value.trim(),from:box.querySelector('#tp-from').value.trim(),to:box.querySelector('#tp-to').value.trim(),dep:box.querySelector('#tp-dep').value,arr:box.querySelector('#tp-arr').value,cost:box.querySelector('#tp-cost').value,memo:box.querySelector('#tp-memo').value.trim()};
    ev.transport=t;if(t.dep)ev.time=t.dep;
    var cost=parseFloat(t.cost),day=itinerary[typeof currentDay==='function'?currentDay():0]||{};
    var rest=(expenses[ev.name]||[]).filter(function(x){return !x.transportCost;});
    if(isFinite(cost)&&cost>0)rest.push({amount:cost,currency:'CNY',category:'交通',date:day.date||window.selectedDate,city:'',note:[t.mode,t.no].filter(Boolean).join(' '),transportCost:true});
    if(rest.length)expenses[ev.name]=rest;else delete expenses[ev.name];
    persistState();closeSheet();renderItinerary();
  };
}
function closeSheet(now){var b=document.getElementById('tp-sheet');if(!b)return;if(now){b.remove();return;}b.classList.remove('open');setTimeout(function(){b.remove();},320);}
document.addEventListener('click',function(e){
  var card=e.target.closest&&e.target.closest('.app-card.transport-card[data-detail]');if(!card)return;
  var ev=curEvent(card.dataset.detail);if(!ev)return;
  e.stopImmediatePropagation();e.preventDefault();openSheet(ev);
},true);
var baseRI=renderItinerary;
renderItinerary=function(){
  baseRI.apply(this,arguments);
  document.querySelectorAll('#itinerary-content .app-card.transport-card[data-detail]').forEach(function(c){
    var ev=curEvent(c.dataset.detail);if(!ev||c.querySelector('.tp-hint'))return;
    var t=ev.transport,txt=t?[t.mode,t.no,(t.from&&t.to?t.from+' → '+t.to:''),(t.dep?t.dep+(t.arr?' - '+t.arr:''):''),(t.cost?'费用 ¥'+t.cost:'')].filter(Boolean).join(' · '):'点击填写机票 车次与费用';
    c.insertAdjacentHTML('beforeend','<div class="tp-hint'+(t?' filled':'')+'">'+esc(txt)+'</div>');
  });
};
})();
