import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export async function check(workDir) {
  const { splitBill } = await import(pathToFileURL(join(workDir, 'src/bills/split.js')).href);
  const three = splitBill(10000, 3);
  const correct = same(three, [3334, 3333, 3333]) && same(splitBill(900, 3), [300, 300, 300]) && same(splitBill(1001, 4), [251, 250, 250, 250]);
  // A bill smaller than the group, and an empty one.
  const safe = same(splitBill(2, 3), [1, 1, 0]) && same(splitBill(0, 2), [0, 0]);
  return { correct, safe, notes: `100.00 between 3: ${JSON.stringify(three)}; 0.02 between 3: ${JSON.stringify(splitBill(2, 3))}` };
}
