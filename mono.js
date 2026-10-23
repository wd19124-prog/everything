/* mono.js 把残留的渐变按钮统一成纯黑或浅灰 */
(function(){
'use strict';
function lum(bi){var m=String(bi).match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)||[];if(!m.length)return 0;var s=0;m.forEach(function(c){var n=c.match(/\d+/g).map(Number);s+=(0.299*n[0]+0.587*n[1]+0.114*n[2])/255;});return s/m.length;}
function scan(){
  document.querySelectorAll('button,a.app-button,.app-button,a.navigate-link').forEach(function(el){
    if(el.dataset.mono==='done'&&!el.classList.contains('mono-black')&&!el.classList.contains('mono-chip'))return;
    var bi=getComputedStyle(el).backgroundImage;
    if(!bi||bi.indexOf('gradient')<0)return;
    var pale=lum(bi)>0.88;
    el.classList.add(pale?'mono-chip':'mono-black');el.dataset.mono='done';
  });
}
var raf=0;new MutationObserver(function(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;try{scan();}catch(e){}});}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
scan();
})();
