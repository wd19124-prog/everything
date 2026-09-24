import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(source, /function openMultiPlaceSheet\s*\(/,
  'both entry points should have a shared multi-place sheet');
assert.match(source, /function addMultiPlaceRow\s*\(/,
  'the form should support adding another place row');
assert.match(source, /function saveMultiplePlaces\s*\(/,
  'the form should save all entered places together');
assert.match(source, /openMultiPlaceSheet\('next'\)/,
  'next-place entry should use the shared form');
assert.match(source, /openMultiPlaceSheet\('itinerary'\)/,
  'itinerary add entry should use the shared form');
assert.match(source, /multi-place-add/, 'the form should render an add-place control');

console.log('multi-place source contract passed');
