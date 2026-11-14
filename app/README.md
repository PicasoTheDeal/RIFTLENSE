# RIFTLENS app

Svelte 5 + Vite + MapLibre. One map, three layers:

- **Analog Index**: click anywhere to score how Mars-like or Moon-like a place is. Climate from NASA POWER, local relief from SRTM based terrain tiles, known geology for preset sites. Rank Ethiopian sites against Atacama, Devon Island, Iceland, Death Valley and the Dry Valleys.
- **The Dance**: earthquakes around Fentale and Dofan since June 2024 (USGS) and every Sentinel-1 pass over the corridor (ASF search), on a weekly time slider. Processed InSAR products show on the map at their date.
- **The Pulse**: harmonised MODIS + VIIRS hotspot calendar from NASA FIRMS, with volcanic and industrial heat flagged, area selection, anomaly view and CSV export.

Base layers: CARTO dark, NASA GIBS MODIS true colour and MODIS land surface temperature, terrain hillshade.

## Run

```
npm install
npm run dev
```

Build for hosting (GitHub Pages or any static host): `npm run build`, then publish `dist/`.

## Data

Live in the browser, no keys: NASA POWER, NASA GIBS, AWS terrain tiles, USGS earthquakes, ASF search.

Saved copies in `public/data` so the demo still works on a bad connection:

| File | What |
|---|---|
| `power_seed.json` | NASA POWER climatology for the preset sites |
| `quakes_fentale.json` | USGS earthquakes M2.5+ in the Fentale box since June 2024 |
| `radar/manifest.json` | list of processed radar products (empty until the radar lead adds some) |
| `fire_calendar.json` | built by `npm run fire`, see below |

### Fire record

```
npm run fire
```

Downloads the FIRMS yearly archives for Ethiopia (MODIS from 2000, VIIRS S-NPP from 2012, NOAA-20 from 2018) into `../data/raw/firms` and writes `public/data/fire_calendar.json`. Use `-- --from 2015 --to 2025` for a shorter run. If FIRMS is slow, download the yearly Ethiopia CSVs by hand from the FIRMS country archive page into `../data/raw/firms` and run it again; it uses whatever is there.

### Radar products

Make InSAR or coherence products over Fentale with ASF HyP3, export a PNG, put it in `public/data/radar/` and add an entry:

```json
[
  { "id": "ifg-1", "label": "Interferogram 2024-12-20 to 2025-01-13", "date1": "2024-12-20", "date2": "2025-01-13",
    "url": "./data/radar/ifg-1.png", "bounds": [39.5, 8.5, 40.6, 9.6] }
]
```

`bounds` is west, south, east, north. The image shows on the map when the slider passes `date2`.
