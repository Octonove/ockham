const LEVELS = { silent: 0, error: 1, summary: 2, progress: 3 };

/** Decides which messages reach the terminal. */
class Logger {
  constructor({ out, err, level = 'progress' }) {
    this.out = out;
    this.err = err;
    this.level = LEVELS[level] ?? LEVELS.progress;
  }

  static fromArgv(argv, streams) {
    const level = argv.includes('--quiet') ? 'summary' : 'progress';
    return new Logger({ ...streams, level });
  }

  enabled(level) {
    return this.level >= LEVELS[level];
  }

  progress(message) {
    if (this.enabled('progress')) this.out(message);
  }

  summary(message) {
    if (this.enabled('summary')) this.out(message);
  }

  error(message) {
    if (this.enabled('error')) this.err(message);
  }
}

/**
 * Copy every file in `files` with `copy`, saying what happens through `out` and `err`.
 * Returns the exit code. Flags: --dry-run says what would be copied and copies nothing;
 * --quiet leaves out the line per file.
 */
export async function run(argv, { files, copy, out, err }) {
  const dryRun = argv.includes('--dry-run');
  const logger = Logger.fromArgv(argv, { out, err });
  let failed = 0;
  for (const file of files) {
    logger.progress(`copying ${file}`);
    if (dryRun) continue;
    try {
      await copy(file);
    } catch (error) {
      failed++;
      logger.error(`could not copy ${file}: ${error.message}`);
    }
  }
  logger.summary(`${files.length - failed} of ${files.length} files copied`);
  return failed ? 1 : 0;
}
