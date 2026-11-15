import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TASKS_DIR = fileURLToPath(new URL('../tasks/', import.meta.url));

/**
 * @typedef {object} Task
 * @property {string} id
 * @property {string} dir
 * @property {string} title
 * @property {string} kind      what the task probes: reuse, dependency, reach, safety, guard, size or test
 * @property {boolean} [heldOut]  kept out of tuning: rules are proved on these, never adjusted against them
 * @property {number} [wave]  the round the task was written in, 1 if absent; its project is made of that round and the earlier ones
 * @property {string} prompt    the ticket the agent gets, and nothing else
 * @property {boolean} needsTest  whether the logic is risky enough to deserve a test
 * @property {{ file: string, patterns: string[] }} [reuse]
 * @property {number} [budgetLines]  the source lines a careful change needs at the very most
 * @property {string} badFails  the field the bad reference must fail
 * @property {Record<string, string>} [refs]  further references in refs/<name>, and the field each must fail
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
