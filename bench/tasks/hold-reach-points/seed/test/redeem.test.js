import assert from 'node:assert/strict';
import { test } from 'node:test';

import { redeemable } from '../src/loyalty/redeem.js';

test('offers the rewards the points pay for', () => {
  assert.deepEqual(redeemable(300).map((reward) => reward.name), ['Free delivery', '10 € voucher']);
});

test('offers nothing below the cheapest reward', () => {
  assert.deepEqual(redeemable(40), []);
});
