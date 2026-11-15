import assert from 'node:assert/strict';
import { test } from 'node:test';

import { splitBill } from '../src/bills/split.js';

test('an even bill is split in equal shares', () => {
  assert.deepEqual(splitBill(900, 3), [300, 300, 300]);
});

test('the cents that do not divide are paid by the first people', () => {
  assert.deepEqual(splitBill(10000, 3), [3334, 3333, 3333]);
});
