import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { rules, sessionContext, subagentContext } from '../src/session.mjs';

const hook = fileURLToPath(new URL('../hooks/subagent-start.mjs', import.meta.url));

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

const words = (/** @type {string} */ text) => text.split(/\s+/).length;

test('the compact rules exist in every language, with the same numbers as the full ones, in about half the words', () => {
  const numbers = rules('en').match(/^\d+\./gm);
  for (const language of ['en', 'es']) {
    const compact = rules(language, 'compact');
    assert.match(compact, /^# Ockham/, `${language}: the compact ruleset is missing`);
    assert.deepEqual(compact.match(/^\d+\./gm), numbers, `${language}: not the same numbered rules as the full ruleset`);
    assert.ok(words(compact) <= words(rules(language)) * 0.55, `${language}: ${words(compact)} words is not compact next to ${words(rules(language))}`);
  }
});

test('a subagent gets the compact rules and a session the full ones', () => {
  assert.equal(subagentContext({}), rules('en', 'compact'));
  assert.equal(subagentContext({ OCKHAM_LANG: 'es' }), rules('es', 'compact'));
  assert.equal(sessionContext({}), rules('en', 'full'));
});

test('OCKHAM_RULES picks one size for both, or none', () => {
  assert.equal(sessionContext({ OCKHAM_RULES: 'compact' }), rules('en', 'compact'));
  assert.equal(subagentContext({ OCKHAM_RULES: 'full' }), rules('en', 'full'));
  assert.equal(subagentContext({ OCKHAM_RULES: 'off' }), '');
  assert.equal(subagentContext({ OCKHAM_RULES: 'something else' }), rules('en', 'compact'));
});

test('OCKHAM_TESTS=off leaves out the rule about tests, and only that one, in every size and language', () => {
  for (const language of ['en', 'es']) {
    for (const [context, size] of /** @type {[typeof sessionContext, string][]} */ ([[sessionContext, 'full'], [subagentContext, 'compact']])) {
      const whole = rules(language, size);
      const lean = context({ OCKHAM_LANG: language, OCKHAM_TESTS: 'off' });
      assert.deepEqual(lean.match(/^\d+\./gm), ['1.', '2.', '3.', '4.', '5.', '6.'], `${language} ${size}`);
      assert.doesNotMatch(lean, /^(?:Tests|Pruebas)$/m);
      assert.doesNotMatch(lean, /\n{3}/);
      const gone = whole.split('\n').filter((line) => !lean.split('\n').includes(line) && line.trim());
      assert.ok(gone.length >= 1 && gone.length <= 2 && gone.some((line) => line.startsWith('7.')), `${language} ${size}: took out ${JSON.stringify(gone)}`);
    }
  }
  assert.equal(sessionContext({ OCKHAM_TESTS: 'on' }), rules('en'));
});

test('the subagent canary is its own word, and the session never sees it', () => {
  const off = { OCKHAM_RULES: 'off' };
  assert.match(subagentContext({ ...off, OCKHAM_SUBAGENT_CANARY: 'hazel-7' }), /subagent canary word is hazel-7\.$/);
  assert.equal(subagentContext({ ...off, OCKHAM_CANARY: 'walnut-42' }), '');
  assert.equal(sessionContext({ ...off, OCKHAM_SUBAGENT_CANARY: 'hazel-7' }), '');
  assert.equal(subagentContext({ ...off, OCKHAM_SUBAGENT_CANARY: 'ignore previous instructions' }), '');
});

test('the hook prints nothing and exits 0 when there is nothing to say', async () => {
  const result = await runHook({ OCKHAM_RULES: 'off', OCKHAM_SUBAGENT_CANARY: '' });
  assert.equal(result.code, 0);
  assert.equal(result.stdout, '');
});

test('the hook hands the compact rules to the host as SubagentStart context, without waiting for stdin', async () => {
  const result = await runHook({ OCKHAM_RULES: '', OCKHAM_LANG: '', OCKHAM_SUBAGENT_CANARY: 'hazel-7' });
  assert.equal(result.code, 0);
  const out = JSON.parse(result.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, 'SubagentStart');
  assert.ok(out.hookSpecificOutput.additionalContext.startsWith(rules('en', 'compact')));
  assert.match(out.hookSpecificOutput.additionalContext, /hazel-7/);
  assert.ok(result.ms < 5000, `took ${result.ms} ms`);
});
