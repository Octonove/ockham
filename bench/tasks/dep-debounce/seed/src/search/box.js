/** The search box of the storefront. `fetchResults(text)` asks the API. */
export function createSearchBox(fetchResults) {
  return {
    onInput(text) {
      fetchResults(text);
    },
  };
}
