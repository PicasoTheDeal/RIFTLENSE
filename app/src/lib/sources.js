// Live data sources. All are public and need no key.
// NASA POWER (climate), AWS Terrain Tiles (SRTM based elevation), USGS earthquakes, ASF search.

const cache = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

let seed = null;
async function loadSeed() {
  if (seed) return seed;
  try { seed = await fetch('./data/power_seed.json').then((r) => (r.ok ? r.json() : {})); } catch { seed = {}; }
  return seed;
}

const key = (lat, lon) => `${lat.toFixed(2)},${lon.toFixed(2)}`;

// NASA POWER long term climatology for one point.
export async function getClimate(lat, lon) {
  const k = 'power:' + key(lat, lon);
  const s = await loadSeed();
  if (s[key(lat, lon)]) return s[key(lat, lon)];
  const c = cache.get(k);
  if (c) return c;
  const params = 'T2M,T2M_RANGE,PRECTOTCORR,RH2M,ALLSKY_SRF_ALB';
  const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=${params}&community=RE&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}&format=JSON`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('NASA POWER returned ' + res.status);
  const j = await res.json();
  const p = j.properties.parameter;
  const ok = (v) => (v == null || v <= -900 ? null : v);
  const out = {
    t: ok(p.T2M?.ANN),
    tRange: ok(p.T2M_RANGE?.ANN),
    precipMmYr: ok(p.PRECTOTCORR?.ANN) == null ? null : p.PRECTOTCORR.ANN * 365,
    rh: ok(p.RH2M?.ANN),
    albedo: ok(p.ALLSKY_SRF_ALB?.ANN)
  };
  cache.set(k, out);
  return out;
}

// Elevation and local relief from Terrarium tiles (SRTM based, AWS open data).
function lonLatToTile(lon, lat, z) {
  const n = 2 ** z;
  const x = ((lon + 180) / 360) * n;
  const r = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  return { x, y };
}

export async function getTerrain(lat, lon) {
  const k = 'dem:' + key(lat, lon);
  const c = cache.get(k);
  if (c) return c;
  const z = 11;
  const t = lonLatToTile(lon, lat, z);
  const tx = Math.floor(t.x), ty = Math.floor(t.y);
  const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${tx}/${ty}.png`;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await img.decode();
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, 256, 256).data;
  const elev = (px, py) => {
    px = Math.max(0, Math.min(255, px)); py = Math.max(0, Math.min(255, py));
    const i = (py * 256 + px) * 4;
    return data[i] * 256 + data[i + 1] + data[i + 2] / 256 - 32768;
  };
  const px = Math.floor((t.x - tx) * 256), py = Math.floor((t.y - ty) * 256);
  // About 15 by 15 pixels, roughly 1 km at the equator at zoom 11.
  const vals = [];
  for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) vals.push(elev(px + dx, py + dy));
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
  const out = { elevation: elev(px, py), rough: Math.max(...vals) - Math.min(...vals), sd };
  cache.set(k, out);
  return out;
}

// USGS earthquake catalogue for a box and period.
export async function getQuakes(box, start, end, minMag = 2.5, seed = false) {
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${start}&endtime=${end}` +
    `&minlatitude=${box.minLat}&maxlatitude=${box.maxLat}&minlongitude=${box.minLon}&maxlongitude=${box.maxLon}&minmagnitude=${minMag}&orderby=time-asc`;
  try {
    const res = await fetch(url + '&limit=20000');
    if (!res.ok) throw new Error('USGS returned ' + res.status);
    return await res.json();
  } catch (e) {
    if (!seed) throw e;
    // Offline fallback: the catalogue saved with the app (Fentale box, M2.5+, from June 2024).
    const r = await fetch('./data/quakes_fentale.json');
    if (!r.ok) throw e;
    const j = await r.json();
    j.offline = true;
    return j;
  }
}

// Sentinel-1 acquisitions over a point from the ASF search API.
export async function getRadarScenes(lat, lon, start, end) {
  const url = `https://api.daac.asf.alaska.edu/services/search/param?platform=SENTINEL-1&processingLevel=GRD_HD` +
    `&intersectsWith=POINT(${lon}%20${lat})&start=${start}&end=${end}&output=geojson&maxResults=250`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('ASF returned ' + res.status);
  const j = await res.json();
  return (j.features || []).map((f) => ({
    id: f.properties.sceneName || f.properties.fileID,
    date: (f.properties.startTime || '').slice(0, 10),
    path: f.properties.pathNumber,
    direction: f.properties.flightDirection,
    browse: Array.isArray(f.properties.browse) ? f.properties.browse[0] : f.properties.browse,
    footprint: f.geometry
  })).sort((a, b) => a.date.localeCompare(b.date));
}

// Processed radar products the team drops into public/data/radar.
export async function getRadarManifest() {
  try { const r = await fetch('./data/radar/manifest.json'); return r.ok ? await r.json() : []; } catch { return []; }
}

// Harmonised fire calendar built by scripts/build_fire_calendar.mjs.
export async function getFireCalendar(country) {
  const url = `./data/fire_calendars/${country}.json`;
  try { const r = await fetch(url); return r.ok ? await r.json() : null; } catch { return null; }
}

const eonetCache = new Map();

// NASA EONET natural events worldwide (wildfires, volcanoes, storms and more).
export async function getEvents(category, start, end) {
  const k = `eonet:${category}:${start}:${end}`;
  if (eonetCache.has(k)) return eonetCache.get(k);
  const url = `https://eonet.gsfc.nasa.gov/api/v3/events/geojson?category=${category}&status=all&start=${start}&end=${end}&limit=5000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('EONET returned ' + res.status);
  const j = await res.json();
  eonetCache.set(k, j);
  return j;
}