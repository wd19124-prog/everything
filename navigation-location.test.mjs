import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const coreUrl = new URL('./app-core.js', import.meta.url);
assert.ok(fs.existsSync(coreUrl), 'app-core.js must provide the shared navigation and location behavior');

const context = { console, setTimeout, clearTimeout };
context.globalThis = context;
vm.runInNewContext(fs.readFileSync(coreUrl, 'utf8'), context, { filename: 'app-core.js' });

const {
  createViewHistory,
  normalizeItineraryCity,
  detailRegionLabel,
  cacheMatchesPosition,
  firstSuccessful,
} = context.TripAppCore || {};

assert.equal(typeof createViewHistory, 'function', 'view history must be executable behavior');
assert.equal(typeof normalizeItineraryCity, 'function', 'itinerary city formatting must be executable behavior');
assert.equal(typeof detailRegionLabel, 'function', 'detail region formatting must be executable behavior');
assert.equal(typeof cacheMatchesPosition, 'function', 'nearby cache matching must be executable behavior');
assert.equal(typeof firstSuccessful, 'function', 'nearby endpoint racing must be executable behavior');

const history = createViewHistory('next');
history.visit('discover');
history.visit('detail');
assert.equal(history.back(), 'discover', 'detail must return to the page that opened it');
assert.equal(history.back(), 'next', 'back must continue through the visit history one level at a time');
history.visit('itinerary');
history.visit('detail');
history.visit('detail');
assert.equal(history.back(), 'itinerary', 'refreshing the current detail must not duplicate it in history');

const cityCases = [
  [{ province: '北京市', city: '朝阳区', district: '朝阳区' }, '北京'],
  [{ province: '上海市', city: '浦东新区', district: '浦东新区' }, '上海'],
  [{ province: '天津市', city: '和平区', district: '和平区' }, '天津'],
  [{ province: '重庆市', city: '渝中区', district: '渝中区' }, '重庆'],
  [{ province: '辽宁省', city: '沈阳市', district: '和平区' }, '沈阳'],
];
for (const [place, expected] of cityCases) {
  assert.equal(normalizeItineraryCity(place), expected, `itinerary city should be ${expected}`);
}
assert.equal(detailRegionLabel({ province: '北京市', city: '朝阳区', district: '朝阳区' }), '北京 · 朝阳区');
assert.equal(detailRegionLabel({ province: '辽宁省', city: '沈阳市', district: '和平区' }), '沈阳 · 和平区');

assert.equal(cacheMatchesPosition({ origin: { lat: 31.2304, lng: 121.4737 }, city: '上海', places: [{ n: '外滩' }] }, { lat: 31.231, lng: 121.474 }), true,
  'a nearby saved position must be eligible for immediate cached rendering');
assert.equal(cacheMatchesPosition({ origin: { lat: 31.2304, lng: 121.4737 }, city: '上海', places: [{ n: '外滩' }] }, { lat: 39.9042, lng: 116.4074 }), false,
  'a distant cache must not be shown for the wrong location');

let resolveSlow;
const slow = new Promise(resolve => { resolveSlow = resolve; });
const fast = Promise.resolve({ source: 'fast' });
const winner = await firstSuccessful([slow, fast], value => value?.source);
assert.equal(winner.source, 'fast', 'nearby loading must use the first successful endpoint instead of waiting sequentially');
resolveSlow({ source: 'slow' });

const serviceWorker = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
assert.match(serviceWorker, /['"]\.\/app-core\.js['"]/, 'offline app shell must include the shared navigation and location runtime');

console.log('navigation, location formatting, and nearby loading behavior passed');
