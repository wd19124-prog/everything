/* china-coords.js 中国地图坐标与底图 高德底图使用国测局坐标 其他数据使用 GPS 坐标 这里统一转换 */
(function(){
'use strict';
var PI=Math.PI,A=6378245.0,EE=0.00669342162296594323;
function out(lng,lat){return lng<72.004||lng>137.8347||lat<0.8293||lat>55.8271;}
function tLat(x,y){var r=-100+2*x+3*y+.2*y*y+.1*x*y+.2*Math.sqrt(Math.abs(x));r+=(20*Math.sin(6*x*PI)+20*Math.sin(2*x*PI))*2/3;r+=(20*Math.sin(y*PI)+40*Math.sin(y/3*PI))*2/3;r+=(160*Math.sin(y/12*PI)+320*Math.sin(y*PI/30))*2/3;return r;}
function tLng(x,y){var r=300+x+2*y+.1*x*x+.1*x*y+.1*Math.sqrt(Math.abs(x));r+=(20*Math.sin(6*x*PI)+20*Math.sin(2*x*PI))*2/3;r+=(20*Math.sin(x*PI)+40*Math.sin(x/3*PI))*2/3;r+=(150*Math.sin(x/12*PI)+300*Math.sin(x/30*PI))*2/3;return r;}
function gcj(lng,lat){
  if(out(lng,lat))return [lng,lat];
  var dLat=tLat(lng-105,lat-35),dLng=tLng(lng-105,lat-35),rad=lat/180*PI,m=Math.sin(rad);m=1-EE*m*m;var s=Math.sqrt(m);
  dLat=(dLat*180)/((A*(1-EE))/(m*s)*PI);dLng=(dLng*180)/(A/s*Math.cos(rad)*PI);
  return [lng+dLng,lat+dLat];
}
var saved=null;try{saved=JSON.parse(localStorage.getItem('sy-last-position')||'null');}catch(e){}
var useAmap=!(saved&&Number.isFinite(saved.lng)&&out(saved.lng,saved.lat));
function toMap(lng,lat){return useAmap?gcj(lng,lat):[lng,lat];}
function conv(ll){if(!ll)return ll;var a=Array.isArray(ll)?ll:[ll.lng!==undefined?ll.lng:ll.lon,ll.lat];return toMap(a[0],a[1]);}
function style(){
  var amap=['1','2','3','4'].map(function(n){return 'https://webrd0'+n+'.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';});
  var carto=['a','b','c','d'].map(function(n){return 'https://'+n+'.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';});
  return {version:8,sources:{base:{type:'raster',tiles:useAmap?amap:carto,tileSize:256,maxzoom:useAmap?18:19,attribution:useAmap?'© 高德地图':'© OpenStreetMap contributors © CARTO'}},
    layers:[{id:'app-white-background',type:'background',paint:{'background-color':'#f4f5f8'}},{id:'base-tiles',type:'raster',source:'base',paint:{'raster-fade-duration':150}}]};
}
function fallbackTiles(){return useAmap?['1','2','3','4'].map(function(n){return 'https://wprd0'+n+'.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7';}):['https://tile.openstreetmap.org/{z}/{x}/{y}.png'];}
if(window.maplibregl){
  var ms=maplibregl.Marker.prototype.setLngLat;
  maplibregl.Marker.prototype.setLngLat=function(ll){return ms.call(this,conv(ll));};
  ['flyTo','easeTo','jumpTo'].forEach(function(k){var o=maplibregl.Map.prototype[k];
    maplibregl.Map.prototype[k]=function(opt){if(opt&&opt.center)opt=Object.assign({},opt,{center:conv(opt.center)});return o.apply(this,[opt].concat([].slice.call(arguments,1)));};});
}
window.MapCoord={toMap:toMap,gcj:gcj,outOfChina:out,style:style,fallbackTiles:fallbackTiles,get useAmap(){return useAmap;}};
})();
