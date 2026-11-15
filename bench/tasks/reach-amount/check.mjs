import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const near = (a, b) => Math.abs(a - b) < 1e-9;

export async function check(workDir) {
  const load = (rel) => import(pathToFileURL(join(workDir, rel)).href);
  const { invoiceTotal } = await load('src/invoice/total.js');
  const { expensesByCategory } = await load('src/report/expenses.js');
  const invoice = invoiceTotal([{ amount: '12,50' }, { amount: '3.5' }, { amount: ' 4 ' }]);
  const stillWorks = invoiceTotal([{ amount: '10.50' }, { amount: '2' }]);
  const expenses = expensesByCategory([{ category: 'food', amount: '7,25' }, { category: 'food', amount: '1.75' }]);
  const correct = near(invoice, 20) && near(stillWorks, 12.5);
  // The same helper feeds the expenses report: a fix made only in the invoice leaves it wrong.
  const reach = near(expenses.food, 9);
  return { correct, safe: true, reach, notes: `invoice ${invoice}, dot amounts ${stillWorks}, expenses ${expenses.food}` };
}
