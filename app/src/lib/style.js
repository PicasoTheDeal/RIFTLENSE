// Base map on OpenFreeMap vector tiles (OpenStreetMap data, free, no key), coloured from the theme.

const name = ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name']];

const PALETTE = {
  dark: { bg: '#0c0c0b', land2: '#151514', sand: '#1a1a18', ice: '#262624', water: '#050505', line: '#2a2927', road: '#2f2e2b', road2: '#222120',
    rail: '#6b6963', border: '#55534d', text: '#a09d95', text2: '#6b6963', halo: '#0c0c0b', shadow: '#000000', light: '#2a2927' },
  light: { bg: '#f1efe9', land2: '#e7e4dc', sand: '#e9e2d0', ice: '#ffffff', water: '#d6d3ca', line: '#c9c5bb', road: '#cfcbc1', road2: '#dedad1',
    rail: '#55534d', border: '#8d8a82', text: '#55534d', text2: '#8d8a82', halo: '#f1efe9', shadow: '#b8b4aa', light: '#ffffff' }
};

// Blend two hex colours, t from 0 (a) to 1 (b).
export function mix(a, b, t) {
  const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const A = h(a), B = h(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

export function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

export function baseStyle(theme = 'dark') {
  const p = PALETTE[theme];
  return {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
      dem: { type: 'raster-dem', encoding: 'terrarium', tileSize: 256, maxzoom: 12,
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], attribution: 'Terrain: SRTM via AWS Open Data' }
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': p.bg } },
      { id: 'landcover-sand', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['match', ['get', 'class'], ['sand', 'rock'], true, false], paint: { 'fill-color': p.sand } },
      { id: 'landcover-ice', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'ice'], paint: { 'fill-color': p.ice } },
      { id: 'landcover-green', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['match', ['get', 'class'], ['wood', 'grass', 'wetland', 'farmland'], true, false], paint: { 'fill-color': p.land2, 'fill-opacity': 0.6 } },
      { id: 'park', type: 'line', source: 'omt', 'source-layer': 'park', minzoom: 6, paint: { 'line-color': p.border, 'line-width': 0.6, 'line-dasharray': [1, 2] } },
      { id: 'hillshade', type: 'hillshade', source: 'dem',
        paint: { 'hillshade-exaggeration': 0.35, 'hillshade-shadow-color': p.shadow, 'hillshade-highlight-color': p.light, 'hillshade-accent-color': p.bg } },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': p.water } },
      { id: 'waterway', type: 'line', source: 'omt', 'source-layer': 'waterway', minzoom: 6, paint: { 'line-color': p.water, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 12, 2] } },
      { id: 'boundary-state', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['==', ['get', 'admin_level'], 4], paint: { 'line-color': p.line, 'line-width': 0.6, 'line-dasharray': [3, 2] } },
      { id: 'boundary-country', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['<=', ['get', 'admin_level'], 2], paint: { 'line-color': p.border, 'line-width': 1 } },
      { id: 'roads-minor', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 8,
        filter: ['match', ['get', 'class'], ['secondary', 'tertiary', 'minor', 'track'], true, false], paint: { 'line-color': p.road2, 'line-width': 0.7 } },
      { id: 'roads', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false],
        paint: { 'line-color': p.road, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.4, 10, 1.8] } },
      { id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['==', ['get', 'class'], 'rail'],
        paint: { 'line-color': p.rail, 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.6, 10, 1.4], 'line-dasharray': [3, 2] } },
      { id: 'water-name', type: 'symbol', source: 'omt', 'source-layer': 'water_name', minzoom: 3,
        layout: { 'text-field': name, 'text-font': ['Noto Sans Italic'], 'text-size': 11 }, paint: { 'text-color': p.text2, 'text-halo-color': p.halo, 'text-halo-width': 1 } },
      { id: 'peaks', type: 'symbol', source: 'omt', 'source-layer': 'mountain_peak', minzoom: 8,
        layout: { 'text-field': ['concat', '▲ ', name, ['case', ['has', 'ele'], ['concat', ' ', ['to-string', ['get', 'ele']], ' m'], '']], 'text-font': ['Noto Sans Regular'], 'text-size': 10 },
        paint: { 'text-color': p.text2, 'text-halo-color': p.halo, 'text-halo-width': 1 } },
      { id: 'place-country', type: 'symbol', source: 'omt', 'source-layer': 'place', filter: ['==', ['get', 'class'], 'country'], maxzoom: 7,
        layout: { 'text-field': ['upcase', name], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-letter-spacing': 0.2 },
        paint: { 'text-color': p.text2, 'text-halo-color': p.halo, 'text-halo-width': 1 } },
      { id: 'place-town', type: 'symbol', source: 'omt', 'source-layer': 'place', filter: ['match', ['get', 'class'], ['city', 'town'], true, false], minzoom: 4.5,
        layout: { 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 10, 13] },
        paint: { 'text-color': p.text, 'text-halo-color': p.halo, 'text-halo-width': 1.2 } },
      { id: 'place-village', type: 'symbol', source: 'omt', 'source-layer': 'place', filter: ['match', ['get', 'class'], ['village', 'hamlet', 'suburb'], true, false], minzoom: 9,
        layout: { 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-size': 10 }, paint: { 'text-color': p.text2, 'text-halo-color': p.halo, 'text-halo-width': 1 } }
    ]
  };
}

