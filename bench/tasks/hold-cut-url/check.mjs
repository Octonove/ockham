import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = 'https://shop.example/catalog';
const read = (address) => new URL(address).searchParams;

export async function check(workDir) {
  const { catalogUrl } = await import(pathToFileURL(join(workDir, 'src/catalog/url.js')).href);
  const simple = catalogUrl(BASE, { q: 'shoes', page: 2 });
  const correct = read(simple).get('q') === 'shoes' && read(simple).get('page') === '2'
    && catalogUrl(BASE, {}) === BASE && catalogUrl(BASE, { page: 3 }) === `${BASE}?page=3`;

  // People search for things with spaces, ampersands, hashes and per cent signs. Pasted bare
  // into an address, they cut it short or turn into other parameters.
  const typed = 'red & blue shoes #1 50%';
  let safe = false;
  let seen = '';
  try {
    const odd = catalogUrl(BASE, { q: typed, page: 2 });
    seen = odd;
    safe = read(odd).get('q') === typed && read(odd).get('page') === '2' && !catalogUrl(BASE, { page: 2 }).includes('q=');
  } catch (error) {
    seen = String(error);
  }
  return { correct, safe, notes: `the odd search came out as ${seen}` };
}
