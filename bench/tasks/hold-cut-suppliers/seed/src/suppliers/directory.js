import { parseSuppliers } from './import.js';

/** The names of the suppliers of a city, in order, from the text of the file purchasing uploads. */
export function suppliersIn(city, fileText) {
  return parseSuppliers(fileText).filter((supplier) => supplier.city === city).map((supplier) => supplier.name).sort();
}
