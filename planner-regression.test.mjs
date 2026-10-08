import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

const finalExpenseRule = [...source.matchAll(/#my-view \.my-card\.expense\{([^}]+)\}/g)].at(-1)?.[1] || '';
assert.match(finalExpenseRule, /border:0!important/, 'the final expense style must remove the circular border');
assert.match(finalExpenseRule, /background:transparent!important/, 'the final expense style must remove the circular background');
assert.match(finalExpenseRule, /box-shadow:none!important/, 'the final expense style must remove the circular shadow');

assert.match(source, /#itinerary-view \.day-picker button\{box-sizing:border-box!important/,
  'date button padding must be included in the five-column width');
assert.match(source, /grid-auto-columns:calc\(20% - 3\.2px\)/,
  'the visible date rail must use five fixed grid columns');
assert.match(source, /#itinerary-view \.app-card h3\{font-size:18px!important/,
  'itinerary place names must use the compact type size');

assert.match(source, /function plannerRecommendationReason\s*\(/,
  'generated places need a dedicated real recommendation-reason formatter');
const effectivePlanner = source.slice(source.lastIndexOf('const buildPlanWithRealReasons'));
assert.match(effectivePlanner, /event\.note=plannerRecommendationReason/,
  'the effective planner must replace questionnaire-based notes with recommendation reasons');
assert.match(source, /function applyPlanLodgingAreas\s*\(/,
  'generated plans need stable lodging-area logic');
assert.match(source, /plan\.length>3/,
  'changing lodging area must only be considered on trips longer than three days');
assert.match(source, /住宿区域建议：/,
  'the preview and itinerary must expose lodging as an area hint');
assert.doesNotMatch(source.slice(source.lastIndexOf('function applyPlanLodgingAreas')), /酒店名称|推荐酒店|入住.*酒店/,
  'lodging suggestions must not name a specific hotel');

assert.match(source, /#my-view \.my-card\.expense\{top:59%!important/,
  'expense, memory, and taste labels must use equal vertical spacing');
assert.match(source, /my-card\.expense h3,#my-view \.my-card\.memory h3,#my-view \.my-card\.taste h3\{font-size:27px!important;color:#06105d!important/,
  'expense must share the same text style as memory and taste');

assert.match(source, /function dedupePlannedPlaces\s*\(/,
  'the effective planner must remove repeated attractions across all days');
assert.match(source, /function addDailyMeals\s*\(/,
  'the effective planner must schedule daily meals');
assert.match(source, /place\.c==='food'/,
  'real meal recommendations must come from food places');
assert.match(source, /\['早餐','08:00'\].*\['午餐','12:00'\].*\['晚餐','18:00'\]/s,
  'a full destination day must include breakfast, lunch, and dinner');

const simpleTransit = source.slice(source.lastIndexOf('function installSimpleTransitStep'));
assert.match(simpleTransit, /id="plan-transit-origin"/,
  'plane and train transport details must ask for the departure city');
assert.doesNotMatch(simpleTransit, /plan-flight-destination|plan-train-destination|到达地点/,
  'the effective plane and train step must not ask for the already-known destination');

console.log('planner and itinerary regression contract passed');