// Recolour the base map in place, so layers added by the panels survive a theme change.
export function applyTheme(map, theme) {
  const p = PALETTE[theme];
  const set = (id, prop, v) => map.getLayer(id) && map.setPaintProperty(id, prop, v);
  set('bg', 'background-color', p.bg);
  set('landcover-sand', 'fill-color', p.sand); set('landcover-ice', 'fill-color', p.ice); set('landcover-green', 'fill-color', p.land2);
  set('park', 'line-color', p.border);
  set('hillshade', 'hillshade-shadow-color', p.shadow); set('hillshade', 'hillshade-highlight-color', p.light); set('hillshade', 'hillshade-accent-color', p.bg);
  set('water', 'fill-color', p.water); set('waterway', 'line-color', p.water);
  set('boundary-state', 'line-color', p.line); set('boundary-country', 'line-color', p.border);
  set('roads-minor', 'line-color', p.road2); set('roads', 'line-color', p.road); set('rail', 'line-color', p.rail);
  for (const id of ['water-name', 'peaks', 'place-country', 'place-village']) { set(id, 'text-color', p.text2); set(id, 'text-halo-color', p.halo); }
  set('place-town', 'text-color', p.text); set('place-town', 'text-halo-color', p.halo);
}

// NASA GIBS layers, names checked against the live GIBS capabilities.
export const DATASETS = [
  { id: 'none', label: 'None' },
  { id: 'lstd', label: 'Land temperature, day (MODIS)', layer: 'MODIS_Terra_Land_Surface_Temp_Day', z: 7, ext: 'png' },
  { id: 'vlstd', label: 'Land temperature, day (VIIRS)', layer: 'VIIRS_NOAA20_Land_Surface_Temp_Day', z: 7, ext: 'png' },
  { id: 'vlstn', label: 'Land temperature, night (VIIRS)', layer: 'VIIRS_NOAA20_Land_Surface_Temp_Night', z: 7, ext: 'png' },
  { id: 'sst', label: 'Sea surface temperature', layer: 'GHRSST_L4_MUR_Sea_Surface_Temperature', z: 7, ext: 'png' },
  { id: 'albedo', label: 'Surface albedo', layer: 'MODIS_Combined_L3_White_Sky_Albedo_Daily', z: 8, ext: 'png' },
  { id: 'snow', label: 'Snow cover', layer: 'MODIS_Terra_NDSI_Snow_Cover', z: 8, ext: 'png' },
  { id: 'soil', label: 'Soil moisture (SMAP)', layer: 'SMAP_L4_Analyzed_Surface_Soil_Moisture', z: 6, ext: 'png' },
  { id: 'viirs', label: 'True colour (VIIRS NOAA-20)', layer: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', z: 9, ext: 'jpg' },
  { id: 'relief', label: 'Relief, ASTER 30 m (no date)', layer: 'ASTER_GDEM_Greyscale_Shaded_Relief', z: 12, ext: 'jpg', static: true },
  { id: 'bluemarble', label: 'Blue Marble relief (no date)', layer: 'BlueMarble_ShadedRelief_Bathymetry', z: 8, ext: 'jpg', static: true },
  { id: 'lights', label: 'Night lights 2016 (no date)', layer: 'VIIRS_Night_Lights', z: 8, ext: 'png', static: true }
];

export const TEXTURES = [
  { id: 'colour', label: 'Colour', paint: { 'raster-saturation': 0, 'raster-contrast': 0, 'raster-brightness-min': 0, 'raster-brightness-max': 1, 'raster-hue-rotate': 0 } },
  { id: 'mono', label: 'Mono', paint: { 'raster-saturation': -1, 'raster-contrast': 0.15, 'raster-brightness-min': 0, 'raster-brightness-max': 1, 'raster-hue-rotate': 0 } },
  { id: 'contrast', label: 'High contrast', paint: { 'raster-saturation': -1, 'raster-contrast': 0.75, 'raster-brightness-min': 0, 'raster-brightness-max': 1, 'raster-hue-rotate': 0 } },
  { id: 'invert', label: 'Inverted', paint: { 'raster-saturation': -1, 'raster-contrast': 0.2, 'raster-brightness-min': 1, 'raster-brightness-max': 0, 'raster-hue-rotate': 0 } },
  { id: 'shift', label: 'Hue shifted', paint: { 'raster-saturation': 0.2, 'raster-contrast': 0.1, 'raster-brightness-min': 0, 'raster-brightness-max': 1, 'raster-hue-rotate': 180 } }
];

export function gibsTiles(ds, date) {
  const t = ds.static ? '' : `${date}/`;
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${ds.layer}/default/${t}GoogleMapsCompatible_Level${ds.z}/{z}/{y}/{x}.${ds.ext}`;
}
