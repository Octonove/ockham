import { debounce } from '../util/timing.js';

/** The search box of the storefront. `fetchResults(text)` asks the API. */
export function createSearchBox(fetchResults) {
  return { onInput: debounce(fetchResults, 300) };
}
