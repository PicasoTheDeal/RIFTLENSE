<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import * as maplibregl from 'maplibre-gl';
  import { railBasePaint } from '../lib/style.js';
  import { palette, theme } from '../lib/theme.js';
  import { QUAKE_REGIONS, POIS } from '../lib/sites.js';
  import { getQuakes, getRadarScenes, getRadarManifest } from '../lib/sources.js';

  let { map } = $props();
  const INK = $derived($palette.ink);
  const PAPER = $derived($palette.paper);
  const FAINT = $derived($palette.faint);
  const DAY = 864e5;
  const today = new Date().toISOString().slice(0, 10);

  let regionId = $state('world');
  const region = $derived(QUAKE_REGIONS.find((r) => r.id === regionId));
  let start = $state(QUAKE_REGIONS[0].start);
  let end = $state(today);
  let minMag = $state(QUAKE_REGIONS[0].minMag);

  let quakes = $state.raw([]);
  let scenes = $state([]);
  let products = $state([]);
  let pos = $state(0);
  let playing = $state(false);
  let loading = $state(false), qErr = $state(''), rErr = $state(''), offline = $state(false);
  let ready = $state(false);
  let timer, markers = [];

  const t0 = $derived(Date.parse(start));
  const t1 = $derived(Date.parse(end) + DAY);
  const binDays = $derived((t1 - t0) / DAY > 3 * 365 ? 30 : 7);
  const bins = $derived(Math.max(1, Math.ceil((t1 - t0) / (binDays * DAY))));
  const cutoff = $derived(Math.min(t1, t0 + (pos + 1) * binDays * DAY));
  const cutoffLabel = $derived(new Date(Math.min(cutoff, Date.now())).toISOString().slice(0, 10));
  
  const hist = $derived.by(() => {
    const h = new Array(bins).fill(0);
    for (const q of quakes) { const i = Math.floor((q.properties.t - t0) / (binDays * DAY)); if (i >= 0 && i < bins) h[i]++; }
    return h;
  });
  const hmax = $derived(Math.max(1, ...hist));
  const shown = $derived(quakes.filter((q) => q.properties.t <= cutoff));
  const maxMag = $derived(shown.reduce((m, q) => Math.max(m, q.properties.mag), 0));
  const peak = $derived.by(() => { const n = Math.max(...hist); const i = hist.indexOf(n); return n ? { n, date: new Date(t0 + i * binDays * DAY).toISOString().slice(0, 10) } : null; });
  const small = $derived(region.box.maxLat - region.box.minLat < 3);
  const lastScene = $derived([...scenes].reverse().find((s) => Date.parse(s.date) <= cutoff));
  const activeProducts = $derived(products.filter((p) => Date.parse(p.date2 || p.date) <= cutoff));

  function chooseRegion(id) {
    const r = QUAKE_REGIONS.find((x) => x.id === id);
    regionId = id; start = r.start; end = today; minMag = r.minMag;
    map.flyTo({ center: r.center, zoom: r.zoom, pitch: 45 });
    load();
  }

  async function load() {
    clearInterval(timer); playing = false;
    loading = true; qErr = ''; offline = false; rErr = ''; scenes = [];
    const r = region;
    try {
      const j = await getQuakes(r.box, start, end, minMag, r.seed);
      offline = !!j.offline;
      quakes = j.features.filter((f) => f.properties.mag >= minMag && f.properties.time >= t0 && f.properties.time <= t1)
        .map((f) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: f.geometry.coordinates.slice(0, 2) }, properties: { t: f.properties.time, mag: f.properties.mag, place: f.properties.place } }));
      pos = bins - 1;
    } catch (e) { quakes = []; qErr = 'Earthquake catalogue unavailable: ' + e.message; }
    finally { loading = false; }
    if (small) {
      const c = [(r.box.minLat + r.box.maxLat) / 2, (r.box.minLon + r.box.maxLon) / 2];
      getRadarScenes(c[0], c[1], start, end).then((s) => (scenes = s)).catch((e) => (rErr = 'ASF search unavailable: ' + e.message));
    }
  }

  $effect(() => {
    const c = cutoff, feats = shown;
    if (!ready || !map.getSource('quakes')) return;
    map.getSource('quakes').setData({ type: 'FeatureCollection', features: feats });
    
    // Fade older dots so the newest ones stand out like an active swarm
    map.setPaintProperty('quakes', 'circle-opacity', ['interpolate', ['linear'], ['-', c, ['get', 't']], 0, 1, 90 * DAY, 0.2]);
    
    const b = region.box;
    map.getSource('qbox')?.setData({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[b.minLon, b.minLat], [b.maxLon, b.minLat], [b.maxLon, b.maxLat], [b.minLon, b.maxLat], [b.minLon, b.minLat]]] } });
  });

  $effect(() => {
    const act = activeProducts;
    if (!ready) return;
    for (const p of products) { const id = 'radar-' + p.id; if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', p === act[act.length - 1] ? 'visible' : 'none'); }
  });

  $effect(() => {
    const p = $palette;
    if (!ready) return;
    if (map.getLayer('rail')) {
      map.setPaintProperty('rail', 'line-color', p.ink);
      map.setPaintProperty('rail', 'line-width', ['interpolate', ['linear'], ['zoom'], 5, 1, 10, 2.2]);
    }
    if (map.getLayer('quakes-cluster')) {
      map.setPaintProperty('quakes-cluster', 'circle-color', p.ink);
      map.setPaintProperty('quakes-cluster', 'circle-stroke-color', p.paper);
    }
    if (map.getLayer('quakes-count')) map.setPaintProperty('quakes-count', 'text-color', p.paper);
    if (map.getLayer('quakes')) {
      map.setPaintProperty('quakes', 'circle-color', p.ink);
      map.setPaintProperty('quakes', 'circle-stroke-color', p.paper);
    }
    if (map.getLayer('qbox')) map.setPaintProperty('qbox', 'line-color', p.faint);
  });

  function play() {
    if (playing) { clearInterval(timer); playing = false; return; }
    if (pos >= bins - 1) pos = 0;
    playing = true;
    // Playback duration: 5 minutes (300,000 ms) total
    const interval = Math.max(50, Math.min(2000, Math.floor(300000 / bins)));
    timer = setInterval(() => { 
      if (pos >= bins - 1) { 
        clearInterval(timer); 
        playing = false; 
      } else {
        pos++;
      }
    }, interval);
  }

  onMount(() => {
    // 1. Enable 3D Terrain
    if (!map.getTerrain()) map.setTerrain({ source: 'dem', exaggeration: 1.5 });

    // 2. Add Color Relief for topographic depth
    if (!map.getLayer('terrain-color')) {
      map.addLayer({
        id: 'terrain-color',
        type: 'color-relief',
        source: 'dem',
        paint: {
          'color-relief-color': [
            'interpolate', ['linear'], ['elevation'],
            -100, '#4a0c6b', 0, '#1f78b4', 500, '#33a02c', 1500, '#ff7f00', 3000, '#e31a1c', 5000, '#ffffff'
          ],
          'color-relief-opacity': 0.6
        }
      }, 'hillshade');
    }

    // 3. Study Box
    map.addSource('qbox', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'qbox', type: 'line', source: 'qbox', paint: { 'line-color': FAINT, 'line-dasharray': [2, 2], 'line-width': 1 } });
    
    // 4. Earthquakes
    map.addSource('quakes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 38, clusterMaxZoom: 10 });
    
    // Glowing heatmap for high-density areas
    map.addLayer({
      id: 'quakes-heat',
      type: 'heatmap',
      source: 'quakes',
      maxzoom: 9,
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'mag'], 1, 0, 6, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
        'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.2, 'rgba(255,255,0,0.5)', 0.5, 'rgba(255,120,0,0.8)', 1, 'rgba(255,0,0,1)'],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 25],
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 9, 0]
      }
    }, 'quakes-cluster');

    map.addLayer({ id: 'quakes-cluster', type: 'circle', source: 'quakes', filter: ['has', 'point_count'], paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 2, 11, 20, 17, 300, 28],
      'circle-color': INK, 'circle-stroke-color': PAPER, 'circle-stroke-width': 1 } });
    map.addLayer({ id: 'quakes-count', type: 'symbol', source: 'quakes', filter: ['has', 'point_count'],
      layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 10, 'text-allow-overlap': true }, paint: { 'text-color': PAPER } });
    
    // Individual earthquake markers - styled to look like glowing embers
    map.addLayer({ id: 'quakes', type: 'circle', source: 'quakes', filter: ['!', ['has', 'point_count']], paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 1.5, 4, 4, 8, 8, 20],
      'circle-color': INK, 
      'circle-stroke-color': PAPER, 
      'circle-stroke-width': 1.5,
      'circle-blur': 0.2,
      'circle-opacity': 1 
    } });

    for (const p of POIS) {
      const el = document.createElement('div');
      el.className = 'poi';
      el.innerHTML = `<span class="d ${p.kind}"></span><span class="l">${p.name}</span>`;
      markers.push(new maplibregl.Marker({ element: el, anchor: 'left', offset: [-4, 0] }).setLngLat([p.lon, p.lat]).addTo(map));
    }
    const popup = new maplibregl.Popup({ closeButton: false, offset: 8 });
    const enter = (e) => {
      const p = e.features[0].properties;
      popup.setLngLat(e.lngLat).setHTML(`M${(+p.mag).toFixed(1)} ${p.place || ''}<br><span style="opacity:0.6">${new Date(+p.t).toISOString().slice(0, 16).replace('T', ' ')} UTC</span>`).addTo(map);
    };
    const leave = () => popup.remove();
    const zoomCluster = async (e) => {
      const f = e.features[0];
      const z = await map.getSource('quakes').getClusterExpansionZoom(f.properties.cluster_id);
      map.easeTo({ center: f.geometry.coordinates, zoom: z });
    };
    map.on('mouseenter', 'quakes', enter); map.on('mouseleave', 'quakes', leave); map.on('click', 'quakes-cluster', zoomCluster);
    ready = true;
    map.flyTo({ center: region.center, zoom: region.zoom, pitch: 45 });
    load();

    getRadarManifest().then((list) => {
      products = list.map((p, i) => ({ ...p, id: p.id || String(i) }));
      for (const p of products) {
        const [w, s, e, n] = p.bounds;
        map.addSource('radar-' + p.id, { type: 'image', url: p.url, coordinates: [[w, n], [e, n], [e, s], [w, s]] });
        map.addLayer({ id: 'radar-' + p.id, type: 'raster', source: 'radar-' + p.id, layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.75 } }, 'quakes-cluster');
      }
    });

    return () => {
      clearInterval(timer);
      map.off('mouseenter', 'quakes', enter); map.off('mouseleave', 'quakes', leave); map.off('click', 'quakes-cluster', zoomCluster); popup.remove();
      if (map.getLayer('rail')) {
        const rp = railBasePaint(get(theme));
        map.setPaintProperty('rail', 'line-color', rp.color);
        map.setPaintProperty('rail', 'line-width', rp.width);
      }
      markers.forEach((m) => m.remove());
      map.setTerrain(null);
      if (map.getLayer('terrain-color')) map.removeLayer('terrain-color');
      
      for (const id of ['quakes-heat', 'quakes-count', 'quakes-cluster', 'quakes', 'qbox', ...products.map((p) => 'radar-' + p.id)]) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      for (const src of ['quakes', 'qbox', ...products.map((p) => 'radar-' + p.id)]) {
        if (map.getSource(src)) map.removeSource(src);
      }
    };
  });
