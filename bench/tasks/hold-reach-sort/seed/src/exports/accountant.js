/** The file the accountant gets every quarter: a line per customer, in the order of the customer list. */
export function accountantFile(customers) {
  const byName = [...customers].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return byName.map((customer) => `${customer.name};${customer.taxId}`).join('\n');
}
