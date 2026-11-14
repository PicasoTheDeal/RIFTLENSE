<script>
  import { onMount } from 'svelte';
  import * as maplibregl from 'maplibre-gl';
  import { css, mix } from '../lib/style.js';
  import { getEvents } from '../lib/sources.js';

  let { map } = $props();
  const INK = css('--ink'), PAPER = css('--paper'), FAINT = css('--faint');
  const today = new Date().toISOString().slice(0, 10);
  const CATS = [
    { id: 'wildfires', label: 'Wildfires' },
    { id: 'volcanoes', label: 'Volcanoes' },
    { id: 'severeStorms', label: 'Storms' },
    { id: 'dustHaze', label: 'Dust and haze' },
    { id: 'floods', label: 'Floods' }
  ];
  const RAMP = [0.08, 0.25, 0.45, 0.65, 0.82, 1].map((t) => mix(PAPER, INK, t));

  let cats = $state(['wildfires', 'volcanoes']);
  let start = $state(new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10));
  let end = $state(today);
  let events = $state.raw([]);
  let loading = $state(false), err = $state('');
  let ready = false;

  const months = $derived.by(() => {
    const out = []; let [y, m] = start.split('-').map(Number); const [ye, me] = end.split('-').map(Number);
    while (y < ye || (y === ye && m <= me)) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } }
    return out;
  });
  const grid = $derived.by(() => {
    const g = {}; let max = 1;
    for (const e of events) { const k = e.properties.cat + '|' + e.properties.date.slice(0, 7); g[k] = (g[k] || 0) + 1; max = Math.max(max, g[k]); }
    return { g, max };
  });
  const totals = $derived(Object.fromEntries(cats.map((c) => [c, events.filter((e) => e.properties.cat === c).length])));
  const recent = $derived([...events].sort((a, b) => b.properties.date.localeCompare(a.properties.date)).slice(0, 8));

  function toggle(id) { cats = cats.includes(id) ? cats.filter((x) => x !== id) : [...cats, id]; }

  async function load() {
    loading = true; err = '';
    try {
      const lists = await Promise.all(cats.map((c) => getEvents(c, start, end).then((j) => j.features.map((f) => {
        const g = f.geometry.type === 'Point' ? f.geometry : { type: 'Point', coordinates: centroid(f.geometry) };
        return { type: 'Feature', geometry: g, properties: { cat: c, title: f.properties.title, date: (f.properties.date || '').slice(0, 10), id: f.properties.id } };
      }))));
      events = lists.flat().filter((e) => e.properties.date);
    } catch (e) { err = 'NASA EONET unavailable: ' + e.message; events = []; }
    finally { loading = false; }
  }
  function centroid(g) {
    const pts = (g.type === 'Polygon' ? g.coordinates[0] : g.coordinates.flat(2).length ? g.coordinates[0][0] : [[0, 0]]);
    const n = pts.length; return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
  }

  $effect(() => { const ev = events; if (ready) map.getSource('events')?.setData({ type: 'FeatureCollection', features: ev }); });

  function csv() {
    const rows = ['category,date,title,lon,lat', ...events.map((e) => `${e.properties.cat},${e.properties.date},"${e.properties.title.replace(/"/g, "'")}",${e.geometry.coordinates[0]},${e.geometry.coordinates[1]}`)];
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
      'circle-radius': 5, 'circle-color': ['match', ['get', 'cat'], 'volcanoes', PAPER, 'wildfires', INK, FAINT],
      'circle-stroke-color': INK, 'circle-stroke-width': 1.5 } });
    const popup = new maplibregl.Popup({ closeButton: false, offset: 8 });
    const enter = (e) => { const p = e.features[0].properties; popup.setLngLat(e.lngLat).setHTML(`${p.title}<br><span style="opacity:0.6">${p.date}</span>`).addTo(map); };
    const leave = () => popup.remove();
    const zoom = async (e) => { const f = e.features[0]; map.easeTo({ center: f.geometry.coordinates, zoom: await map.getSource('events').getClusterExpansionZoom(f.properties.cluster_id) }); };
    map.on('mouseenter', 'events', enter); map.on('mouseleave', 'events', leave); map.on('click', 'events-cluster', zoom);
    ready = true;
    map.flyTo({ center: [20, 15], zoom: 1.5 });
    load();
    return () => {
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

<div class="stats">
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
<div class="row" style="margin-top:8px"><button class="tbtn" onclick={csv} disabled={!events.length}>Download CSV</button><span class="tag">{events.length} events</span></div>

{#if recent.length}
  <ul class="recent">
    {#each recent as e}
      <li><button onclick={() => map.flyTo({ center: e.geometry.coordinates, zoom: 7 })}><span class="tag">{e.properties.date}</span> {e.properties.title}</button></li>
    {/each}
  </ul>
{/if}

<style>
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0; }
  .stats div { border-left: 1px solid var(--rule); padding-left: 8px; display: flex; flex-direction: column; }
  .big { font-size: 26px; font-weight: 500; letter-spacing: -0.02em; }
  .cal { width: 100%; display: block; }
  .lb { font: 7px var(--mono); fill: var(--faint); text-transform: uppercase; }
  .recent { list-style: none; padding: 0; margin: 10px 0 0; }
  .recent li { border-top: 1px solid var(--rule); }
  .recent button { width: 100%; text-align: left; padding: 6px 2px; font-size: 12px; }
  .recent button:hover { background: var(--ink); color: var(--paper); }
</style>
