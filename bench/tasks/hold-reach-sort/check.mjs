import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const load = (rel) => import(pathToFileURL(join(workDir, rel)).href);
  const { customerList } = await load('src/customers/list.js');
  const { accountantFile } = await load('src/exports/accountant.js');

  const people = [
    { name: 'Zamora', taxId: 'Z1' },
    { name: 'Álvarez', taxId: 'A1' },
    { name: 'Ochoa', taxId: 'O1' },
    { name: 'Baños', taxId: 'B1' },
    { name: 'Núñez', taxId: 'N1' },
  ];
  const wanted = 'Álvarez,Baños,Núñez,Ochoa,Zamora';
  const listed = customerList(people).map((customer) => customer.name).join();
  const plain = customerList([{ name: 'Bo' }, { name: 'Al' }, { name: 'Cy' }]).map((customer) => customer.name).join();
  const correct = listed === wanted && plain === 'Al,Bo,Cy';

  // The accountant's file sorts with a copy of the same comparison, and promises the order of
  // the list. Fixed only in the list, the two no longer agree.
  const filed = accountantFile(people).split('\n').map((line) => line.split(';')[0]).join();
  const reach = filed === wanted;

  return { correct, safe: true, reach, notes: `the list goes ${listed}; the accountant's file goes ${filed}` };
}
