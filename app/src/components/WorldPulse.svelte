<script>
  import { onMount } from 'svelte';
  import * as maplibregl from 'maplibre-gl';
  import { mix } from '../lib/style.js';
  import { palette } from '../lib/theme.js';
  import { getEvents } from '../lib/sources.js';

  let { map } = $props();
  const INK = $derived($palette.ink);
  const PAPER = $derived($palette.paper);
  const FAINT = $derived($palette.faint);
  const today = new Date().toISOString().slice(0, 10);
  const CATS = [
    { id: 'wildfires', label: 'Wildfires' },
    { id: 'volcanoes', label: 'Volcanoes' },
    { id: 'severeStorms', label: 'Storms' },
    { id: 'dustHaze', label: 'Dust and haze' },
    { id: 'floods', label: 'Floods' }
  ];
  const RAMP = $derived([0.08, 0.25, 0.45, 0.65, 0.82, 1].map((t) => mix($palette.paper, $palette.ink, t)));

  let cats = $state(['wildfires', 'volcanoes']);
  let start = $state(new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10));
  let end = $state(today);
  let events = $state.raw([]);
  let loadedRange = $state({ start: null, end: null });
  let loadedCats = $state([]);
  let loading = $state(false), err = $state('');
  let ready = $state(false);
  let seq = 0;

  const visible = $derived(events.filter((e) => cats.includes(e.properties.cat)));

  const months = $derived.by(() => {
    const a = loadedRange.start || start;
    const b = loadedRange.end || end;
    const out = []; let [y, m] = a.split('-').map(Number); const [ye, me] = b.split('-').map(Number);
    while (y < ye || (y === ye && m <= me)) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } }
    return out;
  });
  const grid = $derived.by(() => {
    const g = {}; let max = 1;
    for (const e of visible) { const k = e.properties.cat + '|' + e.properties.date.slice(0, 7); g[k] = (g[k] || 0) + 1; max = Math.max(max, g[k]); }
    return { g, max };
  });
  const totals = $derived(Object.fromEntries(cats.map((c) => [c, visible.filter((e) => e.properties.cat === c).length])));
  const recent = $derived([...visible].sort((a, b) => b.properties.date.localeCompare(a.properties.date)).slice(0, 8));
  const stale = $derived(
    loadedRange.start !== start || loadedRange.end !== end || cats.some((c) => !loadedCats.includes(c))
  );

  function toggle(id) {
    const next = cats.includes(id) ? cats.filter((x) => x !== id) : [...cats, id];
    cats = next;
    const missing = next.filter((c) => !loadedCats.includes(c));
    if (ready && missing.length && loadedRange.start === start && loadedRange.end === end) load();
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function bboxCenter(g) {
    if (!g || !g.coordinates) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const walk = (c) => {
      if (typeof c[0] === 'number') {
        if (c[0] < minX) minX = c[0]; if (c[0] > maxX) maxX = c[0];
        if (c[1] < minY) minY = c[1]; if (c[1] > maxY) maxY = c[1];
      } else if (Array.isArray(c)) for (const x of c) walk(x);
    };
    try { walk(g.coordinates); } catch { return null; }
    if (!isFinite(minX) || !isFinite(minY)) return null;
    return [(minX + maxX) / 2, (minY + maxY) / 2];
  }

  function normalize(f, cat) {
    if (!f || !f.geometry) return null;
    const coords = f.geometry.type === 'Point' ? f.geometry.coordinates : bboxCenter(f.geometry);
    if (!coords || !isFinite(coords[0]) || !isFinite(coords[1])) return null;
    const date = (f.properties?.date || '').slice(0, 10) || today;
    return { type: 'Feature',
      geometry: { type: 'Point', coordinates: coords },
      properties: { cat, title: f.properties?.title || '(untitled)', date, id: f.properties?.id || '' } };
  }

  async function load() {
    const my = ++seq;
    loading = true; err = '';
    const s = start, e = end, requested = [...cats];
    try {
      const lists = await Promise.all(requested.map((c) => getEvents(c, s, e)
        .then((j) => (j.features || []).map((f) => normalize(f, c)).filter(Boolean))));
      if (my !== seq) return;
      events = lists.flat();
      loadedRange = { start: s, end: e };
      loadedCats = requested;
    } catch (e2) {
      if (my !== seq) return;
      err = 'NASA EONET unavailable: ' + e2.message;
      events = [];
    } finally {
      if (my === seq) loading = false;
    }
  }

  $effect(() => {
    const v = visible;
    if (ready && map.getSource('events')) map.getSource('events').setData({ type: 'FeatureCollection', features: v });
  });

  $effect(() => {
    const p = $palette;
    if (!ready || !map.getLayer('events')) return;
    map.setPaintProperty('events-cluster', 'circle-color', p.ink);
    map.setPaintProperty('events-cluster', 'circle-stroke-color', p.paper);
    map.setPaintProperty('events-count', 'text-color', p.paper);
    map.setPaintProperty('events', 'circle-color', ['match', ['get', 'cat'], 'volcanoes', p.paper, 'wildfires', p.ink, p.faint]);
    map.setPaintProperty('events', 'circle-stroke-color', p.ink);
  });

  function csv() {
    const safe = (s) => (/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""');
    const rows = ['category,date,title,lon,lat', ...visible.map((e) =>
      `${e.properties.cat},${e.properties.date},"${safe(e.properties.title)}",${e.geometry.coordinates[0]},${e.geometry.coordinates[1]}`)];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    a.download = `riftlens_events_${start}_${end}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  onMount(() => {
    map.addSource('events', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 40, clusterMaxZoom: 7 });
    map.addLayer({ id: 'events-cluster', type: 'circle', source: 'events', filter: ['has', 'point_count'], paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 2, 11, 50, 18, 1000, 28], 'circle-color': INK, 'circle-stroke-color': PAPER, 'circle-stroke-width': 1 } });
    map.addLayer({ id: 'events-count', type: 'symbol', source: 'events', filter: ['has', 'point_count'],
      layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 10, 'text-allow-overlap': true }, paint: { 'text-color': PAPER } });
    
    map.addLayer({ id: 'events', type: 'circle', source: 'events', filter: ['!', ['has', 'point_count']], paint: {
      'circle-radius': 8, 
      'circle-color': ['match', ['get', 'cat'], 'volcanoes', PAPER, 'wildfires', INK, FAINT],
      'circle-stroke-color': INK, 'circle-stroke-width': 2,
      'circle-opacity': 0.9,
      'circle-blur': 0.5 
    } });

    const popup = new maplibregl.Popup({ closeButton: false, offset: 8 });
    const enter = (e) => { const p = e.features[0].properties; popup.setLngLat(e.lngLat).setHTML(`${esc(p.title)}<br><span style="opacity:0.6">${esc(p.date)}</span>`).addTo(map); };
    const leave = () => popup.remove();
    const zoom = async (e) => { const f = e.features[0]; map.easeTo({ center: f.geometry.coordinates, zoom: await map.getSource('events').getClusterExpansionZoom(f.properties.cluster_id) }); };
    map.on('mouseenter', 'events', enter); map.on('mouseleave', 'events', leave); map.on('click', 'events-cluster', zoom);
    ready = true;
    load();

    return () => {
      seq++;
      map.off('mouseenter', 'events', enter); map.off('mouseleave', 'events', leave); map.off('click', 'events-cluster', zoom); popup.remove();
      for (const id of ['events-count', 'events-cluster', 'events']) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource('events')) map.removeSource('events');
    };
  });
</script>

<h3>Worldwide events (NASA EONET)</h3>
<div class="row">
  {#each CATS as c}<button class="chip-opt" class:on={cats.includes(c.id)} onclick={() => toggle(c.id)}>{c.label}</button>{/each}
</div>
<div class="row" style="margin-top:8px">
  <label class="field"><span class="lbl">From</span><input type="date" bind:value={start} max={end} min="2000-01-01" /></label>
  <label class="field"><span class="lbl">To</span><input type="date" bind:value={end} min={start} max={today} /></label>
  <button class="tbtn" onclick={load} disabled={loading || !cats.length}>{loading ? 'Loading' : 'Apply'}</button>
</div>
{#if err}<p class="err" style="margin-top:8px">{err}</p>{/if}
{#if stale && !loading}<p class="note muted" style="margin-top:6px">Dates changed. Press Apply to refresh.</p>{/if}

<div class="stats" style="grid-template-columns: repeat({Math.max(1, cats.length)}, 1fr)">
  {#each cats as c}<div><span class="big">{totals[c] ?? 0}</span><span class="tag">{CATS.find((x) => x.id === c).label}</span></div>{/each}
</div>

<svg class="cal" viewBox="0 0 {70 + months.length * 14} {14 + cats.length * 14}" aria-label="Events per month and type">
  {#each cats as c, r}
    <text x="66" y={14 + r * 14 + 9} class="lb" text-anchor="end">{CATS.find((x) => x.id === c).label}</text>
    {#each months as m, i}
      {@const v = grid.g[c + '|' + m] || 0}
      <rect x={70 + i * 14} y={14 + r * 14} width="13" height="12" fill={v ? RAMP[Math.min(5, Math.ceil((Math.log1p(v) / Math.log1p(grid.max)) * 5))] : RAMP[0]}><title>{m} {c}: {v}</title></rect>
    {/each}
  {/each}
  {#each months as m, i}{#if m.endsWith('-01') || i === 0}<text x={70 + i * 14} y="9" class="lb">{m.slice(0, 4)}</text>{/if}{/each}
</svg>
<div class="row" style="margin-top:8px"><button class="tbtn" onclick={csv} disabled={!visible.length}>Download CSV</button><span class="tag">{visible.length} events</span></div>

{#if recent.length}
  <ul class="recent">
    {#each recent as e}
      <li><button onclick={() => map.flyTo({ center: e.geometry.coordinates, zoom: 7 })}><span class="tag">{e.properties.date}</span> {e.properties.title}</button></li>
    {/each}
  </ul>
{/if}

<style>
  .stats { display: grid; gap: 10px; margin: 12px 0; }
  .stats div { border-left: 1px solid var(--rule); padding-left: 8px; display: flex; flex-direction: column; }
  .big { font-size: 26px; font-weight: 500; letter-spacing: -0.02em; }
  .cal { width: 100%; display: block; }
  .lb { font: 7px var(--mono); fill: var(--faint); text-transform: uppercase; }
  .recent { list-style: none; padding: 0; margin: 10px 0 0; }
  .recent li { border-top: 1px solid var(--rule); }
  .recent button { width: 100%; text-align: left; padding: 6px 2px; font-size: 12px; }
  .recent button:hover { background: var(--ink); color: var(--paper); }
</style>