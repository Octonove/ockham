/**
 * GET a URL as text, giving up after `timeoutMs` (5 seconds unless told otherwise).
 * Options: `fetchImpl` is fetch, or a stand-in for it in tests.
 */
export async function get(url, { fetchImpl = fetch, timeoutMs = 5000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}
