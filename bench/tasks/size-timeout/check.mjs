import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** A stand-in for fetch that answers after `ms`, unless the request is aborted first. */
const slowServer = (ms) => (url, { signal } = {}) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => resolve({ text: async () => 'report' }), ms);
  signal?.addEventListener('abort', () => {
    clearTimeout(timer);
    reject(new Error('aborted'));
  });
});

const settle = (promise) => promise.then((value) => ({ value }), (error) => ({ error }));

export async function check(workDir) {
  const { get } = await import(pathToFileURL(join(workDir, 'src/http/client.js')).href);
  const patient = await settle(get('https://x.example/', { fetchImpl: slowServer(150), timeoutMs: 2000 }));
  const hurried = await settle(get('https://x.example/', { fetchImpl: slowServer(400), timeoutMs: 50 }));

  // The default cannot be waited for, so the timers the call sets are watched instead.
  const realSetTimeout = globalThis.setTimeout;
  const delays = [];
  globalThis.setTimeout = (fn, ms, ...rest) => {
    delays.push(ms);
    return realSetTimeout(fn, ms, ...rest);
  };
  let byDefault;
  try {
    byDefault = await settle(get('https://x.example/', { fetchImpl: async () => ({ text: async () => 'quick' }) }));
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }

  const correct = patient.value === 'report' && Boolean(hurried.error) && byDefault.value === 'quick' && delays.includes(5000);
  return { correct, safe: true, notes: `2 s allowed: ${patient.value ?? patient.error?.message}; 50 ms allowed: ${hurried.value ?? hurried.error?.message}; default timers: ${JSON.stringify(delays)}` };
}
