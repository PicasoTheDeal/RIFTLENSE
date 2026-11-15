<script>
  import { onMount } from 'svelte';
  import * as maplibregl from 'maplibre-gl';
  import { WORLD, REGIONS } from '../lib/world.js';
  import { TARGETS, OPTIONS, scoreSite, similarity, EARTH_LIMITS } from '../lib/analog.js';
  import { getClimate, getTerrain } from '../lib/sources.js';
  import { palette } from '../lib/theme.js';
  import ScoreCard from './ScoreCard.svelte';

  let { map } = $props();
  const INK = $derived($palette.ink);
  const PAPER = $derived($palette.paper);

  let world = $state({});
  let against = $state('mars');
  let options = $state(OPTIONS.map((o) => o.key));
  let region = $state('All');
  let selected = $state(null);
  let pointData = $state(null);
  let loading = $state(false);
  let error = $state('');
  let ready = $state(false);
  let marker;

  const refSite = $derived(WORLD.find((s) => s.id === against));
  const refLabel = $derived(refSite ? refSite.name : TARGETS[against].name);
  const dataOf = (s) => (world[s.id] ? { ...world[s.id], lat: s.lat, tags: s.tags } : null);

  function score(d) {
    if (!d) return null;
    if (refSite) {
      const r = dataOf(refSite);
      if (!r) return null;
      const s = similarity(d, r, options);
      return { ...s, parts: s.parts.map((p) => ({ ...p, key: p.opt })) };
    }
    return scoreSite(against, d, options);
  }

  const ranked = $derived(
    WORLD.filter((s) => s.id !== against && (region === 'All' || s.region === region))
      .map((s) => ({ site: s, card: score(dataOf(s)) }))
      .filter((r) => r.card?.total != null)
      .sort((a, b) => b.card.total - a.card.total)
  );
  const selectedCard = $derived(selected ? (selected.tags ? score(dataOf(selected)) : score(pointData)) : null);
  const selectedData = $derived(selected ? (selected.tags ? world[selected.id] : pointData) : null);

  function toggle(k) { options = options.includes(k) ? options.filter((x) => x !== k) : [...options, k]; }

  function pick(site) {
    selected = site; pointData = null; error = '';
    marker?.setLngLat([site.lon, site.lat]).addTo(map);
  }

  async function measurePoint(lat, lon) {
    selected = { name: `Point ${lat.toFixed(3)}, ${lon.toFixed(3)}`, lat, lon, tags: null };
    pointData = null; loading = true; error = '';
    marker?.setLngLat([lon, lat]).addTo(map);
    try {
      const [clim, dem] = await Promise.all([getClimate(lat, lon), getTerrain(lat, lon).catch(() => null)]);
      pointData = { ...clim, lat, rough: dem?.rough ?? null, elevation: dem?.elevation ?? null };
    } catch (e) { error = 'Could not reach NASA POWER for this point. ' + e.message; }
    finally { loading = false; }
  }

  function geo() {
    const scores = Object.fromEntries(ranked.map((r) => [r.site.id, Math.round(r.card.total * 100)]));
    return { type: 'FeatureCollection', features: WORLD.map((s) => ({ type: 'Feature',
      properties: { id: s.id, name: s.name, ref: s.id === against ? 1 : 0, ...(scores[s.id] != null ? { score: scores[s.id] } : {}) },
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] } })) };
  }
  $effect(() => { const g = geo(); if (ready) map.getSource('world')?.setData(g); });

  $effect(() => {
    const p = $palette;
    if (!ready || !map.getLayer('world-sites')) return;
    map.setPaintProperty('world-sites', 'circle-color', ['case', ['==', ['get', 'ref'], 1], p.paper, p.ink]);
    map.setPaintProperty('world-sites', 'circle-stroke-color', ['case', ['==', ['get', 'ref'], 1], p.ink, p.paper]);
    map.setPaintProperty('world-labels', 'text-color', p.paper);
  });

  function onClick(e) {
    const f = map.queryRenderedFeatures(e.point, { layers: ['world-sites'] })[0];
    if (f) return pick(WORLD.find((x) => x.id === f.properties.id));
    measurePoint(e.lngLat.lat, e.lngLat.lng);
  }

  onMount(() => {
    const el = document.createElement('div');
    el.style.cssText = `width:34px;height:34px;border:1px solid ${$palette.ink};border-radius:50%;pointer-events:none`;
    marker = new maplibregl.Marker({ element: el });
    fetch('./data/world_sites.json').then((r) => r.json()).then((j) => (world = j.sites)).catch(() => (error = 'Could not load the saved world data.'));

    map.addSource('world', { type: 'geojson', data: geo() });
    map.addLayer({ id: 'world-sites', type: 'circle', source: 'world', paint: {
      'circle-radius': ['case', 
        ['==', ['get', 'ref'], 1], 12, 
        ['has', 'score'], ['interpolate', ['linear'], ['get', 'score'], 0, 7, 100, 18], 
        5
      ],
      'circle-color': ['case', ['==', ['get', 'ref'], 1], PAPER, INK], 
      'circle-stroke-color': ['case', ['==', ['get', 'ref'], 1], INK, PAPER], 
      'circle-stroke-width': ['case', 
        ['==', ['get', 'ref'], 1], 3, 
        ['>=', ['get', 'score'], 75], 3, 
        1.5 
      ],
      'circle-opacity': 0.85
    } });
    map.addLayer({ id: 'world-labels', type: 'symbol', source: 'world', filter: ['has', 'score'],
      layout: { 'text-field': ['to-string', ['get', 'score']], 'text-font': ['Noto Sans Bold'], 'text-size': 10, 'text-allow-overlap': true },
      paint: { 'text-color': PAPER } });
    const popup = new maplibregl.Popup({ closeButton: false, offset: 12 });
    const enter = (e) => { map.getCanvas().style.cursor = 'pointer'; const p = e.features[0].properties; popup.setLngLat(e.lngLat).setText(p.name + (p.score != null ? `  ${p.score}` : '')).addTo(map); };
    const leave = () => { map.getCanvas().style.cursor = ''; popup.remove(); };
    map.on('mouseenter', 'world-sites', enter);
    map.on('mouseleave', 'world-sites', leave);
    map.on('click', onClick);
    map.flyTo({ center: [25, 15], zoom: 1.6 });
    ready = true;

    return () => {
      map.off('click', onClick); map.off('mouseenter', 'world-sites', enter); map.off('mouseleave', 'world-sites', leave);
      popup.remove(); marker.remove();
      for (const id of ['world-labels', 'world-sites']) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource('world')) map.removeSource('world');
    };
  });
