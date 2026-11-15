import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { hushStatusLineNote, restoreTraces, snapshotTraces } from '../bench/lib/traces.mjs';

const folder = () => mkdtempSync(join(tmpdir(), 'ockham-traces-'));

test('a folder that had nothing of the reference arm has nothing again', () => {
  const dir = folder();
  writeFileSync(join(dir, 'settings.json'), '{}');
  const before = snapshotTraces(dir);
  hushStatusLineNote(before);
  assert.equal(existsSync(join(dir, '.ponytail-statusline-nudged')), true, 'marked as told for the length of the run');
  writeFileSync(join(dir, '.ponytail-active'), 'full');
  writeFileSync(join(dir, 'ponytail-statusline.ps1'), 'Write-Host x');
  mkdirSync(join(dir, 'ponytail-modes'));
  writeFileSync(join(dir, 'ponytail-modes', 'abc123'), 'full');
  assert.deepEqual(restoreTraces(before).sort(), ['.ponytail-active', '.ponytail-statusline-nudged', 'ponytail-modes/abc123', 'ponytail-statusline.ps1']);
  assert.deepEqual(readdirSync(dir), ['settings.json']);
});

test('what the user already had is put back as it was', () => {
  const dir = folder();
  writeFileSync(join(dir, '.ponytail-active'), 'lite');
  writeFileSync(join(dir, '.ponytail-statusline-nudged'), 'C:/old/path');
  mkdirSync(join(dir, 'ponytail-modes'));
  writeFileSync(join(dir, 'ponytail-modes', 'theirs'), 'lite');
  const before = snapshotTraces(dir);
  hushStatusLineNote(before);
  assert.equal(readFileSync(join(dir, '.ponytail-statusline-nudged'), 'utf8'), 'C:/old/path', 'their own mark is left alone');
  writeFileSync(join(dir, '.ponytail-active'), 'full');
  writeFileSync(join(dir, 'ponytail-modes', 'ours'), 'full');
  assert.deepEqual(restoreTraces(before), ['ponytail-modes/ours']);
  assert.equal(readFileSync(join(dir, '.ponytail-active'), 'utf8'), 'lite');
  assert.deepEqual(readdirSync(join(dir, 'ponytail-modes')), ['theirs']);
});

test('a run that left nothing changes nothing', () => {
  const dir = folder();
  const before = snapshotTraces(dir);
  assert.deepEqual(restoreTraces(before), []);
  assert.equal(existsSync(join(dir, 'ponytail-modes')), false);
});
