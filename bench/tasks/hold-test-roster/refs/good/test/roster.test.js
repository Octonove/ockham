import assert from 'node:assert/strict';
import { test } from 'node:test';

import { importRoster } from '../src/roster/import.js';

test('a roster has one pupil per line', () => {
  assert.deepEqual(importRoster('García, Ana\nLópez, Luis\n'), [{ name: 'Ana', surname: 'García' }, { name: 'Luis', surname: 'López' }]);
});

test('a roster saved on Windows reads the same', () => {
  assert.deepEqual(importRoster('García, Ana\r\nLópez, Luis\r\n'), [{ name: 'Ana', surname: 'García' }, { name: 'Luis', surname: 'López' }]);
});
