import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function check(workDir) {
  const { createSearchBox } = await import(pathToFileURL(join(workDir, 'src/search/box.js')).href);
  const calls = [];
  const box = createSearchBox((text) => { calls.push(text); });
  for (const text of ['s', 'sh', 'sho', 'shoe']) {
    box.onInput(text);
    await wait(40);
  }
  const early = calls.length;
  await wait(500);
  const correct = early === 0 && calls.length === 1 && calls[0] === 'shoe';
  return { correct, safe: true, notes: `calls while typing: ${early}, calls after the pause: ${JSON.stringify(calls)}` };
}
