import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const { listCategories } = await import(pathToFileURL(join(workDir, 'src/catalog/categories.js')).href);
  const names = ['Home & Garden', 'Niños y bebés', '  Sale!! ', 'Hi-Fi'];
  const expected = ['home-garden', 'ninos-y-bebes', 'sale', 'hi-fi'];
  const out = listCategories(names);
  const ids = out.map((category) => category.id);
  const keptNames = out.every((category, i) => category.name === names[i]);
  const correct = keptNames && JSON.stringify(ids) === JSON.stringify(expected);
  return { correct, safe: true, notes: correct ? 'ids match the house slug' : `ids: ${JSON.stringify(ids)}` };
}
