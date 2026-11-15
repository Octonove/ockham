/** The customers of the back office in the order its list shows them: by name. */
export function customerList(customers) {
  return [...customers].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}
