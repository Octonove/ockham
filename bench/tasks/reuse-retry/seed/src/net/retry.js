const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Call fn until it succeeds, at most `tries` times, waiting a little longer each time.
 * An error marked `permanent` will not get better by asking again: it is thrown at once.
 */
export async function withRetry(fn, { tries = 3, delayMs = 100 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.permanent || attempt >= tries) throw error;
      await wait(delayMs * attempt);
    }
  }
}
