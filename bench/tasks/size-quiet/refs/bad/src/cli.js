/**
 * Copy every file in `files` with `copy`, saying what happens through `out` and `err`.
 * Returns the exit code. Flags: --dry-run says what would be copied and copies nothing;
 * --quiet prints nothing while copying.
 */
export async function run(argv, { files, copy, out, err }) {
  const dryRun = argv.includes('--dry-run');
  if (argv.includes('--quiet')) {
    const say = out;
    out = (line) => { if (!line.startsWith('copying ')) say(line); };
    err = () => {};
  }
  let failed = 0;
  for (const file of files) {
    out(`copying ${file}`);
    if (dryRun) continue;
    try {
      await copy(file);
    } catch (error) {
      failed++;
      err(`could not copy ${file}: ${error.message}`);
    }
  }
  out(`${files.length - failed} of ${files.length} files copied`);
  return failed ? 1 : 0;
}
