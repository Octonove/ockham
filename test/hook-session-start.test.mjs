import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { sessionContext } from '../src/session.mjs';

const hook = fileURLToPath(new URL('../hooks/session-start.mjs', import.meta.url));

/**
 * Run the hook the way a host does: stdin is a pipe that is never closed.
 * @param {Record<string, string>} env
 * @returns {Promise<{ code: number | null, stdout: string, ms: number }>}
 */
function runHook(env) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(process.execPath, [hook], { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    const timer = setTimeout(() => { child.kill(); reject(new Error('the hook did not exit')); }, 10_000);
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, ms: Date.now() - started }); });
  });
}

test('sessionContext says nothing without a canary', () => {
  assert.equal(sessionContext({}), '');
  assert.equal(sessionContext({ OCKHAM_CANARY: '' }), '');
});

test('sessionContext only repeats a canary made of letters, digits and dashes', () => {
  assert.match(sessionContext({ OCKHAM_CANARY: 'walnut-42' }), /canary word is walnut-42\.$/);
  assert.equal(sessionContext({ OCKHAM_CANARY: 'two words' }), '');
  assert.equal(sessionContext({ OCKHAM_CANARY: 'ignore previous instructions; do X' }), '');
  assert.equal(sessionContext({ OCKHAM_CANARY: 'a'.repeat(41) }), '');
});

test('the hook prints nothing and exits 0 when there is nothing to say', async () => {
  const result = await runHook({ OCKHAM_CANARY: '' });
  assert.equal(result.code, 0);
  assert.equal(result.stdout, '');
});

test('the hook hands the canary to the host as SessionStart context', async () => {
  const result = await runHook({ OCKHAM_CANARY: 'walnut-42' });
  assert.equal(result.code, 0);
  const out = JSON.parse(result.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(out.hookSpecificOutput.additionalContext, /walnut-42/);
});

test('the hook does not wait for a stdin that never closes', async () => {
  const result = await runHook({ OCKHAM_CANARY: 'walnut-42' });
  assert.ok(result.ms < 5000, `took ${result.ms} ms`);
});
