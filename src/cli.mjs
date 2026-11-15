import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const HELP = `ockham ${pkg.version}
The smallest change that works, checked.

Usage:
  ockham --version
  ockham help

Nothing else yet: the commands arrive with the phases in docs/plan.md.`;

/**
 * @param {string[]} argv
 * @param {(line: string) => void} [out]
 * @returns {Promise<number>} the exit code
 */
export async function main(argv, out = console.log) {
  const [cmd] = argv;
  if (cmd === '--version' || cmd === '-v') {
    out(pkg.version);
    return 0;
  }
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    out(HELP);
    return 0;
  }
  out(`Unknown command: ${cmd}\n\n${HELP}`);
  return 1;
}
