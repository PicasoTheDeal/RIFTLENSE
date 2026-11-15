# RIFTLENS

**Ethiopia's Afar rift is Mars happening in real time. RIFTLENS measures it to find the ultimate testing grounds for permanent bases on the Moon and Mars.**

![Dallol hydrothermal field, Afar, Ethiopia](pitch/images/dallol_1.jpg)
<sub>Dallol, Afar Region, Ethiopia. Photo: A. Savin, FAL licence, via Wikimedia Commons.</sub>

Team **N0xCod3** for the [NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org/2026/), Addis Ababa local event, 14 to 15 November 2026, Shaggar Institute of Technology.

**Challenge:** [Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars](https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/)

## The idea

If NASA is going to build a permanent base on Mars or the Moon, we need to test our gear and train astronauts in the most hostile places on Earth first. The usual list is Atacama, Iceland, and Devon Island. But one of the strongest candidates sits in Ethiopia and has barely been characterised with data.

Afar has Dallol, an acidic, hypersaline hydrothermal field that eats through metal. It has Erta Ale, one of the few persistent lava lakes on Earth. And it is actively splitting apart. Between December 2024 and early 2025 a magma intrusion under Fentale and Dofan caused thousands of earthquakes, cracked the Addis to Djibouti road and railway, and displaced tens of thousands of people. Satellite radar saw the ground move before the cracks opened.

RIFTLENS is one interactive web map built with **Svelte 5, Vite, and MapLibre GL JS** featuring three analytical layers, 3D terrain rendering, and real-time NASA GIBS satellite raster overlays. 

## The three layers

### 1. Analog Finder (`AnalogPanel`)

A deterministic similarity score (0-100) comparing 44 preset global sites (or any clicked point on Earth) against **Mars (Jezero Crater)**, the **Moon (Lunar South Pole / Shackleton)**, or look-alike terrestrial sites.

