// Analog scoring. Every dimension gives 0 to 1 plus a plain reason.
// Dimensions that can not be measured return nothing and are left out, never guessed.

const clamp = (v) => Math.max(0, Math.min(1, v));
const lg = (v) => Math.log10(1 + Math.max(0, v));

export const OPTIONS = [
  { key: 'temp', label: 'Temperature' },
  { key: 'swing', label: 'Day and night swing' },
  { key: 'extremes', label: 'Yearly extremes' },
  { key: 'rain', label: 'Rain' },
  { key: 'humidity', label: 'Humidity' },
  { key: 'albedo', label: 'Brightness' },
  { key: 'sun', label: 'Sunlight' },
  { key: 'terrain', label: 'Terrain' },
  { key: 'geology', label: 'Geology' }
];

export const TARGETS = {
  mars: { id: 'mars', name: 'Jezero crater, Mars', short: 'Mars',
    facts: 'Ancient lake and delta. Mean around minus 50 C, swings of 70 C or more a day, no rain, albedo near 0.25, sunlight about 43 percent of Earth.' },
  moon: { id: 'moon', name: 'Lunar south pole, near Shackleton', short: 'Moon',
    facts: 'Cratered highlands, sun always low, albedo 0.12 to 0.2, shadowed craters near minus 200 C.' }
};

export const EARTH_LIMITS = {
  mars: ['Gravity is 38 percent of Earth', 'Air pressure under 1 percent of Earth, mostly CO2', 'No magnetic field, high surface radiation'],
  moon: ['Gravity is 17 percent of Earth', 'Hard vacuum', 'No magnetic field, full cosmic radiation', 'Two week long days and nights']
};

function targetDims(target, d) {
  const out = [];
  const has = (t) => d.tags?.includes(t);
  const add = (opt, key, label, score, reason) => out.push({ opt, key, label, score: clamp(score), reason });
  const world = target === 'moon' ? 'The Moon' : 'Mars';

  if (d.t != null) add('temp', 'cold', 'Cold', (10 - d.t) / 50, `Mean ${d.t.toFixed(1)} C. ${target === 'moon' ? 'Polar lunar ground sits far below minus 100 C.' : 'Mars averages around minus 50 C.'}`);
  if (d.tRange != null) add('swing', 'swing', 'Day and night swing', d.tRange / 20, `${d.tRange.toFixed(1)} C a day. Earth tops out near 20 C, ${world} goes far beyond.`);
  if (d.tMax != null && d.tMin != null) add('extremes', 'extremes', 'Yearly extremes', (d.tMax - d.tMin) / 70, `From ${d.tMin.toFixed(0)} C to ${d.tMax.toFixed(0)} C across the year.`);
  if (d.precipMmYr != null) add('rain', 'arid', 'Aridity', 1 - d.precipMmYr / 250, `${Math.round(d.precipMmYr)} mm of rain a year. ${world} has none.`);
  if (d.rh != null) add('humidity', 'dry', 'Dry air', 1 - d.rh / 60, `Relative humidity ${Math.round(d.rh)} percent.`);
  if (d.albedo != null) {
    const a = target === 'moon' ? 0.15 : 0.25;
    add('albedo', 'albedo', 'Surface brightness', 1 - Math.abs(d.albedo - a) / 0.25, `Albedo ${d.albedo.toFixed(2)}, ${world} is near ${a}.`);
  }
  if (target === 'moon' && d.lat != null) add('sun', 'sun', 'Low sun angle', (Math.abs(d.lat) - 50) / 40, `Latitude ${Math.abs(d.lat).toFixed(1)} degrees. The south pole sees the sun skim the horizon.`);
  if (target === 'mars' && d.sun != null) add('sun', 'sun', 'Weak sunlight', 1 - Math.abs(d.sun - 2.6) / 4, `${d.sun.toFixed(1)} kWh per square metre a day. Mars gets about 2.6.`);
  if (d.rough != null) {
    if (target === 'mars') add('terrain', 'terrain', 'Terrain relief', 1 - Math.abs(d.rough - 30) / 60, `${Math.round(d.rough)} m local relief. Jezero floor and delta sit around 20 to 50 m.`);
    else add('terrain', 'terrain', 'Rugged terrain', d.rough / 80, `${Math.round(d.rough)} m local relief. The south pole is deeply cratered.`);
  }
  if (d.tags) {
    if (target === 'mars') {
      const hydro = has('hydrothermal') || has('acid');
      add('geology', 'g-hydro', 'Hydrothermal or acid chemistry', hydro ? 1 : has('volcanic') ? 0.6 : 0,
        hydro ? 'Hot or acidic fluids, like the systems thought to exist on early Mars.' : has('volcanic') ? 'Volcanic rock, but no active fluids.' : 'None known.');
      add('geology', 'g-salt', 'Salts and evaporites', has('salt') ? 1 : 0, has('salt') ? 'Evaporite salts, like the sulfates and chlorides mapped on Mars.' : 'None known.');
      add('geology', 'g-rift', 'Rifting or impact', has('deformation') ? 1 : has('rift') || has('impact') ? 0.75 : 0,
        has('rift') ? 'Crust pulling apart, the process behind Cerberus Fossae.' : has('impact') ? 'Impact crater geology.' : 'None known.');
    } else {
      add('geology', 'g-impact', 'Impact or polar ground', has('impact') ? 1 : has('cold') ? 0.6 : has('volcanic') ? 0.3 : 0,
        has('impact') ? 'Impact crater geology.' : has('cold') ? 'Frozen polar ground.' : has('volcanic') ? 'Basalt, like the lunar maria.' : 'None known.');
    }
  }
  return out;
}

