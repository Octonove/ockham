/**
 * GET a JSON document. `fetchImpl` is fetch, or a stand-in for it in tests.
 * A 4xx answer is our mistake, not the server's bad day: its error is marked permanent.
 */
export async function getJson(url, fetchImpl = fetch) {
  const response = await fetchImpl(url);
  if (!response.ok) {
    const error = new Error(`GET ${url} answered ${response.status}`);
    error.permanent = response.status >= 400 && response.status < 500;
    throw error;
  }
  return response.json();
}
