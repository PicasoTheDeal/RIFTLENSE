<script>
  import { onMount } from 'svelte';
  import * as maplibregl from 'maplibre-gl';
  import AnalogPanel from './components/AnalogPanel.svelte';
  import DancePanel from './components/DancePanel.svelte';
  import PulsePanel from './components/PulsePanel.svelte';
  import { baseStyle, applyTheme, DATASETS, TEXTURES, gibsTiles } from './lib/style.js';
  import { WORLD } from './lib/world.js';
  import { POIS } from './lib/sites.js';

  const store = {
    get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} }
  };

  let theme = $state(store.get('rl-theme', 'dark'));
  let mode = $state('analog');
  let map = $state(null);
  let query = $state('');
  let dataset = $state('none');
  let date = $state(new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10));
  let texture = $state('colour');
  let opacity = $state(0.8);
  let el;

  const MODES = [
    { id: 'analog', n: '01', label: 'Analog finder' },
    { id: 'dance', n: '02', label: 'The Dance' },
    { id: 'pulse', n: '03', label: 'The Pulse' }
  ];
  const ds = $derived(DATASETS.find((d) => d.id === dataset));
  const today = new Date().toISOString().slice(0, 10);
  const places = [...WORLD.map((s) => ({ name: s.name, lat: s.lat, lon: s.lon, z: 8 })), ...POIS.map((p) => ({ name: p.name, lat: p.lat, lon: p.lon, z: 9 }))]
    .filter((p, i, a) => a.findIndex((q) => q.name === p.name) === i);

  $effect(() => { document.documentElement.dataset.theme = theme; store.set('rl-theme', theme); });

  // Set the attribute first so panels that read colours on remount see the new theme.
  function toggleTheme() {
    const t = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    theme = t;
  }

  function go(e) {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const p = places.find((x) => x.name.toLowerCase() === q) || places.find((x) => x.name.toLowerCase().includes(q));
    if (p) map?.flyTo({ center: [p.lon, p.lat], zoom: p.z });
  }

  onMount(() => {
    document.documentElement.dataset.theme = theme;
    const m = new maplibregl.Map({ container: el, center: [25, 15], zoom: 1.8, style: baseStyle(theme), attributionControl: false });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');
    m.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    m.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: 'NASA GIBS, NASA POWER, OpenStreetMap, OpenFreeMap' }), 'bottom-left');
    // Start as soon as the style is ready. Waiting for every tile can hang on a slow connection.
    const ready = () => { if (!map) map = m; };
    m.once('style.load', ready);
    m.once('load', ready);
    return () => m.remove();
  });

  $effect(() => { if (map) applyTheme(map, theme); });

  // NASA GIBS overlay: rebuilt when the dataset or date changes, restyled when texture or opacity changes.
  $effect(() => {
    if (!map) return;
    const d = ds, dt = date;
    if (map.getLayer('overlay')) map.removeLayer('overlay');
    if (map.getSource('overlay')) map.removeSource('overlay');
    if (!d || d.id === 'none') return;
    map.addSource('overlay', { type: 'raster', tileSize: 256, maxzoom: d.z, tiles: [gibsTiles(d, dt)], attribution: 'NASA GIBS' });
    map.addLayer({ id: 'overlay', type: 'raster', source: 'overlay', paint: { 'raster-opacity': 0.8 } }, 'boundary-state');
  });
  $effect(() => {
    const t = TEXTURES.find((x) => x.id === texture), o = opacity;
    if (!map || !map.getLayer('overlay') || !ds) return;
    for (const [k, v] of Object.entries(t.paint)) map.setPaintProperty('overlay', k, v);
    map.setPaintProperty('overlay', 'raster-opacity', o);
  });
</script>