* **Live Scoring:** Computes similarity using NASA POWER long-term climatology (temperature, diurnal range, precipitation, humidity, surface albedo) and SRTM elevation/local relief via AWS Terrarium tiles, combined with known geological tags.
* **Scorecards:** Displays metric breakdowns and explicitly lists where the analogy breaks (e.g., Earth's gravity, atmospheric pressure, radiation shielding).

### 2. The Dance (`DancePanel`)

Tracks ground deformation and seismic swarms over the Awash-Fentale corridor on a time slider. 

* **3D Terrain & Heatmaps:** Renders the Afar rift in 3D using MapLibre's terrain engine and a vivid topographic color-relief layer. Live USGS earthquake data is displayed as glowing embers and heatmaps that fade over time based on magnitude.
* **Radar Integration:** Queries Sentinel-1 SAR acquisition footprints from the Alaska Satellite Facility (ASF) API.
* **Infrastructure Context:** Highlights critical assets including the Addis-Djibouti railway, roads, towns, and geothermal fields that a base's supply chain would rely on.

### 3. The Pulse (`PulsePanel` & `WorldPulse`)

Combines global real-time natural event tracking with a 26-year harmonised thermal record:

* **Global Events (NASA EONET):** Live clustering for wildfires, volcanoes, severe storms, dust/haze, and floods worldwide, with dynamic filtering.
* **Harmonised FIRMS Hotspot Calendar (2000-Present):** Merges NASA FIRMS MODIS C6.1 and VIIRS active fire archives onto a `0.1°` monthly grid. Automatically flags and filters out permanent volcanic/industrial heat sources (like Erta Ale and Dallol) to isolate seasonal vegetation fires.
* **Lazy-Loaded Data:** The massive 26-year dataset is split into per-country JSON files (`fire_calendars/Ethiopia.json`, etc.). The app fetches only the JSON for the selected country, keeping the initial load time under 1 second.

### Base Maps & Responsive UI

* **Vector Base Map:** OpenFreeMap vector tiles with a custom "paper and ink" dark/light theme. The theme state is managed globally via a Svelte store (`theme.js`), instantly recoloring both the CSS and MapLibre layers.
* **Mobile Responsive:** On smaller screens, the map takes up the top 45vh, and the side panel stacks below it for a native app feel.
* **NASA GIBS WMTS Overlays:** Switchable daily/static satellite layers (Land Surface Temperature, Surface Albedo, Snow Cover, SMAP Soil Moisture, VIIRS True Colour, ASTER 30m Shaded Relief, and VIIRS Night Lights).

---

## Quickstart & Running Locally

### 1. Run the Web App

```bash
cd app
npm install
npm run dev
```

To build for static hosting (Cloudflare Pages):

```bash
npm run build
```

Publish the resulting `app/dist/` directory.

### 2. Build the Harmonised Fire Calendar (`npm run fire`)

To generate or update the per-country JSON files from NASA FIRMS yearly archives:

```bash
cd app
npm run fire
# Or specify a custom year range:
npm run fire -- --from 2015 --to 2026
```

Note: The script downloads MODIS (2000+), VIIRS S-NPP (2012+), and VIIRS NOAA-20 (2018+) CSVs into `data/raw/firms/`, computes per-cell VIIRS/MODIS overlap scaling ratios, and outputs lightweight, lazy-loaded JSON files into `app/public/data/fire_calendars/`.

### 3. Add Processed InSAR / Radar Products

Generate interferograms or coherence maps (e.g., via ASF HyP3), export as PNGs into `app/public/data/radar/`, and register them in `app/public/data/radar/manifest.json`:

```json
[
  {
    "id": "ifg-1",
    "label": "Interferogram 2024-12-20 to 2025-01-13",
    "date1": "2024-12-20",
    "date2": "2025-01-13",
    "url": "./data/radar/ifg-1.png",
    "bounds": [39.5, 8.5, 40.6, 9.6]
  }
]
```

## Data & Offline Fallbacks

Live data is fetched directly in the browser without API keys from NASA POWER, NASA GIBS, NASA EONET, AWS Open Data Terrain Tiles, USGS Earthquake Hazards, and ASF Search.

Saved seed files in `app/public/data/` ensure the application remains functional offline:

| File | Description |
| --- | --- |
| `world_sites.json` | Precomputed climate and terrain metrics for the 44 global analog sites |
| `power_seed.json` | Cached NASA POWER climatology fallback for preset sites |
| `quakes_fentale.json` | Cached USGS earthquake catalogue (M2.5+) for the Fentale corridor |
| `fire_calendars/*.json` | Split, lazy-loaded 26-year monthly hotspot grids built via `npm run fire` |
| `radar/manifest.json` | Metadata and bounding boxes for georeferenced InSAR PNG overlays |

Full notes on datasets are in `docs/DATA_SOURCES.md`.

## Study areas

| Site | What it is | Analog role |
| --- | --- | --- |
| Dallol | Hydrothermal salt and sulphur field | Mars hydrothermal chemistry, extreme hardware corrosion |
| Erta Ale | Shield volcano with persistent lava lake | Volcanic processes, persistent thermal anomaly |
| Danakil salt flats | Below-sea-level evaporite basin | Martian evaporites and salts |
| Fentale & Dofan | 2024-2025 dyke intrusion & seismic swarm | Active rifting, Cerberus Fossae on Mars |

Benchmarked against 40+ global sites including Atacama, Devon Island, Iceland (Holuhraun), Qaidam Basin, Rio Tinto, and McMurdo Dry Valleys.

## Repository layout

```text
app/                  Svelte 5 + Vite + MapLibre web application
  public/data/        Offline seed JSONs and radar overlays
    fire_calendars/   Per-country lazy-loaded JSON fire grids
  scripts/            Node.js data pipeline (build_fire_calendar.mjs)
  src/components/     AnalogPanel, DancePanel, PulsePanel, WorldPulse, ScoreCard
  src/lib/            Scoring math (analog.js), API clients (sources.js), themes
data/raw/             Raw FIRMS/satellite downloads (gitignored)
docs/                 Data sources and methodology notes
pitch/                Presentation slides, image bank, and credits
```

## Team & Credits

Team: N0xCod3, Addis Ababa

Credits: Images in `pitch/images` are public domain (NASA, USGS) or Creative Commons (Wikimedia Commons, ESA). Full attributions are in `pitch/images/CREDITS.md`.

Licence: MIT
