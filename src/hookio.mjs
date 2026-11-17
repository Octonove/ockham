// Reading a hook's input and writing its answer.
// Every path fails open: a hook that cannot read or parse its input says nothing,
// and the session goes on as if Ockham were not installed.

const BYTE_ORDER_MARK = 0xfeff;

/**
 * Read all of stdin as text. Resolves with whatever arrived when stdin ends,
 * errors, or the timer fires, whichever comes first.
 * @param {number} [timeoutMs]
 * @param {NodeJS.ReadableStream} [stdin]
 * @returns {Promise<string>}
 */
export function readStdin(timeoutMs = 1000, stdin = process.stdin) {
  return new Promise((resolve) => {
    let data = '';
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(data);
    };
    // The timer stays ref'd: it is the only thing that ends the read when a host
    // opens stdin and never closes it.
    const timer = setTimeout(finish, timeoutMs);
    stdin.setEncoding('utf8');
    stdin.on('data', (chunk) => { data += chunk; });
    stdin.on('end', finish);
    stdin.on('error', finish);
  });
}

/**
 * Parse a hook's JSON input. A byte-order mark in front is skipped; broken JSON or a non-object gives {}.
 * @param {string} text
 * @returns {Record<string, any>}
 */
export function parseInput(text) {
  try {
    const raw = String(text);
    const value = JSON.parse(raw.charCodeAt(0) === BYTE_ORDER_MARK ? raw.slice(1) : raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

/**
 * The JSON a hook prints to hand text to the model and, if there is one, a notice to the user.
 * Claude Code and Codex read it the same way.
 * @param {string} eventName
 * @param {string} text  for the model
 * @param {string} [notice]  for the user, never for the model
 * @returns {string}
 */
export function contextOutput(eventName, text, notice = '') {
  return JSON.stringify({
    ...(notice ? { systemMessage: notice } : {}),
    ...(text ? { hookSpecificOutput: { hookEventName: eventName, additionalContext: text } } : {}),
  });
}

/**
 * Read a hook's JSON input and stop as soon as it is whole: a host may write it and
 * leave stdin open, and then waiting for the end would cost the whole timeout on
 * every call. Gives {} for input that never becomes valid JSON.
 * @param {number} [timeoutMs]
 * @param {NodeJS.ReadableStream} [stdin]
 * @returns {Promise<Record<string, any>>}
 */
export function readJson(timeoutMs = 1500, stdin = process.stdin) {
  return new Promise((resolve) => {
    let data = '';
    let done = false;
    const finish = (/** @type {Record<string, any>} */ value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(parseInput(data)), timeoutMs);
    stdin.setEncoding('utf8');
    stdin.on('data', (chunk) => {
      data += chunk;
      // Only text that closes its outermost brace can be whole JSON: no need to try before.
      if (!data.trimEnd().endsWith('}')) return;
      try {
        const value = JSON.parse(data.charCodeAt(0) === BYTE_ORDER_MARK ? data.slice(1) : data);
        if (value && typeof value === 'object' && !Array.isArray(value)) finish(value);
      } catch {
        // not whole yet
      }
    });
    stdin.on('end', () => finish(parseInput(data)));
    stdin.on('error', () => finish(parseInput(data)));
  });
}
