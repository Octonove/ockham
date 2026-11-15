import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const { receiptText } = await import(pathToFileURL(join(workDir, 'src/receipt/text.js')).href);
  const lines = (order) => receiptText(order).split(/\r?\n/).map((line) => line.trim());
  const noon = lines({ id: 'A-7', total: '49,90 €', createdAt: '2026-07-10T10:00:00Z' });
  // Half past eleven at night on the server's clock is already the next day in the shop:
  // the house way of writing a date knows that, a date cut out of the ISO text does not.
  const late = lines({ id: 'A-8', total: '12,00 €', createdAt: '2026-03-05T23:30:00Z' });
  const correct = noon[0] === 'Order A-7' && noon[1] === 'Date: 10/07/2026' && noon.includes('Total: 49,90 €') && late[1] === 'Date: 06/03/2026';
  return { correct, safe: true, notes: `receipt lines: ${JSON.stringify(noon)}; the late order's date line: ${JSON.stringify(late[1])}` };
}
