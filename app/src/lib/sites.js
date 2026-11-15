// Preset sites. Coordinates are approximate centre points.
// Tags drive the "process" dimensions of the analog score, since those can not be read
// from a climate or elevation grid.
export const SITES = [
  { id: 'dallol', name: 'Dallol', country: 'Ethiopia', lat: 14.242, lon: 40.3, tags: ['hydrothermal', 'salt', 'volcanic', 'rift'],
    note: 'Acidic, hypersaline hydrothermal field. Used to study life at its limits.' },
  { id: 'erta-ale', name: 'Erta Ale', country: 'Ethiopia', lat: 13.6, lon: 40.67, tags: ['volcanic', 'rift'],
    note: 'Shield volcano with one of the few long lived lava lakes on Earth.' },
  { id: 'danakil', name: 'Danakil salt flats', country: 'Ethiopia', lat: 14.15, lon: 40.33, tags: ['salt', 'rift'],
    note: 'Evaporite basin below sea level. Salts similar to Martian deposits.' },
  { id: 'fentale', name: 'Fentale', country: 'Ethiopia', lat: 8.975, lon: 39.93, tags: ['volcanic', 'rift', 'deformation'],
    note: 'Centre of the 2024 to 2025 dyke intrusion and earthquake swarm.' },
  { id: 'atacama', name: 'Atacama (Yungay)', country: 'Chile', lat: -24.1, lon: -70.02, tags: ['salt'],
    note: 'Hyper arid desert. Classic Mars analog benchmark.' },
  { id: 'devon', name: 'Devon Island (Haughton)', country: 'Canada', lat: 75.38, lon: -89.68, tags: ['impact', 'cold'],
    note: 'Polar impact crater. Classic Mars and Moon analog benchmark.' },
  { id: 'holuhraun', name: 'Holuhraun', country: 'Iceland', lat: 64.85, lon: -16.83, tags: ['volcanic', 'rift'],
    note: 'Basaltic lava field from the 2014 to 2015 rifting eruption.' },
  { id: 'death-valley', name: 'Death Valley (Badwater)', country: 'USA', lat: 36.23, lon: -116.77, tags: ['salt'],
    note: 'Hot desert salt pan. Common rover test site.' },
  { id: 'dry-valleys', name: 'McMurdo Dry Valleys', country: 'Antarctica', lat: -77.6, lon: 162.9, tags: ['cold'],
    note: 'Cold, dry polar desert. Strong analog for both Mars and the Moon.' }
];

// Points of interest for the rift view.
export const POIS = [
  { name: 'Fentale', lat: 8.975, lon: 39.93, kind: 'volcano' },
  { name: 'Dofan', lat: 9.35, lon: 40.13, kind: 'volcano' },
  { name: 'Erta Ale', lat: 13.6, lon: 40.67, kind: 'volcano' },
  { name: 'Dallol', lat: 14.242, lon: 40.3, kind: 'volcano' },
  { name: 'Aluto geothermal', lat: 7.77, lon: 38.79, kind: 'asset' },
  { name: 'Tulu Moye geothermal', lat: 8.16, lon: 39.14, kind: 'asset' },
  { name: 'Metehara', lat: 8.9, lon: 39.92, kind: 'town' },
  { name: 'Awash', lat: 8.98, lon: 40.17, kind: 'town' },
  { name: 'Adama', lat: 8.54, lon: 39.27, kind: 'town' },
  { name: 'Addis Ababa', lat: 9.0, lon: 38.76, kind: 'town' }
];

// Approximate line of the Addis Ababa to Djibouti railway, for context only.
export const RAILWAY = [
  [38.8, 8.98], [39.0, 8.85], [39.27, 8.54], [39.55, 8.62], [39.92, 8.9], [40.17, 8.98],
  [40.75, 9.24], [41.3, 9.4], [41.86, 9.6], [42.3, 10.4], [42.6, 11.0], [43.15, 11.59]
];

// Study box for the radar and earthquake view.
export const FENTALE_BOX = { minLat: 8.5, maxLat: 9.6, minLon: 39.5, maxLon: 40.6 };

