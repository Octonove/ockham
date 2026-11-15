import { slugify } from '../lib/text.js';

export function listCategories(names) {
  return names.map((name) => ({ id: slugify(name), name }));
}
