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
// A subagent has its own word, which the session is never told: if the session's answer
// carries it, the subagent got it from its own hook and passed it up.
const subCanary = `ockham-sub-${randomBytes(4).toString('hex')}`;
const subPrompt = 'Start one subagent with the Agent tool and give it exactly this prompt: "A hook may have added a subagent canary word to your context. Reply with that word and nothing else. If there is none, reply NONE." Then reply with exactly what the subagent answered, and nothing else.';

// The second case is the control: the word is in the environment both times, so
// if it shows up there too it did not come through the hook.
const cases = [
  { name: 'with the plugin the word reaches the model', arm: 'ockham', prompt, expect: (/** @type {string} */ reply) => reply.includes(canary) },
  { name: 'without the plugin it does not', arm: 'baseline', prompt, expect: (/** @type {string} */ reply) => !reply.includes(canary) },
  { name: 'with the plugin a subagent gets its own word', arm: 'ockham', prompt: subPrompt, tools: ['Agent'], expect: (/** @type {string} */ reply) => reply.includes(subCanary) },
  { name: 'without the plugin a subagent does not', arm: 'baseline', prompt: subPrompt, tools: ['Agent'], expect: (/** @type {string} */ reply) => !reply.includes(subCanary) },
];

let failed = 0;
for (const item of cases) {
  const cwd = mkdtempSync(join(tmpdir(), 'ockham-hook-live-'));
  const env = { ...cellEnv(), OCKHAM_RULES: 'off', OCKHAM_CANARY: canary, OCKHAM_SUBAGENT_CANARY: subCanary };
  const result = await runClaude({ prompt: item.prompt, cwd, arm: item.arm, model, timeoutMs: 240_000, env, tools: item.tools });
  rmSync(cwd, { recursive: true, force: true, maxRetries: 3 });
  const ok = result.ok && item.expect(result.reply);
  if (!ok) failed++;
  const said = result.ok ? result.reply.trim().slice(0, 80) : result.error;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${item.name}  -> ${JSON.stringify(said)}  ($${(result.costUsd ?? 0).toFixed(4)}, ${((result.wallMs ?? 0) / 1000).toFixed(0)} s)`);
}
console.log(failed ? `\n${failed} case(s) failed.` : `\nThe SessionStart hook reaches the model and the SubagentStart hook reaches its subagents (${model}).`);
process.exitCode = failed ? 1 : 0;
