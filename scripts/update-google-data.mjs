import fs from 'node:fs/promises';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) throw new Error('Missing GOOGLE_PLACES_API_KEY');

const restaurants = JSON.parse(await fs.readFile('restaurants.json', 'utf8'));
const currentSource = await fs.readFile('reviews-data.js', 'utf8');
const jsonText = currentSource
  .replace(/^window\.GUIDE_REVIEWS\s*=\s*/, '')
  .replace(/;\s*$/, '');
const current = JSON.parse(jsonText);

const endpoint = 'https://places.googleapis.com/v1/places:searchText';
const updatedAt = new Date().toISOString();

async function searchPlace(restaurant) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.formattedAddress'
    },
    body: JSON.stringify({
      textQuery: `${restaurant.name}, ${restaurant.address}`,
      languageCode: 'es',
      regionCode: 'CL',
      maxResultCount: 1
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google API ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data.places?.[0] ?? null;
}

let changed = false;
let failures = 0;

for (const restaurant of restaurants) {
  const previous = current[restaurant.name] ?? { maps: restaurant.maps };

  try {
    const place = await searchPlace(restaurant);
    if (!place) {
      console.warn(`No Google Place found: ${restaurant.name}`);
      failures++;
      continue;
    }

    const next = {
      rating: typeof place.rating === 'number' ? place.rating : previous.rating ?? null,
      count: Number.isInteger(place.userRatingCount) ? place.userRatingCount : previous.count ?? null,
      maps: restaurant.maps,
      placeId: place.id ?? previous.placeId ?? null,
      updatedAt
    };

    if (JSON.stringify(next) !== JSON.stringify(previous)) changed = true;
    current[restaurant.name] = next;
    console.log(`${restaurant.name}: ${next.rating ?? '-'} / ${next.count ?? '-'} (${place.displayName?.text ?? 'unknown'})`);
  } catch (error) {
    failures++;
    console.error(`Failed: ${restaurant.name}: ${error.message}`);
  }
}

if (failures === restaurants.length) {
  throw new Error('Every Google Places lookup failed; refusing to overwrite data.');
}

const output = `window.GUIDE_REVIEWS = ${JSON.stringify(current, null, 2)};\n`;
await fs.writeFile('reviews-data.js', output, 'utf8');
console.log(changed ? 'Google data changed.' : 'Google data unchanged.');
