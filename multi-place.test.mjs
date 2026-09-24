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
assert.match(source, /max-width:100%;min-width:0/, 'date and place inputs should fit narrow mobile sheets');
assert.match(source, /loading="eager" decoding="async" fetchpriority="high"/, 'empty-state artwork should load eagerly');
assert.match(source, /function openTasteSort\s*\(/, 'taste sorting should have its own control');
assert.match(source, /id[=:]?["']?expenses-back/, 'expenses should expose a back control');
assert.match(source, /query\.length<2/, 'empty place input should not open suggestions');
assert.match(source, /同步行程/, 'empty itinerary should expose sync in the new-trip choice');
assert.match(source, /const renderItineraryWithSync=renderItinerary/, 'empty itinerary should remove the bulky sync panel');
assert.match(source.slice(source.lastIndexOf('function buildPlan')), /selected\.map\(p=>p\.n\)/, 'effective planner should render concrete place names');

console.log('multi-place source contract passed');
