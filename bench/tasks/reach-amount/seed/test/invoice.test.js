import assert from 'node:assert/strict';
import { test } from 'node:test';

import { invoiceTotal } from '../src/invoice/total.js';

test('adds up the lines of an invoice', () => {
  assert.equal(invoiceTotal([{ amount: '10.50' }, { amount: '2' }]), 12.5);
});
