import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const assets = ['scenic.png', 'food.png', 'leisure.png'];

assert.match(source, /function createWhiteMapStyle\s*\(/,
  'the map needs an app-owned light style with a white fallback');
assert.match(source, /background-color['"]?:['"]#fcfcfd['"]/,
  'the fallback map layer must match the app white background');
assert.match(source, /tile\.openstreetmap\.org/,
  'the light map should use a public tile source without an API key');
assert.doesNotMatch(source, /cartocdn\.com/,
  'the map must not render an API-key-required watermark');
assert.match(source, /\.discover-view\{background:transparent!important/,
  'the discover overlay must not cover the map canvas');
assert.match(source, /function createPlaceMarkerElement\s*\(/,
  'map places need image marker elements');
assert.match(source, /function discoverMarkerCategory\s*\(/,
  'initial markers need a category mapper that is available before discover data initializes');
assert.doesNotMatch(source.slice(source.indexOf('const discoverMarkerAssets'), source.indexOf('places.forEach')), /discoverCategory\(/,
  'initial marker creation must not access the later discoverCategoryMap constant');
assert.match(source, /new maplibregl\.Marker\(\{element:createPlaceMarkerElement\(p\),anchor:'bottom'\}\)/,
  'all place markers must use the supplied PNG marker elements');
assert.match(source, /\.\/assets\/vendor\/maplibre-gl\.css/,
  'the map stylesheet should be served locally');
assert.match(source, /\.\/assets\/vendor\/maplibre-gl\.js/,
  'the map runtime should be served locally');
assert.doesNotMatch(source, /unpkg\.com\/maplibre-gl/,
  'map loading must not depend on the external unpkg runtime');

for (const name of assets) {
  const file = new URL(`./assets/map-markers/${name}`, import.meta.url);
  assert.ok(fs.existsSync(file), `${name} must be present in the web assets`);
  const data = fs.readFileSync(file);
  assert.equal(data.toString('ascii', 1, 4), 'PNG', `${name} must remain a PNG`);
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  assert.ok(width <= 192 && height <= 192, `${name} should be web-sized, got ${width}x${height}`);
  assert.ok(data.length < 160_000, `${name} should be compressed for map loading`);
}

for (const name of ['maplibre-gl.css', 'maplibre-gl.js']) {
  assert.ok(fs.existsSync(new URL(`./assets/vendor/${name}`, import.meta.url)), `${name} must be vendored locally`);
}

console.log('discover map source and asset contract passed');
