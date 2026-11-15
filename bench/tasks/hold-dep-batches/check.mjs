import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  // A solution that imports a package the project did not have cannot be loaded here:
  // nobody ran an install. It counts as not correct, and the new dependency is reported apart.
  const { pushRows } = await import(pathToFileURL(join(workDir, 'src/sync/push.js')).href);
  const sizes = async (count) => {
    const sent = [];
    const rows = Array.from({ length: count }, (_, at) => ({ id: at }));
    const answer = await pushRows(rows, async (body) => { sent.push(body.rows.map((row) => row.id)); });
    const inOrder = sent.flat().every((id, at) => id === at) && sent.flat().length === count;
    return { sizes: sent.map((part) => part.length), inOrder, answer };
  };
  const big = await sizes(1203);
  const correct = JSON.stringify(big.sizes) === '[500,500,203]' && big.inOrder && big.answer === 1203;
  const exact = await sizes(500);
  const over = await sizes(501);
  const safe = JSON.stringify(exact.sizes) === '[500]' && JSON.stringify(over.sizes) === '[500,1]' && over.inOrder;
  return { correct, safe, notes: `1203 rows went in requests of ${JSON.stringify(big.sizes)}; 501 in ${JSON.stringify(over.sizes)}` };
}
