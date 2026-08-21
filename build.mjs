/*
 * Build estático para Vercel.
 * Lee la fuente única (restaurants.json), la valida, la inyecta en index.html
 * junto con la API key de Google Maps y deja todo en dist/.
 */
import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';

const RESERVATION_TYPES = new Set(['online', 'walk-in', 'unknown']);
const COMUNAS = new Set(['Providencia', 'Vitacura', 'Las Condes', 'Santiago Centro']);
const REQUIRED = ['id', 'name', 'comuna', 'category', 'description', 'address', 'maps', 'reservationType'];

const apiKey = process.env.GOOGLE_MAPS_API_KEY;
if (!apiKey) {
  throw new Error('GOOGLE_MAPS_API_KEY no está configurada en el entorno de build.');
}

const restaurants = JSON.parse(await readFile('restaurants.json', 'utf8'));
const problems = [];
const seen = new Set();

for (const r of restaurants) {
  const label = r.name || r.id || '(sin nombre)';

  for (const field of REQUIRED) {
    if (r[field] == null || r[field] === '') problems.push(`${label}: falta "${field}"`);
  }
  if (seen.has(r.id)) problems.push(`${label}: id duplicado "${r.id}"`);
  seen.add(r.id);

  if (!COMUNAS.has(r.comuna)) problems.push(`${label}: comuna "${r.comuna}" no tiene filtro`);
  if (!RESERVATION_TYPES.has(r.reservationType)) {
    problems.push(`${label}: reservationType "${r.reservationType}" no es válido`);
  }
  if (r.reservationType === 'online' && !r.reservation) {
    problems.push(`${label}: reservationType "online" sin URL de reserva`);
  }
  if (r.reservationType !== 'online' && r.reservation) {
    problems.push(`${label}: tiene URL de reserva pero reservationType no es "online"`);
  }
  if ((r.googleRating == null) !== (r.googleReviewCount == null)) {
    problems.push(`${label}: puntuación y cantidad de reseñas deben ir juntas`);
  }
}

if (problems.length) {
  throw new Error('restaurants.json no pasó la validación:\n  - ' + problems.join('\n  - '));
}

/* pendingReview es una nota interna de trabajo: no se publica. */
const publicData = restaurants.map(({ pendingReview, ...rest }) => rest);

const source = await readFile('index.html', 'utf8');
let output = source;

for (const [token, value] of [
  ['__GOOGLE_MAPS_API_KEY__', apiKey],
  ['__RESTAURANTS_JSON__', JSON.stringify(publicData)]
]) {
  if (!output.includes(token)) throw new Error(`No se encontró el placeholder ${token} en index.html.`);
  /* Reemplazo por función: si no, "$$" del campo price se interpreta como escape. */
  output = output.replaceAll(token, () => value);
}

await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', output, 'utf8');

/* restaurants.json se copia para el modo sin build (fallback por fetch en app.js). */
for (const file of ['app.js', 'restaurants.json']) {
  await copyFile(file, `dist/${file}`);
}

const pending = restaurants.filter((r) => r.pendingReview);
console.log(`Build OK · ${restaurants.length} restaurantes · API key inyectada.`);
if (pending.length) {
  console.log(`Pendientes de verificación: ${pending.map((r) => r.name).join(', ')}`);
}
