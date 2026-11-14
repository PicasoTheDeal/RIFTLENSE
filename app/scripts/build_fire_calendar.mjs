// Builds public/data/fire_calendar.json from NASA FIRMS yearly country archives for Ethiopia.
//
// Usage:  npm run fire
//         npm run fire -- --from 2015 --to 2025
//         npm run fire -- --country Kenya   (FIRMS country file name, spaces as underscores)
//
// It downloads MODIS C6.1 (2000 onward) and VIIRS S-NPP / NOAA-20 (2012 onward) yearly CSVs into
// ../data/raw/firms, or uses CSV files you already put there by hand (any file name with
// "modis" or "viirs" in it). Then it harmonises both sensors on a 0.1 degree monthly grid.
//
// Harmonisation:
//   1. Count detections per 0.1 degree cell per month for each sensor (low confidence dropped).
//   2. For every cell, the ratio VIIRS / MODIS over the overlap years scales the MODIS only
//      years up to VIIRS equivalent counts. Cells with too few overlap detections use the
//      grid wide ratio for that calendar month.
//   3. Cells that FIRMS marks as volcano or static land source, or that burn in almost every month all year round,
//      are flagged as static heat (Erta Ale, Dallol, gas flares) so the app can hide them.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.resolve(here, '../../data/raw/firms');
const OUT = path.resolve(here, '../public/data/fire_calendar.json');
const COUNTRY = (() => { const i = process.argv.indexOf('--country'); return i >= 0 ? process.argv[i + 1].replace(/ /g, '_') : 'Ethiopia'; })();
const RES = 0.1;

const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(n); return i >= 0 ? +args[i + 1] : d; };
const FROM = arg('--from', 2000);
const TO = arg('--to', new Date().getUTCFullYear());

fs.mkdirSync(RAW, { recursive: true });

const SOURCES = [
  { sensor: 'modis', dir: 'modis', start: 2000 },
  { sensor: 'viirs', dir: 'viirs-snpp', start: 2012 },
  { sensor: 'viirs20', dir: 'viirs-noaa20', start: 2018 }
];

async function download(src, year) {
  const name = `${src.dir}_${year}_${COUNTRY}.csv`;
  const file = path.join(RAW, name);
  if (fs.existsSync(file) && fs.statSync(file).size > 100) return file;
  const url = `https://firms.modaps.eosdis.nasa.gov/data/country/${src.dir}/${year}/${name}`;
  try {
    const res = await fetch(url);
    if (!res.ok) { console.log(`  skip ${name} (${res.status})`); return null; }
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log(`  got  ${name}`);
    return file;
  } catch (e) {
    console.log(`  skip ${name} (${e.message})`);
    return null;
  }
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
  console.log(`FIRMS ${COUNTRY} ${FROM} to ${TO}`);
  for (const src of SOURCES) for (let y = Math.max(FROM, src.start); y <= TO; y++) await download(src, y);

  const files = fs.readdirSync(RAW).filter((f) => f.endsWith('.csv') && f.includes(COUNTRY));
  if (!files.length) { console.error('No FIRMS CSV files found in ' + RAW); process.exit(1); }

  const grid = new Map();
  const monthsSeen = new Set();
  let total = 0;
  for (const f of files) {
    const hint = f.includes('noaa20') ? 'viirs20' : f.includes('viirs') ? 'viirs' : f.includes('modis') ? 'modis' : null;
    for (const r of parse(path.join(RAW, f), hint)) {
      if (!r.ym || isNaN(r.lat)) continue;
      const la = Math.floor(r.lat / RES) * RES + RES / 2, lo = Math.floor(r.lon / RES) * RES + RES / 2;
      const k = `${la.toFixed(2)},${lo.toFixed(2)}`;
      let cell = grid.get(k);
      if (!cell) { cell = { lat: +la.toFixed(2), lon: +lo.toFixed(2), modis: {}, viirs: {}, viirs20: {}, staticHits: 0, hits: 0 }; grid.set(k, cell); }
      cell[r.sensor][r.ym] = (cell[r.sensor][r.ym] || 0) + 1;
      cell.hits++;
      if (r.type === 1 || r.type === 2) cell.staticHits++;
      monthsSeen.add(r.ym);
      total++;
    }
  }
  console.log(`${total} detections in ${grid.size} cells`);

  const sorted = [...monthsSeen].sort();
  const months = monthList(sorted[0], sorted[sorted.length - 1]);
  const idx = Object.fromEntries(months.map((m, i) => [m, i]));
  const viirsMonths = new Set(), modisMonths = new Set();
  for (const c of grid.values()) {
    Object.keys(c.viirs).forEach((m) => viirsMonths.add(m));
    Object.keys(c.viirs20).forEach((m) => viirsMonths.add(m));
    Object.keys(c.modis).forEach((m) => modisMonths.add(m));
  }
  const firstViirs = [...viirsMonths].sort()[0] || '9999-99';
  const overlap = months.filter((m) => m >= firstViirs && modisMonths.has(m));

  const vOf = (c, m) => (c.viirs[m] != null ? c.viirs[m] : c.viirs20[m] || 0);
  const monthRatio = Array.from({ length: 12 }, () => ({ v: 0, m: 0 }));
  for (const c of grid.values()) for (const m of overlap) {
    const mo = +m.slice(5, 7) - 1;
    monthRatio[mo].v += vOf(c, m);
    monthRatio[mo].m += c.modis[m] || 0;
  }
  const allV = monthRatio.reduce((s, r) => s + r.v, 0), allM = monthRatio.reduce((s, r) => s + r.m, 0);
  const globalR = allM ? allV / allM : 1;
  const R = monthRatio.map((r) => (r.m >= 50 ? r.v / r.m : globalR));
  console.log(`Overlap ${overlap[0]} to ${overlap[overlap.length - 1]}, grid ratio VIIRS/MODIS ${globalR.toFixed(2)}`);

  const cells = [];
  let staticCount = 0;
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
    // Volcanoes and gas flares burn all year. Seasonal fires do not.
    const isStatic = c.staticHits / c.hits >= 0.5 || (months.length >= 24 && active / months.length >= 0.75 && calMonths.size === 12) ? 1 : 0;
    staticCount += isStatic;
    cells.push([c.lat, c.lon, isStatic, pairs]);
  }

  const out = {
    generated: new Date().toISOString(),
    source: 'NASA FIRMS MODIS C6.1 and VIIRS 375 m active fire archives, harmonised to VIIRS equivalent counts on a 0.1 degree monthly grid',
    country: COUNTRY, res: RES, firstViirs, ratio: +globalR.toFixed(3), monthRatio: R.map((r) => +r.toFixed(3)), months, cells
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(`Wrote ${OUT} (${cells.length} cells, ${staticCount} static, ${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB)`);
}

main();
