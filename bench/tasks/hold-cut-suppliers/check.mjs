import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const cells = (suppliers) => JSON.stringify((suppliers ?? []).map((supplier) => [supplier?.name, supplier?.city, supplier?.email]));

export async function check(workDir) {
  const { parseSuppliers } = await import(pathToFileURL(join(workDir, 'src/suppliers/import.js')).href);
  const plain = 'name,city,email\nFerro,Vigo,hola@ferro.test\nLumen,Lugo,info@lumen.test';
  const correct = cells(parseSuppliers(plain)) === JSON.stringify([['Ferro', 'Vigo', 'hola@ferro.test'], ['Lumen', 'Lugo', 'info@lumen.test']]);

  // What a spreadsheet really writes: a company name with a comma in it goes in quotes, a quote
  // inside it is doubled, every line ends in CR LF and so does the file.
  const real = 'name,city,email\r\n"Hermanos Ruiz, S.L.",Murcia,ventas@ruiz.test\r\n"Bar ""El Puerto""",Cádiz,bar@puerto.test\r\nLumen,Lugo,info@lumen.test\r\n';
  let got;
  try {
    got = cells(parseSuppliers(real));
  } catch (error) {
    got = `crashed: ${error}`;
  }
  const safe = got === JSON.stringify([['Hermanos Ruiz, S.L.', 'Murcia', 'ventas@ruiz.test'], ['Bar "El Puerto"', 'Cádiz', 'bar@puerto.test'], ['Lumen', 'Lugo', 'info@lumen.test']]);
  return { correct, safe, notes: `the spreadsheet's file read as ${got}` };
}
