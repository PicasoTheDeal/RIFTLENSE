# RIFTLENS plan

## Why this wins

Local judges score impact, creativity, validity, relevance and presentation. Most Addis teams will pick Field Shift or a game. Nobody picks the analog challenge with radar and fire evidence behind it, and nobody has a story the judges personally remember from the news (the Fentale earthquakes of late 2024 and early 2025). The challenge text literally says "look beyond well known analog sites" and "surprise us". A team from the country that owns the analog does both.

## Team roles (4 to 6 people)

Role A, Data lead (Python): downloads and clips NASA layers, computes the analog similarity score. Owns notebooks/01_analog_index.
Role B, Radar lead (Python): pulls Sentinel-1 and NISAR scenes over Awash to Fentale from ASF Vertex, produces coherence change and, if time allows, an interferogram. Owns notebooks/02_rift_radar.
Role C, Fire lead (Python or JS): downloads FIRMS MODIS and VIIRS archives for Ethiopia, harmonises them, builds the burning calendar. Owns notebooks/03_fire_calendar.
Role D, Web lead (JS): builds the single page map app (MapLibre or Leaflet) with three toggleable layers, a time slider and a site scorecard panel. Owns app/.
Role E, Story lead: writes the project page, the 7 slide deck, the 4 minute pitch, and the Amharic summary. Owns pitch/.
If only four people: merge B into A and C into D.

## Timeline

Before Saturday (this week): set up accounts (NASA Earthdata login, ASF Vertex, FIRMS archive download), download the heavy data at home where internet is better, agree on the map stack, read this plan.
Saturday 10:30 to 17:30: Layer 1 scored and rendered on the map by lunch. Fire archive harmonised by 15:00. Radar scenes downloaded and first coherence image by 17:30. App skeleton with map and layer toggles by end of day.
Sunday 09:15 to 13:00: radar time slider in the app, fire calendar in the app, scorecard panel done.
Sunday 13:00 to 15:30: freeze features. Record demo, write project page, finish slides.
Sunday 16:00: local pitch submission. 16:15 pitch. 23:59 global submission on the site.

## Analog similarity score (Layer 1)

Targets: Jezero crater (Mars, 18.4 N 77.7 E) and the lunar south pole rim near Shackleton (89.9 S).
Dimensions (each normalised 0 to 1, weighted, with a plain language reason):
terrain roughness and slope (SRTM 30 m for Earth, MOLA for Mars, LOLA for Moon)
surface temperature range and extremes (MODIS LST day and night for Earth, THEMIS and Diviner published ranges for targets)
aridity and vegetation absence (MODIS NDVI, GPM or CHIRPS rainfall)
albedo and surface brightness (MODIS albedo)
volcanic and hydrothermal activity (VIIRS thermal anomalies from Layer 3, counted as a process analog)
salt, sulphate and hydrated mineral presence (ASTER mineral indices, published Dallol studies)
active tectonic deformation (radar deformation from Layer 2, counted as a process analog for Martian rifting such as Valles Marineris and Cerberus Fossae)
Output: a score per 1 km cell globally at coarse resolution, plus detailed scorecards for six Ethiopian candidate sites and three famous benchmarks (Atacama, Devon Island, Iceland) so judges can see the method is honest and not rigged for Ethiopia.
Honesty section in the app: what Earth cannot reproduce (gravity, vacuum, radiation, thin atmosphere).

## Radar layer (Layer 2)

Area: Awash Fentale to Dofan, roughly 8.6 to 9.4 N, 39.6 to 40.4 E.
Data: Sentinel-1 GRD and SLC via ASF Vertex (free, Earthdata login), NISAR L band products via ASF when available. Pre event scenes from mid 2024, co event scenes Dec 2024 to Feb 2025, post event scenes 2026.
Minimum viable output: amplitude change and coherence loss maps between pairs, shown as a time slider. Stretch: a wrapped interferogram showing the deformation fringes. Use the HyP3 on demand InSAR service on ASF Vertex to avoid local processing.
Overlay: Addis to Djibouti railway, main road, Kesem estate, geothermal sites, towns (OpenStreetMap).

## Fire layer (Layer 3)

Data: FIRMS archive download for Ethiopia bounding box, MODIS C6.1 (2000 onward) and VIIRS SNPP and NOAA20 (2012 onward), with FRP and confidence columns.
Harmonisation approach: aggregate both sensors to a common 0.1 degree monthly grid, calibrate the overlap period 2012 to 2024 with a per cell and per month ratio or regression so the MODIS era is scaled into VIIRS equivalent counts, flag persistent hotspots (Erta Ale, Dallol, gas flares) with a persistence rule and classify them as volcanic or industrial rather than fire.
Output: month by year calendar heatmap for any drawn area, anomaly against the multi year median, CSV download.

## App stack

Single page web app, MapLibre GL JS or Leaflet, static hosting (GitHub Pages or Vercel) so the demo link works on judges' phones. Layers served as COG or pre tiled PNG plus GeoJSON. No backend needed for the demo. Keep it under 20 MB total so it loads on Ethiopian mobile data.

## Submission checklist

Project page: title, high level summary (under 200 words), demo link, project details, NASA data used, other data used, AI use disclosure, team members.
Demo: 30 second video or 7 slides maximum. Not both.
Open source licence file in the repo.
Local pitch: 4 minutes plus questions, start with the Fentale cracks photo, end with the global ranking map.
