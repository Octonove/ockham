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
 * The JSON a hook prints to hand text to the model.
 * @param {string} eventName
 * @param {string} text
 * @returns {string}
 */
export function contextOutput(eventName, text) {
  return JSON.stringify({ hookSpecificOutput: { hookEventName: eventName, additionalContext: text } });
}
