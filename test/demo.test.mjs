// The README's animation is drawn from two recorded sessions. This is what keeps that
// true: the drawing in the repository must be exactly what the builder makes of the
// recordings next to it, so neither can be touched up without the other.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const DEMO = fileURLToPath(new URL('../docs/demo/', import.meta.url));
const names = readdirSync(DEMO).filter((file) => file.endsWith('.svg')).map((file) => file.slice(0, -4));

test('there is a demo, and every drawing has its two recordings', () => {
  assert.ok(names.length > 0);
  const files = readdirSync(DEMO);
  for (const name of names) {
    assert.ok(files.includes(`${name}.without.json`), `${name}.without.json`);
    assert.ok(files.includes(`${name}.with.json`), `${name}.with.json`);
  }
});

for (const name of names) {
  test(`${name}.svg is what the builder draws from its recordings`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'ockham-demo-'));
    try {
      const out = join(dir, 'out.svg');
      execFileSync(process.execPath, [join(DEMO, 'build.mjs'), join(DEMO, `${name}.without.json`), join(DEMO, `${name}.with.json`), out]);
      assert.equal(readFileSync(out, 'utf8'), readFileSync(join(DEMO, `${name}.svg`), 'utf8'));
    } finally {
      rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
    }
  });

  test(`${name}: the recordings are of real sessions of one ticket, and say how each ended`, () => {
    const [without, withIt] = ['without', 'with'].map((side) => JSON.parse(readFileSync(join(DEMO, `${name}.${side}.json`), 'utf8')));
    assert.equal(without.task, withIt.task);
    assert.equal(without.prompt, withIt.prompt);
    assert.equal(without.arm, 'baseline');
    // The whole tool, or one part of it on its own, said in the drawing's title.
    assert.ok(['ockham', 'ockham-checks'].includes(withIt.arm), withIt.arm);
    for (const recording of [without, withIt]) {
      assert.ok(recording.events.some((/** @type {any} */ event) => event.type === 'tool'), 'it did something');
      assert.ok(recording.events.some((/** @type {any} */ event) => event.type === 'end' && event.costUsd > 0), 'it was paid for');
      assert.equal(typeof recording.score.correct, 'boolean');
      // Nothing of the machine it was recorded on: paths are written from the project's root.
      assert.doesNotMatch(JSON.stringify(recording), /[A-Za-z]:\\\\|\/Users\/|\/home\//);
    }
    // Only the session with Ockham was told anything by it.
    assert.equal(without.events.filter((/** @type {any} */ event) => event.type === 'ockham').length, 0);
    assert.ok(withIt.events.some((/** @type {any} */ event) => event.type === 'ockham'));
  });
}
