#!/usr/bin/env node
// Live contract test for the hooks: does what a hook prints reach the model?
// It starts real Claude Code sessions, so it needs a logged-in Claude Code and
// spends a little quota. That is why it is not part of `npm test`.
//
//   node bench/hook-live.mjs [--model haiku]
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { cellEnv, runClaude } from './lib/agent.mjs';

const at = process.argv.indexOf('--model');
const model = at > 0 ? process.argv[at + 1] : 'haiku';
const canary = `ockham-${randomBytes(4).toString('hex')}`;
const prompt = 'A hook may have added a canary word to your context. Reply with that word and nothing else. If there is none, reply NONE.';

// The second case is the control: the word is in the environment both times, so
// if it shows up there too it did not come through the hook.
const cases = [
  { name: 'with the plugin the word reaches the model', arm: 'ockham', expect: (/** @type {string} */ reply) => reply.includes(canary) },
  { name: 'without the plugin it does not', arm: 'baseline', expect: (/** @type {string} */ reply) => !reply.includes(canary) },
];

let failed = 0;
for (const item of cases) {
  const cwd = mkdtempSync(join(tmpdir(), 'ockham-hook-live-'));
  const result = await runClaude({ prompt, cwd, arm: item.arm, model, timeoutMs: 180_000, env: { ...cellEnv(), OCKHAM_CANARY: canary } });
  rmSync(cwd, { recursive: true, force: true, maxRetries: 3 });
  const ok = result.ok && item.expect(result.reply);
  if (!ok) failed++;
  const said = result.ok ? result.reply.trim().slice(0, 80) : result.error;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${item.name}  -> ${JSON.stringify(said)}  ($${(result.costUsd ?? 0).toFixed(4)}, ${((result.wallMs ?? 0) / 1000).toFixed(0)} s)`);
}
console.log(failed ? `\n${failed} case(s) failed.` : `\nThe SessionStart hook reaches the model (${model}).`);
process.exitCode = failed ? 1 : 0;
