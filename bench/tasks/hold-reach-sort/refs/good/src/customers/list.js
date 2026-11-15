/** The customers of the back office in the order its list shows them: by name. */
export function customerList(customers) {
  return [...customers].sort((a, b) => a.name.localeCompare(b.name));
}
