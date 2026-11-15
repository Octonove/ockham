import { readFileSync } from 'node:fs';

import { parseLabels } from './parse.js';

/** The texts of the shop in one language, read once when the server starts. */
export function loadLabels(language) {
  return parseLabels(readFileSync(new URL(`../../labels/${language}.txt`, import.meta.url), 'utf8'));
}