export function scoreSite(target, data, options = OPTIONS.map((o) => o.key)) {
  const parts = targetDims(target, data).filter((p) => options.includes(p.opt));
  const total = parts.length ? parts.reduce((s, p) => s + p.score, 0) / parts.length : null;
  return { target, total, parts, limits: EARTH_LIMITS[target] };
}

// How alike two Earth places are, on the chosen options.
export function similarity(a, b, options) {
  const parts = [];
  const add = (opt, label, score) => options.includes(opt) && score != null && !isNaN(score) && parts.push({ opt, label, score: clamp(score) });
  if (a.t != null && b.t != null) add('temp', 'Temperature', 1 - Math.abs(a.t - b.t) / 30);
  if (a.tRange != null && b.tRange != null) add('swing', 'Swing', 1 - Math.abs(a.tRange - b.tRange) / 8);
  if (a.tMax != null && b.tMax != null) add('extremes', 'Extremes', 1 - (Math.abs(a.tMax - b.tMax) + Math.abs(a.tMin - b.tMin)) / 40);
  if (a.precipMmYr != null && b.precipMmYr != null) add('rain', 'Rain', 1 - Math.abs(lg(a.precipMmYr) - lg(b.precipMmYr)) / 2);
  if (a.rh != null && b.rh != null) add('humidity', 'Humidity', 1 - Math.abs(a.rh - b.rh) / 40);
  if (a.albedo != null && b.albedo != null) add('albedo', 'Brightness', 1 - Math.abs(a.albedo - b.albedo) / 0.3);
  if (a.sun != null && b.sun != null) add('sun', 'Sunlight', 1 - Math.abs(a.sun - b.sun) / 3);
  if (a.rough != null && b.rough != null) add('terrain', 'Terrain', 1 - Math.abs(lg(a.rough) - lg(b.rough)) / 2);
  if (a.tags?.length || b.tags?.length) {
    const A = new Set(a.tags || []), B = new Set(b.tags || []);
    const inter = [...A].filter((x) => B.has(x)).length, uni = new Set([...A, ...B]).size;
    add('geology', 'Geology', uni ? inter / uni : 1);
  }
  const total = parts.length ? parts.reduce((s, p) => s + p.score, 0) / parts.length : null;
  return { total, parts };
}

export function grade(v) {
  if (v == null) return 'no data';
  if (v >= 0.75) return 'strong match';
  if (v >= 0.55) return 'partial match';
  if (v >= 0.35) return 'weak match';
  return 'poor match';
}
