(function (root) {
  'use strict';

  const MUNICIPALITIES = ['北京', '上海', '天津', '重庆'];

  function cleanRegion(value) {
    return String(value || '').trim().replace(/\s+/g, '');
  }

  function municipalityName(place) {
    const values = [place?.province, place?.municipality, place?.city, place?.state];
    return MUNICIPALITIES.find(name => values.some(value => cleanRegion(value).startsWith(name))) || '';
  }

  function normalizeCityValue(value) {
    const raw = cleanRegion(value);
    if (!raw) return '';
    const embedded = raw.match(/(?:^|\u7701|\u81ea\u6cbb\u533a)([^\u7701\u533a\u53bf]+?)\u5e02(?:$|[\u533a\u53bf])/);
    const city = embedded?.[1] || raw;
    return city.replace(/(?:\u5e02|\u81ea\u6cbb\u5dde|\u5730\u533a|\u76df)$/u, '');
  }

  function normalizeItineraryCity(place) {
    if (!place) return '';
    const municipality = municipalityName(place);
    if (municipality) return municipality;
    const address = place.address || {};
    const rawCity = place.parentCity || place.prefecture || address.city || address.town ||
      address.municipality || place.city || place.town || '';
    if (/[\u533a\u53bf]$/u.test(cleanRegion(rawCity))) {
      const parent = place.parentCity || place.prefecture || address.city || address.town || address.municipality;
      if (parent && !/[\u533a\u53bf]$/u.test(cleanRegion(parent))) return normalizeCityValue(parent);
    }
    return normalizeCityValue(rawCity);
  }

  function detailRegionLabel(place) {
    if (!place) return '';
    const city = normalizeItineraryCity(place);
    const municipality = municipalityName(place);
    const address = place.address || {};
    let district = place.district || place.cityDistrict || place.county || address.city_district ||
      address.district || address.county || address.suburb || '';
    if (!district && municipality && /[\u533a\u53bf]$/u.test(cleanRegion(place.city))) district = place.city;
    district = cleanRegion(district);
    if (!city) return district;
    if (!district || normalizeCityValue(district) === city) return city;
    return `${city} \u00b7 ${district}`;
  }

  function createViewHistory(initialView = 'next') {
    let current = initialView;
    const stack = [];
    return {
      visit(view) {
        if (view && view !== current) {
          stack.push(current);
          current = view;
        }
        return current;
      },
      back(fallback = 'next') {
        current = stack.pop() || fallback;
        return current;
      },
      replace(view) {
        if (view) current = view;
        return current;
      },
      current() { return current; },
      depth() { return stack.length; },
    };
  }

  function distanceKm(a, b) {
    if (![a?.lat, a?.lng, b?.lat, b?.lng].every(Number.isFinite)) return Infinity;
    const radius = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const value = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) *
      Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * radius * Math.asin(Math.sqrt(value));
  }

  function cacheMatchesPosition(cache, position, maxDistanceKm = 3) {
    return Boolean(cache?.origin && Array.isArray(cache?.places) &&
      distanceKm(cache.origin, position) <= maxDistanceKm);
  }

  function firstSuccessful(tasks, isValid = value => value != null) {
    return new Promise(resolve => {
      if (!tasks.length) return resolve(null);
      let remaining = tasks.length;
      let settled = false;
      tasks.forEach(task => Promise.resolve(task).then(value => {
        if (!settled && isValid(value)) {
          settled = true;
          resolve(value);
          return;
        }
        remaining -= 1;
        if (!settled && remaining === 0) resolve(null);
      }, () => {
        remaining -= 1;
        if (!settled && remaining === 0) resolve(null);
      }));
    });
  }

  root.TripAppCore = {
    createViewHistory,
    normalizeItineraryCity,
    detailRegionLabel,
    cacheMatchesPosition,
    firstSuccessful,
  };
}(globalThis));
