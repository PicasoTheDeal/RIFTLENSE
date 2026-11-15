<script>
  import { onMount } from 'svelte';
  import { mix } from '../lib/style.js';
  import { palette } from '../lib/theme.js';
  import { FIRE_AREAS } from '../lib/sites.js';
  import { getFireCalendar } from '../lib/sources.js';
  import { seriesFor, calendar, toCSV } from '../lib/fire.js';
  import WorldPulse from './WorldPulse.svelte';

  let { map } = $props();
  const INK = $derived($palette.ink);
  const PAPER = $derived($palette.paper);

  let cal = $state(null);
  let loaded = $state(false);
  let activeCountry = $state('');
  
  let areaId = $state('ethiopia');
  let custom = $state(null);
  let drawing = $state(false);
  let firstCorner = null;
  let hideStatic = $state(true);
  let view = $state('count');
  let ready = $state(false);

  const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const RAMP = $derived([0.06, 0.2, 0.35, 0.5, 0.65, 0.82, 1].map((t) => mix($palette.paper, $palette.ink, t)));
  const DIV = $derived([0, 0.12, 0.25, 0.4, 0.6, 0.8, 1].map((t) => mix($palette.paper, $palette.ink, t)));

  const area = $derived(custom && areaId === 'custom' ? custom : FIRE_AREAS.find((a) => a.id === areaId));
  const targetFile = $derived(area?.file || 'Ethiopia');
  
  const series = $derived(cal && area ? seriesFor(cal, area.bbox, hideStatic) : null);
  const c = $derived(series ? calendar(series) : null);
  const latest = $derived.by(() => {
    if (!series || !series.months.length) return null;
    const i = series.months.length - 1;
    const m = series.months[i], mo = +m.slice(5, 7) - 1;
    return { m, n: series.counts[i], med: c.med[mo] };
  });

  // LAZY LOADING LOGIC
  $effect(async () => {
    if (!targetFile || targetFile === activeCountry) return;
    loaded = false;
    const j = await getFireCalendar(targetFile);
    if (j) {
      cal = j;
      activeCountry = targetFile;
      loaded = true;
    }
  });

  function color(v, med) {
    if (view === 'count') {
      if (!v) return RAMP[0];
      const t = Math.log1p(v) / Math.log1p(c.max);
      return RAMP[Math.min(RAMP.length - 1, 1 + Math.floor(t * (RAMP.length - 1)))];
    }
    const d = (v - med) / Math.max(1, med);
    const k = d <= -0.6 ? 0 : d <= -0.3 ? 1 : d <= -0.1 ? 2 : d < 0.1 ? 3 : d < 0.3 ? 4 : d < 0.6 ? 5 : 6;
    return DIV[k];
  }

  function download() {
    const blob = new Blob([toCSV(series, c.med, area.name)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `riftlens_hotspots_${area.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function boxGeo(b) {
    const [w, s, e, n] = b;
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] } };
  }

  $effect(() => {
    if (ready && cal && area && map.getSource('fire-area')) {
      map.getSource('fire-area').setData(boxGeo(area.bbox));
      const [w, s, e, n] = area.bbox;
      map.fitBounds([[w, s], [e, n]], { padding: 60, maxZoom: 9, duration: 600 });
    }
  });

  let cellFeatures = $state.raw([]);
  $effect(() => {
    if (!cal) return;
    cellFeatures = cal.cells.map(([lat, lon, s, pairs]) => {
      let total = 0; for (let i = 1; i < pairs.length; i += 2) total += pairs[i];
      return { type: 'Feature', properties: { s, total }, geometry: { type: 'Point', coordinates: [lon, lat] } };
    });
  });

  $effect(() => {
    const hide = hideStatic, f = cellFeatures;
    if (ready && map.getSource('fire-cells')) map.getSource('fire-cells').setData({ type: 'FeatureCollection', features: hide ? f.filter((x) => !x.properties.s) : f });
  });

  $effect(() => {
    const p = $palette;
    if (!ready) return;
    if (map.getLayer('fire-clusters')) {
      map.setPaintProperty('fire-clusters', 'circle-color', p.ink);
      map.setPaintProperty('fire-clusters', 'circle-stroke-color', p.paper);
    }
    if (map.getLayer('fire-count')) map.setPaintProperty('fire-count', 'text-color', p.paper);
    if (map.getLayer('fire-cells')) {
      map.setPaintProperty('fire-cells', 'circle-color', ['case', ['==', ['get', 's'], 1], p.paper, p.ink]);
      map.setPaintProperty('fire-cells', 'circle-stroke-color', ['case', ['==', ['get', 's'], 1], p.ink, p.paper]);
    }
    if (map.getLayer('fire-area')) map.setPaintProperty('fire-area', 'line-color', p.ink);
  });

  function onClick(e) {
    if (!drawing) return;
    const { lng, lat } = e.lngLat;
    if (!firstCorner) { firstCorner = [lng, lat]; return; }
    const [x, y] = firstCorner;
    custom = { id: 'custom', name: 'Drawn area', bbox: [Math.min(x, lng), Math.min(y, lat), Math.max(x, lng), Math.max(y, lat)] };
    areaId = 'custom'; drawing = false; firstCorner = null;
    map.getCanvas().style.cursor = '';
  }

  function startDraw() { drawing = true; firstCorner = null; map.getCanvas().style.cursor = 'crosshair'; }

  onMount(() => {
    map.addSource('fire-area', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'fire-area', type: 'line', source: 'fire-area', paint: { 'line-color': INK, 'line-width': 1, 'line-dasharray': [3, 2] } });
    map.on('click', onClick);
    ready = true;

    const k = ['case', ['>=', ['get', 'total'], 1000], ['concat', ['to-string', ['/', ['round', ['/', ['get', 'total'], 100]], 10]], 'k'], ['to-string', ['round', ['get', 'total']]]];
    map.addSource('fire-cells', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 42, clusterMaxZoom: 9,
      clusterProperties: { total: ['+', ['get', 'total']] } });
    
    map.addLayer({
      id: 'fire-heat', type: 'heatmap', source: 'fire-cells', maxzoom: 9,
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'total'], 1, 0, 100, 1],
        'heatmap-intensity': 2,
        'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.2, 'rgba(255,255,0,0.6)', 0.5, 'rgba(255,100,0,0.8)', 1, 'rgba(255,0,0,1)'],
        'heatmap-radius': 20, 'heatmap-opacity': 0.8
      }
    }, 'fire-area');

    map.addLayer({ id: 'fire-clusters', type: 'circle', source: 'fire-cells', filter: ['has', 'point_count'], paint: {
      'circle-radius': ['interpolate', ['linear'], ['ln', ['+', 1, ['get', 'total']]], 2, 11, 7, 17, 11, 26],
      'circle-color': INK, 'circle-stroke-color': PAPER, 'circle-stroke-width': 1
    } }, 'fire-area');
    map.addLayer({ id: 'fire-count', type: 'symbol', source: 'fire-cells', filter: ['has', 'point_count'],
      layout: { 'text-field': k, 'text-font': ['Noto Sans Bold'], 'text-size': 11, 'text-allow-overlap': true }, paint: { 'text-color': PAPER } });
    map.addLayer({ id: 'fire-cells', type: 'circle', source: 'fire-cells', filter: ['!', ['has', 'point_count']], paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 3, 10, 7],
      'circle-color': ['case', ['==', ['get', 's'], 1], PAPER, INK],
      'circle-stroke-color': ['case', ['==', ['get', 's'], 1], INK, PAPER], 'circle-stroke-width': 1.2
    } }, 'fire-area');

    return () => {
      map.off('click', onClick);
      map.getCanvas().style.cursor = '';
      for (const id of ['fire-heat', 'fire-count', 'fire-clusters', 'fire-cells', 'fire-area']) { 
        if (map.getLayer(id)) map.removeLayer(id); 
        if (map.getSource(id)) map.removeSource(id); 
      }
    };
  });
</script>

<div class="tag">03  the pulse</div>
<h2>Fire, volcanoes and storms, worldwide</h2>
<p class="muted small">Natural events tracked by NASA EONET for any dates you choose, plus a detailed 26 year hotspot calendar from NASA FIRMS. The heatmap shows where fires burn most intensely.</p>

<WorldPulse {map} />

<h3>Detailed hotspot calendar (FIRMS)</h3>

{#if !loaded}
  <p class="small muted">Loading harmonised hotspot record for {area.name}...</p>
{:else if !cal}
  <div class="empty">
    <p class="small">Not built yet. In the <code>app</code> folder run <code>npm run fire</code>.</p>
  </div>
{:else}
  <div class="row">
    <select bind:value={areaId} aria-label="Area">
      {#each FIRE_AREAS as a}<option value={a.id}>{a.name}</option>{/each}
      {#if custom}<option value="custom">Drawn area</option>{/if}
    </select>
    <button class="tbtn" onclick={startDraw} class:on={drawing}>{drawing ? 'Click two corners' : 'Draw area'}</button>
  </div>
  <div class="row small" style="margin-top:8px">
    <label><input type="checkbox" bind:checked={hideStatic} /> Hide volcanic and industrial heat</label>
  </div>
  <div class="row" style="margin-top:10px">
    <button class="tbtn" class:on={view === 'count'} onclick={() => (view = 'count')}>Hotspots</button>
    <button class="tbtn" class:on={view === 'anom'} onclick={() => (view = 'anom')}>Against median</button>
  </div>

  {#if latest}
    <div class="stats">
      <div><span class="big">{Math.round(latest.n)}</span><span class="small muted">hotspots in {latest.m}</span></div>
      <div><span class="big">{Math.round(latest.med)}</span><span class="small muted">median for that month</span></div>
      <div><span class="big">{series.cells}</span><span class="small muted">active grid cells</span></div>
    </div>
  {/if}

  <svg class="cal" viewBox="0 0 {28 + 12 * 22} {14 + c.years.length * 13}" aria-label="Month by year hotspot calendar">
    {#each MONTHS as m, i}<text x={28 + i * 22 + 10} y="10" class="lbl" text-anchor="middle">{m}</text>{/each}
    {#each c.years as y, r}
      <text x="24" y={14 + r * 13 + 9} class="lbl" text-anchor="end">{y}</text>
      {#each MONTHS as _, mo}
        {@const v = c.grid[`${y}-${mo}`]}
        {#if v !== undefined}
          <rect x={28 + mo * 22} y={14 + r * 13} width="21" height="12" fill={color(v, c.med[mo])}><title>{y}-{mo + 1}: {Math.round(v)} hotspots, median {Math.round(c.med[mo])}</title></rect>
        {/if}
      {/each}
    {/each}
  </svg>
  <div class="legend small muted">
    {#if view === 'count'}
      <span>fewer</span>{#each RAMP as k}<i style="background:{k}"></i>{/each}<span>more</span>
    {:else}
      <span>below median</span>{#each DIV as k}<i style="background:{k}"></i>{/each}<span>above</span>
    {/if}
  </div>
  <div class="row" style="margin-top:12px">
    <button class="tbtn" onclick={download}>Download CSV</button>
    <span class="small muted">{area.name}, {series.months[0]} to {series.months[series.months.length - 1]}</span>
  </div>
{/if}

<style>
  .empty { border: 1px dashed var(--rule); padding: 12px 14px; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 14px 0; }
  .stats div { border-left: 1px solid var(--rule); padding-left: 10px; display: flex; flex-direction: column; }
  .big { font-size: 30px; font-weight: 500; letter-spacing: -0.02em; }
  .cal { width: 100%; display: block; }
  .lbl { font-size: 8px; fill: var(--faint); }
  .legend { display: flex; align-items: center; gap: 3px; margin-top: 6px; }
  .legend i { width: 16px; height: 9px; display: inline-block; }
  .legend span { margin: 0 4px; }
</style>