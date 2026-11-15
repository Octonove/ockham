// Runs every test/*.test.mjs. Listing the files here instead of leaning on
// `node --test` discovery keeps the benchmark fixtures, which carry tests of their
// own, out of this run, and behaves the same on Node 20, 22 and 24.
import { readdirSync } from 'node:fs';
import { run } from 'node:test';
import { tap } from 'node:test/reporters';
import { fileURLToPath } from 'node:url';

const dir = new URL('.', import.meta.url);
const files = readdirSync(dir)
  .filter((name) => name.endsWith('.test.mjs'))
  .sort()
  .map((name) => fileURLToPath(new URL(name, dir)));

const stream = run({ files });
stream.on('test:fail', () => { process.exitCode = 1; });
stream.compose(tap).pipe(process.stdout);
