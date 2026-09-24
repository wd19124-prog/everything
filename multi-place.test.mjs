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
assert.match(source, /const cities=plannerCityCandidates\(\)/, 'planner suggestions should come from cities');
assert.match(source, /plan-preview-back.*planner\.classList\.add\('open'\)/s, 'preview back should return to the current planner step');
assert.match(source, /筛选结果总花费/, 'expense summary should use the total label');
assert.match(source, /55000/, 'planner lookup should allow a realistic network window');
assert.match(source, /overpass-api\.de\/api\/interpreter\?data=/, 'planner should use the tested Overpass GET endpoint');
assert.match(source, /只有读取到具体地点后/, 'planner loading should guard against empty preview plans');
assert.match(source, /火车信息/, 'train transport should open a transport detail step');
assert.match(source, /每段最多驾驶10小时/, 'self-drive plans should split long drives into ten-hour segments');
assert.match(source, /提前2小时到机场/, 'flight plans should reserve airport arrival time');
assert.match(source, /返程交通/, 'generated plans should include return transport');
assert.match(source, /estimateVerifiedDriveTime/,
  'self-drive routing should use a verified route response rather than an invented fallback');
assert.match(source, /交通时间暂时无法核实/,
  'unverified transport data should be disclosed instead of displayed as precise');
assert.match(source, /每驾驶约2至3小时/,
  'self-drive plans should add a rest interval every two to three hours');
assert.match(source, /休息至少15分钟/,
  'self-drive rest cards should state a minimum rest duration');
assert.match(source, /地点概况加载中/,
  'place details should show an explicit network-loading state');
assert.match(source, /loadVerifiedPlaceIntroForDetail/,
  'opening a place should trigger verified online place-intro loading');

console.log('multi-place source contract passed');
