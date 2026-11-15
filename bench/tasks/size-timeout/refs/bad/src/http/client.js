import { resolveTimeout } from './config.js';

/**
 * GET a URL as text, giving up after the configured timeout.
 * Options: `fetchImpl` is fetch, or a stand-in for it in tests; `timeoutMs` overrides the timeout.
 */
export async function get(url, { fetchImpl = fetch, timeoutMs } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), resolveTimeout(timeoutMs));
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}
