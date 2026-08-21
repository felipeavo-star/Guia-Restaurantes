/*
 * Actualiza puntuación, cantidad de reseñas y coordenadas desde Google Places.
 * Se ejecuta una vez por semana (.github/workflows/update-google-data.yml).
 *
 * Regla: si el restaurante ya tiene place_id, se consulta por place_id. La búsqueda
 * por texto solo se usa la primera vez, para no confundir establecimientos distintos.
 *
 * Nunca escribe una nota ni un conteo inventado: si Google no responde, deja el valor anterior.
 */
import fs from 'node:fs/promises';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) throw new Error('Falta GOOGLE_PLACES_API_KEY.');

const FIELDS = 'id,displayName,rating,userRatingCount,location,formattedAddress';
const restaurants = JSON.parse(await fs.readFile('restaurants.json', 'utf8'));
const updatedAt = new Date().toISOString();

async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Google API ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  return response.json();
}

function detailsByPlaceId(placeId) {
  return request(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELDS,
      'Accept-Language': 'es-CL'
    }
  });
}

async function searchByText(restaurant) {
  const data = await request('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELDS.split(',').map((f) => `places.${f}`).join(',')
    },
    body: JSON.stringify({
      textQuery: `${restaurant.name}, ${restaurant.addressFull || restaurant.address}`,
      includedType: 'restaurant',
      languageCode: 'es',
      regionCode: 'CL',
      maxResultCount: 1
    })
  });
  return data.places?.[0] ?? null;
}

let changed = 0;
let failures = 0;

for (const restaurant of restaurants) {
  try {
    const place = restaurant.placeId
      ? await detailsByPlaceId(restaurant.placeId)
      : await searchByText(restaurant);

    if (!place) {
      console.warn(`Sin resultado en Google: ${restaurant.name}`);
      failures++;
      continue;
    }

    const before = JSON.stringify([
      restaurant.googleRating, restaurant.googleReviewCount, restaurant.placeId
    ]);

    if (typeof place.rating === 'number') restaurant.googleRating = place.rating;
    if (Number.isInteger(place.userRatingCount)) restaurant.googleReviewCount = place.userRatingCount;
    if (place.id) restaurant.placeId = place.id;
    if (place.location) {
      restaurant.lat = place.location.latitude;
      restaurant.lng = place.location.longitude;
    }
    restaurant.updatedAt = updatedAt;

    const after = JSON.stringify([
      restaurant.googleRating, restaurant.googleReviewCount, restaurant.placeId
    ]);
    if (before !== after) changed++;

    console.log(
      `${restaurant.name}: ${restaurant.googleRating ?? '-'} / ${restaurant.googleReviewCount ?? '-'}` +
      ` · ${place.displayName?.text ?? '?'}`
    );
  } catch (error) {
    failures++;
    console.error(`Falló ${restaurant.name}: ${error.message}`);
  }
}

if (failures === restaurants.length) {
  throw new Error('Todas las consultas a Google fallaron; no se sobrescriben los datos.');
}

await fs.writeFile('restaurants.json', JSON.stringify(restaurants, null, 2) + '\n', 'utf8');
console.log(`Listo · ${changed} con cambios · ${failures} sin respuesta.`);
