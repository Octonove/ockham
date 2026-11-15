export function listCategories(names) {
  return names.map((name) => ({ id: name.toLowerCase().replace(/ /g, '-'), name }));
}
