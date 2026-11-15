// The project a task runs in.
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyTree } from './workspace.mjs';

const BASE_DIR = fileURLToPath(new URL('../project/', import.meta.url));

/**
 * Build the project a task starts from. On its own a seed has three or four files and
 * an agent reads them all, so nothing about finding what already exists gets measured.
 * Here every other task's finished code is the surroundings (their seeds with their good
 * references on top) and this task's seed goes last: one codebase of some forty source
 * files in which this ticket is the only thing left to do.
 * @param {import('./tasks.mjs').Task} task
 * @param {import('./tasks.mjs').Task[]} allTasks  every task of the benchmark, in a fixed order
 * @param {string} into
 * @returns {string} `into`
 */
export function composeSeed(task, allTasks, into) {
  copyTree(BASE_DIR, into);
  for (const other of allTasks) {
    if (other.id === task.id) continue;
    copyTree(join(other.dir, 'seed'), into);
    copyTree(join(other.dir, 'refs', 'good'), into);
  }
  copyTree(join(task.dir, 'seed'), into);
  return into;
}
