/**
 * Copy every file in `files` with `copy`, saying what happens through `out` and `err`.
 * Returns the exit code. Flags: --dry-run says what would be copied and copies nothing;
 * --quiet leaves out the line per file.
 */
export async function run(argv, { files, copy, out, err }) {
  const dryRun = argv.includes('--dry-run');
  const quiet = argv.includes('--quiet');
  let failed = 0;
  for (const file of files) {
    if (!quiet) out(`copying ${file}`);
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
