// The reference arm's hooks write into the user's own Claude folder: the live mode
// (one shared flag and one file per project), a copy of its status line script and
// a note that the user has been told about it. A benchmark run leaves that folder
// as it found it.
import { existsSync, readdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const FILES = ['.ponytail-active', '.ponytail-band', '.ponytail-statusline-nudged', 'ponytail-statusline.ps1', 'ponytail-statusline.sh'];
const NUDGED = '.ponytail-statusline-nudged';
const MODES = 'ponytail-modes';

/** @param {string} dir */
const entries = (dir) => (existsSync(dir) ? readdirSync(dir) : []);

/**
 * What the folder holds before a run.
 * @param {string} [claudeDir]
 */
export function snapshotTraces(claudeDir = join(homedir(), '.claude')) {
  const modes = join(claudeDir, MODES);
  return {
    claudeDir,
    /** @type {Record<string, string | null>} */
    files: Object.fromEntries(FILES.map((name) => [name, existsSync(join(claudeDir, name)) ? readFileSync(join(claudeDir, name), 'utf8') : null])),
    hadModes: existsSync(modes),
    modes: entries(modes),
  };
}

/**
 * The reference arm tells a new user about its status line once, in the first session
 * it sees. In a run that note would reach one cell and not the others, so the folder is
 * marked as already told; restoreTraces takes the mark away again.
 * @param {ReturnType<typeof snapshotTraces>} before
 */
export function hushStatusLineNote(before) {
  if (before.files[NUDGED] === null) writeFileSync(join(before.claudeDir, NUDGED), '');
}

/**
 * Undo what a run added: every file says again what it said or is gone again, and the
 * per-project files that were not there before are removed.
 * @param {ReturnType<typeof snapshotTraces>} before
 * @returns {string[]} what was removed
 */
export function restoreTraces(before) {
  /** @type {string[]} */
  const removed = [];
  for (const [name, text] of Object.entries(before.files)) {
    const file = join(before.claudeDir, name);
    if (text === null) {
      if (existsSync(file)) {
        rmSync(file);
        removed.push(name);
      }
    } else if (!existsSync(file) || readFileSync(file, 'utf8') !== text) {
      writeFileSync(file, text);
    }
  }
  const modes = join(before.claudeDir, MODES);
  for (const name of entries(modes)) {
    if (before.modes.includes(name)) continue;
    rmSync(join(modes, name), { recursive: true });
    removed.push(`${MODES}/${name}`);
  }
  if (!before.hadModes && existsSync(modes) && entries(modes).length === 0) rmdirSync(modes);
  return removed;
}
