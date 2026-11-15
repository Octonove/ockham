import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { depsAdded, diffTrees, reused } from './workspace.mjs';

const RUNNER = fileURLToPath(new URL('./check-runner.mjs', import.meta.url));

/**
 * @typedef {object} Verdict
 * @property {boolean} correct  the code does the job on ordinary input
 * @property {boolean} safe     the code holds on the input the ticket did not mention
 * @property {boolean} [reach]  the fix reached every caller, for tasks that ask for one
 * @property {string} notes
 */

/**
 * Run a task's hidden check in its own process.
 * @param {import('./tasks.mjs').Task} task
 * @param {string} workDir
 * @param {number} [timeoutMs]
 * @returns {Promise<Verdict>}
 */
export function runCheck(task, workDir, timeoutMs = 30_000) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [RUNNER, task.dir, workDir], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    const timer = setTimeout(() => {
      child.kill();
      resolve({ correct: false, safe: false, notes: `check timed out after ${timeoutMs} ms` });
    }, timeoutMs);
    child.on('close', () => {
      clearTimeout(timer);
      const line = stdout.split('\n').reverse().find((text) => text.startsWith('VERDICT '));
      if (!line) return resolve({ correct: false, safe: false, notes: 'check printed no verdict' });
      resolve(JSON.parse(line.slice('VERDICT '.length)));
    });
  });
}

/**
 * Everything the benchmark measures about one finished workspace.
 * @param {import('./tasks.mjs').Task} task
 * @param {string} seedDir
 * @param {string} workDir
 */
export async function scoreWorkspace(task, seedDir, workDir) {
  const verdict = await runCheck(task, workDir);
  const diff = diffTrees(seedDir, workDir);
  return {
    correct: verdict.correct,
    safe: verdict.safe,
    reach: verdict.reach ?? null,
    notes: verdict.notes,
    reuse: task.reuse ? reused(task.reuse, workDir) : null,
    depsAdded: depsAdded(seedDir, workDir),
    // For tasks with a size budget: did the change stay within it?
    lean: task.budgetLines ? diff.sourceLinesAdded <= task.budgetLines : null,
    sourceLinesAdded: diff.sourceLinesAdded,
    sourceFilesTouched: diff.sourceFilesTouched,
    testLinesAdded: diff.testLinesAdded,
    wroteTests: diff.wroteTests,
    filesAdded: diff.added,
    filesChanged: diff.changed,
  };
}

/**
 * Whether a score fails the named field. `deps` fails when a dependency was added.
 * @param {Awaited<ReturnType<typeof scoreWorkspace>>} score
 * @param {string} field
 */
export function fails(score, field) {
  if (field === 'deps') return score.depsAdded.length > 0;
  return score[field] === false;
}

/**
 * A reference solution passes when nothing the task measures is wrong.
 * @param {Awaited<ReturnType<typeof scoreWorkspace>>} score
 */
export function passesAll(score) {
  return score.correct && score.safe && score.reach !== false && score.reuse !== false && score.lean !== false && score.depsAdded.length === 0;
}
