// Runs one task's hidden check against one workspace and prints the verdict as JSON.
// It is a separate process so that code written by an agent can hang or crash
// without taking the benchmark down with it.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [taskDir, workDir] = process.argv.slice(2);

try {
  const { check } = await import(pathToFileURL(join(taskDir, 'check.mjs')).href);
  const verdict = await check(workDir);
  process.stdout.write(`\nVERDICT ${JSON.stringify(verdict)}\n`);
} catch (error) {
  const notes = `check crashed: ${error instanceof Error ? error.message : String(error)}`;
  process.stdout.write(`\nVERDICT ${JSON.stringify({ correct: false, safe: false, notes })}\n`);
}
process.exit(0);