</script>

<div class="tag">01  analog finder</div>
<h2>Which places on Earth behave like {refSite ? refSite.name : TARGETS[against].short}?</h2>
<p class="small muted">{WORLD.length} known and candidate analog sites worldwide, scored with NASA POWER climate and SRTM terrain. Click any point on the map to score it live.</p>

<h3>Match against</h3>
<div class="row">
  <button class="tbtn" class:on={against === 'mars'} onclick={() => (against = 'mars')}>Mars</button>
  <button class="tbtn" class:on={against === 'moon'} onclick={() => (against = 'moon')}>Moon</button>
  <select bind:value={against} aria-label="Find look-alikes of a site">
    <option value="mars">Look-alikes of a site...</option>
    {#each WORLD as s}<option value={s.id}>{s.name}</option>{/each}
  </select>
</div>
{#if !refSite}<p class="small muted" style="margin-top:6px">{TARGETS[against].facts}</p>{/if}

<h3>Match on</h3>
<div class="row">
  {#each OPTIONS as o}
    <button class="chip-opt" class:on={options.includes(o.key)} onclick={() => toggle(o.key)}>{o.label}</button>
  {/each}
</div>

{#if error}<p class="err" style="margin-top:10px">{error}</p>{/if}

{#if selected}
  <ScoreCard {selected} card={selectedCard ? { ...selectedCard, limits: refSite ? null : EARTH_LIMITS[against] } : null} {loading} data={selectedData} against={refLabel} />
{/if}

<h3>World ranking</h3>
<div class="row">
  <select bind:value={region} aria-label="Region">{#each REGIONS as r}<option value={r}>{r}</option>{/each}</select>
  <span class="tag">{ranked.length} sites</span>
</div>
<ol class="rank">
  {#each ranked as r, i (r.site.id)}
    <li>
      <button class:sel={selected?.id === r.site.id} onclick={() => { pick(r.site); map.flyTo({ center: [r.site.lon, r.site.lat], zoom: 6 }); }}>
        <span class="pos">{String(i + 1).padStart(2, '0')}</span>
        <span class="nm">{r.site.name}<span class="tag"> {r.site.country}</span></span>
        <span class="bar"><span style="width:{Math.round(r.card.total * 100)}%"></span></span>
        <span class="val">{Math.round(r.card.total * 100)}</span>
      </button>
    </li>
  {/each}
</ol>
<p class="note muted">Score 0 to 100 is the mean of the selected options that could be measured. NASA POWER is a coarse grid of about 50 km, so small sites inherit some of their surroundings.</p>

<style>
  .rank { list-style: none; padding: 0; margin: 8px 0; }
  .rank li { border-top: 1px solid var(--rule); }
  .rank button { width: 100%; display: grid; grid-template-columns: 24px 1fr 70px 26px; gap: 8px; align-items: center; padding: 7px 2px; text-align: left; }
  .rank button:hover, .rank button.sel { background: var(--ink); color: var(--paper); }
  .rank button:hover .tag, .rank button.sel .tag { color: inherit; opacity: 0.7; }
  .pos { font-family: var(--mono); font-size: 11px; opacity: 0.6; }
  .nm .tag { margin-left: 4px; }
  .bar { height: 2px; background: var(--rule); }
  .bar span { display: block; height: 100%; background: currentColor; }
  .val { font-family: var(--mono); font-size: 12px; text-align: right; }
</style>