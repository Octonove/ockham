import assert from 'node:assert/strict';
import { test } from 'node:test';

import { importRoster } from '../src/roster/import.js';

test('a roster has one pupil per line', () => {
  assert.deepEqual(importRoster('García, Ana\nLópez, Luis\n'), [{ name: 'Ana', surname: 'García' }, { name: 'Luis', surname: 'López' }]);
});
