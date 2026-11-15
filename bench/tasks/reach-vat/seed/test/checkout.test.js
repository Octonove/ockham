import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkoutTotal } from '../src/checkout/total.js';

test('adds 21% VAT to the net prices', () => {
  assert.equal(checkoutTotal([{ price: 10, quantity: 2 }]), 24.2);
});