// Selectable areas for the fire calendar.
export const FIRE_AREAS = [
  { id: 'ethiopia', name: 'Ethiopia', bbox: [33.0, 3.4, 48.0, 14.9], file: 'Ethiopia' },
  { id: 'kenya', name: 'Kenya', bbox: [33.9, -4.7, 41.9, 5.5], file: 'Kenya' },
  { id: 'tanzania', name: 'Tanzania', bbox: [29.3, -11.7, 40.5, -1.0], file: 'Tanzania' },
  { id: 'somalia', name: 'Somalia', bbox: [40.9, -1.7, 51.4, 12.0], file: 'Somalia' },
  { id: 'sudan', name: 'Sudan', bbox: [21.8, 3.4, 38.6, 22.2], file: 'Sudan' },
  { id: 'south-africa', name: 'South Africa', bbox: [16.4, -34.8, 32.9, -22.1], file: 'South_Africa' },
  { id: 'drc', name: 'DR Congo', bbox: [12.2, -13.5, 31.3, 5.4], file: 'Democratic_Republic_of_the_Congo' },
  { id: 'angola', name: 'Angola', bbox: [11.6, -18.0, 24.1, -4.3], file: 'Angola' },
  { id: 'zambia', name: 'Zambia', bbox: [21.9, -18.1, 33.7, -8.2], file: 'Zambia' },
  { id: 'mozambique', name: 'Mozambique', bbox: [30.2, -26.9, 40.8, -10.4], file: 'Mozambique' },
  { id: 'nigeria', name: 'Nigeria', bbox: [2.6, 4.2, 14.6, 13.9], file: 'Nigeria' },
  { id: 'madagascar', name: 'Madagascar', bbox: [43.2, -25.6, 50.5, -11.9], file: 'Madagascar' },
  { id: 'zimbabwe', name: 'Zimbabwe', bbox: [25.2, -22.4, 33.0, -15.6], file: 'Zimbabwe' },
  { id: 'ghana', name: 'Ghana', bbox: [-3.2, 4.7, 1.2, 11.2], file: 'Ghana' },
  { id: 'cameroon', name: 'Cameroon', bbox: [8.5, 1.6, 16.2, 13.1], file: 'Cameroon' },
  { id: 'bale', name: 'Bale Mountains', bbox: [39.3, 6.4, 40.3, 7.2], file: 'Ethiopia' },
  { id: 'simien', name: 'Simien Mountains', bbox: [37.9, 13.0, 38.6, 13.5], file: 'Ethiopia' },
  { id: 'erta-ale', name: 'Erta Ale', bbox: [40.5, 13.45, 40.85, 13.75], file: 'Ethiopia' }
];

// Regions for the ground motion view. minMag keeps worldwide queries small enough to load fast.
export const QUAKE_REGIONS = [
  { id: 'world', name: 'Whole world', box: { minLat: -90, maxLat: 90, minLon: -180, maxLon: 180 }, minMag: 5, start: '2025-01-01', center: [20, 15], zoom: 1.5 },
  { id: 'fentale', name: 'Fentale and Dofan, Ethiopia', box: FENTALE_BOX, minMag: 2.5, start: '2024-06-01', center: [40.0, 9.05], zoom: 8.2, seed: true },
  { id: 'afar', name: 'Afar rift, Ethiopia', box: { minLat: 8, maxLat: 15, minLon: 38.5, maxLon: 43 }, minMag: 3, start: '2020-01-01', center: [40.6, 11.5], zoom: 6 },
  { id: 'east-africa', name: 'East African Rift', box: { minLat: -16, maxLat: 16, minLon: 28, maxLon: 44 }, minMag: 4, start: '2015-01-01', center: [36, 0], zoom: 4 },
  { id: 'reykjanes', name: 'Reykjanes, Iceland', box: { minLat: 63.7, maxLat: 64.2, minLon: -23, maxLon: -21.3 }, minMag: 2.5, start: '2021-01-01', center: [-22.3, 63.9], zoom: 8.5 },
  { id: 'hawaii', name: 'Kilauea, Hawaii', box: { minLat: 18.9, maxLat: 19.8, minLon: -155.8, maxLon: -154.8 }, minMag: 2.5, start: '2018-01-01', center: [-155.3, 19.4], zoom: 8.5 },
  { id: 'campi', name: 'Campi Flegrei, Italy', box: { minLat: 40.7, maxLat: 40.95, minLon: 13.95, maxLon: 14.3 }, minMag: 1.5, start: '2023-01-01', center: [14.13, 40.83], zoom: 10 },
  { id: 'santorini', name: 'Santorini, Greece', box: { minLat: 36.2, maxLat: 36.9, minLon: 25.2, maxLon: 26.2 }, minMag: 2.5, start: '2024-06-01', center: [25.6, 36.5], zoom: 8.5 },
  { id: 'japan', name: 'Japan', box: { minLat: 30, maxLat: 46, minLon: 128, maxLon: 147 }, minMag: 4.5, start: '2024-01-01', center: [138, 37], zoom: 4.5 },
  { id: 'chile', name: 'Chile and Peru', box: { minLat: -45, maxLat: -5, minLon: -82, maxLon: -66 }, minMag: 4.5, start: '2024-01-01', center: [-72, -22], zoom: 3.5 }
];
