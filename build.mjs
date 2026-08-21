import { readFile, mkdir, writeFile } from 'node:fs/promises';

const apiKey = process.env.GOOGLE_MAPS_API_KEY;
if (!apiKey) {
  throw new Error('GOOGLE_MAPS_API_KEY no está configurada en el entorno de build.');
}

const source = await readFile('index.html', 'utf8');
const output = source.replaceAll('__GOOGLE_MAPS_API_KEY__', apiKey);

if (output === source) {
  throw new Error('No se encontró el placeholder de Google Maps en index.html.');
}

await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', output, 'utf8');

for (const file of ['reviews.js', 'reviews-data.js']) {
  const content = await readFile(file, 'utf8');
  await writeFile(`dist/${file}`, content, 'utf8');
}

console.log('Build OK: Google Maps key injected and static assets copied.');
