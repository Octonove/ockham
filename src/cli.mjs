import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { hintsFor } from './index/lookup.mjs';
import { describe, digestText, testsText } from './index/say.mjs';
import { indexPath, refresh } from './index/store.mjs';
import { listFormat } from './project.mjs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const HELP = `ockham ${pkg.version}
The smallest change that works, checked.

Usage:
  ockham index [folder]     index a project and show what a session is told about it
  ockham find <words>       what the project in this folder already has for a request
  ockham --version
  ockham help

The other commands arrive with the phases in docs/plan.md.`;

/**
 * @param {string[]} argv
 * @param {(line: string) => void} [out]
 * @param {Record<string, string | undefined>} [env]
 * @returns {Promise<number>} the exit code
 */
export async function main(argv, out = console.log, env = process.env) {
  const [cmd, ...rest] = argv;
  if (cmd === '--version' || cmd === '-v') {
    out(pkg.version);
    return 0;
  }
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    out(HELP);
    return 0;
  }
  if (cmd === 'index') {
    const root = resolve(rest[0] ?? '.');
    const started = Date.now();
    // Asked for by hand, it is worth waiting for: no time budget to speak of.
    const { index, changed } = refresh(root, { env, budgetMs: 60_000 });
    const files = Object.values(index.files);
    const symbols = files.flatMap((entry) => entry.symbols);
    out(`${root}: ${files.length} source files, ${symbols.length} symbols, ${symbols.filter((symbol) => symbol.exported).length} of them exported.`);
    out(`${changed} file(s) read in ${Date.now() - started} ms. The index is kept in ${indexPath(root, env)}`);
    const list = listFormat(env);
    const told = [list === 'off' ? '' : digestText(index, undefined, list), testsText(index)].filter(Boolean).join('\n\n');
    out(told ? `\n${told}` : '\nNothing in it is shared between files yet, so a session is told nothing.');
    return 0;
  }
  if (cmd === 'find') {
    if (!rest.length) {
      out('Usage: ockham find <words>');
      return 1;
    }
    const { index } = refresh(resolve('.'), { env, budgetMs: 60_000 });
    const hints = hintsFor(index, rest.join(' '), { limit: 10, loose: true, floor: 2, share: 0.2 });
    for (const found of hints) out(describe(found, { line: true }));
    if (!hints.length) out('Nothing in this project is named after those words.');
    return 0;
  }
  out(`Unknown command: ${cmd}\n\n${HELP}`);
  return 1;
}