</script>

<div class="tag">02  the dance</div>
<h2>The ground moving, anywhere on Earth</h2>
<p class="small muted">Press play to watch the swarm populate the map. The size of each glowing ember reflects the magnitude of the earthquake. Older events fade out to highlight the active frontier.</p>

<h3>Region and dates</h3>
<div class="row">
  <select value={regionId} onchange={(e) => chooseRegion(e.currentTarget.value)} aria-label="Region">
    {#each QUAKE_REGIONS as r}<option value={r.id}>{r.name}</option>{/each}
  </select>
</div>
<div class="row" style="margin-top:8px">
  <label class="field"><span class="lbl">From</span><input type="date" bind:value={start} max={end} min="1990-01-01" /></label>
  <label class="field"><span class="lbl">To</span><input type="date" bind:value={end} min={start} max={today} /></label>
  <label class="field"><span class="lbl">Min M</span><input type="number" bind:value={minMag} min="1" max="8" step="0.5" style="width:56px" /></label>
  <button class="tbtn" onclick={load} disabled={loading}>{loading ? 'Loading' : 'Apply'}</button>
</div>

<div class="stats">
  <div><span class="big">{shown.length}</span><span class="tag">earthquakes to {cutoffLabel}</span></div>
  <div><span class="big">{maxMag ? maxMag.toFixed(1) : '-'}</span><span class="tag">largest</span></div>
  <div><span class="big">{small ? scenes.filter((s) => Date.parse(s.date) <= cutoff).length : '-'}</span><span class="tag">radar passes</span></div>
</div>
{#if qErr}<p class="err">{qErr}</p>{/if}
{#if offline}<p class="note muted">Showing the saved USGS catalogue (no connection to USGS right now).</p>{/if}

<svg viewBox="0 0 {bins} 50" preserveAspectRatio="none" class="hist" aria-label="Earthquakes per {binDays === 7 ? 'week' : 'month'}">
  {#each hist as h, i}
    <rect x={i} y={48 - (h / hmax) * 46} width="0.8" height={(h / hmax) * 46} fill={i <= pos ? INK : $palette.rule} />
  {/each}
  <line x1={pos + 0.4} x2={pos + 0.4} y1="0" y2="50" stroke={INK} stroke-width="0.3" stroke-dasharray="1 1" />
</svg>
<div class="row between tag"><span>{start}</span><span>per {binDays === 7 ? 'week' : 'month'}</span><span>{end}</span></div>
<div class="row">
  <button class="tbtn" onclick={play}>{playing ? 'Pause' : 'Play'}</button>
  <input type="range" min="0" max={bins - 1} bind:value={pos} aria-label="Time" />
</div>
{#if peak}<p class="small muted">Busiest {binDays === 7 ? 'week' : 'month'} starts {peak.date} with {peak.n} earthquakes.</p>{/if}

<h3>Radar</h3>
{#if !small}
  <p class="small muted">Pick a single volcano or rift region to list its Sentinel-1 radar passes.</p>
{:else}
  {#if rErr}<p class="err">{rErr}</p>{/if}
  {#if lastScene}<p class="small">Latest pass before this date: <strong>{lastScene.date}</strong>, path {lastScene.path}, {lastScene.direction?.toLowerCase()}</p>{/if}
{/if}
{#if products.length}
  <p class="small">Processed products: {activeProducts.length} of {products.length} up to this date.</p>
{:else}
  <p class="note muted">Processed interferograms go in public/data/radar with an entry in manifest.json. They show on the map at their date.</p>
{/if}

<style>
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 14px 0; }
  .stats div { border-left: 1px solid var(--rule); padding-left: 8px; display: flex; flex-direction: column; }
  .big { font-size: 30px; font-weight: 500; letter-spacing: -0.02em; }
  .hist { width: 100%; height: 80px; display: block; margin-top: 8px; }
  .between { justify-content: space-between; }
  input[type='range'] { flex: 1; }
  :global(.poi) { display: flex; align-items: center; gap: 6px; pointer-events: none; }
  :global(.poi .d) { width: 8px; height: 8px; border-radius: 50%; background: var(--ink); display: inline-block; flex: none; }
  :global(.poi .d.volcano) { background: transparent; border: 1.5px solid var(--ink); }
  :global(.poi .d.asset) { background: var(--faint); border-radius: 0; }
  :global(.poi .l) { font: 11px var(--mono); color: var(--ink); text-shadow: 0 0 3px var(--paper), 0 0 3px var(--paper); white-space: nowrap; }
</style>