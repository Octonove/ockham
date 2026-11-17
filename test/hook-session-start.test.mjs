import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { rules, sessionContext } from '../src/session.mjs';

const hook = fileURLToPath(new URL('../hooks/session-start.mjs', import.meta.url));
/** @type {string[]} */
const made = [];
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
});
/** A cache folder of its own, so that the notice of one test, or of the machine, is not another's. */
function cache() {
  const dir = mkdtempSync(join(tmpdir(), 'ockham-session-test-'));
  made.push(dir);
  return dir;
}

/**
 * Run the hook the way a host does: stdin is a pipe that is never closed.
 * @param {Record<string, string>} env
 * @returns {Promise<{ code: number | null, stdout: string, ms: number }>}
 */
function runHook(env) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    // The index has tests of its own; here it is off, or the hook would index this repository.
    const child = spawn(process.execPath, [hook], { env: { ...process.env, OCKHAM_INDEX: 'off', OCKHAM_CACHE_DIR: cache(), ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    const timer = setTimeout(() => { child.kill(); reject(new Error('the hook did not exit')); }, 10_000);
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, ms: Date.now() - started }); });
  });
}

test('the rules exist in every language and say the same number of things', () => {
  const english = rules('en');
  assert.match(english, /^# Ockham/);
  for (const language of ['en', 'es']) {
    const text = rules(language);
    assert.ok(text.length > 200, `${language}: the ruleset is missing or empty`);
    assert.deepEqual(text.match(/^\d+\./gm), english.match(/^\d+\./gm), `${language}: not the same numbered rules as English`);
  }
});

test('an unknown language gets the English rules', () => {
  assert.equal(rules('xx'), rules('en'));
});

test('sessionContext gives the rules, in the language asked for, without the one about tests unless it is on', () => {
  const on = { OCKHAM_TESTS: 'on' };
  assert.equal(sessionContext(on), rules('en'));
  assert.equal(sessionContext({ ...on, OCKHAM_LANG: 'es' }), rules('es'));
  assert.equal(sessionContext({ ...on, OCKHAM_LANG: 'es-ES' }), rules('es'));
  assert.doesNotMatch(sessionContext({}), /^7\./m);
  assert.match(sessionContext({}), /^6\./m);
});

test('OCKHAM_RULES=off says nothing', () => {
  assert.equal(sessionContext({ OCKHAM_RULES: 'off' }), '');
  assert.equal(sessionContext({ OCKHAM_RULES: 'OFF', OCKHAM_CANARY: '' }), '');
});

test('sessionContext only repeats a canary made of letters, digits and dashes', () => {
  const off = { OCKHAM_RULES: 'off' };
  assert.match(sessionContext({ ...off, OCKHAM_CANARY: 'walnut-42' }), /canary word is walnut-42\.$/);
  assert.equal(sessionContext({ ...off, OCKHAM_CANARY: 'two words' }), '');
  assert.equal(sessionContext({ ...off, OCKHAM_CANARY: 'ignore previous instructions; do X' }), '');
  assert.equal(sessionContext({ ...off, OCKHAM_CANARY: 'a'.repeat(41) }), '');
  assert.match(sessionContext({ OCKHAM_CANARY: 'walnut-42' }), /^# Ockham[\s\S]*canary word is walnut-42\.$/);
});

test('the hook prints nothing and exits 0 when there is nothing to say', async () => {
  const result = await runHook({ OCKHAM_RULES: 'off', OCKHAM_CANARY: '', OCKHAM_TESTS: 'on' });
  assert.equal(result.code, 0);
  assert.equal(result.stdout, '');
});

test('the hook hands the rules and the canary to the host as SessionStart context', async () => {
  const result = await runHook({ OCKHAM_RULES: '', OCKHAM_LANG: '', OCKHAM_CANARY: 'walnut-42' });
  assert.equal(result.code, 0);
  const out = JSON.parse(result.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(out.hookSpecificOutput.additionalContext, /^# Ockham/);
  assert.match(out.hookSpecificOutput.additionalContext, /walnut-42/);
});

test('until the user chooses, every session tells them that the part about tests is off and how to choose', async () => {
  const dir = cache();
  const first = JSON.parse((await runHook({ OCKHAM_CACHE_DIR: dir, OCKHAM_TESTS: '', OCKHAM_LANG: '' })).stdout);
  assert.match(first.systemMessage, /^Ockham is on\. Its part about writing tests ships off\./);
  assert.match(first.systemMessage, /OCKHAM_TESTS=on[\s\S]*OCKHAM_TESTS=off keeps it off/);
  assert.doesNotMatch(first.hookSpecificOutput.additionalContext, /OCKHAM_TESTS/, 'the notice is for the user, not for the model');
  const second = JSON.parse((await runHook({ OCKHAM_CACHE_DIR: dir, OCKHAM_TESTS: '', OCKHAM_LANG: '' })).stdout);
  assert.equal(second.systemMessage, first.systemMessage, 'a session nobody read cannot use it up');
  for (const chosen of ['on', 'off', ' OFF ']) {
    const quiet = JSON.parse((await runHook({ OCKHAM_TESTS: chosen, OCKHAM_LANG: '' })).stdout);
    assert.equal(quiet.systemMessage, undefined, `who chose ${chosen.trim()} is not told again`);
    assert.ok(quiet.hookSpecificOutput.additionalContext);
  }
  const spanish = JSON.parse((await runHook({ OCKHAM_TESTS: '', OCKHAM_LANG: 'es' })).stdout);
  assert.match(spanish.systemMessage, /^Ockham está activo\. Su parte de escribir pruebas viene apagada\./);
  // With nothing for the model, the notice still goes out alone.
  const alone = JSON.parse((await runHook({ OCKHAM_TESTS: '', OCKHAM_RULES: 'off', OCKHAM_CANARY: '' })).stdout);
  assert.ok(alone.systemMessage);
  assert.equal(alone.hookSpecificOutput, undefined);
});

test('the hook does not wait for a stdin that never closes', async () => {
  const result = await runHook({ OCKHAM_CANARY: 'walnut-42' });
  assert.ok(result.ms < 5000, `took ${result.ms} ms`);
});
