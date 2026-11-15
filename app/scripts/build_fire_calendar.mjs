// Builds public/data/fire_calendars/*.json from NASA FIRMS yearly archives.
// Usage:  npm run fire

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.resolve(here, '../../data/raw/firms');
const OUT_DIR = path.resolve(here, '../public/data/fire_calendars');
const RES = 0.1;

const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(n); return i >= 0 ? +args[i + 1] : d; };
const FROM = arg('--from', 2000);
const TO = arg('--to', new Date().getUTCFullYear());

fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

// ONLY the 15 countries you have downloaded. No more global downloads.
const REGIONS = [
  'Ethiopia', 'Kenya', 'Tanzania', 'Somalia', 'South_Africa', 'Democratic_Republic_of_the_Congo',
  'Angola', 'Zambia', 'Mozambique', 'Nigeria', 'Sudan', 'Madagascar', 'Zimbabwe', 'Ghana', 'Cameroon'
];

const SOURCES = [
  { sensor: 'modis', dir: 'modis', start: 2000 },
  { sensor: 'viirs', dir: 'viirs-snpp', start: 2012 },
  { sensor: 'viirs20', dir: 'viirs-noaa20', start: 2018 }
];

async function download(src, year, country, retries = 3) {
  const name = `${src.dir}_${year}_${country}.csv`;
  const file = path.join(RAW, name);
  if (fs.existsSync(file) && fs.statSync(file).size > 100) return file;
  // It will only try to download if a file is missing.
  const url = `https://firms.modaps.eosdis.nasa.gov/data/country/${src.dir}/${year}/${name}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) { if (attempt === retries) return null; continue; }
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length <= 100) return null;
      fs.writeFileSync(file, buffer);
      return file;
    } catch (e) {
      if (attempt === retries) return null;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return null;
}

function parse(file, sensorHint) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const head = lines[0].split(',');
  const col = (n) => head.indexOf(n);
  const iLat = col('latitude'), iLon = col('longitude'), iDate = col('acq_date'), iConf = col('confidence'), iType = col('type'), iInst = col('instrument'), iSat = col('satellite');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const c = lines[i].split(',');
    const inst = (c[iInst] || sensorHint || '').toLowerCase();
    let sensor = sensorHint;
    if (!sensor) {
      sensor = inst.includes('viirs') ? 'viirs' : 'modis';
      const sat = String(c[iSat] || '').toUpperCase();
      if (sensor === 'viirs' && ['N20', '1', 'J1', 'NOAA-20', 'NOAA20'].includes(sat)) sensor = 'viirs20';
    }
    const conf = c[iConf];
    if (sensor === 'modis' ? +conf < 30 : String(conf).toLowerCase().startsWith('l')) continue;
    rows.push({ lat: +c[iLat], lon: +c[iLon], ym: (c[iDate] || '').slice(0, 7), type: iType >= 0 ? +c[iType] : 0, sensor });
  }
  return rows;
}

function monthList(a, b) {
  const out = [];
  let [y, m] = a.split('-').map(Number);
  const [yb, mb] = b.split('-').map(Number);
  while (y < yb || (y === yb && m <= mb)) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } }
  return out;
}

async function main() {
  console.log(`Processing ${REGIONS.length} African countries...`);
  for (const country of REGIONS) {
    for (const src of SOURCES) {
      for (let y = Math.max(FROM, src.start); y <= TO; y++) {
        await download(src, y, country);
      }
    }
  }

  const files = fs.readdirSync(RAW).filter((f) => f.endsWith('.csv'));
  if (!files.length) { console.error('No FIRMS CSV files found'); process.exit(1); }

  const globalMonthsSeen = new Set();
  const countryGrids = {};
  
  for (const f of files) {
    const match = f.match(/_(\d{4})_(.*)\.csv$/);
    if (!match) continue;
    const country = match[2];
    if (!countryGrids[country]) countryGrids[country] = new Map();

    const hint = f.includes('noaa20') ? 'viirs20' : f.includes('viirs') ? 'viirs' : f.includes('modis') ? 'modis' : null;
    for (const r of parse(path.join(RAW, f), hint)) {
      if (!r.ym || isNaN(r.lat)) continue;
      const la = Math.floor(r.lat / RES) * RES + RES / 2, lo = Math.floor(r.lon / RES) * RES + RES / 2;
      const k = `${la.toFixed(2)},${lo.toFixed(2)}`;
      let cell = countryGrids[country].get(k);
      if (!cell) { cell = { lat: +la.toFixed(2), lon: +lo.toFixed(2), modis: {}, viirs: {}, viirs20: {}, staticHits: 0, hits: 0 }; countryGrids[country].set(k, cell); }
      cell[r.sensor][r.ym] = (cell[r.sensor][r.ym] || 0) + 1;
      cell.hits++;
      if (r.type === 1 || r.type === 2) cell.staticHits++;
      globalMonthsSeen.add(r.ym);
    }
  }

  const sorted = [...globalMonthsSeen].sort();
  const months = monthList(sorted[0], sorted[sorted.length - 1]);
  const idx = Object.fromEntries(months.map((m, i) => [m, i]));

  const globalViirsMonths = new Set(), globalModisMonths = new Set();
  for (const grid of Object.values(countryGrids)) {
    for (const c of grid.values()) {
      Object.keys(c.viirs).forEach((m) => globalViirsMonths.add(m));
      Object.keys(c.viirs20).forEach((m) => globalViirsMonths.add(m));
      Object.keys(c.modis).forEach((m) => globalModisMonths.add(m));
    }
  }
  const firstViirs = [...globalViirsMonths].sort()[0] || '9999-99';
  const overlap = months.filter((m) => m >= firstViirs && globalModisMonths.has(m));

  const monthRatio = Array.from({ length: 12 }, () => ({ v: 0, m: 0 }));
  for (const grid of Object.values(countryGrids)) {
    const vOf = (c, m) => (c.viirs[m] != null ? c.viirs[m] : c.viirs20[m] || 0);
    for (const c of grid.values()) {
      for (const m of overlap) {
        const mo = +m.slice(5, 7) - 1;
        monthRatio[mo].v += vOf(c, m);
        monthRatio[mo].m += c.modis[m] || 0;
      }
    }
  }
  const allV = monthRatio.reduce((s, r) => s + r.v, 0), allM = monthRatio.reduce((s, r) => s + r.m, 0);
  const globalR = allM ? allV / allM : 1;
  const R = monthRatio.map((r) => (r.m >= 50 ? r.v / r.m : globalR));

  const countryIndex = [];

  for (const [country, grid] of Object.entries(countryGrids)) {
    const cells = [];
    const vOf = (c, m) => (c.viirs[m] != null ? c.viirs[m] : c.viirs20[m] || 0);
    
    for (const c of grid.values()) {
      let sv = 0, sm = 0;
      for (const m of overlap) { sv += vOf(c, m); sm += c.modis[m] || 0; }
      const cellR = sm >= 10 && sv >= 10 ? Math.min(8, Math.max(0.25, sv / sm)) : null;
      const calMonths = new Set();
      const pairs = [];
      let active = 0;
      for (const m of months) {
        let v;
        if (m >= firstViirs) v = vOf(c, m);
        else { const mo = +m.slice(5, 7) - 1; v = (c.modis[m] || 0) * (cellR ?? R[mo]); }
        if (v > 0) { pairs.push(idx[m], Math.round(v * 10) / 10); active++; calMonths.add(m.slice(5, 7)); }
      }
      if (!pairs.length) continue;
      const isStatic = c.staticHits / c.hits >= 0.5 || (months.length >= 24 && active / months.length >= 0.75 && calMonths.size === 12) ? 1 : 0;
      cells.push([c.lat, c.lon, isStatic, pairs]);
    }

    const out = {
      generated: new Date().toISOString(),
      source: 'NASA FIRMS MODIS C6.1 and VIIRS active fire archives',
      country, res: RES, firstViirs, ratio: +globalR.toFixed(3), months, cells
    };
    
    const outPath = path.join(OUT_DIR, `${country}.json`);
    fs.writeFileSync(outPath, JSON.stringify(out));
    countryIndex.push({ id: country, name: country.replace(/_/g, ' '), count: cells.length });
    console.log(`Wrote ${country}.json (${cells.length} cells, ${(fs.statSync(outPath).size / 1e6).toFixed(1)} MB)`);
  }

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(countryIndex));
  console.log('All done.');
}

main();