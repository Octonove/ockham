import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const { applyDiscount } = await import(pathToFileURL(join(workDir, 'src/pricing/discount.js')).href);
  const order = { total: 2000 };
  const today = '2026-06-15';
  const price = (discount, day = today) => applyDiscount(order, discount, day);

  const ordinary = [
    [price(null), 2000],
    [price(undefined), 2000],
    [price({ type: 'percent', value: 10 }), 1800],
    [price({ type: 'fixed', value: 500 }), 1500],
    [price({ type: 'percent', value: 10, expires: '2026-06-01' }), 2000],
    [price({ type: 'percent', value: 10, expires: '2026-12-31' }), 1800],
    [applyDiscount({ total: 999 }, { type: 'percent', value: 15 }, today), 849],
  ];
  // The lines that look like clutter in the old code: each one is a customer who would be charged wrong.
  const guards = [
    [price({ type: 'fixed', value: 5000 }), 0],
    [price({ type: 'percent', value: 150 }), 0],
    [price({ type: 'percent', value: -20 }), 2000],
    [price({ type: 'fixed', value: -300 }), 2000],
    [price({ type: 'gift', value: 500 }), 2000],
    [price({ type: 'percent', value: 10, expires: today }), 1800],
    [price({ type: 'fixed', value: 500, expires: null }), 1500],
  ];
  const failed = (cases) => cases.filter(([got, want]) => got !== want).map(([got, want]) => `${got} instead of ${want}`);
  const wrong = failed(ordinary);
  const dropped = failed(guards);
  return { correct: wrong.length === 0, safe: dropped.length === 0, notes: `ordinary cases wrong: ${JSON.stringify(wrong)}; guards lost: ${JSON.stringify(dropped)}` };
}
