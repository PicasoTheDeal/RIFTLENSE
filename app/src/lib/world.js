// Candidate analog sites around the world. Coordinates are approximate centre points.
// Tags are known geology that a climate grid can not see.
// [id, name, country, region, lat, lon, tags, note]
const RAW = [
  ['dallol', 'Dallol', 'Ethiopia', 'Africa', 14.242, 40.3, 'hydrothermal salt volcanic rift acid', 'Acidic, hypersaline hydrothermal field.'],
  ['erta-ale', 'Erta Ale', 'Ethiopia', 'Africa', 13.6, 40.67, 'volcanic rift', 'Shield volcano with a long lived lava lake.'],
  ['danakil', 'Danakil salt flats', 'Ethiopia', 'Africa', 14.15, 40.33, 'salt rift', 'Evaporite basin below sea level.'],
  ['fentale', 'Fentale', 'Ethiopia', 'Africa', 8.975, 39.93, 'volcanic rift deformation', 'Centre of the 2024 to 2025 dyke intrusion.'],
  ['abhe', 'Lake Abhe', 'Ethiopia and Djibouti', 'Africa', 11.17, 41.78, 'hydrothermal salt rift', 'Travertine chimneys around a soda lake.'],
  ['assal', 'Lake Assal', 'Djibouti', 'Africa', 11.66, 42.42, 'salt rift', 'Lowest point in Africa, hypersaline.'],
  ['lengai', 'Ol Doinyo Lengai', 'Tanzania', 'Africa', -2.764, 35.914, 'volcanic rift', 'Only active carbonatite volcano.'],
  ['natron', 'Lake Natron', 'Tanzania', 'Africa', -2.42, 36.04, 'salt rift', 'Alkaline soda lake.'],
  ['namib', 'Namib Desert', 'Namibia', 'Africa', -24.73, 15.29, '', 'Dune fields shaped by wind, like Martian dunes.'],
  ['richat', 'Richat Structure', 'Mauritania', 'Africa', 21.12, -11.4, '', 'Eroded dome in hyper arid desert.'],
  ['tibesti', 'Emi Koussi, Tibesti', 'Chad', 'Africa', 19.79, 18.55, 'volcanic', 'Desert shield volcano, compared with Elysium Mons.'],
  ['kamil', 'Gebel Kamil crater', 'Egypt', 'Africa', 22.018, 26.088, 'impact', 'Small fresh impact crater in the Sahara.'],
  ['makgadikgadi', 'Makgadikgadi Pans', 'Botswana', 'Africa', -20.7, 25.5, 'salt', 'One of the largest salt flats.'],
  ['lut', 'Dasht-e Lut', 'Iran', 'Asia', 30.4, 58.4, '', 'Among the hottest surfaces measured from space.'],
  ['rub-al-khali', 'Rub al Khali', 'Saudi Arabia', 'Asia', 20.0, 50.5, '', 'Largest continuous sand desert.'],
  ['dead-sea', 'Dead Sea', 'Jordan and Israel', 'Asia', 31.5, 35.5, 'salt rift', 'Hypersaline rift lake.'],
  ['lonar', 'Lonar crater', 'India', 'Asia', 19.976, 76.508, 'impact volcanic', 'Impact crater in basalt, like many on Mars.'],
  ['qaidam', 'Qaidam Basin', 'China', 'Asia', 37.5, 93.0, 'salt cold', 'High, cold, salty desert. Studied as a Mars analog.'],
  ['taklamakan', 'Taklamakan', 'China', 'Asia', 39.0, 83.0, '', 'Cold sand desert.'],
  ['gobi', 'Gobi', 'Mongolia', 'Asia', 43.5, 103.0, 'cold', 'Cold stony desert.'],
  ['tso-kar', 'Tso Kar, Ladakh', 'India', 'Asia', 33.3, 78.0, 'salt cold', 'High altitude salt lake.'],
  ['atacama', 'Atacama (Yungay)', 'Chile', 'Americas', -24.1, -70.02, 'salt', 'Hyper arid desert, classic Mars benchmark.'],
  ['uyuni', 'Salar de Uyuni', 'Bolivia', 'Americas', -20.13, -67.49, 'salt cold', 'Largest salt flat on Earth.'],
  ['licancabur', 'Licancabur', 'Chile and Bolivia', 'Americas', -22.83, -67.88, 'volcanic cold', 'High summit lake, extreme UV.'],
  ['death-valley', 'Death Valley (Badwater)', 'USA', 'Americas', 36.23, -116.77, 'salt', 'Hot salt pan, rover test site.'],
  ['meteor', 'Meteor Crater', 'USA', 'Americas', 35.027, -111.022, 'impact', 'Apollo astronaut training site.'],
  ['mdrs', 'Mars Desert Research Station', 'USA', 'Americas', 38.406, -110.792, '', 'Red sedimentary desert, crewed analog station.'],
  ['white-sands', 'White Sands', 'USA', 'Americas', 32.8, -106.3, 'salt', 'Gypsum dunes, like Martian sulfates.'],
  ['mauna-kea', 'Mauna Kea', 'USA', 'Americas', 19.82, -155.47, 'volcanic', 'Basaltic slopes used for lunar rover tests.'],
  ['yellowstone', 'Yellowstone', 'USA', 'Americas', 44.46, -110.83, 'hydrothermal volcanic', 'Hot springs and microbial mats.'],
  ['devon', 'Devon Island (Haughton)', 'Canada', 'Polar', 75.38, -89.68, 'impact cold', 'Polar impact crater, Mars and Moon benchmark.'],
  ['axel-heiberg', 'Axel Heiberg springs', 'Canada', 'Polar', 79.4, -90.8, 'hydrothermal salt cold', 'Cold saline springs through permafrost.'],
  ['rio-tinto', 'Rio Tinto', 'Spain', 'Europe', 37.69, -6.59, 'acid', 'Acidic iron rich river, like Meridiani Planum.'],
  ['lanzarote', 'Lanzarote', 'Spain', 'Europe', 29.02, -13.73, 'volcanic', 'Lava fields used for ESA astronaut training.'],
  ['holuhraun', 'Holuhraun', 'Iceland', 'Europe', 64.85, -16.83, 'volcanic rift', 'Basalt from the 2014 rifting eruption.'],
  ['ries', 'Ries crater', 'Germany', 'Europe', 48.88, 10.56, 'impact', 'Apollo geology training crater.'],
  ['etna', 'Mount Etna', 'Italy', 'Europe', 37.75, 15.0, 'volcanic', 'Rover tests on fresh basalt.'],
  ['bockfjord', 'Bockfjord, Svalbard', 'Norway', 'Polar', 79.43, 13.35, 'volcanic hydrothermal cold', 'Arctic volcano with carbonate deposits.'],
  ['pilbara', 'Pilbara', 'Australia', 'Oceania', -21.0, 119.5, '', 'Some of the oldest traces of life on Earth.'],
  ['eyre', 'Kati Thanda (Lake Eyre)', 'Australia', 'Oceania', -28.37, 137.37, 'salt', 'Huge salt lake below sea level.'],
  ['wolfe-creek', 'Wolfe Creek crater', 'Australia', 'Oceania', -19.17, 127.8, 'impact', 'Well preserved desert impact crater.'],
  ['dry-valleys', 'McMurdo Dry Valleys', 'Antarctica', 'Polar', -77.6, 162.9, 'cold', 'Cold polar desert, Mars and Moon analog.'],
  ['don-juan', 'Don Juan Pond', 'Antarctica', 'Polar', -77.56, 161.19, 'salt cold', 'Saltiest water body on Earth, never freezes.'],
  ['erebus', 'Mount Erebus', 'Antarctica', 'Polar', -77.53, 167.15, 'volcanic cold', 'Polar volcano with a lava lake.']
];

export const WORLD = RAW.map(([id, name, country, region, lat, lon, tags, note]) => ({
  id, name, country, region, lat, lon, tags: tags ? tags.split(' ') : [], note
}));

export const REGIONS = ['All', 'Africa', 'Asia', 'Americas', 'Europe', 'Oceania', 'Polar'];
