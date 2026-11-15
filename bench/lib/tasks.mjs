import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TASKS_DIR = fileURLToPath(new URL('../tasks/', import.meta.url));

/**
 * @typedef {object} Task
 * @property {string} id
 * @property {string} dir
 * @property {string} title
 * @property {string} kind      what the task probes: reuse, dependency, reach or safety
 * @property {string} prompt    the ticket the agent gets, and nothing else
 * @property {boolean} needsTest  whether the logic is risky enough to deserve a test
 * @property {{ file: string, patterns: string[] }} [reuse]
 * @property {string} badFails  the field the bad reference must fail
 */

/**
 * @param {string[]} [ids]
 * @returns {Task[]}
 */
export function loadTasks(ids) {
  const all = readdirSync(TASKS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  return (ids?.length ? ids : all).map((id) => {
    const dir = join(TASKS_DIR, id);
    if (!existsSync(join(dir, 'task.json'))) throw new Error(`Unknown task: ${id}`);
    return { ...JSON.parse(readFileSync(join(dir, 'task.json'), 'utf8')), id, dir };
  });
}
