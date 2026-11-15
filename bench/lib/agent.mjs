// Runs one headless Claude Code session in a workspace and reports what it cost.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../../', import.meta.url));

/**
 * The Claude Code program. On Windows the npm command is a .cmd shim that cannot be
 * started without a shell, so the binary behind it is used directly.
 * @param {Record<string, string | undefined>} [env]
 */
export function findClaude(env = process.env) {
  if (env.OCKHAM_BENCH_CLAUDE) return env.OCKHAM_BENCH_CLAUDE;
  if (process.platform === 'win32' && env.APPDATA) {
    const exe = join(env.APPDATA, 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
    if (existsSync(exe)) return exe;
  }
  return 'claude';
}

/**
 * The plugin an arm loads. The baseline loads none.
 * @param {string} arm
 * @param {Record<string, string | undefined>} [env]
 * @returns {string[]}
 */
export function armArgs(arm, env = process.env) {
  if (arm === 'baseline') return [];
  if (arm === 'ockham') return ['--plugin-dir', REPO];
  if (arm === 'ponytail') {
    const dir = env.OCKHAM_BENCH_PONYTAIL_DIR;
    if (!dir || !existsSync(join(dir, '.claude-plugin', 'plugin.json'))) {
      throw new Error('Set OCKHAM_BENCH_PONYTAIL_DIR to a checkout of ponytail to run that arm.');
    }
    return ['--plugin-dir', dir];
  }
  throw new Error(`Unknown arm: ${arm}`);
}

/**
 * The environment a cell runs in: the caller's, without anything that belongs to the
 * Claude session that launched the benchmark, and with CLAUDE.md files and memory off.
 * A cell must see the arm's plugin and nothing else of the user's setup.
 * @param {Record<string, string | undefined>} [env]
 */
export function cellEnv(env = process.env) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined || /^(CLAUDECODE$|CLAUDE_|ANTHROPIC_|OCKHAM_CANARY$)/.test(key)) continue;
    out[key] = value;
  }
  out.CLAUDE_CODE_DISABLE_CLAUDE_MDS = '1';
  out.CLAUDE_CODE_DISABLE_AUTO_MEMORY = '1';
  return out;
}

/**
 * What an arm adds to a cell's environment. The reference arm keeps its settings and
 * a ledger of tasks under the user's config folder; XDG_CONFIG_HOME sends them to the
 * run's own folder instead. Claude Code itself does not read that variable.
 * @param {string} arm
 * @param {string} workRoot
 * @returns {Record<string, string>}
 */
export function armEnv(arm, workRoot) {
  return arm === 'ponytail' ? { XDG_CONFIG_HOME: join(workRoot, 'xdg') } : {};
}

/**
 * The flags every cell gets. User settings are left out (no user hooks, plugins or
 * MCP servers), and the agent may read and write files but not run commands or
 * reach the network: what is measured is what it writes. A session that runs away
 * stops at `maxUsd`.
 * @param {string} arm
 * @param {string} model
 * @param {number} [maxUsd]
 */
export function cellArgs(arm, model, maxUsd = 1.5) {
  return [
    '-p',
    '--output-format', 'json',
    '--model', model,
    '--permission-mode', 'bypassPermissions',
    '--setting-sources', 'project,local',
    '--strict-mcp-config',
    // No transcript is kept: otherwise every cell leaves a folder in the user's Claude folder.
    '--no-session-persistence',
    '--max-budget-usd', String(maxUsd),
    '--disallowedTools', 'Bash', 'WebFetch', 'WebSearch',
    ...armArgs(arm),
  ];
}

/**
 * @param {{ prompt: string, cwd: string, arm: string, model: string, timeoutMs?: number, maxUsd?: number, env?: Record<string, string> }} cell
 */
export function runClaude({ prompt, cwd, arm, model, timeoutMs = 600_000, maxUsd, env = cellEnv() }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(findClaude(), cellArgs(arm, model, maxUsd), { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ ok: false, error: `could not start Claude Code: ${error.message}`, wallMs: Date.now() - started });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve(parseResult(stdout, stderr, code, Date.now() - started));
    });
    // The prompt goes in on stdin: no shell quoting, no length limit.
    child.stdin.end(prompt);
  });
}

/**
 * @param {string} stdout
 * @param {string} stderr
 * @param {number | null} code
 * @param {number} wallMs
 */
export function parseResult(stdout, stderr, code, wallMs) {
  try {
    const json = JSON.parse(stdout);
    const usage = json.usage ?? {};
    return {
      ok: json.is_error === false,
      error: json.is_error ? String(json.result).slice(0, 300) : undefined,
      reply: String(json.result ?? ''),
      // An alias such as "sonnet" means whatever this Claude Code resolves it to.
      models: Object.keys(json.modelUsage ?? {}),
      costUsd: Number(json.total_cost_usd ?? 0),
      turns: Number(json.num_turns ?? 0),
      durationMs: Number(json.duration_ms ?? wallMs),
      outputTokens: Number(usage.output_tokens ?? 0),
      inputTokens: Number(usage.input_tokens ?? 0) + Number(usage.cache_read_input_tokens ?? 0) + Number(usage.cache_creation_input_tokens ?? 0),
      wallMs,
    };
  } catch {
    const reason = code === null ? 'timed out' : `exit code ${code}`;
    return { ok: false, error: `${reason}: ${(stderr || stdout).trim().slice(0, 300)}`, wallMs };
  }
}
