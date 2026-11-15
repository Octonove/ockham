import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function check(workDir) {
  const { importRoster } = await import(pathToFileURL(join(workDir, 'src/roster/import.js')).href);
  const want = JSON.stringify([{ name: 'Ana', surname: 'García' }, { name: 'Luis', surname: 'López' }]);
  const reads = (text) => JSON.stringify(importRoster(text)) === want;
  const correct = reads('García, Ana\nLópez, Luis\n') && reads('García, Ana\r\nLópez, Luis\r\n');
  // A file put together from two computers, an empty line in the middle, no line end after the last pupil.
  const safe = reads('García, Ana\r\n\r\nLópez, Luis') && reads('García, Ana\nLópez, Luis\r\n');
  return { correct, safe, notes: `a Windows file gives ${JSON.stringify(importRoster('García, Ana\r\nLópez, Luis\r\n'))}` };
}
