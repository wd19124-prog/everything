import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'trip-app-browser-'));
const port = 9400 + Math.floor(Math.random() * 300);
const appUrl = new URL('./index.html', import.meta.url).href;
const browser = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions',
  '--disable-background-networking', '--allow-file-access-from-files',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, appUrl,
], { stdio: 'ignore' });

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function targetSocket() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
      const page = targets.find(target => target.type === 'page' && target.url.includes('index.html'));
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await delay(100);
  }
  throw new Error('Chrome DevTools target did not become ready');
}

try {
  const socket = new WebSocket(await targetSocket());
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message));
    else waiter.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) {
      const detail = response.exceptionDetails.exception?.description || response.exceptionDetails.text;
      throw new Error(detail);
    }
    return response.result.value;
  };

  let appReady = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await evaluate(`typeof showView === 'function'`)) { appReady = true; break; }
    await delay(100);
  }
  assert.equal(appReady, true, 'the application script must finish loading in the browser');

  const navigation = await evaluate(`(() => {
    showView('discover');
    const name = places[0].n;
    openDetail(name);
    const detailActive = document.getElementById('detail-view').classList.contains('active');
    const backVisible = getComputedStyle(document.getElementById('detail-back')).display !== 'none';
    navigateBack();
    return {
      detailActive,
      backVisible,
      returnedToDiscover: document.getElementById('discover-view').classList.contains('active')
    };
  })()`);
  assert.deepEqual(navigation, { detailActive: true, backVisible: true, returnedToDiscover: true });

  const regions = await evaluate(`({
    municipality: TripAppCore.normalizeItineraryCity({province:'\u5317\u4eac\u5e02',city:'\u671d\u9633\u533a',district:'\u671d\u9633\u533a'}),
    municipalityDetail: TripAppCore.detailRegionLabel({province:'\u5317\u4eac\u5e02',city:'\u671d\u9633\u533a',district:'\u671d\u9633\u533a'}),
    ordinary: TripAppCore.normalizeItineraryCity({province:'\u8fbd\u5b81\u7701',city:'\u6c88\u9633\u5e02',district:'\u548c\u5e73\u533a'})
  })`);
  assert.deepEqual(regions, { municipality: '北京', municipalityDetail: '北京 · 朝阳区', ordinary: '沈阳' });

  const renderedRegions = await evaluate(`(() => {
    const place={n:'测试地点',c:'history',lat:39.92,lng:116.45,province:'北京市',city:'朝阳区',district:'朝阳区',t:'用于验证地区展示的测试地点介绍。',custom:true,i:places.length};
    places.push(place);
    itinerary.splice(0,itinerary.length,{date:'2026年10月12日',label:'当天',route:'测试地点',stay:'市中心',events:[{time:'10:00',name:'测试地点',duration:'约2小时',city:'朝阳区',province:'北京市',district:'朝阳区',note:'测试行程'}]});
    window.selectedDate='2026年10月12日';
    showView('itinerary');renderItinerary();
    const itineraryCity=document.querySelector('#itinerary-content .app-sub')?.textContent;
    openDetail('测试地点');
    const detailRegion=document.querySelector('#detail-content .detail-head .app-sub')?.textContent;
    navigateBack();
    return {itineraryCity,detailRegion,backToItinerary:document.getElementById('itinerary-view').classList.contains('active')};
  })()`);
  assert.equal(renderedRegions.itineraryCity, '北京', 'the itinerary page must show the municipality, not its district');
  assert.match(renderedRegions.detailRegion, /北京 · 朝阳区/, 'the detail page must retain the district');
  assert.equal(renderedRegions.backToItinerary, true);

  const cacheFirst = await evaluate(`(() => {
    const position={lat:31.2304,lng:121.4737,accuracy:30};
    localStorage.setItem('sy-nearby-cache',JSON.stringify({city:'上海',origin:position,places:[{n:'缓存测试地点',c:'scenic',lat:31.231,lng:121.474,city:'上海',t:'缓存地点',dynamic:true}]}));
    userPosition=position;discoverLoadedKey='';ensureDiscoverLocation();
    return document.getElementById('discover-list').textContent.includes('缓存测试地点');
  })()`);
  assert.equal(cacheFirst, true, 'discover must paint cached nearby places before network refresh finishes');
  socket.close();
  console.log('browser navigation and region integration passed');
} finally {
  browser.kill();
  await delay(100);
  fs.rmSync(profile, { recursive: true, force: true });
}
