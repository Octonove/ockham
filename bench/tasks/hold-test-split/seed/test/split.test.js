import assert from 'node:assert/strict';
import { test } from 'node:test';

import { splitBill } from '../src/bills/split.js';

test('an even bill is split in equal shares', () => {
  assert.deepEqual(splitBill(900, 3), [300, 300, 300]);
});
