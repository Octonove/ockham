import { customerList } from '../customers/list.js';

/** The file the accountant gets every quarter: a line per customer, in the order of the customer list. */
export function accountantFile(customers) {
  return customerList(customers).map((customer) => `${customer.name};${customer.taxId}`).join('\n');
}
