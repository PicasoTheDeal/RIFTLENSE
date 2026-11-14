// Turns the harmonised hotspot grid into a month by year calendar for a box.

export function seriesFor(cal, bbox, hideStatic = true) {
  const [w, s, e, n] = bbox;
  const counts = new Array(cal.months.length).fill(0);
  let cells = 0;
  for (const [lat, lon, isStatic, pairs] of cal.cells) {
    if (lat < s || lat > n || lon < w || lon > e) continue;
    if (hideStatic && isStatic) continue;
    cells++;
    for (let i = 0; i < pairs.length; i += 2) counts[pairs[i]] += pairs[i + 1];
  }
  return { months: cal.months, counts, cells };
}

const median = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function calendar(series) {
  const years = [...new Set(series.months.map((m) => +m.slice(0, 4)))];
  const grid = {};
  const byMonth = Array.from({ length: 12 }, () => []);
  series.months.forEach((m, i) => {
    const y = +m.slice(0, 4), mo = +m.slice(5, 7) - 1;
    grid[`${y}-${mo}`] = series.counts[i];
    byMonth[mo].push(series.counts[i]);
  });
  const med = byMonth.map(median);
  const max = Math.max(1, ...series.counts);
  const yearTotals = years.map((y) => ({ year: y, total: series.months.reduce((s, m, i) => (+m.slice(0, 4) === y ? s + series.counts[i] : s), 0) }));
  return { years, grid, med, max, yearTotals };
}

export function toCSV(series, med, label) {
  const rows = ['area,year,month,hotspots,median_for_month,anomaly'];
  series.months.forEach((m, i) => {
    const mo = +m.slice(5, 7) - 1;
    const c = Math.round(series.counts[i]);
    rows.push(`"${label}",${m.slice(0, 4)},${mo + 1},${c},${med[mo]},${c - Math.round(med[mo])}`);
  });
  return rows.join('\n');
}
