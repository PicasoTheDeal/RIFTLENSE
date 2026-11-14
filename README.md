# RIFTLENS by N0xCod3

NASA Space Apps Challenge 2026, Addis Ababa local event
14 to 15 November 2026, Shaggar Institute of Technology (SIT)

This is the team roadmap. Read all of it before Saturday. It explains the challenge we picked, what we are building, what each person owns, what to prepare this week, and the hour by hour plan for the two days.

## 1. The challenge we register under

Register the team under this one challenge on the Space Apps website:

Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars

Why this one and not the others: NASA asks teams to find and characterise places on Earth that resemble Mars landing sites or the lunar south pole, using open data, and explicitly says to look beyond famous sites like Atacama and Iceland, to think about processes (volcanism, rifting, erosion) and not only places, to use several datasets together, and to surprise them. Ethiopia owns the best answer to that question and almost no team in Addis will touch this challenge. It accepts beginner to advanced, so a mixed team fits. It is also data agnostic, so no single dataset can sink us.

We fold two other challenges into the same product as evidence layers, so the work serves one submission: Dancing with the SARs (radar surface change with NISAR) and Harmonization of MODIS and VIIRS Hot Spots (a consistent satellite fire and heat record). We do not register under those. We use them.

## 2. What we are building

RIFTLENS is a single web map that proves one claim: the Afar rift in Ethiopia is Mars happening in real time, and the tool that characterises it as a planetary analog is the same tool that protects the people living on it.

The Afar region has Dallol and Erta Ale, which astrobiologists already use to study life limits and Martian hydrothermal chemistry. It is also actively tearing open. Between December 2024 and early 2025 the Fentale and Dofan area had thousands of earthquakes from a magma intrusion, cracked the Addis to Djibouti road and railway corridor, and displaced tens of thousands of people. The only instrument that saw the ground move before the cracks appeared was satellite radar. Every judge in the room remembers that news.

The app has three layers on one map.

Layer 1, Analog Index. A similarity score between any place on Earth and two targets, Jezero crater on Mars and the lunar south pole near Shackleton crater. Built from NASA terrain, temperature, dryness, albedo, mineral and activity data. A global ranking map where Dallol, Erta Ale, the Danakil salt flats and Fentale appear near the top beside Atacama and Devon Island, with an honest scorecard per site showing where the analogy holds and where it breaks (gravity, vacuum, radiation, atmosphere cannot be matched on Earth). This layer is the registered challenge.

Layer 2, The Dance. Radar deformation and coherence change from NISAR and Sentinel-1 over the Awash to Fentale corridor, 2024 to 2026, replayed with a time slider so you see the ground bulge weeks before the cracks. In the analog story this is a live Mars process (rifting and dyke intrusion, the same mechanism behind Cerberus Fossae on Mars). In the Ethiopian story it is a free hazard monitor for the railway, the Kesem sugar estate and the Aluto and Tulu Moye geothermal fields.

Layer 3, The Pulse. A harmonised MODIS plus VIIRS thermal hotspot calendar (2000 to today) for any area a user draws, which separates permanent volcanic heat (Erta Ale lava lake, Dallol) from true vegetation fires (Bale, Simien), shows a month by year heat calendar, flags unusual months against the long term median, and exports CSV.

## 3. What the finished submission must contain

The Space Apps site requires, by Sunday 15 November 23:59:

1. A project page with title, a summary under 200 words, project details, the list of every NASA dataset used, other data used, and an AI use disclosure.
2. A demo: either a 30 second video or a slide deck of at most 7 slides. Not both. We will do 7 slides and keep a 30 second screen recording as backup.
3. A public link to the working app and an open source code repository with a licence file.

The local judging deadline is Sunday 16:00 with pitches from 16:15. The pitch is about 4 minutes plus questions.

## 4. Team roles and what we need from you

We need four to six people. Each role owns one folder and one deliverable. Tell the team lead which role you take by Thursday.

Role A, Data lead (Python, pandas, rasterio or GDAL). Downloads and clips the NASA layers, computes the analog similarity score for the whole globe at coarse resolution and in detail for six Ethiopian candidate sites and three famous benchmarks. Owns notebooks/01_analog_index. Deliverable: a GeoTIFF or tiles of the score plus a JSON scorecard per site.

Role B, Radar lead (Python, comfortable learning one new tool in a day). Pulls Sentinel-1 and NISAR scenes over the Fentale corridor from ASF Vertex, uses the HyP3 on demand service so we do not process interferograms locally, produces coherence change and amplitude change images for a sequence of dates. Stretch goal: one wrapped interferogram of the 2025 intrusion. Owns notebooks/02_rift_radar. Deliverable: a dated stack of PNG or COG images ready for the slider.