<div class="shell">
  <header class="top">
    <button class="wordmark" onclick={() => map?.flyTo({ center: [25, 15], zoom: 1.8 })} aria-label="RIFTLENS, whole world view">
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" stroke-width="1.3" /><path d="M10 1.5 8 7l3 3-2 4 1 4.5" fill="none" stroke="currentColor" stroke-width="1.3" /></svg>
      RIFTLENS
    </button>
    <span class="top-rule" aria-hidden="true"></span>
    <nav class="row">
      {#each MODES as m}
        <button class="tbtn" class:on={mode === m.id} onclick={() => (mode = m.id)}>{m.n} {m.label}</button>
      {/each}
      <button class="tbtn" onclick={toggleTheme}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
    </nav>
  </header>

  <section class="mast">
    <h1>Mars and the Moon,<br /><span class="dimmed">found on Earth.</span></h1>
    <form class="find" onsubmit={go}>
      <span class="lbl">Find a place</span>
      <input list="places" placeholder="Dallol, Atacama, Fentale..." bind:value={query} aria-label="Find a place" />
      <datalist id="places">{#each places as p}<option value={p.name}></option>{/each}</datalist>
      <button class="tbtn" type="submit">Go</button>
    </form>
    <div class="meta lbl">
      <span>NASA Space Apps 2026</span>
      <span class="muted">Addis Ababa, team N0xCod3</span>
    </div>
  </section>

  <div class="layerbar">
    <label class="field"><span class="lbl">NASA layer</span>
      <select bind:value={dataset}>{#each DATASETS as d}<option value={d.id}>{d.label}</option>{/each}</select>
    </label>
    <label class="field"><span class="lbl">Date</span>
      <input type="date" bind:value={date} max={today} min="2000-03-01" disabled={!ds || ds.id === 'none' || ds.static} />
    </label>
    <label class="field"><span class="lbl">Texture</span>
      <select bind:value={texture}>{#each TEXTURES as t}<option value={t.id}>{t.label}</option>{/each}</select>
    </label>
    <label class="field"><span class="lbl">Opacity</span>
      <input type="range" min="0.2" max="1" step="0.05" bind:value={opacity} />
    </label>
    {#if ds && ds.id !== 'none'}<span class="note muted">Daily layers have thin gaps between satellite passes. Try the day before if a date looks empty.</span>{/if}
  </div>

  <main>
    <div class="map" bind:this={el}></div>
    <aside>
      {#if !map}
        <p class="lbl muted">Loading map</p>
      {:else}
        {#key theme}
          {#if mode === 'analog'}<AnalogPanel {map} />
          {:else if mode === 'dance'}<DancePanel {map} />
          {:else}<PulsePanel {map} />{/if}
        {/key}
      {/if}
    </aside>
  </main>
</div>

<style>
  .shell { display: flex; flex-direction: column; height: 100%; }
  .top { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 20px; padding: 12px var(--pad); }
  .wordmark { display: inline-flex; align-items: center; gap: 8px; font-family: var(--display); font-size: 13px; letter-spacing: 0.12em; }
  .top-rule { height: 10px; opacity: 0.55;
    background: repeating-linear-gradient(90deg, var(--ink) 0 1px, transparent 1px 30px) left bottom / 100% 10px no-repeat,
                repeating-linear-gradient(90deg, var(--ink) 0 1px, transparent 1px 6px) left bottom / 100% 5px no-repeat; }
  .mast { display: grid; grid-template-columns: 1fr auto auto; gap: 32px; align-items: end; padding: 6px var(--pad) 14px; border-bottom: 1px solid var(--rule); }
  h1 { margin: 0; font-family: var(--sans); font-weight: 500; font-size: clamp(26px, 3.4vw, 46px); line-height: 0.98; letter-spacing: -0.03em; }
  .dimmed { color: var(--faint); }
  .find { display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--ink); padding-bottom: 4px; }
  .find input { background: transparent; border: 0; outline: none; width: 210px; font-family: var(--mono); font-size: 12px; }
  .meta { display: flex; flex-direction: column; text-align: right; }
  .layerbar { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; padding: 8px var(--pad); border-bottom: 1px solid var(--rule); }
  .field { display: flex; align-items: center; gap: 8px; }
  .field input[type='range'] { width: 110px; }
  main { flex: 1; position: relative; min-height: 0; }
  .map { position: absolute; inset: 0; }
  aside { position: absolute; top: 14px; right: 14px; bottom: 14px; width: 410px; overflow-y: auto;
    background: var(--paper); border: 1px solid var(--ink); padding: 16px 18px; }
  @media (max-width: 960px) {
    .mast { grid-template-columns: 1fr; gap: 12px; }
    .meta { text-align: left; }
    .top { grid-template-columns: auto 1fr; }
    .top nav { grid-column: 1 / -1; }
    main { display: flex; flex-direction: column; }
    .map { position: relative; height: 55vh; inset: auto; }
    aside { position: static; width: auto; border-width: 1px 0 0; }
  }
</style>
