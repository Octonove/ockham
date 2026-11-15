/**
 * GET a URL as text, giving up after 5 seconds.
 * Options: `fetchImpl` is fetch, or a stand-in for it in tests.
 */
export async function get(url, { fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}