Role C, Fire lead (Python or JavaScript, data cleaning). Downloads the FIRMS archive for Ethiopia for MODIS (2000 onward) and VIIRS (2012 onward), aggregates both to a common 0.1 degree monthly grid, calibrates the overlap years so the MODIS era is scaled into VIIRS equivalent counts, flags persistent hotspots as volcanic or industrial, builds the calendar heatmap and anomaly logic. Owns notebooks/03_fire_calendar. Deliverable: the harmonised dataset plus the calendar component.

Role D, Web lead (JavaScript, MapLibre GL JS or Leaflet). Builds the single page map app with three toggleable layers, a time slider, a draw a region tool, a site scorecard panel and CSV export. Static hosting on GitHub Pages or Vercel so the link opens on a judge's phone. Keep the total payload under 20 MB. Owns app/. Deliverable: the live link.

Role E, Story lead (writing, design, presenting). Writes the project page text, the 7 slides, the 4 minute pitch script and a short Amharic summary. Collects photos of the Fentale cracks and the Dallol landscape with correct credits. Presents on Sunday with one technical teammate. Owns pitch/. Deliverable: the deck and the project page.

If we are only four people, A also does B and D also does C.

Skills we are still looking for when recruiting at the venue: one person who loves maps and GIS, one who can design and tell a story visually, one with an Earth science or physics background.

## 5. What to do this week, before Saturday

1. Create a free NASA Earthdata login. The same login works for ASF Vertex (radar), AppEEARS (MODIS clipping) and Earthdata Search. Everyone does this.
2. Register on the FIRMS archive download page with your email so the fire CSV requests are ready.
3. Create a GitHub account if you do not have one and send your username to the team lead so you are added to the repository.
4. Download the heavy data at home, where internet is better than at the venue: SRTM tiles for Ethiopia, the FIRMS Ethiopia archive for both sensors, and at least six Sentinel-1 scenes over the Fentale area (two from mid 2024, two from December 2024 to February 2025, two from 2026). Put them in data/raw on a laptop and on a USB stick.
5. Role D sets up the empty app skeleton (map loads, layer toggles exist, nothing else) and the hosting link so Saturday starts with a working page.
6. Role E collects five photos with licences we can use and reads the Smithsonian Global Volcanism Program entries for Fentale, Dofan, Erta Ale and Dallol.
7. Everyone reads docs/PLAN.md and docs/DATA_SOURCES.md in the project folder.

Preparation is allowed by the rules. The requirement is that the project itself is built during the event, so this week is accounts, downloads and skeletons only, not finished features.

## 6. Hour by hour plan

Saturday 14 November
09:00 Kick off at SIT. Recruit the missing skills during team formation.
10:30 Start. Roles A, B, C begin data work. D wires the map. E drafts the project page.
12:30 Lunch. Target: Layer 1 global score rendered on the map, even if rough.
13:30 to 17:30 Fire archive harmonised by 15:00. First radar coherence image by 17:30. App has all three layer toggles working with placeholder data.
18:00 Debrief. Decide what we cut.

Sunday 15 November
09:15 Radar time slider live. Fire calendar live. Scorecard panel live.
13:00 Feature freeze. No new features after this, only fixes.
13:00 to 15:30 Record the 30 second screen capture, finish the 7 slides, complete the project page, confirm the public link opens on a phone on mobile data.
16:00 Submit for local judging.
16:15 Pitch.
19:00 Awards.
Before 23:59 Final global submission on the website.

## 7. The pitch in one breath

Open on the photo of the cracked railway. This is not an earthquake, this is Ethiopia becoming an ocean, and it is the closest thing to Mars on this planet. NASA wants new analog sites, we have the best one and nobody has characterised it with data, and the people living on it get no warning when it moves. RIFTLENS is one map with three layers: how Mars like a place is, how the ground is moving, and how hot it is burning. Live demo: click Dallol, read the scorecard, compare it to Atacama. Slide the radar through 2025 and watch the ground bulge before the cracks. Show the fire calendar correctly separating Erta Ale from the Bale fires. Close on what NASA gets, a systematic method and a new site, and what Ethiopia gets, a free hazard monitor and a case for hosting international analog missions in Afar.

## 8. Folder map

README.md            this roadmap
docs/PLAN.md         detailed method for each layer and the submission checklist
docs/DATA_SOURCES.md every dataset with download links and required accounts
docs/TEAM_FORM.md    text to paste into the Space Apps team registration
data/raw/            downloaded source files, never pushed to git
data/processed/      clipped and harmonised layers the app reads
notebooks/           01_analog_index, 02_rift_radar, 03_fire_calendar
app/                 the web application
pitch/               slides, screen recording, project page text

## 9. Rules of the room

One repository, small commits, push often. Nothing lives only on one laptop.
Every number on a slide must be reproducible from a notebook in the repo.
If a layer is not working by Sunday 13:00, it becomes a static image with a caption, not a reason to miss the deadline.
Credit every dataset and photo. Disclose any AI assistance in the project page as the rules require.
